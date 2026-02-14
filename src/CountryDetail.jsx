import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

// Flag as image from flagcdn.com (works on all platforms including Windows)
function FlagImg({ code, size = 32 }) {
  if (!code) return <span>🌍</span>;
  // flagcdn supports w20, w40, w80, w160, w320
  const w = size <= 20 ? 20 : size <= 40 ? 40 : size <= 80 ? 80 : 160;
  const src = `https://flagcdn.com/w${w}/${code.toLowerCase()}.png`;
  return <img src={src} alt={code} style={{ width: size, height: 'auto', borderRadius: 3 }} />;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Human-readable sentiment label — matches Y axis scale
function getSentimentLabel(tone) {
  if (tone <= -3) return { label: 'Critical', desc: 'Conflict, crisis, strong criticism' };
  if (tone <= -1.5) return { label: 'Negative', desc: 'Tension, concern, criticism' };
  if (tone < 0) return { label: 'Neutral', desc: 'Balanced, factual coverage' };
  if (tone < 1.5) return { label: 'Neutral', desc: 'Balanced, factual coverage' };
  if (tone < 3) return { label: 'Positive', desc: 'Progress, cooperation, growth' };
  return { label: 'Optimistic', desc: 'Strong praise, celebration' };
}

function getDissonanceLabel(d) {
  if (d < 0.5) return { label: 'Aligned', desc: 'Internal and external narratives converge' };
  if (d < 1) return { label: 'Low divergence', desc: 'Minor differences in perception' };
  if (d < 2) return { label: 'Moderate divergence', desc: 'Notable gap between internal and external views' };
  if (d < 3) return { label: 'High divergence', desc: 'Significantly different narratives' };
  return { label: 'Extreme divergence', desc: 'Opposing internal vs external perception' };
}

// Format date for X axis: "Nov 25", "Dec 25", "Jan 26"
function formatMonth(dateStr) {
  if (!dateStr || dateStr.length < 7) return dateStr;
  const month = parseInt(dateStr.slice(5, 7), 10) - 1;
  const year = dateStr.slice(2, 4);
  return `${MONTHS[month]} '${year}`;
}

// Custom tooltip for chart
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: '#111118', border: '1px solid #222', borderRadius: 6, padding: '8px 12px', fontSize: '0.8rem' }}>
      <div style={{ color: '#888', marginBottom: 4 }}>{d.date}</div>
      {d.external != null && <div style={{ color: '#4f8ffc' }}>External: {getSentimentLabel(d.external).label}</div>}
      {d.internal != null && <div style={{ color: '#ff6b9d' }}>Internal: {getSentimentLabel(d.internal).label}</div>}
    </div>
  );
}

function SentimentMeter({ tone, label: sideLabel, desc, color }) {
  const s = getSentimentLabel(tone);
  // Map tone (-5 to +5) to percentage (0-100)
  const pct = Math.max(0, Math.min(100, ((tone + 5) / 10) * 100));
  return (
    <div className="mirror-card">
      <div className="mirror-label">{sideLabel}</div>
      <div className="mirror-desc">{desc}</div>
      <div className="mirror-tone" style={{ color }}>
        {s.label}
      </div>
      <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>{s.desc}</div>
      {/* Tone bar */}
      <div style={{ margin: '0.5rem 0', background: 'linear-gradient(to right, #ff1744, #ff9100, #607080, #69f0ae, #00c853)', borderRadius: 4, height: 6, position: 'relative' }}>
        <div style={{ position: 'absolute', left: `${pct}%`, top: -3, width: 12, height: 12, borderRadius: '50%', background: '#fff', border: '2px solid #000', transform: 'translateX(-50%)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: '#555' }}>
        <span>Critical</span>
        <span>Negative</span>
        <span>Neutral</span>
        <span>Positive</span>
        <span>Optimistic</span>
      </div>
    </div>
  );
}

function CountryDetail({ country, onClose, getToneColor, getDissonanceColor }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('overview');
  const panelRef = useRef(null);

  useEffect(() => {
    if (country) {
      setTab('overview');
      setData(null);
      fetchDetail(country);
      // Scroll panel to top on mobile only
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
      <div className="detail-loading"><div className="loading-spinner" />Loading...</div>
    </div>
  );

  const disLabel = getDissonanceLabel(data.dissonance || 0);

  // Merge both timelines into one array keyed by date
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
    // Handles "20251126T0" or "2025-11-26" or "20251126"
    const clean = dateStr.replace(/[-T].*/g, '').replace(/-/g, '');
    const month = parseInt(clean.slice(4, 6), 10) - 1;
    const day = clean.slice(6, 8);
    const year = clean.slice(2, 4);
    // Show "1 Dec '25" format
    return `${parseInt(day)} ${MONTHS[month]} '${year}`;
  };

  return (
    <div ref={panelRef} className={`country-detail ${country ? 'open' : ''}`}>
      <button className="close-btn" onClick={onClose}>×</button>

      {data && (
        <>
          {/* Header */}
          <div className="detail-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="country-flag"><FlagImg code={country} size={64} /></span>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div className="country-name">{data.name}</div>
            </div>
            <div style={{ textAlign: 'right', minWidth: '60px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: getDissonanceColor(data.dissonance) }}>
                {(data.dissonance || 0).toFixed(1)}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>dissonance</div>
            </div>
          </div>

          {/* Sentiment meters */}
          <div className="mirror-scores">
            <SentimentMeter
              tone={data.internal?.tone || 0}
              label="Internal"
              desc="Local media sentiment"
              color={getToneColor(data.internal?.tone || 0)}
            />
{/* spacer */}
            <SentimentMeter
              tone={data.external?.tone || 0}
              label="External"
              desc="International media sentiment"
              color={getToneColor(data.external?.tone || 0)}
            />
          </div>

          {/* Tabs */}
          <div className="detail-tabs">
            <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
            <button className={`tab ${tab === 'internal' ? 'active' : ''}`} onClick={() => setTab('internal')}>Internal News</button>
            <button className={`tab ${tab === 'external' ? 'active' : ''}`} onClick={() => setTab('external')}>External News</button>
          </div>

          {/* Timeline */}
          {tab === 'overview' && (
            <div className="detail-section">
              <h3 className="section-title">Sentiment Timeline (3 months)</h3>
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
                          if (v <= -3) return 'Critical';
                          if (v <= -1.5) return 'Negative';
                          if (v === 0) return 'Neutral';
                          if (v >= 3) return 'Optimistic';
                          if (v >= 1.5) return 'Positive';
                          return '';
                        }}
                        domain={[-5, 5]}
                        tick={{ fill: '#888' }}
                      />
                      <ReferenceLine y={0} stroke="#444" strokeDasharray="3 3" />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                      <Line type="monotone" dataKey="external" name="External" stroke="#4f8ffc" strokeWidth={2} dot={false} connectNulls />
                      <Line type="monotone" dataKey="internal" name="Internal" stroke="#ff6b9d" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ color: '#555', padding: '2rem 0', textAlign: 'center' }}>No timeline data available</div>
              )}

              {/* Key Topics */}
              {data.analysis?.keyTopics && (
                <>
                  <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Key Topics</h3>
                  <div className="key-topics">
                    <div className="topics-col">
                      <div className="topics-heading"><span className="topics-dot internal" />Internal</div>
                      {(data.analysis.keyTopics.internal || []).map((t, i) => (
                        <span key={i} className="topic-tag internal">{t}</span>
                      ))}
                    </div>
                    <div className="topics-col">
                      <div className="topics-heading"><span className="topics-dot external" />External</div>
                      {(data.analysis.keyTopics.external || []).map((t, i) => (
                        <span key={i} className="topic-tag external">{t}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Country Context */}
              {data.analysis?.context && (
                <>
                  <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Context</h3>
                  <div className="country-context">
                    {data.analysis.context}
                  </div>
                  {data.analysis.summary && (
                    <div className="country-summary">
                      {data.analysis.summary}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Articles tabs */}
          {(tab === 'internal' || tab === 'external') && (
            <div className="detail-section">
              <h3 className="section-title">
                {tab === 'internal' ? 'Local Media Coverage' : 'International Coverage'}
              </h3>
              <div className="articles-list">
                {(data[tab]?.articles || []).map((a, i) => (
                  <div key={i} className="article">
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="article-title">
                      {a.title}
                    </a>
                    <div className="article-meta">
                      <span className="article-source">{a.source}</span>
                    </div>
                  </div>
                ))}
                {(!data[tab]?.articles?.length) && (
                  <div style={{ color: '#555', padding: '2rem 0', textAlign: 'center' }}>No articles available</div>
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
