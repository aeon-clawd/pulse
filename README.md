# SensMundi - Interactive World Sentiment Map

**Sentire Mundum — Feel the world**

An interactive web application that visualizes real-time news sentiment across the globe using GDELT data.

## Features

- **Interactive World Map**: Click any country to see detailed sentiment analysis
- **Real-time GDELT Integration**: Fetches latest news sentiment data
- **Visual Sentiment Gradient**: Countries colored from red (negative) to green (positive)
- **Country Details**: View tone timeline, recent articles, and sentiment scores
- **30-minute Cache**: Optimized performance with in-memory caching

## Tech Stack

- **Backend**: Express.js (Node.js)
- **Frontend**: React + Vite
- **Data**: GDELT DOC 2.0 API
- **Maps**: react-simple-maps + TopoJSON
- **Charts**: Recharts

## Installation

```bash
cd /home/ubuntu/projects/sensmundi
npm install
npm run build
```

## Running

### Development
```bash
npm run dev  # Frontend on port 5173
node server.js  # Backend on port 3300
```

### Production
```bash
npm run build
npm start
```

### Systemd Service
```bash
systemctl --user start sensmundi.service
systemctl --user status sensmundi.service
systemctl --user stop sensmundi.service
```

## API Endpoints

- `GET /api/sentiment` - Get sentiment data for all tracked countries
- `GET /api/country/:code` - Get detailed sentiment data for a specific country (e.g., `/api/country/US`)

## Port

- Production: http://localhost:3300

## Color Scale

- **Very Negative** (< -5): Deep Red (#ff1744)
- **Negative** (-5 to -2): Red (#ff5252)
- **Slightly Negative** (-2 to -0.5): Orange (#ff9100)
- **Neutral** (-0.5 to 0.5): Gray (#607080)
- **Slightly Positive** (0.5 to 2): Light Green (#69f0ae)
- **Positive** (2 to 5): Green (#00e676)
- **Very Positive** (> 5): Deep Green (#00c853)

## Tracked Countries (50)

US, CN, RU, GB, DE, FR, JP, IN, BR, AU, CA, KR, MX, IT, ES, TR, SA, IR, IL, UA, PL, NL, SE, NO, AR, CO, EG, NG, ZA, ID, TH, VN, PK, BD, PH, MY, TW, SG, AE, QA, IQ, SY, AF, KE, ET, MM, VE, CL, PE, CU

## Notes

- GDELT data updates every 15 minutes
- Sentiment cache TTL: 30 minutes
- Rate limiting: ~2.5 requests/second to GDELT API
- First load may take 20-30 seconds to fetch all country data
