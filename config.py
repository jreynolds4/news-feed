"""
Configuration for the personal news digest.

Edit TOPICS to add/remove sources. Each topic has:
  - rss: list of RSS feed URLs (free, no API key needed)
  - gnews_queries: list of search queries to run against the GNews API
                   (used mainly for AP/Reuters-style wire coverage, since
                   those two killed their public RSS feeds)
  - max_items: how many curated stories to include in the final digest
               for this topic

NOTE ON SOURCE VERIFICATION:
Some feed URLs below were verified working as of June 2026; others are
best-effort and should be confirmed once before relying on them. The
fetch step (fetch.py) will log any feed that fails or returns zero items
so you can spot dead links quickly rather than silently losing coverage.
"""

import os

# ---------------------------------------------------------------------------
# API keys / secrets (set these as environment variables -- see .env.example
# and README.md. Never hardcode real keys in this file.)
# ---------------------------------------------------------------------------
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
GNEWS_API_KEY = os.environ.get("GNEWS_API_KEY")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

RECIPIENT_EMAIL = os.environ.get("RECIPIENT_EMAIL")          # where the digest goes
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "digest@yourdomain.com")  # must be a domain verified in Resend

# Claude model used for filtering/ranking/summarizing
CLAUDE_MODEL = "claude-sonnet-4-6"

# ---------------------------------------------------------------------------
# Local context (used for the weather alert lookup)
# ---------------------------------------------------------------------------
# NWS uses UGC zone/county codes, not city names. GAC135 is Gwinnett County, GA.
# Verify at: https://api.weather.gov/zones?type=county&area=GA  (search for Gwinnett)
NWS_COUNTY_CODE = "GAC135"

# ---------------------------------------------------------------------------
# Topics
# ---------------------------------------------------------------------------
TOPICS = {

    "sports": {
        "label": "Sports: NBA, NFL (Commanders), MLB (Braves), MLS (Atlanta United), Track & Field, International Soccer",
        "rss": [
            "https://www.espn.com/espn/rss/nba/news",
            "https://www.espn.com/espn/rss/nfl/news",
            "https://www.espn.com/espn/rss/mlb/news",
            "https://www.espn.com/espn/rss/soccer/news",
            "http://feeds.bbci.co.uk/sport/football/rss.xml",
            "https://worldathletics.org/rss/news",
        ],
        "gnews_queries": [
            "Washington Commanders",
            "Atlanta Braves",
            "Atlanta United",
        ],
        "max_items": 8,
    },

    "technology": {
        "label": "Technology: AI/ML trends & research, new releases, top tech news",
        "rss": [
            "https://techcrunch.com/feed/",
            "https://www.theverge.com/rss/index.xml",
            "https://feeds.arstechnica.com/arstechnica/index",
            "https://www.technologyreview.com/feed/",
        ],
        "gnews_queries": [
            "artificial intelligence research",
        ],
        "max_items": 6,
    },

    "finance": {
        "label": "Finance: stock market state, geopolitical market impact, sentiment, crypto",
        "rss": [
            "https://www.marketwatch.com/rss/topstories",
            "https://www.coindesk.com/arc/outboundfeeds/rss/",
        ],
        "gnews_queries": [
            "stock market today",
            "geopolitical risk markets",
        ],
        "max_items": 6,
    },

    "local_atlanta": {
        "label": "Local: Atlanta metro / Gwinnett County",
        "rss": [
            "https://www.ajc.com/arc/outboundfeeds/rss/",
            "https://www.11alive.com/feeds/syndication/rss/news/local",
            "https://www.capitalbnews.org/feed/",
        ],
        "gnews_queries": [
            "Gwinnett County",
            "Atlanta metro news",
        ],
        "max_items": 6,
        "include_weather_alerts": True,
    },

    "ghana": {
        "label": "Ghana News",
        "rss": [
            "https://www.myjoyonline.com/feed/",
            "https://www.modernghana.com/rssfeed/",
            "https://citinewsroom.com/feed/",
        ],
        "gnews_queries": [
            "Ghana news",
        ],
        "max_items": 6,
    },

    "world": {
        "label": "World news (broader international events, non-market, non-Ghana)",
        "rss": [
            "http://feeds.bbci.co.uk/news/world/rss.xml",
            "https://www.aljazeera.com/xml/rss/all.xml",
            "https://feeds.npr.org/1004/rss.xml",
        ],
        "gnews_queries": [],
        "max_items": 6,
    },

    "health": {
        "label": "Health & public health news",
        "rss": [
            "https://tools.cdc.gov/api/v2/resources/media/132608.rss",
            "https://www.statnews.com/feed/",
            "https://feeds.npr.org/1128/rss.xml",
        ],
        "gnews_queries": [],
        "max_items": 4,
    },

    "federal_gov": {
        "label": "Federal Government: 24hr roundup, Supreme Court, Congress/legislation, Elections",
        "rss": [
            "https://www.scotusblog.com/feed/",
            "https://thehill.com/homenews/feed/",
        ],
        "gnews_queries": [
            "Congress legislation",
            "White House",
            "federal election",
        ],
        "max_items": 8,
    },
}

# Outlets to prefer when multiple sources cover the same story (per your
# preference for Black-owned/Black press outlets, applied as a tie-breaker
# during ranking -- not an exclusivity filter).
PREFERRED_OUTLETS = [
    "theGrio", "Capital B", "The Atlanta Voice", "AFRO", "Andscape",
]
