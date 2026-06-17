// main.js
//
// Entry point. Run this daily (via GitHub Actions cron, see
// .github/workflows/daily-digest.yml) to fetch, curate, compile, and send
// the digest.
//
// Run locally for testing with:
//   node main.js
//   node main.js --dry-run                       (build but don't send)
//   node main.js --dry-run --save-html out.html   (also write HTML to a file)

import fs from 'node:fs/promises';
import * as config from './config.js';
import * as sources from './fetch.js';
import * as curate from './curate.js';
import { buildDigestHtml } from './digest.js';
import { sendDigest } from './sendEmail.js';
import { generateSoccerExplainer } from './explainer.js';

function checkRequiredConfig() {
  const missing = [];
  if (!config.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (!config.GNEWS_API_KEY) missing.push('GNEWS_API_KEY');
  if (!config.RESEND_API_KEY) missing.push('RESEND_API_KEY');
  if (!config.RECIPIENT_EMAIL) missing.push('RECIPIENT_EMAIL');

  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const saveHtmlIndex = args.indexOf('--save-html');
  const saveHtmlPath = saveHtmlIndex !== -1 ? args[saveHtmlIndex + 1] : null;

  if (!checkRequiredConfig()) {
    process.exit(1);
  }

  console.log('=== Starting daily digest run ===');

  console.log('Step 1/4: fetching raw articles from all sources...');
  const rawByTopic = await sources.fetchAll();
  const totalRaw = Object.values(rawByTopic).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`Fetched ${totalRaw} total raw articles across ${Object.keys(rawByTopic).length} topics`);

  if (totalRaw === 0) {
    console.error('Zero articles fetched across all topics -- aborting before sending an empty digest');
    process.exit(1);
  }

  console.log('Step 2/4: curating with Claude (filter, dedupe, rank, summarize)...');
  const curatedByTopic = await curate.curateAll(rawByTopic);
  const totalCurated = Object.values(curatedByTopic).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`Curated down to ${totalCurated} total stories`);

  console.log('Step 3/4: generating today\'s soccer explainer...');
  const soccerExplainer = await generateSoccerExplainer();

  console.log('Step 4/4: compiling digest...');
  const htmlBody = buildDigestHtml(curatedByTopic, soccerExplainer);

  if (saveHtmlPath) {
    await fs.writeFile(saveHtmlPath, htmlBody, 'utf-8');
    console.log(`Saved HTML digest to ${saveHtmlPath}`);
  }

  const subject = `Your Daily Digest -- ${new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })}`;

  if (dryRun) {
    console.log(`Dry run: skipping email send. Subject would be: ${subject}`);
  } else {
    const success = await sendDigest(htmlBody, subject);
    if (!success) process.exit(1);
  }

  console.log('=== Digest run complete ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
