import { useState, useEffect } from 'react';
import WorldMap from './WorldMap';
import CountryDetail from './CountryDetail';
import { useI18n } from './i18n.jsx';

function SubscribeBanner({ lang, t }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // null | 'ok' | 'already' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const API = import.meta.env.VITE_API_URL || '';
      const r = await fetch(`${API}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang })
      });
      const data = await r.json();
      if (data.ok) setStatus(data.already ? 'already' : 'ok');
      else setStatus('error');
    } catch { setStatus('error'); }
  };

  if (status === 'ok' || status === 'already') {
    return (
      <div className="subscribe-banner">
        <span className="subscribe-check">✓</span>
        <span>{status === 'ok' ? t('subscribeOk') : t('subscribeAlready')}</span>
      </div>
    );
  }

  return (
    <div className="subscribe-banner">
      <div className="subscribe-text">
        <strong>{t('subscribeTitle')}</strong>
        <span>{t('subscribeDesc')}</span>
      </div>
      <form className="subscribe-form" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('subscribePlaceholder')}
          required
          className="subscribe-input"
        />
        <button type="submit" className="subscribe-btn">{t('subscribeBtn')}</button>
      </form>
      {status === 'error' && <span className="subscribe-error">{t('subscribeError')}</span>}
    </div>
  );
}

function App() {
  const { lang, toggleLang, t } = useI18n();
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mode, setMode] = useState('dissonance');
  const [continent, setContinent] = useState('world');
  const [showAbout, setShowAbout] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('sensmundi-about-seen');
    }
    return true;
  });

  const MODES = {
    dissonance: { label: t('modeDissonance'), desc: t('modeDescDissonance') },
    internal: { label: t('modeInternal'), desc: t('modeDescInternal') },
    external: { label: t('modeExternal'), desc: t('modeDescExternal') },
  };

  useEffect(() => { fetchSentiment(); }, []);

  const fetchSentiment = async () => {
    try {
      setLoading(true);
      const API = import.meta.env.VITE_API_URL || '';
      const r = await fetch(`${API}/api/sentiment`);
      const data = await r.json();
      setSentimentData(data.countries || {});
      setLastUpdated(data.timestamp ? new Date(data.timestamp) : new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getToneColor = (tone) => {
    if (tone < -5) return '#ff1744';
    if (tone < -2) return '#ff5252';
    if (tone < -0.5) return '#ff9100';
    if (tone < 0.5) return '#607080';
    if (tone < 2) return '#69f0ae';
    if (tone < 5) return '#00e676';
    return '#00c853';
  };

  const getDissonanceColor = (d) => {
    if (d < 0.5) return '#1a3a5c';
    if (d < 1) return '#2a5a8c';
    if (d < 2) return '#6a5acd';
    if (d < 3) return '#9b59b6';
    if (d < 5) return '#e74c8b';
    return '#ff1744';
  };

  const getCountryColor = (countryData) => {
    if (!countryData) return '#111118';
    if (!countryData.lastUpdated) return '#111118';
    if (mode === 'dissonance') return getDissonanceColor(countryData.dissonance || 0);
    if (mode === 'internal') return getToneColor(countryData.internal?.tone || 0);
    if (mode === 'external') return getToneColor(countryData.external?.tone || 0);
    return '#607080';
  };

  const getSentimentWord = (tone) => {
    if (tone <= -3) return t('critical');
    if (tone <= -1.5) return t('negative');
    if (tone < 1.5) return t('neutral');
    if (tone < 3) return t('positive');
    return t('optimistic');
  };

  const getTooltipExtra = (d) => {
    if (!d) return '';
    const name = lang === 'es' ? (d.name_es || d.name) : d.name;
    if (mode === 'dissonance') {
      const dis = d.dissonance || 0;
      const label = dis < 0.5 ? t('aligned') : dis < 1 ? t('lowDivergence') : dis < 2 ? t('moderateDivergence') : dis < 3 ? t('highDivergence') : t('extremeDivergence');
      return `${label} · ${t('modeInternal')}: ${getSentimentWord(d.internal?.tone||0)} / ${t('modeExternal')}: ${getSentimentWord(d.external?.tone||0)}`;
    }
    if (mode === 'internal') {
      const tone = d.internal?.tone || 0;
      return `${getSentimentWord(tone)} (${tone > 0 ? '+' : ''}${tone.toFixed(1)})`;
    }
    const tone = d.external?.tone || 0;
    return `${getSentimentWord(tone)} (${tone > 0 ? '+' : ''}${tone.toFixed(1)})`;
  };

  const globalSentiment = (() => {
    if (!sentimentData) return null;
    const tones = Object.values(sentimentData)
      .filter(d => d.lastUpdated && d.internal?.tone != null)
      .map(d => d.internal.tone);
    if (!tones.length) return null;
    return tones.reduce((a, b) => a + b, 0) / tones.length;
  })();

  const getGlobalLabel = (tone) => {
    if (tone == null) return '';
    if (tone <= -3) return t('critical');
    if (tone <= -1.5) return t('negative');
    if (tone < 1.5) return t('neutral');
    if (tone < 3) return t('positive');
    return t('optimistic');
  };

  const legendItems = mode === 'dissonance'
    ? [
        { color: '#1a3a5c', label: t('aligned') },
        { color: '#2a5a8c', label: t('lowGap') },
        { color: '#6a5acd', label: t('moderate') },
        { color: '#9b59b6', label: t('highGap') },
        { color: '#e74c8b', label: t('veryHigh') },
        { color: '#ff1744', label: t('extreme') },
      ]
    : [
        { color: '#ff1744', label: t('critical') },
        { color: '#ff9100', label: t('negative') },
        { color: '#607080', label: t('neutral') },
        { color: '#69f0ae', label: t('positive') },
        { color: '#00c853', label: t('optimistic') },
      ];

  const continents = ['world','africa','americas','asia','europe','oceania'];

  return (
    <>
      <div className="header">
        <div className="title-row">
          <div className="brand">
            <div className="brand-icon">◉</div>
            <div>
              <h1 className="title">Pul<span className="title-accent">se</span></h1>
              <p className="subtitle">{t('brandSubtitle')}</p>
            </div>
          </div>
          {globalSentiment != null && (
            <div className="global-thermo">
              <div className="thermo-label">{t('globalPulse')}</div>
              <div className="thermo-bar">
                <div className="thermo-track">
                  <div className="thermo-indicator" style={{ left: `${Math.max(0, Math.min(100, ((globalSentiment + 5) / 10) * 100))}%` }} />
                </div>
                <div className="thermo-value" style={{ color: getToneColor(globalSentiment) }}>
                  {getGlobalLabel(globalSentiment)}
                </div>
              </div>
            </div>
          )}
          <div className="header-right">
            <button className="info-btn" onClick={() => setShowAbout(true)} title="About Pulse">
              i
            </button>
            <button className="lang-toggle" onClick={toggleLang} title={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}>
              <img src={lang === 'en' ? 'https://flagcdn.com/w40/es.png' : 'https://flagcdn.com/w40/gb.png'} alt="" style={{ width: 24, height: 'auto', borderRadius: 2, verticalAlign: 'middle' }} />
            </button>
            <div className="mode-toggle">
              {Object.entries(MODES).map(([key, { label }]) => (
                <button
                  key={key}
                  className={`mode-btn ${mode === key ? 'active' : ''}`}
                  onClick={() => setMode(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {lastUpdated && (
              <div className="last-updated">
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
              </div>
            )}
          </div>
        </div>

        <div className="controls-row">
          <div className="mode-desc">{MODES[mode].desc}</div>
          <div className="legend">
            {legendItems.map((item, i) => (
              <div key={i} className="legend-item">
                <div className="legend-color" style={{ background: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="continent-nav">
        {continents.map(c => (
          <button key={c} className={`continent-btn ${continent === c ? 'active' : ''}`} onClick={() => setContinent(c)}>
            {t(c)}
          </button>
        ))}
      </div>
      <div className="map-container">
        {loading && (
          <div className="loading">
            <div className="loading-spinner" />
            <div>{t('loadingText')}</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#555' }}>{t('loadingSubtext')}</div>
          </div>
        )}
        {!loading && sentimentData && (
          <WorldMap
            sentimentData={sentimentData}
            getCountryColor={getCountryColor}
            getTooltipExtra={getTooltipExtra}
            onCountryClick={setSelectedCountry}
            continent={continent}
            lang={lang}
          />
        )}
      </div>

      <CountryDetail
        country={selectedCountry}
        onClose={() => setSelectedCountry(null)}
        getToneColor={getToneColor}
        getDissonanceColor={getDissonanceColor}
        lang={lang}
      />

      <SubscribeBanner lang={lang} t={t} />

      {showAbout && (
        <div className="about-overlay" onClick={() => { setShowAbout(false); localStorage.setItem('sensmundi-about-seen', '1'); }}>
          <div className="about-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => { setShowAbout(false); localStorage.setItem('sensmundi-about-seen', '1'); }}>×</button>
            <div className="about-icon">◉</div>
            <h2 className="about-title">Pul<span className="title-accent">se</span></h2>
            {lang === 'en' ? (
              <>
                <p className="about-text">
                  Pulse is a real-time emotional map of the world. It visualizes how every country <em>feels</em> — both from the inside (local media) and the outside (international coverage).
                </p>
                <p className="about-text">
                  The key insight is <strong>dissonance</strong>: the gap between how a country sees itself and how the world sees it. High dissonance often signals tension, propaganda, or misunderstanding between cultures.
                </p>
                <h3 className="about-subtitle">How it works</h3>
                <ul className="about-list">
                  <li><strong>Internal sentiment</strong> — Aggregated tone from local media sources within each country</li>
                  <li><strong>External sentiment</strong> — How international media covers that country</li>
                  <li><strong>Dissonance index</strong> — The difference between internal and external perception</li>
                </ul>
                <p className="about-text">
                  Data is sourced from <strong>GDELT</strong> (Global Database of Events, Language, and Tone), which monitors news media worldwide in 65+ languages. Sentiment is updated continuously across all 195 countries.
                </p>
                <h3 className="about-subtitle">Why it matters</h3>
                <p className="about-text">
                  Understanding how different regions feel — and the gap between self-perception and outside perception — is the first step toward global empathy. Pulse makes the invisible emotional landscape of our world visible.
                </p>
              </>
            ) : (
              <>
                <p className="about-text">
                  Pulse es un mapa emocional del mundo en tiempo real. Visualiza cómo <em>se siente</em> cada país — tanto desde dentro (medios locales) como desde fuera (cobertura internacional).
                </p>
                <p className="about-text">
                  La clave es la <strong>disonancia</strong>: la brecha entre cómo un país se ve a sí mismo y cómo lo ve el mundo. Una disonancia alta suele señalar tensión, propaganda o incomprensión entre culturas.
                </p>
                <h3 className="about-subtitle">Cómo funciona</h3>
                <ul className="about-list">
                  <li><strong>Sentimiento interno</strong> — Tono agregado de los medios locales de cada país</li>
                  <li><strong>Sentimiento externo</strong> — Cómo los medios internacionales cubren ese país</li>
                  <li><strong>Índice de disonancia</strong> — La diferencia entre la percepción interna y externa</li>
                </ul>
                <p className="about-text">
                  Los datos provienen de <strong>GDELT</strong> (Global Database of Events, Language, and Tone), que monitoriza medios de comunicación en todo el mundo en más de 65 idiomas. El sentimiento se actualiza continuamente para los 195 países.
                </p>
                <h3 className="about-subtitle">Por qué importa</h3>
                <p className="about-text">
                  Entender cómo se sienten las distintas regiones — y la brecha entre autopercepción y percepción externa — es el primer paso hacia la empatía global. Pulse hace visible el paisaje emocional invisible de nuestro mundo.
                </p>
              </>
            )}
            <div className="about-footer">
              <a href="https://aeoninfinitive.com" target="_blank" rel="noopener noreferrer">Aeon Infinitive</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
