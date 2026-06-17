# Personal Daily News Digest (Node.js)

A scheduled system that fetches news from RSS feeds and the GNews API,
curates and summarizes it with Gemini based on your topics, and emails
you a single daily digest, optimized for Gmail. Runs entirely on free
tiers via GitHub Actions -- no server to maintain.

## How it works

1. **Fetch** (`fetch.js`) -- pulls raw articles from RSS feeds and GNews
   API queries for each topic in `config.js`, plus live weather alerts
   for Gwinnett County from the National Weather Service.
2. **Curate** (`curate.js`) -- sends each topic's raw articles to Gemini,
   which dedupes overlapping coverage, drops low-quality items, ranks by
   relevance, and writes short neutral summaries.
3. **Explain** (`explainer.js`) -- generates a short rotating "Soccer 101"
   explainer each day, separate from the news, since the goal there is
   learning the sport, not just reading match reports.
4. **Compile** (`digest.js`) -- builds a single dark-themed "daily brief"
   HTML email from the curated stories and the day's explainer, tuned for
   Gmail's rendering rules (see below).
5. **Send** (`sendEmail.js`) -- delivers it via Resend.
6. **Schedule** (`.github/workflows/daily-digest.yml`) -- GitHub Actions
   runs the whole pipeline once a day automatically.

## Gmail-specific notes

This digest is built assuming Gmail is the only client that needs to
render it, which simplifies things:

- Gmail supports an embedded `<style>` block in `<head>` (unlike some
  older or other clients that strip it), so the template doesn't need
  every property inlined by hand.
- Gmail clips messages over roughly 102KB behind a "[Message clipped] /
  View entire message" link. `digest.js` logs a warning if the compiled
  HTML crosses ~95KB so you'll notice before it becomes a problem --
  the default topic sizes stay well under that.
- Gmail ignores `<script>` tags and won't load external stylesheets;
  this template uses neither.
- No Outlook-specific VML or conditional-comment hacks are included,
  since those exist purely to patch Outlook's renderer. If you ever add
  Outlook as a target, that's the main thing you'd need to bring back.

## Setup

### 1. Get your API keys (all have free tiers)

- **Gemini API key**: aistudio.google.com/apikey -> create an API key.
  This is pay-as-you-go; a digest run costs roughly a few cents/day in
  API usage at this scale.
- **GNews API key**: gnews.io -> sign up -> free tier gives 100
  requests/day, enough for this digest's ~9 queries/day with room to spare.
- **Resend API key**: resend.com -> sign up -> API Keys. Free tier covers
  100 emails/day. Without verifying a custom domain, Resend will only let
  you send from `onboarding@resend.dev` to the email address you signed
  up with -- fine if `RECIPIENT_EMAIL` is your own Gmail address. To send
  from a custom domain instead, verify it under Resend's Domains tab.

### 2. Get this code into your own GitHub repo

Create a new **private** repo and add these files.

### 3. Add your secrets

In your repo: Settings -> Secrets and variables -> Actions -> New repository secret.
Add each of: `GEMINI_API_KEY`, `GNEWS_API_KEY`, `RESEND_API_KEY`,
`RECIPIENT_EMAIL`, `SENDER_EMAIL`.

### 4. Customize your topics and sources

Edit `config.js`:
- Add, remove, or replace RSS URLs and `gnewsQueries` per topic.
- Adjust `maxItems` per topic to control digest length (and email size).
- Update `NWS_COUNTY_CODE` if you move, or remove `includeWeatherAlerts`.
- Adjust `PREFERRED_OUTLETS` for the tie-breaker preference.
- Add/remove entries in `SOCCER_EXPLAINER_TOPICS` to change what the
  rotating explainer covers.

A handful of the RSS URLs in the default config are best-effort guesses
for smaller/local outlets -- run a local test (next step) and check the
logs for "Feed returned zero entries" or "Failed to fetch RSS feed"
warnings, then swap out anything dead.

### 5. Test locally before relying on the schedule

```bash
npm install
cp .env.example .env   # fill in your real keys
npm run dry-run
```

This runs `node main.js --dry-run --save-html preview.html` -- open
`preview.html` in a browser to see exactly what the email will look like
without sending anything. Once it looks right, run `npm start` to send
yourself a real test email.

### 6. Turn on the schedule

The workflow is already set to run daily at 11:00 UTC (7:00 AM Eastern
Standard Time). GitHub Actions schedules can lag by up to ~15 minutes
during high load, and the cron doesn't auto-adjust for daylight saving --
nudge the cron line in `.github/workflows/daily-digest.yml` by an hour
twice a year if that bothers you. You can also trigger a run manually
any time from the repo's Actions tab ("Run workflow").

## Costs at this scale

Running daily: Gemini API usage (~9 topic-curation calls + 1 explainer
call/day, each a few thousand tokens, on the top-tier Gemini model)
typically lands in the few-dollars/month range; GNews and Resend free
tiers fully cover this volume; GitHub Actions is free for scheduled jobs
on a private repo within the free minutes allotment.

## Extending this later

- Swap `sendEmail.js` for SendGrid/SES if you outgrow Resend's free tier.
- Add a `seenArticles.json` cache (committed back to the repo each run)
  to avoid resurfacing the same story two days in a row.
- Add similar rotating explainer content for other topics if useful.
