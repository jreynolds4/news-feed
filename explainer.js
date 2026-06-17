// explainer.js
//
// Generates a short, rotating "Soccer 101" explainer -- educational content
// distinct from news coverage, addressing the goal of learning the sport,
// not just reading match reports. One topic is selected deterministically
// per day (by day-of-year) so it cycles through config.SOCCER_EXPLAINER_TOPICS
// without needing any persisted state between runs.

import Anthropic from '@anthropic-ai/sdk';
import * as config from './config.js';

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diffMs = date - start;
  return Math.floor(diffMs / 86400000);
}

export async function generateSoccerExplainer() {
  const topics = config.SOCCER_EXPLAINER_TOPICS;
  if (!topics || topics.length === 0) return null;

  const topic = topics[dayOfYear() % topics.length];

  const prompt = `Write a short, clear explainer for someone who is a casual sports fan but new to soccer specifically. They already follow other sports closely (NBA, NFL, MLB), so you can assume general sports literacy -- standings, playoffs, salary caps -- but not soccer-specific rules or structures.

Explain: ${topic}

Write 3-4 sentences in plain language, with no unexplained jargon. Do not use bullet points or headers. This will appear as a small "Soccer 101" feature inside a daily news email, so keep it self-contained and skimmable.`;

  try {
    const response = await client.messages.create({
      model: config.CLAUDE_EXPLAINER_MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });
    return { topic, text: response.content[0].text.trim() };
  } catch (err) {
    console.error(`Soccer explainer generation failed: ${err.message}`);
    return null;
  }
}
