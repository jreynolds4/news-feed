// digest.js
//
// Compiles curated, per-topic story lists (plus the soccer explainer) into
// a single HTML email body, styled as a dark, data-dense "daily brief"
// (ticker, stats card with an SVG bar chart, per-section story cards).
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
//   stylesheets -- this template uses neither, by design (no Google Fonts
//   <link>, just font-family fallback stacks).
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
  :root {
    --bg: #0a0e13;
    --bg-raise: #11161e;
    --bg-raise-2: #161d27;
    --border: #232b36;
    --border-soft: #1a212b;
    --text: #f2f5f8;
    --text-muted: #8893a1;
    --text-faint: #5b6573;
    --lime: #c9ff3f;
    --lime-dim: #8fb52a;
    --amber: #ff8a3d;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background:
      radial-gradient(ellipse 900px 500px at 50% -10%, rgba(201,255,63,0.07), transparent 60%),
      var(--bg);
    color: var(--text);
    font-family: 'Inter', -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .container {
    max-width: 700px;
    margin: 0 auto;
    padding: 0 0 56px 0;
  }

  /* ---------- masthead ---------- */
  .masthead {
    padding: 36px 22px 22px 22px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .masthead .brand h1 {
    font-family: 'Oswald', sans-serif;
    font-weight: 700;
    font-size: 34px;
    letter-spacing: 0.5px;
    margin: 0;
    color: var(--text);
    text-transform: uppercase;
  }
  .masthead .status {
    text-align: right;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--text-muted);
  }
  .masthead .status .date { color: var(--text); font-weight: 500; }
  .masthead .status .live {
    display: inline-flex; align-items: center; gap: 5px;
    margin-top: 4px; color: var(--lime); font-weight: 500;
  }
  .masthead .status .live .dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--lime);
    box-shadow: 0 0 6px var(--lime);
  }

  /* ---------- ticker ---------- */
  .ticker {
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    background: var(--bg-raise);
    overflow: hidden;
    white-space: nowrap;
    padding: 9px 0;
  }
  .ticker-track {
    display: inline-block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    letter-spacing: 0.3px;
    color: var(--text-muted);
    padding-left: 22px;
  }

  /* ---------- signature stat card ---------- */
  .brief-card {
    margin: 26px 22px 8px 22px;
    background: var(--bg-raise);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 22px 22px 18px 22px;
  }
  .brief-card .brief-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--amber);
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .brief-stats {
    display: flex;
    gap: 28px;
    flex-wrap: wrap;
    align-items: flex-end;
  }
  .stat .num {
    font-family: 'Oswald', sans-serif;
    font-size: 34px;
    font-weight: 600;
    color: var(--text);
    line-height: 1;
  }
  .stat .num.accent { color: var(--lime); }
  .stat .lbl {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-top: 5px;
  }
  .brief-chart { margin-left: auto; }
  .bar { fill: var(--lime); opacity: 0.85; }
  .bar-label { font-size: 11px; text-anchor: middle; }

  /* ---------- sections ---------- */
  .section { padding: 0 22px; margin-top: 38px; }
  .section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    padding-bottom: 10px;
    margin-bottom: 18px;
  }
  .section-head h2 {
    font-family: 'Oswald', sans-serif;
    font-weight: 600;
    font-size: 19px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    margin: 0;
    color: var(--text);
  }
  .sec-emoji { margin-right: 9px; }
  .sec-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    color: var(--text-faint);
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  /* ---------- explainer callout ---------- */
  .explainer {
    background: var(--bg-raise);
    border: 1px dashed rgba(255,138,61,0.4);
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 20px;
  }
  .explainer-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.6px;
    color: var(--amber);
    margin-bottom: 6px;
  }
  .explainer p {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--text-muted);
  }

  /* ---------- empty state ---------- */
  .empty-state {
    padding: 14px 0 14px 14px;
    font-size: 14px;
    font-style: italic;
    color: var(--text-faint);
  }

  /* ---------- story ---------- */
  .story {
    padding: 14px 0 14px 14px;
    margin-bottom: 4px;
    border-left: 2px solid var(--border-soft);
  }
  .story-title {
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 16px;
    line-height: 1.35;
    color: var(--text);
    text-decoration: none;
  }
  .story-meta { margin: 6px 0 8px 0; }
  .source-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
    color: var(--text-faint);
    background: var(--bg-raise-2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 7px;
  }
  .story-summary {
    font-size: 14px;
    line-height: 1.55;
    color: var(--text-muted);
    margin: 0;
  }

  /* ---------- footer ---------- */
  .footer {
    margin: 44px 22px 0 22px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--text-faint);
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }
  .footer .prompt { color: var(--lime-dim); }

  @media (max-width: 520px) {
    .masthead { flex-direction: column; align-items: flex-start; gap: 10px; }
    .masthead .status { text-align: left; }
    .masthead .brand h1 { font-size: 27px; }
    .brief-stats { gap: 20px; }
    .brief-chart { margin-left: 0; margin-top: 14px; }
    .stat .num { font-size: 27px; }
    .story-title { font-size: 15px; }
  }
</style>
</head>
<body>
<div class="container">
`;

const HTML_TAIL = `
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

function wordCount(text = '') {
  return String(text).split(/\s+/).filter(Boolean).length;
}

function renderStory(story) {
  const title = escapeHtml(story.title || 'Untitled');
  const url = story.url || '#';
  const source = escapeHtml((story.source || 'Unknown source').toUpperCase());
  const summary = escapeHtml(story.summary || '');
  return `
    <div class="story">
      <a class="story-title" href="${url}" target="_blank" rel="noopener">${title}</a>
      <div class="story-meta"><span class="source-tag">${source}</span></div>
      <p class="story-summary">${summary}</p>
    </div>`;
}

function renderExplainer(explainer) {
  if (!explainer) return '';
  return `
    <div class="explainer">
      <div class="explainer-label">&#129504; QUICK EXPLAINER &middot; SOCCER 101</div>
      <p>${escapeHtml(explainer.text)}</p>
    </div>`;
}

function renderSection(topicKey, topicConfig, stories, explainer) {
  const sectionTitle = topicConfig.label.split(':')[0]; // short heading, e.g. "Sports"
  const paddedCount = String(stories.length).padStart(2, '0');
  const body = stories.length
    ? stories.map(renderStory).join('')
    : '<div class="empty-state">No stories cleared the bar today.</div>';
  return `
    <section class="section" id="${topicKey}">
      <div class="section-head">
        <h2><span class="sec-emoji">${topicConfig.emoji}</span>${escapeHtml(sectionTitle)}</h2>
        <span class="sec-count">${paddedCount} STORIES</span>
      </div>
      ${renderExplainer(explainer)}
      ${body}
    </section>`;
}

function renderMasthead() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  return `
  <div class="masthead">
    <div class="brand"><h1>Your Daily Digest</h1></div>
    <div class="status">
      <div class="date">${today}</div>
      <div class="live"><span class="dot"></span> LIVE</div>
    </div>
  </div>`;
}

function renderTicker(curatedByTopic) {
  const entries = Object.entries(config.TOPICS).map(([topicKey, topicConfig]) => {
    const count = (curatedByTopic[topicKey] || []).length;
    const shortLabel = escapeHtml(topicConfig.label.split(':')[0].toUpperCase());
    const paddedCount = String(count).padStart(2, '0');
    return `${topicConfig.emoji} ${shortLabel} ${paddedCount}`;
  });
  return `
  <div class="ticker"><div class="ticker-track">${entries.join('&nbsp;&middot;&nbsp;')}</div></div>`;
}

function renderBriefChart(counts, topicConfigs) {
  const barWidth = 18;
  const xStep = 28;
  const baselineY = 46;
  const maxHeight = 46;
  const max = Math.max(1, ...counts);
  const svgWidth = topicConfigs.length * xStep;
  const svgHeight = 64;

  const parts = topicConfigs.map((topicConfig, i) => {
    const count = counts[i];
    const x = i * xStep;
    const labelX = x + barWidth / 2;
    let height = Math.round((count / max) * maxHeight);
    if (count > 0 && height < 3) height = 3;
    const rect = count > 0
      ? `<rect x="${x}" y="${baselineY - height}" width="${barWidth}" height="${height}" rx="2" class="bar" />`
      : '';
    return `${rect}<text x="${labelX}" y="60" class="bar-label">${topicConfig.emoji}</text>`;
  }).join('');

  return `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">${parts}</svg>`;
}

function renderBriefCard(curatedByTopic, soccerExplainer) {
  const topicEntries = Object.entries(config.TOPICS);
  const counts = topicEntries.map(([topicKey]) => (curatedByTopic[topicKey] || []).length);
  const totalStories = counts.reduce((sum, n) => sum + n, 0);
  const sectionsCount = topicEntries.length;

  let totalWords = 0;
  for (const [topicKey] of topicEntries) {
    for (const story of curatedByTopic[topicKey] || []) {
      totalWords += wordCount(story.title) + wordCount(story.summary);
    }
  }
  if (soccerExplainer) totalWords += wordCount(soccerExplainer.text);
  const minRead = Math.max(1, Math.round(totalWords / 200));
  const explainerCount = soccerExplainer ? 1 : 0;

  const chart = renderBriefChart(counts, topicEntries.map(([, topicConfig]) => topicConfig));

  return `
  <div class="brief-card">
    <div class="brief-label">&#128202; Today's Brief</div>
    <div class="brief-stats">
      <div class="stat"><div class="num accent">${totalStories}</div><div class="lbl">Stories</div></div>
      <div class="stat"><div class="num">${sectionsCount}</div><div class="lbl">Sections</div></div>
      <div class="stat"><div class="num">${minRead}</div><div class="lbl">Min Read</div></div>
      <div class="stat"><div class="num">${explainerCount}</div><div class="lbl">Explainer</div></div>
      <div class="brief-chart">${chart}</div>
    </div>
  </div>`;
}

function renderFooter() {
  const lastSync = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  return `
  <div class="footer">
    <span><span class="prompt">&gt;</span> compiled_by: gemini &middot; sources: rss + gnews_api</span>
    <span>last_sync: ${lastSync}</span>
  </div>`;
}

export function buildDigestHtml(curatedByTopic, soccerExplainer) {
  const sections = Object.entries(config.TOPICS)
    .map(([topicKey, topicConfig]) => {
      const explainer = topicConfig.soccerExplainer ? soccerExplainer : null;
      return renderSection(topicKey, topicConfig, curatedByTopic[topicKey] || [], explainer);
    })
    .join('');

  const html = HTML_HEAD
    + renderMasthead()
    + renderTicker(curatedByTopic)
    + renderBriefCard(curatedByTopic, soccerExplainer)
    + sections
    + renderFooter()
    + HTML_TAIL;

  const sizeKb = Buffer.byteLength(html, 'utf-8') / 1024;
  if (sizeKb > 95) {
    console.warn(`Digest HTML is ${sizeKb.toFixed(1)}KB -- approaching Gmail's ~102KB clipping threshold. Consider lowering maxItems in config.js.`);
  }

  return html;
}
