// digest.js
//
// Compiles curated, per-topic story lists (plus the soccer explainer) into
// a single HTML email body, styled to read like a daily newspaper.
//
// Gmail-specific notes:
// - Gmail (web, app, and most clients) supports an embedded <style> block
//   in <head>, unlike some older/other clients that strip it -- so this
//   doesn't need every property inlined by hand.
// - Gmail clips messages over ~102KB with a "[Message clipped]" link and a
//   "View entire message" prompt. The default maxItems per topic in
//   config.js keep total size well under that, but if you raise them a lot,
//   watch for clipping.
// - Gmail ignores <script> tags entirely and does not load external
//   stylesheets -- this template uses neither, by design.
// - No Outlook-specific VML/conditional-comment hacks are included here
//   since Gmail is the only target client; add those back if you ever need
//   to support Outlook desktop too.

import * as config from './config.js';

const HTML_HEAD = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
  .story .source { font-size: 12px; color: #888; margin: 2px 0 4px 0; }
  .story .summary { font-size: 14px; color: #333; line-height: 1.4; }
  .explainer { background: #f4f1ea; border-left: 3px solid #1a1a1a; padding: 10px 14px; margin: 0 0 16px 0; font-size: 13px; color: #333; line-height: 1.4; }
  .explainer .label { font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; margin-bottom: 4px; }
  .empty { font-size: 13px; color: #999; font-style: italic; }
  .footer { text-align: center; font-size: 11px; color: #999; margin-top: 32px;
            border-top: 1px solid #ddd; padding-top: 12px; }
</style>
</head>
<body>
<div class="container">
`;

const HTML_TAIL = `
<div class="footer">Your personal daily digest -- compiled from RSS feeds and the GNews API, curated by Claude.</div>
</div>
</body>
</html>
`;

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderStory(story) {
  const title = escapeHtml(story.title || 'Untitled');
  const url = story.url || '#';
  const source = escapeHtml(story.source || 'Unknown source');
  const summary = escapeHtml(story.summary || '');
  return `
    <div class="story">
      <a href="${url}">${title}</a>
      <div class="source">${source}</div>
      <div class="summary">${summary}</div>
    </div>`;
}

function renderExplainer(explainer) {
  if (!explainer) return '';
  return `
    <div class="explainer">
      <div class="label">Soccer 101</div>
      ${escapeHtml(explainer.text)}
    </div>`;
}

function renderSection(label, stories, explainer) {
  const sectionTitle = label.split(':')[0]; // short heading, e.g. "Sports"
  const body = stories.length
    ? stories.map(renderStory).join('')
    : '<div class="empty">No stories cleared the bar today.</div>';
  return `
    <div class="section">
      <h2>${sectionTitle}</h2>
      ${renderExplainer(explainer)}
      ${body}
    </div>`;
}

export function buildDigestHtml(curatedByTopic, soccerExplainer) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const sections = Object.entries(config.TOPICS)
    .map(([topicKey, topicConfig]) => {
      const explainer = topicConfig.soccerExplainer ? soccerExplainer : null;
      return renderSection(topicConfig.label, curatedByTopic[topicKey] || [], explainer);
    })
    .join('');

  const html = HTML_HEAD
    + `<div class="masthead"><h1>Your Daily Digest</h1><div class="date">${today}</div></div>`
    + sections
    + HTML_TAIL;

  const sizeKb = Buffer.byteLength(html, 'utf-8') / 1024;
  if (sizeKb > 95) {
    console.warn(`Digest HTML is ${sizeKb.toFixed(1)}KB -- approaching Gmail's ~102KB clipping threshold. Consider lowering maxItems in config.js.`);
  }

  return html;
}
