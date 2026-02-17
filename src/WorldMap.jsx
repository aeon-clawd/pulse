import { useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import ISO_NUMERIC_TO_ALPHA2 from './isoMapping';
import { useI18n } from './i18n.jsx';

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const CONTINENT_VIEWS = {
  world:   { center: [10, 20], zoom: 1 },
  africa:  { center: [20, 5], zoom: 2.2 },
  americas:{ center: [-80, 10], zoom: 1.8 },
  asia:    { center: [90, 30], zoom: 2 },
  europe:  { center: [15, 52], zoom: 3.5 },
  oceania: { center: [140, -25], zoom: 3 },
};

function WorldMap({ sentimentData, getCountryColor, getTooltipExtra, onCountryClick, continent = 'world', lang }) {
  const { t } = useI18n();
  const [tooltip, setTooltip] = useState(null);
  const view = CONTINENT_VIEWS[continent] || CONTINENT_VIEWS.world;

  const getDisplayName = (data, geoName) => {
    if (!data) return geoName;
    return lang === 'es' ? (data.name_es || data.name || geoName) : (data.name || geoName);
  };

  return (
    <>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 147 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          center={view.center}
          zoom={view.zoom}
          minZoom={1}
          maxZoom={6}
          translateExtent={[[-200, -100], [1000, 600]]}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const code = ISO_NUMERIC_TO_ALPHA2[geo.id] || ISO_NUMERIC_TO_ALPHA2[String(parseInt(geo.id, 10))];
                const data = code ? sentimentData[code] : null;
                const geoName = geo.properties?.name || '';
                const fill = getCountryColor(data);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#0a0a0f"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: 'none', transition: 'fill 0.3s' },
                      hover: {
                        fill: data ? '#ffffff' : '#1a1a2a',
                        outline: 'none',
                        cursor: data ? 'pointer' : 'default',
                        strokeWidth: data ? 1 : 0.4,
                        stroke: data ? '#4f8ffc' : '#0a0a0f',
                      },
                      pressed: { outline: 'none' }
                    }}
                    onMouseEnter={(e) => {
                      const name = getDisplayName(data, geoName);
                      if (name) {
                        setTooltip({ x: e.clientX, y: e.clientY, data: data ? { ...data, displayName: name } : { displayName: name }, noData: !data });
                      }
                    }}
                    onMouseMove={(e) => {
                      if (tooltip) setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => {
                      if (code && data) onCountryClick(code);
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {tooltip && (
        <div className="tooltip" style={{ left: tooltip.x + 15, top: tooltip.y - 10 }}>
          <div className="tooltip-name">{tooltip.data?.displayName || ''}</div>
          <div className="tooltip-info">
            {tooltip.noData ? t('noData')
              : !tooltip.data?.lastUpdated ? t('pending')
              : getTooltipExtra(tooltip.data)}
          </div>
        </div>
      )}
    </>
  );
}

export default WorldMap;
