// explainer.js
//
// Generates a short, rotating "Soccer 101" explainer -- educational content
// distinct from news coverage, addressing the goal of learning the sport,
// not just reading match reports. One topic is selected deterministically
// per day (by day-of-year) so it cycles through config.SOCCER_EXPLAINER_TOPICS
// without needing any persisted state between runs.

import { GoogleGenAI } from '@google/genai';
import * as config from './config.js';

const client = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

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
    const response = await client.models.generateContent({
      model: config.GEMINI_MODEL,
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingLevel: 'LOW' },
      },
    });
    return { topic, text: response.text.trim() };
  } catch (err) {
    console.error(`Soccer explainer generation failed: ${err.message}`);
    return null;
  }
}
