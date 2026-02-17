import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { useI18n } from './i18n.jsx';

function FlagImg({ code, size = 32 }) {
  if (!code) return <span>🌍</span>;
  const w = size <= 20 ? 20 : size <= 40 ? 40 : size <= 80 ? 80 : 160;
  const src = `https://flagcdn.com/w${w}/${code.toLowerCase()}.png`;
  return <img src={src} alt={code} style={{ width: size, height: 'auto', borderRadius: 3 }} />;
}

const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function CountryDetail({ country, onClose, getToneColor, getDissonanceColor, lang }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('overview');
  const panelRef = useRef(null);

  const MONTHS = lang === 'es' ? MONTHS_ES : MONTHS_EN;

  const getSentimentLabel = (tone) => {
    if (tone <= -3) return { label: t('sentCritical'), desc: t('sentCriticalDesc') };
    if (tone <= -1.5) return { label: t('sentNegative'), desc: t('sentNegativeDesc') };
    if (tone < 1.5) return { label: t('sentNeutral'), desc: t('sentNeutralDesc') };
    if (tone < 3) return { label: t('sentPositive'), desc: t('sentPositiveDesc') };
    return { label: t('sentOptimistic'), desc: t('sentOptimisticDesc') };
  };

  const getDissonanceLabel = (d) => {
    if (d < 0.5) return { label: t('disAligned'), desc: t('disAlignedDesc') };
    if (d < 1) return { label: t('disLow'), desc: t('disLowDesc') };
    if (d < 2) return { label: t('disModerate'), desc: t('disModerateDesc') };
    if (d < 3) return { label: t('disHigh'), desc: t('disHighDesc') };
    return { label: t('disExtreme'), desc: t('disExtremeDesc') };
  };

  useEffect(() => {
    if (country) {
      setTab('overview');
      setData(null);
      fetchDetail(country);
      if (window.innerWidth <= 768) {
        requestAnimationFrame(() => {
          if (panelRef.current) panelRef.current.scrollTop = 0;
        });
      }
    }
  }, [country]);

  const fetchDetail = async (code) => {
    setLoading(true);
    try {
      const API = import.meta.env.VITE_API_URL || '';
      const r = await fetch(`${API}/api/country/${code}`);
      setData(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (!country) return null;
  if (loading || !data) return (
    <div ref={panelRef} className="country-detail open">
      <button className="close-btn" onClick={onClose}>×</button>
      <div className="detail-loading"><div className="loading-spinner" />{t('loading')}</div>
    </div>
  );

  const countryName = lang === 'es' ? (data.name_es || data.name) : data.name;
  const disLabel = getDissonanceLabel(data.dissonance || 0);

  const mergedTimeline = (() => {
    const map = {};
    (data.external?.timeline || []).forEach(d => {
      if (!map[d.date]) map[d.date] = { date: d.date };
      map[d.date].external = d.tone;
    });
    (data.internal?.timeline || []).forEach(d => {
      if (!map[d.date]) map[d.date] = { date: d.date };
      map[d.date].internal = d.tone;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const formatTick = (dateStr) => {
    if (!dateStr || dateStr.length < 8) return '';
    const clean = dateStr.replace(/[-T].*/g, '').replace(/-/g, '');
    const month = parseInt(clean.slice(4, 6), 10) - 1;
    const day = clean.slice(6, 8);
    const year = clean.slice(2, 4);
    return `${parseInt(day)} ${MONTHS[month]} '${year}`;
  };

  function ChartTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div style={{ background: '#111118', border: '1px solid #222', borderRadius: 6, padding: '8px 12px', fontSize: '0.8rem' }}>
        <div style={{ color: '#888', marginBottom: 4 }}>{d.date}</div>
        {d.external != null && <div style={{ color: '#4f8ffc' }}>{t('external')}: {getSentimentLabel(d.external).label}</div>}
        {d.internal != null && <div style={{ color: '#ff6b9d' }}>{t('internal')}: {getSentimentLabel(d.internal).label}</div>}
      </div>
    );
  }

  function SentimentMeter({ tone, label: sideLabel, desc, color }) {
    const s = getSentimentLabel(tone);
    const pct = Math.max(0, Math.min(100, ((tone + 5) / 10) * 100));
    return (
      <div className="mirror-card">
        <div className="mirror-label">{sideLabel}</div>
        <div className="mirror-desc">{desc}</div>
        <div className="mirror-tone" style={{ color }}>{s.label}</div>
        <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>{s.desc}</div>
        <div style={{ margin: '0.5rem 0', background: 'linear-gradient(to right, #ff1744, #ff9100, #607080, #69f0ae, #00c853)', borderRadius: 4, height: 6, position: 'relative' }}>
          <div style={{ position: 'absolute', left: `${pct}%`, top: -3, width: 12, height: 12, borderRadius: '50%', background: '#fff', border: '2px solid #000', transform: 'translateX(-50%)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: '#555' }}>
          <span>{t('critical')}</span>
          <span>{t('negative')}</span>
          <span>{t('neutral')}</span>
          <span>{t('positive')}</span>
          <span>{t('optimistic')}</span>
        </div>
      </div>
    );
  }

  // Pick the right article title based on language
  const getArticleTitle = (article) => {
    if (lang === 'es') return article.title_es || article.title;
    return article.title_en || article.title;
  };

  // Pick the right analysis fields based on language
  const getAnalysisSummary = () => {
    if (!data.analysis) return null;
    if (lang === 'es') return data.analysis.summary_es || data.analysis.summary;
    return data.analysis.summary || data.analysis.summary_es;
  };

  const getAnalysisContext = () => {
    if (!data.analysis) return null;
    if (lang === 'es') return data.analysis.context_es || data.analysis.context;
    return data.analysis.context || data.analysis.context_es;
  };

  const getAnalysisTopics = () => {
    if (!data.analysis) return null;
    if (lang === 'es') return data.analysis.keyTopics_es || data.analysis.keyTopics;
    return data.analysis.keyTopics || data.analysis.keyTopics_es;
  };

  return (
    <div ref={panelRef} className={`country-detail ${country ? 'open' : ''}`}>
      <button className="close-btn" onClick={onClose}>×</button>

      {data && (
        <>
          <div className="detail-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="country-flag"><FlagImg code={country} size={64} /></span>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div className="country-name">{countryName}</div>
            </div>
            <div style={{ textAlign: 'right', minWidth: '60px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: getDissonanceColor(data.dissonance) }}>
                {(data.dissonance || 0).toFixed(1)}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('dissonance')}</div>
            </div>
          </div>

          <div className="mirror-scores">
            <SentimentMeter
              tone={data.internal?.tone || 0}
              label={t('internal')}
              desc={t('localMedia')}
              color={getToneColor(data.internal?.tone || 0)}
            />
            <SentimentMeter
              tone={data.external?.tone || 0}
              label={t('external')}
              desc={t('internationalMedia')}
              color={getToneColor(data.external?.tone || 0)}
            />
          </div>

          <div className="detail-tabs">
            <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>{t('overview')}</button>
            <button className={`tab ${tab === 'internal' ? 'active' : ''}`} onClick={() => setTab('internal')}>{t('internalNews')}</button>
            <button className={`tab ${tab === 'external' ? 'active' : ''}`} onClick={() => setTab('external')}>{t('externalNews')}</button>
          </div>

          {tab === 'overview' && (
            <div className="detail-section">
              <h3 className="section-title">{t('timelineTitle')}</h3>
              {mergedTimeline.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={mergedTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2a" />
                      <XAxis
                        dataKey="date"
                        stroke="#666"
                        style={{ fontSize: '0.65rem' }}
                        tickFormatter={formatTick}
                        interval={Math.floor(mergedTimeline.length / 4)}
                        tick={{ fill: '#888' }}
                      />
                      <YAxis
                        stroke="#444"
                        style={{ fontSize: '0.6rem' }}
                        ticks={[-5, -1.5, 0, 1.5, 5]}
                        tickFormatter={v => {
                          if (v <= -3) return t('critical');
                          if (v <= -1.5) return t('negative');
                          if (v === 0) return t('neutral');
                          if (v >= 3) return t('optimistic');
                          if (v >= 1.5) return t('positive');
                          return '';
                        }}
                        domain={[-5, 5]}
                        tick={{ fill: '#888' }}
                      />
                      <ReferenceLine y={0} stroke="#444" strokeDasharray="3 3" />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                      <Line type="monotone" dataKey="external" name={t('external')} stroke="#4f8ffc" strokeWidth={2} dot={false} connectNulls />
                      <Line type="monotone" dataKey="internal" name={t('internal')} stroke="#ff6b9d" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ color: '#555', padding: '2rem 0', textAlign: 'center' }}>{t('noTimeline')}</div>
              )}

              {getAnalysisTopics() && (
                <>
                  <h3 className="section-title" style={{ marginTop: '1.5rem' }}>{t('keyTopics')}</h3>
                  <div className="key-topics">
                    <div className="topics-col">
                      <div className="topics-heading"><span className="topics-dot internal" />{t('internal')}</div>
                      {(getAnalysisTopics().internal || []).map((topic, i) => (
                        <span key={i} className="topic-tag internal">{topic}</span>
                      ))}
                    </div>
                    <div className="topics-col">
                      <div className="topics-heading"><span className="topics-dot external" />{t('external')}</div>
                      {(getAnalysisTopics().external || []).map((topic, i) => (
                        <span key={i} className="topic-tag external">{topic}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {getAnalysisContext() && (
                <>
                  <h3 className="section-title" style={{ marginTop: '1.5rem' }}>{t('context')}</h3>
                  <div className="country-context">{getAnalysisContext()}</div>
                  {getAnalysisSummary() && (
                    <div className="country-summary">{getAnalysisSummary()}</div>
                  )}
                </>
              )}
            </div>
          )}

          {(tab === 'internal' || tab === 'external') && (
            <div className="detail-section">
              <h3 className="section-title">
                {tab === 'internal' ? t('localCoverage') : t('internationalCoverage')}
              </h3>
              <div className="articles-list">
                {(data[tab]?.articles || []).map((a, i) => (
                  <div key={i} className="article">
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="article-title">
                      {getArticleTitle(a)}
                    </a>
                    <div className="article-meta">
                      <span className="article-source">{a.source}</span>
                    </div>
                  </div>
                ))}
                {(!data[tab]?.articles?.length) && (
                  <div style={{ color: '#555', padding: '2rem 0', textAlign: 'center' }}>{t('noArticles')}</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CountryDetail;
