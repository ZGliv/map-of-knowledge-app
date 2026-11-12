// The drafting interface. A provider turns one day's brief (stages/brief.mjs: templates, rules,
// schema and the shortlisted stories) into draft reels in the DRAFT_SCHEMA shape. Nothing else in
// the engine knows who drafted: assemble, validate, fact-check, narrate and publish are the same.
//
//   interface Provider {
//     name: string;
//     draft(brief, { date, dir }): Promise<
//       | { status: 'done'; drafts: { drafter: string; reels: DraftReel[] }; usage?: { inputTokens, outputTokens, costUsd } }
//       | { status: 'pending'; message: string }      // an agent will write drafts.json itself
//     >;
//   }
//
// Two providers ship: `agent` (a Claude Code session running the generate-reels skill writes the
// file) and `openrouter` (any chat model behind OpenRouter's OpenAI-compatible API, for unattended
// nightly runs). Add another by exporting the same shape and registering it here.
import { agent } from './agent.mjs';
import { openrouter } from './openrouter.mjs';

export const PROVIDERS = { agent, openrouter };

export function provider(name = 'agent') {
  const found = PROVIDERS[name];
  if (!found) throw new Error(`Unknown drafting provider "${name}" (have: ${Object.keys(PROVIDERS).join(', ')})`);
  return found;
}
