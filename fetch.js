// fetch.js
//
// Pulls raw articles from all configured sources for one topic.
// Each function returns an array of objects with a consistent shape:
//   { title, url, source, summary, published }
//
// Network failures for a single feed never crash the whole run -- they're
// logged and skipped so one dead source doesn't kill the digest.

import Parser from 'rss-parser';
import * as config from './config.js';

const rssParser = new Parser();
const REQUEST_TIMEOUT_MS = 10000; // per source -- keep tight so one slow
                                    // feed doesn't stall the whole run

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// GNews's free tier caps requests at 1/second; this needs to stay above that
// or every query after the first in a topic gets rejected with HTTP 429.
const GNEWS_MIN_INTERVAL_MS = 1100;
const GNEWS_MAX_RETRIES = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Some feeds (e.g. citinewsroom.com) ship raw, unescaped "&" characters in
// entry text, which breaks strict XML entity parsing. Escape any "&" that
// isn't already part of a valid entity before handing the XML to the parser.
function sanitizeXmlEntities(xml) {
  return xml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
}

export async function fetchRss(url) {
  try {
    const resp = await fetchWithTimeout(url, {
      headers: { 'User-Agent': BROWSER_USER_AGENT },
    });
    if (!resp.ok) {
      console.warn(`Failed to fetch RSS feed ${url}: HTTP ${resp.status}`);
      return [];
    }

    const xml = await resp.text();
    const feed = await rssParser.parseString(sanitizeXmlEntities(xml));
    const sourceName = feed.title || url;

    const articles = (feed.items || []).slice(0, 15).map((item) => ({
      title: (item.title || '').trim(),
      url: item.link || '',
      source: sourceName,
      summary: (item.contentSnippet || item.content || '').slice(0, 500),
      published: item.pubDate || item.isoDate || '',
    }));

    if (articles.length === 0) {
      console.warn(`Feed returned zero entries: ${url}`);
    }
    return articles;
  } catch (err) {
    console.warn(`Failed to fetch RSS feed ${url}: ${err.message}`);
    return [];
  }
}

export async function fetchGNews(query, attempt = 0) {
  if (!config.GNEWS_API_KEY) {
    console.warn(`GNEWS_API_KEY not set -- skipping GNews query: ${query}`);
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      lang: 'en',
      max: '8',
      apikey: config.GNEWS_API_KEY,
    });
    const resp = await fetchWithTimeout(`https://gnews.io/api/v4/search?${params.toString()}`);

    if (resp.status === 429 && attempt < GNEWS_MAX_RETRIES) {
      const retryAfterSec = Number(resp.headers.get('retry-after')) || (attempt + 1) * 2;
      console.warn(`GNews rate-limited on query '${query}', retrying in ${retryAfterSec}s...`);
      await sleep(retryAfterSec * 1000);
      return fetchGNews(query, attempt + 1);
    }

    if (!resp.ok) {
      console.warn(`Failed GNews query '${query}': HTTP ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    return (data.articles || []).map((item) => ({
      title: (item.title || '').trim(),
      url: item.url || '',
      source: item.source?.name || 'GNews',
      summary: (item.description || '').slice(0, 500),
      published: item.publishedAt || '',
    }));
  } catch (err) {
    console.warn(`Failed GNews query '${query}': ${err.message}`);
    return [];
  }
}

export async function fetchWeatherAlerts(countyCode) {
  try {
    const resp = await fetchWithTimeout(
      `https://api.weather.gov/alerts/active/zone/${countyCode}`,
      { headers: { 'User-Agent': '(personal news digest, contact: set-your-email@example.com)' } }
    );
    if (!resp.ok) {
      console.warn(`Failed to fetch weather alerts for ${countyCode}: HTTP ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    return (data.features || []).map((feature) => {
      const props = feature.properties || {};
      return {
        title: `WEATHER ALERT: ${props.event || 'Alert'}`,
        url: props['@id'] || 'https://www.weather.gov',
        source: 'National Weather Service',
        summary: (props.headline || props.description || '').slice(0, 500),
        published: props.sent || '',
      };
    });
  } catch (err) {
    console.warn(`Failed to fetch weather alerts for ${countyCode}: ${err.message}`);
    return [];
  }
}

export async function fetchTopic(topicKey, topicConfig) {
  let articles = [];

  for (const url of topicConfig.rss || []) {
    articles = articles.concat(await fetchRss(url));
    await sleep(300); // be polite to source servers
  }

  for (const query of topicConfig.gnewsQueries || []) {
    articles = articles.concat(await fetchGNews(query));
    await sleep(GNEWS_MIN_INTERVAL_MS);
  }

  if (topicConfig.includeWeatherAlerts) {
    articles = articles.concat(await fetchWeatherAlerts(config.NWS_COUNTY_CODE));
  }

  console.log(`Topic '${topicKey}': fetched ${articles.length} raw articles`);
  return articles;
}

export async function fetchAll() {
  const results = {};
  for (const [topicKey, topicConfig] of Object.entries(config.TOPICS)) {
    results[topicKey] = await fetchTopic(topicKey, topicConfig);
  }
  return results;
}
