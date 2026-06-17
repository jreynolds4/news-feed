# Personal Daily News Digest

A scheduled system that fetches news from RSS feeds and the GNews API,
curates and summarizes it with Claude based on your topics, and emails
you a single daily digest. Runs entirely on free tiers via GitHub Actions
-- no server to maintain.

## How it works

1. **Fetch** (`fetch.py`) -- pulls raw articles from RSS feeds and GNews
   API queries for each topic in `config.py`, plus live weather alerts
   for Gwinnett County from the National Weather Service.
2. **Curate** (`curate.py`) -- sends each topic's raw articles to Claude,
   which dedupes overlapping coverage, drops low-quality items, ranks by
   relevance, and writes short neutral summaries.
3. **Compile** (`digest.py`) -- builds a single newspaper-styled HTML
   email from the curated stories.
4. **Send** (`send_email.py`) -- delivers it via Resend.
5. **Schedule** (`.github/workflows/daily-digest.yml`) -- GitHub Actions
   runs the whole pipeline once a day automatically.

## Setup

### 1. Get your API keys (all have free tiers)

- **Anthropic API key**: console.anthropic.com -> Settings -> API Keys.
  This is a paid-as-you-go API (not the same as a claude.ai subscription);
  a digest run costs roughly a few cents/day in API usage at this scale.
- **GNews API key**: gnews.io -> sign up -> free tier gives 100
  requests/day, enough for this digest's ~7 queries/day with room to spare.
- **Resend API key**: resend.com -> sign up -> API Keys. Free tier covers
  100 emails/day. Without verifying a custom domain, Resend will only let
  you send from `onboarding@resend.dev` to the email address you signed
  up with -- which is fine if `RECIPIENT_EMAIL` is your own address. To
  send from a custom domain, verify it under Resend's Domains tab first.

### 2. Get this code into your own GitHub repo

Create a new **private** repo and add these files (or ask me to package
this as a zip/give you git commands if you'd rather not type it all out).

### 3. Add your secrets

In your repo: Settings -> Secrets and variables -> Actions -> New repository secret.
Add each of: `ANTHROPIC_API_KEY`, `GNEWS_API_KEY`, `RESEND_API_KEY`,
`RECIPIENT_EMAIL`, `SENDER_EMAIL`.

### 4. Customize your topics and sources

Edit `config.py`:
- Add, remove, or replace RSS URLs and GNews queries per topic.
- Adjust `max_items` per topic to control digest length.
- Update `NWS_COUNTY_CODE` if you move, or remove `include_weather_alerts`
  if you don't want it.
- Adjust `PREFERRED_OUTLETS` for the tie-breaker preference.

A handful of the RSS URLs in the default config are best-effort guesses
for smaller/local outlets -- run a local test (next step) and check the
logs for "Feed returned zero entries" or "Failed to fetch RSS feed"
warnings, then swap out anything dead.

### 5. Test locally before relying on the schedule

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in your real keys
python -m dotenv run -- python main.py --dry-run --save-html preview.html
```

Open `preview.html` in a browser to see exactly what the email will look
like without actually sending anything. Once it looks right, run without
`--dry-run` to send yourself a real test email.

### 6. Turn on the schedule

The workflow is already set to run daily at 11:00 UTC (7:00 AM Eastern
Standard Time). GitHub Actions schedules can lag by up to ~15 minutes
during high load, and the cron doesn't auto-adjust for daylight saving --
nudge the cron line in `.github/workflows/daily-digest.yml` by an hour
twice a year if that bothers you. You can also trigger a run manually
any time from the repo's Actions tab ("Run workflow").

## Costs at this scale

Running daily: Claude API usage (~8 topic-curation calls/day, each a few
thousand tokens) typically lands in the few-cents-to-low-dollars/month
range; GNews and Resend free tiers fully cover this volume; GitHub
Actions is free for scheduled jobs on a private repo within the free
minutes allotment.

## Extending this later

- Swap `send_email.py` for SendGrid/SES if you outgrow Resend's free tier.
- Add a `seen_articles.json` cache (committed back to the repo each run)
  to avoid resurfacing the same story two days in a row.
- Add a second digest section ranking *why* each story made the cut, if
  you want more transparency into the curation step.
