// Stage 4a: the drafting brief: everything the drafting agent needs on one page.
//
//   node scripts/generate/brief.mjs <id>     → content/generator/<id>/brief.md
//
// The archetype catalogue (which sim engine teaches what), the frozen rules (PLACE_RULES), the
// node, the minted IDs, the media candidates and the fact sheet's location. Drafting is agent
// work; this script makes sure every draft starts from the same contract.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { APP_EXPORTS, args, loadTs, logStage, readJson, workDir } from './lib.mjs';

const started = Date.now();
const id = args()._[0];
if (!id) { console.error('usage: brief.mjs <id>'); process.exit(2); }
const m = await loadTs(APP_EXPORTS, 'brief');
const plan = readJson(path.join(workDir(id), 'plan.json'));
const ids = readJson(path.join(workDir(id), 'ids.json'));
const media = readJson(path.join(workDir(id), 'media-candidates.json'), []);
const node = m.catalog.get(plan.nodeId);
// The leaf may be off the map while a draft is stopped (scaffold's places.ts line not committed):
// name it under its parent then, rather than printing the raw node ID.
const parentNode = m.catalog.get(plan.parent);
const pathNames = node ? m.catalog.getPath(node).slice(1).map(n => n.name).join(' › ')
  : parentNode ? [...m.catalog.getPath(parentNode).slice(1).map(n => n.name), plan.name].join(' › ') : plan.nodeId;
// Hand-written notes for this place (traps in the sources, names to keep out), read before drafting.
const handoffFile = path.join(workDir(id), 'handoff.md');
const handoff = existsSync(handoffFile) ? `${readFileSync(handoffFile, 'utf8').trim()}\n\n` : '';
const examples = m.PLACES.filter(p => p.id.startsWith('evolution-')).map(p => `src/expeditions/content/${p.id}.ts`).slice(0, 3);

const brief = `# Drafting brief: ${plan.name}

**Place:** ${pathNames} (\`${plan.nodeId}\`)
**Claim it proves:** ${plan.claim}
**Bundle to fill:** \`src/places/generated/${id}.ts\` (schema \`mok.place/2\`, places/contract.ts)

${handoff}## The contract (validatePlace runs every rule)
${Object.entries(m.PLACE_RULES).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n')}

## How to write
- Write from the fact sheet (\`content/generator/${id}/factsheet.md\`), in your own words. Never copy 8 words in a row from Wikipedia: the clean-room check fails the bundle.
- Every provenance \`source\` must be a source ID from the fact sheet headings, character for character. Add a paper with \`facts.mjs ${id} --paper "Label|https://doi.org/…"\`.
- Numbers a learner sees in a sim come from the engine; in a number beat or number item they come from a generator. Never type a computed answer.
- Sim beats: give params a type with \`satisfies <EngineParams>\` (import the type only), so drafting mistakes are compile errors. Peas cross: set \`expect\` on every step.
- Transfer items (in the bank) use organisms, places and people the pack never names; list them in \`entities\`. List any provenance source that only backs a transfer item in \`transferOnlySources\`.
- New cases (\`cases\`, src/cases/types.ts): at least 3, each a real situation the pack and reels never name, played in an engine from src/cases/engines.ts (population, tradeoff, cross, tree, clock, nest, chart, sequence), in the place's own archetype unless \`fit\` says why another fits better. The learner picks or sets something, then runs it; the engine computes who wins, so never type an answer. The slider starts outside the winning band and a blind guess wins at most 1 in 5. Write \`reveal\` as what really happened and why, sourced. Ask yourself: could someone win by guessing or fiddling? If so, change what they set.
- Reels: 2–3, 4–7 frames each, every frame cites a reel source whose \`cite\` is a pack provenance source; a \`pre:\` prediction that is not a check.
- Bank: at least 12 items, 3+ kinds; 3+ open-response transfers, 4+ multiple-choice transfers, 4+ on the pack’s own scenarios. Use IDs from \`ids.json\` once each.
- Plain words, no hype, no “Did you know”, no exclamation marks outside quotes, prompts ≤ 60 words.
- Worked examples of the format: ${examples.join(', ')}; banks in src/checks/banks/; reels in src/explore/reels/.

## Minted IDs (content/generator/${id}/ids.json)
- Expedition families (one per graded beat): ${ids.expeditionFamilies.join(', ')}
- Items (item / fresh family): ${ids.items.slice(0, 24).map(x => `${x.item}/${x.family}`).join(', ')}

## Media candidates (licence-checked; content/generator/${id}/media-candidates.md)
${media.length ? media.slice(0, 30).map(c => `- ${c.title} · ${c.license} · ${c.author}`).join('\n') : '_none yet: run media.mjs --search_'}

## The sim library: pick an archetype, fill it with data
${m.catalogueText()}
`;
writeFileSync(path.join(workDir(id), 'brief.md'), brief);
const minutes = logStage(id, 'brief', 'script', started);
console.log(`Brief → content/generator/${id}/brief.md (${minutes} min)`);
