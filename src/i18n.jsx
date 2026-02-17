import { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    // Header
    brandSubtitle: 'Global Sentiment Intelligence',
    globalPulse: 'Global Pulse',
    
    // Modes
    modeDissonance: 'Dissonance',
    modeInternal: 'Internal',
    modeExternal: 'External',
    modeDescDissonance: 'Gap between internal and external perception',
    modeDescInternal: 'How local media feel',
    modeDescExternal: 'How the world sees them',

    // Legend - Dissonance
    aligned: 'Aligned',
    lowGap: 'Low gap',
    moderate: 'Moderate',
    highGap: 'High gap',
    veryHigh: 'Very high',
    extreme: 'Extreme',

    // Legend - Tone
    critical: 'Critical',
    negative: 'Negative',
    neutral: 'Neutral',
    positive: 'Positive',
    optimistic: 'Optimistic',

    // Tooltip
    noData: 'No data available',
    pending: 'Pending...',
    lowDivergence: 'Low divergence',
    moderateDivergence: 'Moderate divergence',
    highDivergence: 'High divergence',
    extremeDivergence: 'Extreme divergence',

    // Continents
    world: '🌍',
    africa: 'Africa',
    americas: 'Americas',
    asia: 'Asia',
    europe: 'Europe',
    oceania: 'Oceania',

    // Loading
    loadingText: 'Loading sentiment data...',
    loadingSubtext: 'This may take a few seconds',

    // Country Detail
    dissonance: 'dissonance',
    internal: 'Internal',
    external: 'External',
    localMedia: 'Local media sentiment',
    internationalMedia: 'International media sentiment',
    overview: 'Overview',
    internalNews: 'Internal News',
    externalNews: 'External News',
    timelineTitle: 'Sentiment Timeline (3 months)',
    noTimeline: 'No timeline data available',
    keyTopics: 'Key Topics',
    context: 'Context',
    localCoverage: 'Local Media Coverage',
    internationalCoverage: 'International Coverage',
    noArticles: 'No articles available',
    loading: 'Loading...',

    // Sentiment labels
    sentCritical: 'Critical',
    sentCriticalDesc: 'Conflict, crisis, strong criticism',
    sentNegative: 'Negative',
    sentNegativeDesc: 'Tension, concern, criticism',
    sentNeutral: 'Neutral',
    sentNeutralDesc: 'Balanced, factual coverage',
    sentPositive: 'Positive',
    sentPositiveDesc: 'Progress, cooperation, growth',
    sentOptimistic: 'Optimistic',
    sentOptimisticDesc: 'Strong praise, celebration',

    // Subscribe
    subscribeTitle: 'Weekly Pulse Report',
    subscribeDesc: 'Get the top 5 geopolitical shifts delivered to your inbox every Monday.',
    subscribePlaceholder: 'your@email.com',
    subscribeBtn: 'Subscribe',
    subscribeOk: 'You\'re in! First report arrives Monday.',
    subscribeAlready: 'You\'re already subscribed!',
    subscribeError: 'Something went wrong. Try again.',

    // Dissonance labels
    disAligned: 'Aligned',
    disAlignedDesc: 'Internal and external narratives converge',
    disLow: 'Low divergence',
    disLowDesc: 'Minor differences in perception',
    disModerate: 'Moderate divergence',
    disModerateDesc: 'Notable gap between internal and external views',
    disHigh: 'High divergence',
    disHighDesc: 'Significantly different narratives',
    disExtreme: 'Extreme divergence',
    disExtremeDesc: 'Opposing internal vs external perception',
  },
  es: {
    // Header
    brandSubtitle: 'Inteligencia de Sentimiento Global',
    globalPulse: 'Pulso Global',

    // Modes
    modeDissonance: 'Disonancia',
    modeInternal: 'Interno',
    modeExternal: 'Externo',
    modeDescDissonance: 'Brecha entre percepción interna y externa',
    modeDescInternal: 'Cómo se sienten los medios locales',
    modeDescExternal: 'Cómo el mundo los ve',

    // Legend - Dissonance
    aligned: 'Alineado',
    lowGap: 'Baja brecha',
    moderate: 'Moderada',
    highGap: 'Alta brecha',
    veryHigh: 'Muy alta',
    extreme: 'Extrema',

    // Legend - Tone
    critical: 'Crítico',
    negative: 'Negativo',
    neutral: 'Neutral',
    positive: 'Positivo',
    optimistic: 'Optimista',

    // Tooltip
    noData: 'Sin datos disponibles',
    pending: 'Pendiente...',
    lowDivergence: 'Divergencia baja',
    moderateDivergence: 'Divergencia moderada',
    highDivergence: 'Divergencia alta',
    extremeDivergence: 'Divergencia extrema',

    // Continents
    world: '🌍',
    africa: 'África',
    americas: 'Américas',
    asia: 'Asia',
    europe: 'Europa',
    oceania: 'Oceanía',

    // Loading
    loadingText: 'Cargando datos de sentimiento...',
    loadingSubtext: 'Puede tardar unos segundos',

    // Country Detail
    dissonance: 'disonancia',
    internal: 'Interno',
    external: 'Externo',
    localMedia: 'Sentimiento de medios locales',
    internationalMedia: 'Sentimiento de medios internacionales',
    overview: 'Resumen',
    internalNews: 'Noticias Internas',
    externalNews: 'Noticias Externas',
    timelineTitle: 'Línea temporal de sentimiento (3 meses)',
    noTimeline: 'Sin datos de línea temporal',
    keyTopics: 'Temas Clave',
    context: 'Contexto',
    localCoverage: 'Cobertura de Medios Locales',
    internationalCoverage: 'Cobertura Internacional',
    noArticles: 'Sin artículos disponibles',
    loading: 'Cargando...',

    // Sentiment labels
    sentCritical: 'Crítico',
    sentCriticalDesc: 'Conflicto, crisis, críticas fuertes',
    sentNegative: 'Negativo',
    sentNegativeDesc: 'Tensión, preocupación, críticas',
    sentNeutral: 'Neutral',
    sentNeutralDesc: 'Cobertura equilibrada y factual',
    sentPositive: 'Positivo',
    sentPositiveDesc: 'Progreso, cooperación, crecimiento',
    sentOptimistic: 'Optimista',
    sentOptimisticDesc: 'Elogios fuertes, celebración',

    // Subscribe
    subscribeTitle: 'Informe Semanal Pulse',
    subscribeDesc: 'Recibe los 5 cambios geopolíticos más relevantes en tu email cada lunes.',
    subscribePlaceholder: 'tu@email.com',
    subscribeBtn: 'Suscribirse',
    subscribeOk: '¡Estás dentro! El primer informe llega el lunes.',
    subscribeAlready: '¡Ya estás suscrito!',
    subscribeError: 'Algo falló. Inténtalo de nuevo.',

    // Dissonance labels
    disAligned: 'Alineado',
    disAlignedDesc: 'Las narrativas interna y externa convergen',
    disLow: 'Divergencia baja',
    disLowDesc: 'Diferencias menores en percepción',
    disModerate: 'Divergencia moderada',
    disModerateDesc: 'Brecha notable entre visión interna y externa',
    disHigh: 'Divergencia alta',
    disHighDesc: 'Narrativas significativamente diferentes',
    disExtreme: 'Divergencia extrema',
    disExtremeDesc: 'Percepción interna vs externa opuesta',
  }
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sensmundi-lang') || (navigator.language?.startsWith('es') ? 'es' : 'en');
    }
    return 'en';
  });

  const toggleLang = () => {
    const next = lang === 'en' ? 'es' : 'en';
    setLang(next);
    localStorage.setItem('sensmundi-lang', next);
  };

  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;

  return (
    <I18nContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
