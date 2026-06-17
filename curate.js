// curate.js
//
// Uses the Gemini API to turn a pile of raw articles into a small set of
// ranked, deduplicated, summarized stories per topic. This is the
// "personalization" layer -- it judges relevance and quality, not just
// keyword-matches headlines.

import { GoogleGenAI, Type } from '@google/genai';
import * as config from './config.js';

const client = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

const STORY_LIST_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      url: { type: Type.STRING },
      source: { type: Type.STRING },
      summary: { type: Type.STRING },
    },
    required: ['title', 'url', 'source', 'summary'],
    propertyOrdering: ['title', 'url', 'source', 'summary'],
  },
};

function buildPrompt(label, maxItems, preferredOutlets, articlesJson) {
  return `You are curating one section of a personal daily news digest.

Topic: ${label}

Below is a list of raw articles (some may be duplicates covering the same story from different outlets, some may be low-relevance or low-quality). Your job:

1. Remove duplicate/overlapping stories -- keep only the single best-sourced version of each distinct story.
2. Drop anything irrelevant to the topic above, or that reads as low-quality (clickbait, opinion-as-news, no real informational content).
3. Rank the remaining stories by genuine importance/relevance, most important first.
4. Select at most ${maxItems} stories.
5. When multiple outlets cover the same story equally well, prefer these outlets if present: ${preferredOutlets}. This is a tie-breaker only -- never include a worse or less relevant story just because it's from a preferred outlet, and never exclude an important story because it isn't.
6. Write a neutral, factual 2-3 sentence summary for each selected story in your own words (do not copy text from the source).

Raw articles (JSON):
${articlesJson}

Respond with a JSON array. Each element:
{"title": "...", "url": "...", "source": "...", "summary": "your 2-3 sentence neutral summary"}

If none of the raw articles are usable, respond with an empty JSON array: []
`;
}

function stripCodeFences(text) {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.split('```')[1];
    if (t.startsWith('json')) t = t.slice(4);
  }
  return t.trim();
}

export async function curateTopic(topicKey, topicConfig, rawArticles) {
  if (!rawArticles || rawArticles.length === 0) {
    console.warn(`Topic '${topicKey}': no raw articles to curate, skipping`);
    return [];
  }

  const trimmed = rawArticles.map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source,
    summary: a.summary || '',
  }));

  const prompt = buildPrompt(
    topicConfig.label,
    topicConfig.maxItems || 6,
    config.PREFERRED_OUTLETS.join(', '),
    JSON.stringify(trimmed)
  );

  try {
    const response = await client.models.generateContent({
      model: config.GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: STORY_LIST_SCHEMA,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingLevel: 'HIGH' },
      },
    });

    const curated = JSON.parse(stripCodeFences(response.text));

    if (!Array.isArray(curated)) {
      console.error(`Topic '${topicKey}': Gemini response was not a list, skipping`);
      return [];
    }

    console.log(`Topic '${topicKey}': curated ${curated.length} stories from ${rawArticles.length} raw articles`);
    return curated;
  } catch (err) {
    console.error(`Topic '${topicKey}': curation failed: ${err.message}`);
    return [];
  }
}

export async function curateAll(rawByTopic) {
  const curated = {};
  for (const [topicKey, topicConfig] of Object.entries(config.TOPICS)) {
    curated[topicKey] = await curateTopic(topicKey, topicConfig, rawByTopic[topicKey] || []);
  }
  return curated;
}
