"""
curate.py -- uses the Claude API to turn a pile of raw articles into a
small set of ranked, deduplicated, summarized stories per topic.

This is the "personalization" layer: it's where source quality, topic
relevance, and your outlet preference actually get applied, rather than
just dumping every RSS entry into the email.
"""

import json
import logging

import anthropic

import config

logger = logging.getLogger("news_digest.curate")

client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

CURATION_PROMPT_TEMPLATE = """You are curating one section of a personal daily news digest.

Topic: {label}

Below is a list of raw articles (some may be duplicates covering the same story from different outlets, some may be low-relevance or low-quality). Your job:

1. Remove duplicate/overlapping stories -- keep only the single best-sourced version of each distinct story.
2. Drop anything irrelevant to the topic above, or that reads as low-quality (clickbait, opinion-as-news, no real informational content).
3. Rank the remaining stories by genuine importance/relevance, most important first.
4. Select at most {max_items} stories.
5. When multiple outlets cover the same story equally well, prefer these outlets if present: {preferred}. This is a tie-breaker only -- never include a worse or less relevant story just because it's from a preferred outlet, and never exclude an important story because it isn't.
6. Write a neutral, factual 2-3 sentence summary for each selected story in your own words (do not copy text from the source).

Raw articles (JSON):
{articles_json}

Respond with ONLY a JSON array, no other text, no markdown code fences. Each element:
{{"title": "...", "url": "...", "source": "...", "summary": "your 2-3 sentence neutral summary"}}

If none of the raw articles are usable, respond with an empty JSON array: []
"""


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


def curate_topic(topic_key: str, topic_config: dict, raw_articles: list[dict]) -> list[dict]:
    """Send raw articles for one topic to Claude and get back a curated list."""
    if not raw_articles:
        logger.warning("Topic '%s': no raw articles to curate, skipping", topic_key)
        return []

    # Trim each article's summary field so the prompt doesn't balloon, and
    # cap total article count sent to keep token usage sane.
    trimmed = [
        {
            "title": a["title"],
            "url": a["url"],
            "source": a["source"],
            "summary": a["summary"][:300],
        }
        for a in raw_articles[:60]
    ]

    prompt = CURATION_PROMPT_TEMPLATE.format(
        label=topic_config["label"],
        max_items=topic_config.get("max_items", 6),
        preferred=", ".join(config.PREFERRED_OUTLETS),
        articles_json=json.dumps(trimmed, ensure_ascii=False),
    )

    try:
        response = client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = response.content[0].text
        curated = json.loads(_strip_code_fences(raw_text))

        if not isinstance(curated, list):
            logger.error("Topic '%s': Claude response was not a list, skipping", topic_key)
            return []

        logger.info("Topic '%s': curated %d stories from %d raw articles",
                     topic_key, len(curated), len(raw_articles))
        return curated

    except json.JSONDecodeError as e:
        logger.error("Topic '%s': failed to parse Claude's JSON response: %s", topic_key, e)
        return []
    except Exception as e:
        logger.error("Topic '%s': Claude API call failed: %s", topic_key, e)
        return []


def curate_all(raw_by_topic: dict[str, list[dict]]) -> dict[str, list[dict]]:
    """Curate every topic's raw articles."""
    curated = {}
    for topic_key, topic_config in config.TOPICS.items():
        curated[topic_key] = curate_topic(topic_key, topic_config, raw_by_topic.get(topic_key, []))
    return curated
