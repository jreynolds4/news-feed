"""
fetch.py -- pulls raw articles from all configured sources for one topic.

Each function returns a list of dicts with a consistent shape:
    {
        "title": str,
        "url": str,
        "source": str,
        "summary": str,   # short excerpt, not the full article
        "published": str, # ISO-ish string, best effort
    }

Network failures for a single feed should never crash the whole run --
they're logged and skipped so one dead source doesn't kill the digest.
"""

import logging
import time
from datetime import datetime, timezone

import feedparser
import requests

import config

logger = logging.getLogger("news_digest.fetch")

REQUEST_TIMEOUT = 10  # seconds, per source -- keep this tight so one slow
                       # feed doesn't stall the whole run


def fetch_rss(url: str) -> list[dict]:
    """Fetch and parse a single RSS feed. Returns [] on any failure."""
    try:
        # feedparser does its own networking; wrap with a manual timeout
        # via requests first so we control it, then hand bytes to feedparser.
        resp = requests.get(
            url,
            timeout=REQUEST_TIMEOUT,
            headers={"User-Agent": "Mozilla/5.0 (personal news digest bot)"},
        )
        resp.raise_for_status()
        parsed = feedparser.parse(resp.content)

        if parsed.bozo and not parsed.entries:
            logger.warning("Feed parse issue, no entries: %s (%s)", url, parsed.bozo_exception)
            return []

        source_name = parsed.feed.get("title", url)
        articles = []
        for entry in parsed.entries[:15]:  # cap per-feed volume
            articles.append({
                "title": entry.get("title", "").strip(),
                "url": entry.get("link", ""),
                "source": source_name,
                "summary": entry.get("summary", "")[:500],
                "published": entry.get("published", ""),
            })
        if not articles:
            logger.warning("Feed returned zero entries: %s", url)
        return articles

    except Exception as e:
        logger.warning("Failed to fetch RSS feed %s: %s", url, e)
        return []


def fetch_gnews(query: str) -> list[dict]:
    """Fetch articles matching `query` from the GNews API. Returns [] on failure."""
    if not config.GNEWS_API_KEY:
        logger.warning("GNEWS_API_KEY not set -- skipping GNews query: %s", query)
        return []

    try:
        resp = requests.get(
            "https://gnews.io/api/v4/search",
            params={
                "q": query,
                "lang": "en",
                "max": 8,
                "apikey": config.GNEWS_API_KEY,
            },
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        articles = []
        for item in data.get("articles", []):
            articles.append({
                "title": item.get("title", "").strip(),
                "url": item.get("url", ""),
                "source": item.get("source", {}).get("name", "GNews"),
                "summary": (item.get("description") or "")[:500],
                "published": item.get("publishedAt", ""),
            })
        return articles

    except Exception as e:
        logger.warning("Failed GNews query '%s': %s", query, e)
        return []


def fetch_weather_alerts(county_code: str) -> list[dict]:
    """Fetch active NWS alerts for a county/zone code. Returns [] on failure."""
    try:
        resp = requests.get(
            f"https://api.weather.gov/alerts/active/zone/{county_code}",
            timeout=REQUEST_TIMEOUT,
            headers={"User-Agent": "(personal news digest, contact: set-your-email@example.com)"},
        )
        resp.raise_for_status()
        data = resp.json()

        alerts = []
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            alerts.append({
                "title": f"WEATHER ALERT: {props.get('event', 'Alert')}",
                "url": props.get("@id", "https://www.weather.gov"),
                "source": "National Weather Service",
                "summary": (props.get("headline") or props.get("description", ""))[:500],
                "published": props.get("sent", ""),
            })
        return alerts

    except Exception as e:
        logger.warning("Failed to fetch weather alerts for %s: %s", county_code, e)
        return []


def fetch_topic(topic_key: str, topic_config: dict) -> list[dict]:
    """Fetch all raw articles for a single configured topic."""
    articles = []

    for url in topic_config.get("rss", []):
        articles.extend(fetch_rss(url))
        time.sleep(0.3)  # be polite to source servers

    for query in topic_config.get("gnews_queries", []):
        articles.extend(fetch_gnews(query))
        time.sleep(0.3)

    if topic_config.get("include_weather_alerts"):
        articles.extend(fetch_weather_alerts(config.NWS_COUNTY_CODE))

    logger.info("Topic '%s': fetched %d raw articles", topic_key, len(articles))
    return articles


def fetch_all() -> dict[str, list[dict]]:
    """Fetch raw articles for every configured topic."""
    results = {}
    for topic_key, topic_config in config.TOPICS.items():
        results[topic_key] = fetch_topic(topic_key, topic_config)
    return results
