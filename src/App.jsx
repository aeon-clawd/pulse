import { useState, useEffect } from 'react';
import WorldMap from './WorldMap';
import CountryDetail from './CountryDetail';

const MODES = {
  dissonance: { label: 'Dissonance', desc: 'Gap between internal and external perception' },
  internal: { label: 'Internal', desc: 'How local media feel' },
  external: { label: 'External', desc: 'How the world sees them' },
};

function App() {
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mode, setMode] = useState('dissonance');
  const [continent, setContinent] = useState('world');

  useEffect(() => { fetchSentiment(); }, []);

  const fetchSentiment = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/sentiment`);
      const data = await r.json();
      setSentimentData(data.countries || {});
      setLastUpdated(data.timestamp ? new Date(data.timestamp) : new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Tone color: negative red → neutral gray → positive green
  const getToneColor = (tone) => {
    if (tone < -5) return '#ff1744';
    if (tone < -2) return '#ff5252';
    if (tone < -0.5) return '#ff9100';
    if (tone < 0.5) return '#607080';
    if (tone < 2) return '#69f0ae';
    if (tone < 5) return '#00e676';
    return '#00c853';
  };

  // Dissonance color: low (blue/calm) → high (purple/red hot)
  const getDissonanceColor = (d) => {
    if (d < 0.5) return '#1a3a5c';   // very low — dark blue
    if (d < 1) return '#2a5a8c';     // low — blue
    if (d < 2) return '#6a5acd';     // moderate — purple
    if (d < 3) return '#9b59b6';     // high — vivid purple
    if (d < 5) return '#e74c8b';     // very high — magenta
    return '#ff1744';                 // extreme — red
  };

  // Get the color for a country based on current mode
  const getCountryColor = (countryData) => {
    if (!countryData) return '#111118';
    // No GDELT data yet — dark gray
    if (!countryData.lastUpdated) return '#111118';
    if (mode === 'dissonance') return getDissonanceColor(countryData.dissonance || 0);
    if (mode === 'internal') return getToneColor(countryData.internal?.tone || 0);
    if (mode === 'external') return getToneColor(countryData.external?.tone || 0);
    return '#607080';
  };

  const getSentimentWord = (tone) => {
    if (tone <= -3) return 'Critical';
    if (tone <= -1.5) return 'Negative';
    if (tone < 1.5) return 'Neutral';
    if (tone < 3) return 'Positive';
    return 'Optimistic';
  };

  // Get tooltip text based on mode
  const getTooltipExtra = (d) => {
    if (!d) return '';
    if (mode === 'dissonance') {
      const dis = d.dissonance || 0;
      const label = dis < 0.5 ? 'Aligned' : dis < 1 ? 'Low divergence' : dis < 2 ? 'Moderate divergence' : dis < 3 ? 'High divergence' : 'Extreme divergence';
      return `${label} · Int: ${getSentimentWord(d.internal?.tone||0)} / Ext: ${getSentimentWord(d.external?.tone||0)}`;
    }
    if (mode === 'internal') {
      const t = d.internal?.tone || 0;
      return `${getSentimentWord(t)} (${t > 0 ? '+' : ''}${t.toFixed(1)})`;
    }
    const t = d.external?.tone || 0;
    return `${getSentimentWord(t)} (${t > 0 ? '+' : ''}${t.toFixed(1)})`;
  };

  // Global sentiment thermometer (average of internal tones)
  const globalSentiment = (() => {
    if (!sentimentData) return null;
    const tones = Object.values(sentimentData)
      .filter(d => d.lastUpdated && d.internal?.tone != null)
      .map(d => d.internal.tone);
    if (!tones.length) return null;
    return tones.reduce((a, b) => a + b, 0) / tones.length;
  })();

  const getGlobalLabel = (t) => {
    if (t == null) return '';
    if (t <= -3) return 'Critical';
    if (t <= -1.5) return 'Negative';
    if (t < -0.3) return 'Slightly Negative';
    if (t < 0.3) return 'Neutral';
    if (t < 1.5) return 'Slightly Positive';
    if (t < 3) return 'Positive';
    return 'Optimistic';
  };

  const legendItems = mode === 'dissonance'
    ? [
        { color: '#1a3a5c', label: 'Aligned' },
        { color: '#2a5a8c', label: 'Low gap' },
        { color: '#6a5acd', label: 'Moderate' },
        { color: '#9b59b6', label: 'High gap' },
        { color: '#e74c8b', label: 'Very high' },
        { color: '#ff1744', label: 'Extreme' },
      ]
    : [
        { color: '#ff1744', label: 'Critical' },
        { color: '#ff9100', label: 'Negative' },
        { color: '#607080', label: 'Neutral' },
        { color: '#69f0ae', label: 'Positive' },
        { color: '#00c853', label: 'Optimistic' },
      ];

  return (
    <>
      <div className="header">
        <div className="title-row">
          <div className="brand">
            <div className="brand-icon">◉</div>
            <div>
              <h1 className="title">Sens<span className="title-accent">Mundi</span></h1>
              <p className="subtitle">Global Sentiment Intelligence</p>
            </div>
          </div>
          {globalSentiment != null && (
            <div className="global-thermo">
              <div className="thermo-label">Global Pulse</div>
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
        {['world','africa','americas','asia','europe','oceania'].map(c => (
          <button key={c} className={`continent-btn ${continent === c ? 'active' : ''}`} onClick={() => setContinent(c)}>
            {c === 'world' ? '🌍' : c === 'africa' ? 'Africa' : c === 'americas' ? 'Americas' : c === 'asia' ? 'Asia' : c === 'europe' ? 'Europe' : 'Oceania'}
          </button>
        ))}
      </div>
      <div className="map-container">
        {loading && (
          <div className="loading">
            <div className="loading-spinner" />
            <div>Loading sentiment data for 50 countries...</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#555' }}>This may take 30-60 seconds on first load</div>
          </div>
        )}
        {!loading && sentimentData && (
          <WorldMap
            sentimentData={sentimentData}
            getCountryColor={getCountryColor}
            getTooltipExtra={getTooltipExtra}
            onCountryClick={setSelectedCountry}
            continent={continent}
          />
        )}
      </div>

      <CountryDetail
        country={selectedCountry}
        onClose={() => setSelectedCountry(null)}
        getToneColor={getToneColor}
        getDissonanceColor={getDissonanceColor}
      />
    </>
  );
}

export default App;
