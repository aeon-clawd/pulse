import express from 'express';
import cors from 'cors';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3300;

app.use(cors());
app.use(express.json());

// --- Database ---
const DB_PATH = path.join(__dirname, 'pipeline', 'sensmundi.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma('journal_mode = WAL');
  }
  return db;
}

// --- API ---

// All countries sentiment (for map)
app.get('/api/sentiment', (req, res) => {
  const d = getDb();
  const rows = d.prepare(`
    SELECT c.code, c.name, c.name_es, c.region,
           s.tone_internal, s.tone_external, s.dissonance,
           s.article_count_internal, s.article_count_external,
           s.timeline_internal, s.timeline_external,
           c.last_updated
    FROM countries c
    LEFT JOIN sentiment s ON s.country_code = c.code
  `).all();

  const countries = {};
  for (const r of rows) {
    countries[r.code] = {
      name: r.name,
      name_es: r.name_es,
      region: r.region,
      internal: {
        tone: r.tone_internal || 0,
        articleCount: r.article_count_internal || 0,
        timeline: r.timeline_internal ? JSON.parse(r.timeline_internal) : []
      },
      external: {
        tone: r.tone_external || 0,
        articleCount: r.article_count_external || 0,
        timeline: r.timeline_external ? JSON.parse(r.timeline_external) : []
      },
      dissonance: r.dissonance || 0,
      tone: r.tone_external || 0,
      articleCount: (r.article_count_internal || 0) + (r.article_count_external || 0),
      lastUpdated: r.last_updated
    };
  }

  res.json({ countries, count: rows.length });
});

// Country detail with articles
app.get('/api/country/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const d = getDb();

  const country = d.prepare(`
    SELECT c.code, c.name, c.name_es, c.region,
           s.tone_internal, s.tone_external, s.dissonance,
           s.article_count_internal, s.article_count_external,
           s.timeline_internal, s.timeline_external,
           c.last_updated
    FROM countries c
    LEFT JOIN sentiment s ON s.country_code = c.code
    WHERE c.code = ?
  `).get(code);

  if (!country) {
    return res.status(404).json({ error: 'Country not found' });
  }

  // Fetch latest analysis
  const analysis = d.prepare(`
    SELECT summary_en, summary_es, key_topics, tension_level, context, model, timestamp
    FROM analyses
    WHERE country_code = ?
    ORDER BY timestamp DESC
    LIMIT 1
  `).get(code);

  // Fetch articles
  const articles = d.prepare(`
    SELECT url, title, title_es, title_en, source, published, language, source_type, tone
    FROM articles
    WHERE country_code = ?
    ORDER BY fetched_at DESC
    LIMIT 50
  `).all(code);

  const intArticles = articles.filter(a => a.source_type === 'internal');
  const extArticles = articles.filter(a => a.source_type === 'external');

  res.json({
    code: country.code,
    name: country.name,
    name_es: country.name_es,
    region: country.region,
    lastUpdated: country.last_updated,
    internal: {
      tone: country.tone_internal || 0,
      articleCount: country.article_count_internal || 0,
      timeline: country.timeline_internal ? JSON.parse(country.timeline_internal) : [],
      articles: intArticles.map(a => ({ title: a.title, title_es: a.title_es, title_en: a.title_en, url: a.url, source: a.source, date: a.published, language: a.language }))
    },
    external: {
      tone: country.tone_external || 0,
      articleCount: country.article_count_external || 0,
      timeline: country.timeline_external ? JSON.parse(country.timeline_external) : [],
      articles: extArticles.map(a => ({ title: a.title, title_es: a.title_es, title_en: a.title_en, url: a.url, source: a.source, date: a.published, language: a.language }))
    },
    dissonance: country.dissonance || 0,
    analysis: analysis ? {
      summary: analysis.summary_en,
      keyTopics: analysis.key_topics ? JSON.parse(analysis.key_topics) : null,
      tensionLevel: analysis.tension_level,
      context: analysis.context,
      model: analysis.model,
      date: analysis.timestamp
    } : null
  });
});

// Serve static frontend
app.use(express.static(path.join(__dirname, 'dist')));
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`SensMundi server running on http://localhost:${PORT}`);
  const d = getDb();
  const count = d.prepare("SELECT count(*) as n FROM countries WHERE last_updated IS NOT NULL").get();
  console.log(`Database: ${count.n} countries with data`);
});
