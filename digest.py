"""
digest.py -- compiles curated, per-topic story lists into a single HTML
email body styled to read well as a daily newspaper-style digest.
"""

from datetime import datetime

import config

HTML_HEAD = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Georgia, 'Times New Roman', serif; background: #f4f1ea; margin: 0; padding: 0; }
  .container { max-width: 640px; margin: 0 auto; background: #ffffff; padding: 24px; }
  .masthead { text-align: center; border-bottom: 3px double #1a1a1a; padding-bottom: 12px; margin-bottom: 24px; }
  .masthead h1 { font-size: 28px; letter-spacing: 1px; margin: 0; }
  .masthead .date { font-size: 13px; color: #555; margin-top: 4px; }
  .section { margin-bottom: 28px; }
  .section h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 1px;
                border-bottom: 1px solid #1a1a1a; padding-bottom: 6px; margin-bottom: 14px; }
  .story { margin-bottom: 16px; }
  .story a { font-size: 17px; font-weight: bold; color: #1a1a1a; text-decoration: none; }
  .story a:hover { text-decoration: underline; }
  .story .source { font-size: 12px; color: #888; margin: 2px 0 4px 0; }
  .story .summary { font-size: 14px; color: #333; line-height: 1.4; }
  .empty { font-size: 13px; color: #999; font-style: italic; }
  .footer { text-align: center; font-size: 11px; color: #999; margin-top: 32px;
            border-top: 1px solid #ddd; padding-top: 12px; }
</style>
</head>
<body>
<div class="container">
"""

HTML_TAIL = """
<div class="footer">Your personal daily digest -- compiled from RSS feeds and the GNews API, curated by Claude.</div>
</div>
</body>
</html>
"""


def render_story(story: dict) -> str:
    title = story.get("title", "Untitled")
    url = story.get("url", "#")
    source = story.get("source", "Unknown source")
    summary = story.get("summary", "")
    return f"""
    <div class="story">
      <a href="{url}">{title}</a>
      <div class="source">{source}</div>
      <div class="summary">{summary}</div>
    </div>
    """


def render_section(topic_key: str, label: str, stories: list[dict]) -> str:
    section_title = label.split(":")[0]  # short heading, e.g. "Sports" not the full description
    if not stories:
        body = '<div class="empty">No stories cleared the bar today.</div>'
    else:
        body = "".join(render_story(s) for s in stories)
    return f"""
    <div class="section">
      <h2>{section_title}</h2>
      {body}
    </div>
    """


def build_digest_html(curated_by_topic: dict[str, list[dict]]) -> str:
    today = datetime.now().strftime("%A, %B %-d, %Y")
    sections = []
    for topic_key, topic_config in config.TOPICS.items():
        sections.append(
            render_section(topic_key, topic_config["label"], curated_by_topic.get(topic_key, []))
        )

    return (
        HTML_HEAD
        + f'<div class="masthead"><h1>Your Daily Digest</h1><div class="date">{today}</div></div>'
        + "".join(sections)
        + HTML_TAIL
    )
