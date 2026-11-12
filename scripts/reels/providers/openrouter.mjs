// The API provider: one chat completion through OpenRouter (OpenAI-compatible), JSON out.
//   OPENROUTER_API_KEY   required (never committed: an env var on the machine or a CI secret)
//   REEL_MODEL           optional model id (default below); any model OpenRouter lists
// The brief is sent as-is (the same words an agent reads), so swapping the drafter changes nothing
// downstream. Usage and cost come back from OpenRouter's own accounting.
export const DEFAULT_MODEL = 'google/gemini-2.5-flash';

/** The messages a model gets: the rules and templates as the system turn, the stories as the user turn. */
export function messages(brief) {
  const system = [
    'You write short educational reels for Map of Knowledge, an atlas of human knowledge. You are careful, concrete and plain-spoken; you never write hype.',
    'Templates:', JSON.stringify(brief.templates, null, 1),
    'Rules:', brief.rules,
    `Never name (anywhere), and never two names from the same check: ${brief.reserved.join(', ')}`,
    `Answer with one JSON object in exactly this schema:\n${brief.schema}`,
  ].join('\n\n');
  const stories = brief.stories.map(s => ({
    id: s.id, kind: s.kind, year: s.year, dateBound: s.dateBound, place: s.place.name, endCard: s.place.provable ? 'Try a new case' : `Open ${s.place.name}`,
    headline: s.headline, claim: s.claim, alreadyTold: s.told, neverNameHere: s.reservedHere,
    media: s.media.map(m => ({ key: m.key, file: m.file, size: `${m.width}x${m.height}`, licence: m.license, showWhole: m.mustContain, description: m.description, descriptionSource: m.page })),
    sources: s.sources.map(src => ({ key: src.key, cite: src.cite, sentences: src.sentences.map(x => `[${src.key}.${x.n}] ${x.text}`) })),
  }));
  const user = `Draft ${brief.count} reels for ${brief.date} from these stories (use at least three templates):\n${JSON.stringify(stories)}`;
  return [{ role: 'system', content: system }, { role: 'user', content: user }];
}

/** Pull the JSON object out of a reply, with or without a code fence. */
export function parseReply(text) {
  const body = String(text ?? '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = body.indexOf('{'), end = body.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('the model replied without a JSON object');
  const drafts = JSON.parse(body.slice(start, end + 1));
  if (!Array.isArray(drafts.reels)) throw new Error('the reply has no "reels" array');
  return drafts;
}

export const openrouter = {
  name: 'openrouter',
  async draft(brief, { fetchImpl = fetch, env = process.env } = {}) {
    const key = env.OPENROUTER_API_KEY;
    if (!key) throw new Error('OPENROUTER_API_KEY is not set');
    const model = env.REEL_MODEL || DEFAULT_MODEL;
    const res = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://map-of-knowledge.vercel.app', 'X-Title': 'Map of Knowledge reel engine' },
      body: JSON.stringify({ model, messages: messages(brief), response_format: { type: 'json_object' }, temperature: 0.6, usage: { include: true } }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const drafts = parseReply(data.choices?.[0]?.message?.content);
    drafts.drafter = drafts.drafter || model;
    return { status: 'done', drafts, usage: { model, inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens, costUsd: data.usage?.cost } };
  },
};
