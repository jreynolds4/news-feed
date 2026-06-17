"""
main.py -- entry point. Run this daily (via GitHub Actions cron, see
.github/workflows/daily-digest.yml) to fetch, curate, compile, and send
the digest.

Run locally for testing with:
    python main.py
    python main.py --dry-run     # build the digest but don't send the email
    python main.py --save-html out.html   # also write the HTML to a file
"""

import argparse
import logging
import sys
from datetime import datetime

import config
import fetch
import curate
import digest
import send_email

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("news_digest.main")


def check_required_config() -> bool:
    missing = []
    if not config.ANTHROPIC_API_KEY:
        missing.append("ANTHROPIC_API_KEY")
    if not config.GNEWS_API_KEY:
        missing.append("GNEWS_API_KEY")
    if not config.RESEND_API_KEY:
        missing.append("RESEND_API_KEY")
    if not config.RECIPIENT_EMAIL:
        missing.append("RECIPIENT_EMAIL")

    if missing:
        logger.error("Missing required environment variables: %s", ", ".join(missing))
        return False
    return True


def main():
    parser = argparse.ArgumentParser(description="Build and send the daily news digest.")
    parser.add_argument("--dry-run", action="store_true", help="Build the digest but skip sending the email")
    parser.add_argument("--save-html", metavar="FILE", help="Write the compiled HTML digest to this file")
    args = parser.parse_args()

    if not check_required_config():
        sys.exit(1)

    logger.info("=== Starting daily digest run ===")

    logger.info("Step 1/3: fetching raw articles from all sources...")
    raw_by_topic = fetch.fetch_all()
    total_raw = sum(len(v) for v in raw_by_topic.values())
    logger.info("Fetched %d total raw articles across %d topics", total_raw, len(raw_by_topic))

    if total_raw == 0:
        logger.error("Zero articles fetched across all topics -- aborting before sending an empty digest")
        sys.exit(1)

    logger.info("Step 2/3: curating with Claude (filter, dedupe, rank, summarize)...")
    curated_by_topic = curate.curate_all(raw_by_topic)
    total_curated = sum(len(v) for v in curated_by_topic.values())
    logger.info("Curated down to %d total stories", total_curated)

    logger.info("Step 3/3: compiling digest...")
    html_body = digest.build_digest_html(curated_by_topic)

    if args.save_html:
        with open(args.save_html, "w", encoding="utf-8") as f:
            f.write(html_body)
        logger.info("Saved HTML digest to %s", args.save_html)

    subject = f"Your Daily Digest -- {datetime.now().strftime('%B %-d, %Y')}"

    if args.dry_run:
        logger.info("Dry run: skipping email send. Subject would be: %s", subject)
    else:
        success = send_email.send_digest(html_body, subject)
        if not success:
            sys.exit(1)

    logger.info("=== Digest run complete ===")


if __name__ == "__main__":
    main()
