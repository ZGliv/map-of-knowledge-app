// Gives every atlas place a glyph from Phosphor (MIT, 1,530 icons): a hand pick for the headline
// territories, a keyword match on name and tags for everything else, and the nearest ancestor's
// glyph when nothing matches. Writes src/atlasArt/glyphs.generated.ts with only the icons in use.
// Run: node scripts/atlas-art/glyphs.mjs [--list]   (downloads each new icon once, as data)
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const VERSION = '2.1.1';
const CACHE = 'scripts/atlas-art/.phosphor';
const WEIGHT = 'duotone';
await mkdir(CACHE, { recursive: true });
const fetchText = async (url, file) => {
  const local = path.join(CACHE, file);
  if (existsSync(local)) return readFile(local, 'utf8');
  const response = await fetch(url, { headers: { 'User-Agent': 'mok-atlas-art/0.1' } });
  if (!response.ok) throw Error(`${response.status} ${url}`);
  const text = await response.text();
  await writeFile(local, text);
  return text;
};

// The catalog ships as a JS module; it is read as text, never run.
const catalogSource = await fetchText(`https://cdn.jsdelivr.net/npm/@phosphor-icons/core@${VERSION}/dist/index.mjs`, 'index.mjs');
const icons = [...catalogSource.matchAll(/\n {4}name: "([^"]+)",\s*pascal_name: "[^"]*",(?:\s*alias: \{[^}]*\},)?\s*categories: \[([^\]]*)\],[\s\S]*?tags: \[([\s\S]*?)\]/g)]
  .map(([, name, categories, tags]) => ({ name, categories: categories.split(',').map(c => c.trim().replace(/^e\./, '')), tags: [...tags.matchAll(/"([^"]+)"/g)].map(m => m[1]) }));
if (icons.length < 1000) throw Error(`Read only ${icons.length} icons from the catalog`);
const iconNames = new Set(icons.map(icon => icon.name));

// Headline territories: chosen by hand, since these are the first thing anyone sees.
const PICKS = {
  science: 'atom', technology: 'cpu', humanities: 'scroll', society: 'users-three', mathematics: 'function',
  arts: 'palette', earth: 'globe-hemisphere-west', economics: 'chart-line-up',
  'science.physics': 'magnet', 'science.biology': 'dna', 'science.chemistry': 'flask', 'science.astronomy': 'planet', 'science.medicine': 'stethoscope',
  'technology.computing': 'code', 'technology.engineering': 'gear-six', 'technology.materials': 'cube', 'technology.energy': 'lightning', 'technology.networks': 'share-network',
  'humanities.history': 'hourglass-medium', 'humanities.philosophy': 'yin-yang', 'humanities.languages': 'translate', 'humanities.literature': 'book-open-text', 'humanities.archaeology': 'shovel',
  'society.psychology': 'brain', 'society.sociology': 'users-four', 'society.politics': 'scales', 'society.anthropology': 'mask-happy', 'society.education': 'graduation-cap',
  'mathematics.foundations': 'hash', 'mathematics.algebra': 'math-operations', 'mathematics.geometry': 'compass-tool', 'mathematics.analysis': 'wave-sine', 'mathematics.probability': 'dice-five', 'mathematics.logic': 'intersect',
  'arts.music': 'music-notes', 'arts.visual-arts': 'paint-brush', 'arts.architecture': 'buildings', 'arts.theatre': 'mask-sad', 'arts.design': 'pen-nib',
  'earth.climate': 'cloud-sun', 'earth.oceans': 'waves', 'earth.geology': 'mountains', 'earth.ecology': 'leaf', 'earth.geography': 'map-trifold',
  'economics.markets': 'storefront', 'economics.exchange': 'handshake', 'economics.money': 'coins', 'economics.institutions': 'bank', 'economics.decision-theory': 'signpost',
  'science.biology.molecules-cells': 'circles-three', 'science.biology.genetics-genomes': 'dna', 'science.biology.evolution': 'tree-structure', 'science.biology.plants-fungi': 'plant',
  'science.biology.animals': 'paw-print', 'science.biology.microbes': 'virus', 'science.biology.development-physiology': 'heartbeat',
  'humanities.history.medieval-world': 'castle-turret', 'humanities.history.medieval-world.black-death': 'skull',
};
// One level further, where the map has places. In the real pipeline the place generator would
// choose each new place's glyph from this icon list as it charts the place.
const DEEPER = {
  'science.physics': { mechanics: 'path', thermodynamics: 'thermometer-hot', electromagnetism: 'magnet-straight', optics: 'rainbow', relativity: 'clock-clockwise', 'quantum-physics': 'wave-square' },
  'science.physics.mechanics': { motion: 'person-simple-run', forces: 'arrows-in', energy: 'flame', momentum: 'soccer-ball', equilibrium: 'scales', oscillation: 'wave-sine' },
  'science.biology.evolution': { 'tree-thinking': 'tree', 'variation-heredity': 'fingerprint', 'natural-selection': 'bird', 'chance-drift': 'shuffle', 'new-species': 'egg-crack', 'deep-time': 'hourglass-low', evidence: 'magnifying-glass', 'transitions-extinctions': 'bone', 'human-evolution': 'person-simple-walk', 'evolution-now': 'bug', 'sexual-selection': 'feather', 'how-we-know': 'notebook' },
  'science.biology.genetics-genomes': { dna: 'dna', dominance: 'crown-simple', 'gene-regulation': 'toggle-right' },
  'technology.computing': { programming: 'brackets-curly', 'computer-hardware': 'hard-drives', 'operating-systems': 'app-window', databases: 'database', 'computer-networks': 'wifi-high', 'human-computer-interaction': 'hand-tap' },
  'technology.computing.programming': { algorithms: 'flow-arrow', 'data-structures': 'stack', 'programming-languages': 'terminal-window', 'software-design': 'puzzle-piece', testing: 'check-square', debugging: 'bug-beetle' },
  'humanities.languages': { linguistics: 'text-aa', 'language-families': 'tree-view', translation: 'translate', 'writing-systems': 'pen', 'language-learning': 'student', 'historical-change': 'clock-counter-clockwise' },
  'humanities.languages.linguistics': { phonetics: 'waveform', phonology: 'ear', morphology: 'puzzle-piece', syntax: 'brackets-angle', semantics: 'lightbulb', pragmatics: 'chat-teardrop-dots' },
  'society.psychology': { cognition: 'brain', development: 'baby', 'social-psychology': 'users', personality: 'mask-happy', 'biological-psychology': 'pulse', 'research-methods': 'clipboard-text' },
  'society.psychology.cognition': { memory: 'archive', attention: 'eye', perception: 'eyeglasses', language: 'chat-circle-text', reasoning: 'lightbulb-filament', 'decision-making': 'git-fork' },
  'mathematics.foundations': { 'pair-surplus': 'arrows-left-right', 'quantity-symbol': 'number-one', 'count-invariance': 'number-circle-three', 'zero-empty': 'number-zero', 'equal-units': 'squares-four', 'unit-path': 'dots-three-outline', 'measure-interval': 'ruler', 'quarter-unit-path': 'chart-pie-slice' },
  'mathematics.geometry': { 'plane-geometry': 'square', 'solid-geometry': 'cube-focus', 'coordinate-geometry': 'grid-four', transformations: 'arrows-clockwise', 'geometric-proof': 'seal-check', 'non-euclidean-geometry': 'globe' },
  'mathematics.geometry.plane-geometry': { triangles: 'triangle', circles: 'circle', polygons: 'polygon', lines: 'line-segment', angles: 'angle', constructions: 'pencil-ruler' },
  'arts.music': { rhythm: 'metronome', melody: 'music-note', harmony: 'piano-keys', timbre: 'speaker-high', form: 'stack-simple', performance: 'microphone-stage' },
  'arts.music.rhythm': { 'pulse-and-meter': 'heartbeat', 'note-durations': 'music-note-simple', syncopation: 'shuffle-angular', polyrhythm: 'waveform', tempo: 'timer', phrasing: 'quotes' },
  'earth.ecology': { ecosystems: 'tree-evergreen', populations: 'fish', communities: 'flower', biodiversity: 'butterfly', conservation: 'recycle', biogeography: 'globe-hemisphere-east' },
  'earth.ecology.ecosystems': { 'energy-flow': 'sun', 'nutrient-cycles': 'drop', habitats: 'house-line', disturbance: 'fire', productivity: 'plant', 'ecosystem-services': 'hand-heart' },
  'economics.decision-theory': { 'choices-under-constraints': 'lock-simple', 'choices-under-uncertainty': 'question', preferences: 'heart', 'game-theory': 'strategy', 'social-choice': 'hand-palm', 'behavioral-economics': 'brain' },
  'economics.decision-theory.choices-under-constraints': { 'opportunity-cost': 'door-open', 'trade-offs': 'scales', 'marginal-choices': 'plus-minus', 'feasible-sets': 'selection', 'resource-allocation': 'chart-pie', 'intertemporal-choice': 'calendar' },
};
PICKS.technology = 'cpu';
PICKS.mathematics = 'pi';
PICKS['science.physics'] = 'lightning';
PICKS['technology.energy'] = 'battery-charging-vertical';
PICKS['technology.materials'] = 'diamond';
PICKS['mathematics.analysis'] = 'infinity';
PICKS['society.politics'] = 'flag-banner';
PICKS['society.anthropology'] = 'campfire';
PICKS['arts.theatre'] = 'mask-sad';
PICKS['humanities.languages'] = 'chats-circle';
PICKS['science.biology'] = 'microscope';
for (const [parent, children] of Object.entries(DEEPER)) for (const [key, name] of Object.entries(children)) PICKS[`${parent}.${key}`] = name;
const missing = Object.entries(PICKS).filter(([, name]) => !iconNames.has(name));
if (missing.length) throw Error(`No Phosphor icon for: ${missing.map(([key, name]) => `${key}=${name}`).join(', ')}`);

// Words that say nothing about what a place is.
const STOP = new Set('the a an and of in on to for from with under past one how we know now new what why is are its by into as at or our your their'.split(' '));
const SKIP_CATEGORIES = new Set(['BRAND', 'ARROWS', 'SYSTEM', 'EDITOR']);
const stem = word => word.length > 4 && word.endsWith('ies') ? `${word.slice(0, -3)}y` : word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;
const words = text => text.toLowerCase().split(/[^a-z]+/).filter(word => word.length > 1 && !STOP.has(word)).map(stem);
const index = icons.filter(icon => !icon.categories.some(category => SKIP_CATEGORIES.has(category)))
  .map(icon => ({ name: icon.name, own: new Set(words(icon.name.replaceAll('-', ' '))), tags: new Set(icon.tags.filter(tag => !tag.startsWith('*')).flatMap(words)) }));

/**
 * An icon whose whole name is the place's name ("Triangles" → triangle), and nothing looser:
 * matching single words or tags picked a wheelchair for Motion and a newspaper for Deep time.
 */
function match(name) {
  const wanted = words(name).join('-');
  return index.find(icon => [...icon.own].join('-') === wanted)?.name ?? null;
}

const nodes = JSON.parse(execFileSync('node', ['scripts/atlas-art/dump-catalog.mjs'], { encoding: 'utf8', maxBuffer: 1 << 24 }));
const stray = Object.keys(PICKS).filter(key => !nodes.some(node => node.id === `knowledge.${key}`));
if (stray.length) throw Error(`Picks for places the atlas does not have: ${stray.join(', ')}`);
const glyphOf = {}, how = { picked: 0, matched: 0, inherited: 0 };
for (const node of nodes) {
  if (node.depth === 0) continue;
  const key = node.id.slice('knowledge.'.length);
  const parentId = node.id.slice(0, node.id.lastIndexOf('.'));
  const picked = PICKS[key], matched = picked ? null : match(node.name);
  const glyph = picked ?? matched ?? glyphOf[parentId] ?? null;
  if (!glyph) continue;
  glyphOf[node.id] = glyph;
  how[picked ? 'picked' : matched ? 'matched' : 'inherited']++;
  if (process.argv.includes('--list')) console.log(`${'  '.repeat(node.depth - 1)}${node.name} → ${glyph}${picked ? ' (pick)' : matched ? '' : ' (inherited)'}`);
}

const used = [...new Set(Object.values(glyphOf))].sort();
const bodies = {};
for (const name of used) {
  const svg = await fetchText(`https://cdn.jsdelivr.net/npm/@phosphor-icons/core@${VERSION}/assets/${WEIGHT}/${name}-${WEIGHT}.svg`, `${name}-${WEIGHT}.svg`);
  // Paths only: anything else in a downloaded file is dropped.
  bodies[name] = [...svg.matchAll(/<(path|circle|rect|line|polyline|polygon|ellipse)\b[^>]*\/>/g)].map(m => m[0]).join('');
}
await mkdir('src/atlasArt', { recursive: true });
await writeFile('src/atlasArt/glyphs.generated.ts', `// Generated by scripts/atlas-art/glyphs.mjs. Do not edit by hand.
// Icons: Phosphor ${VERSION} (${WEIGHT}), MIT licence, https://phosphoricons.com
/** Each place's glyph name. */
export const GLYPH_OF: Readonly<Record<string, string>> = ${JSON.stringify(glyphOf, null, 1)};
/** Each glyph's SVG body, drawn in a 256-unit box with currentColor. */
export const GLYPH_SVG: Readonly<Record<string, string>> = ${JSON.stringify(bodies, null, 1)};
`);
console.log(`${Object.keys(glyphOf).length} places: ${how.picked} picked, ${how.matched} matched, ${how.inherited} inherited; ${used.length} distinct icons`);
