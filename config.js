// config.js
//
// Edit TOPICS to add/remove sources. Each topic has:
//   rss            -- list of RSS feed URLs (free, no API key needed)
//   gnewsQueries   -- search queries run against the GNews API (used mainly
//                     for AP/Reuters-style wire coverage, since those two
//                     killed their public RSS feeds)
//   maxItems       -- how many curated stories to include in the digest
//
// NOTE ON SOURCE VERIFICATION:
// Some feed URLs below were verified working as of June 2026; others are
// best-effort and should be confirmed once before relying on them. The
// fetch step (fetch.js) logs any feed that fails or returns zero items
// so you can spot dead links quickly rather than silently losing coverage.

import 'dotenv/config';

// ---------------------------------------------------------------------------
// API keys / secrets (set as environment variables -- see .env.example and
// README.md. Never hardcode real keys in this file.)
// ---------------------------------------------------------------------------
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
export const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
export const RESEND_API_KEY = process.env.RESEND_API_KEY;

export const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;          // where the digest goes (Gmail address)
export const SENDER_EMAIL = process.env.SENDER_EMAIL || 'digest@yourdomain.com'; // must be verified in Resend

// Claude model used for filtering/ranking/summarizing
export const CLAUDE_MODEL = 'claude-sonnet-4-6';

// ---------------------------------------------------------------------------
// Local context (used for the weather alert lookup)
// ---------------------------------------------------------------------------
// NWS uses UGC zone/county codes, not city names. GAC135 is Gwinnett County, GA.
// Verify at: https://api.weather.gov/zones?type=county&area=GA
export const NWS_COUNTY_CODE = 'GAC135';

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------
export const TOPICS = {

  sports: {
    label: 'Sports: NBA, NFL (Commanders), MLB (Braves), MLS (Atlanta United), Track & Field, International Soccer',
    rss: [
      'https://www.espn.com/espn/rss/nba/news',
      'https://www.espn.com/espn/rss/nfl/news',
      'https://www.espn.com/espn/rss/mlb/news',
      'https://www.espn.com/espn/rss/soccer/news',
      'http://feeds.bbci.co.uk/sport/football/rss.xml',
      'https://worldathletics.org/rss/news',
    ],
    gnewsQueries: ['Washington Commanders', 'Atlanta Braves', 'Atlanta United'],
    maxItems: 8,
    soccerExplainer: true, // appends a rotating "Soccer 101" explainer to this section
  },

  technology: {
    label: 'Technology: AI/ML trends & research, new releases, top tech news',
    rss: [
      'https://techcrunch.com/feed/',
      'https://www.theverge.com/rss/index.xml',
      'https://feeds.arstechnica.com/arstechnica/index',
      'https://www.technologyreview.com/feed/',
    ],
    gnewsQueries: ['artificial intelligence research'],
    maxItems: 6,
  },

  finance: {
    label: 'Finance: stock market state, geopolitical market impact, sentiment, crypto',
    rss: [
      'https://www.marketwatch.com/rss/topstories',
      'https://www.coindesk.com/arc/outboundfeeds/rss/',
    ],
    gnewsQueries: ['stock market today', 'geopolitical risk markets'],
    maxItems: 6,
  },

  localAtlanta: {
    label: 'Local: Atlanta metro / Gwinnett County',
    rss: [
      'https://www.ajc.com/arc/outboundfeeds/rss/',
      'https://www.11alive.com/feeds/syndication/rss/news/local',
      'https://www.capitalbnews.org/feed/',
    ],
    gnewsQueries: ['Gwinnett County', 'Atlanta metro news'],
    maxItems: 6,
    includeWeatherAlerts: true,
  },

  blackAmerica: {
    label: 'National Black America News',
    rss: [
      'https://thegrio.com/feed/',
      'https://afro.com/feed/',
      'https://www.wordinblack.com/feed/',
    ],
    gnewsQueries: ['Black America news', 'African American community'],
    maxItems: 5,
  },

  ghana: {
    label: 'Ghana News',
    rss: [
      'https://www.myjoyonline.com/feed/',
      'https://www.modernghana.com/rssfeed/',
      'https://citinewsroom.com/feed/',
    ],
    gnewsQueries: ['Ghana news'],
    maxItems: 6,
  },

  world: {
    label: 'World news (broader international events, non-market, non-Ghana)',
    rss: [
      'http://feeds.bbci.co.uk/news/world/rss.xml',
      'https://www.aljazeera.com/xml/rss/all.xml',
      'https://feeds.npr.org/1004/rss.xml',
    ],
    gnewsQueries: [],
    maxItems: 6,
  },

  health: {
    label: 'Health & public health news',
    rss: [
      'https://tools.cdc.gov/api/v2/resources/media/132608.rss',
      'https://www.statnews.com/feed/',
      'https://feeds.npr.org/1128/rss.xml',
    ],
    gnewsQueries: [],
    maxItems: 4,
  },

  federalGov: {
    label: 'Federal Government: 24hr roundup, Supreme Court, Congress/legislation, Elections',
    rss: [
      'https://www.scotusblog.com/feed/',
      'https://thehill.com/homenews/feed/',
    ],
    gnewsQueries: ['Congress legislation', 'White House', 'federal election'],
    maxItems: 8,
  },
};

// Outlets to prefer when multiple sources cover the same story (per your
// preference for Black-owned/Black press outlets, applied as a tie-breaker
// during ranking -- not an exclusivity filter).
export const PREFERRED_OUTLETS = [
  'theGrio', 'Capital B', 'The Atlanta Voice', 'AFRO', 'Andscape', 'Word In Black',
];

// Rotating topics for the soccer explainer feature. One is selected per day
// (deterministically, by day-of-year) so it cycles without needing to track
// state between runs.
export const SOCCER_EXPLAINER_TOPICS = [
  'How the offside rule actually works, including the common confusion points',
  'How promotion and relegation works in European soccer leagues',
  'The structure of the UEFA Champions League, from qualifying to the final',
  'How World Cup qualification works across different confederations',
  'What financial fair play / profit and sustainability rules mean for clubs',
  'How a soccer transfer window and transfer fees actually work',
  'The difference between a league title race and a cup competition',
  'How VAR (Video Assistant Referee) works and what it can and can\u2019t review',
  'What "expected goals" (xG) means and how to read it as a stat',
  'How a league table, goal difference, and tiebreakers work',
  'How MLS roster rules work (salary cap, allocation money, designated players) using Atlanta United as an example',
  'How tournaments like the Africa Cup of Nations or the Euros are structured',
];
