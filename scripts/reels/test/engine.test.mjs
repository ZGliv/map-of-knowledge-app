import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { creditOf, describeFile, licenceOf, measureOnDark, usable, whenOf } from '../commons.mjs';
import { agent } from '../providers/agent.mjs';
import { provider } from '../providers/index.mjs';
import { messages, openrouter, parseReply } from '../providers/openrouter.mjs';
import { heroScore, scoreStory, shortlist } from '../score.mjs';
import { assembleReel, sayYear, speakable, staleSay } from '../stages/assemble.mjs';
import { units } from '../stages/factcheck.mjs';
import { evergreenPicks, published } from '../stages/publish.mjs';
import { relevant, sentences } from '../stages/brief.mjs';
import { splitLines } from '../../../src/explore/narrationText.ts';

const meta = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { value: v }]));

describe('Commons licences and credits', () => {
  it('keeps only the allowlist: public domain, CC0, CC BY and CC BY-SA', () => {
    expect(licenceOf(meta({ License: 'pd', LicenseShortName: 'Public domain' }))).toBe('Public domain');
    expect(licenceOf(meta({ License: 'cc0', LicenseShortName: 'CC0' }))).toBe('CC0');
    expect(licenceOf(meta({ License: 'cc-by-sa-4.0', LicenseShortName: 'CC BY-SA 4.0' }))).toBe('CC BY-SA 4.0');
    expect(licenceOf(meta({ License: 'cc-by-3.0', LicenseShortName: 'CC BY 3.0' }))).toBe('CC BY 3.0');
    for (const code of ['cc-by-nc-4.0', 'cc-by-nd-2.0', 'cc-by-nc-sa-3.0', 'gfdl', 'cc-by-sa-1.0']) expect(licenceOf(meta({ License: code })), code).toBeNull();
  });

  it('reads when a work was made, never Commons’ hidden machine date', () => {
    expect(whenOf('15<sup>th</sup> century<div style="display: none;">date QS:P571,+1450-00-00T00:00:00Z/7</div>')).toBe('15th century');
    expect(whenOf('circa 1654<div style="display: none;">date QS:P571,+1654</div>')).toBe('c. 1654');
    expect(whenOf('between 1890 and 1900')).toBe('c. 1890–1900');
    expect(whenOf('2015-10-23 17:30')).toBe('2015');
  });

  it('never prints a bare link or a footnote marker as a name', () => {
    expect(creditOf(meta({ Artist: 'https://www.gettyimages.co.uk/detail/123', Credit: 'Portrait by Example Studio', DateTimeOriginal: '1910' }))).toBe('Portrait by Example Studio, 1910');
    expect(creditOf(meta({ Artist: 'Maull &amp; Fox [ 1 ]', DateTimeOriginal: 'circa 1854' }))).toBe('Maull & Fox, c. 1854');
    expect(creditOf(meta({ Artist: '' }))).toBe('Unknown author');
  });

  it('refuses restricted, AI-made, copyright-claimed and animated files', () => {
    const page = (categories, extra = {}) => ({ title: 'File:X.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/X.jpg', width: 2000, height: 1500, mime: 'image/jpeg', extmetadata: meta({ License: 'pd', LicenseShortName: 'Public domain', Categories: categories, ...extra }) }] });
    expect(usable(describeFile(page('Featured pictures')))).toBe(true);
    expect(usable(describeFile(page('AI-generated images')))).toBe(false);
    expect(usable(describeFile(page('Items with copyright claims')))).toBe(false);
    expect(usable(describeFile(page('', { Restrictions: 'trademarked' })))).toBe(false);
    const gif = page(''); gif.imageinfo[0].mime = 'image/gif';
    expect(usable(describeFile(gif))).toBe(false);
  });
});

describe('scoring and the shortlist', () => {
  const story = (id, kind, node, extra = {}) => ({ id, kind, headline: '', pages: [], place: { node, provable: false }, score: { total: 3 }, ...extra });

  it('prefers images that may move, big ones, featured ones', () => {
    expect(heroScore({ license: 'Public domain', width: 3000, height: 4000, featured: true })).toBeGreaterThan(heroScore({ license: 'CC BY-SA 4.0', width: 800, height: 600 }));
    expect(heroScore(undefined)).toBeLessThan(0);
  });

  it('scores a surprising, placeable story with a strong hero above a recent grim one', () => {
    const hero = { license: 'Public domain', width: 3000, height: 3000 };
    const good = scoreStory({ kind: 'this-day', year: 1906, headline: 'The first flight certified by any official body' }, { day: '2026-10-23', hero, place: { node: 'knowledge.technology.engineering', provable: false } });
    const grim = scoreStory({ kind: 'this-day', year: 2022, headline: 'Airstrikes killed at least 80 people' }, { day: '2026-10-23', hero, place: { node: 'knowledge.humanities.history', provable: false } });
    expect(good.total).toBeGreaterThan(grim.total);
    expect(grim.parts.grim).toBe(-9);
  });

  it('mixes kinds, one story per place in each pool, the least covered evergreen places first', () => {
    const scored = [
      story('p1', 'place', 'a', { score: { total: 4 } }), story('p2', 'place', 'a', { score: { total: 3.9 } }), story('p3', 'place', 'b', { score: { total: 3 } }),
      story('d1', 'this-day', 'a', { score: { total: 5 } }), story('d2', 'this-day', 'c', { score: { total: 4.5 } }), story('d3', 'this-day', 'c', { score: { total: 4.4 } }),
      story('m1', 'mostread', 'd', { score: { total: 2 } }), story('m2', 'mostread', 'e', { score: { total: 1.9 } }),
    ];
    const out = shortlist(scored, { count: 2, day: '2026-10-23', coverage: { a: 3 } }).map(s => s.id);
    expect(out).toContain('p3');
    expect(out.filter(id => id.startsWith('p')).length).toBeLessThanOrEqual(2);
    expect(out).not.toContain('d3');
    expect(out).toHaveLength(4);
    expect(shortlist(scored, { count: 2, day: '2026-10-23', coverage: { a: 3 } }).map(s => s.id)).toEqual(out);
  });
});

describe('assembly', () => {
  it('spells years for the voice, keeping sentence breaks', () => {
    expect(sayYear(1707)).toBe('seventeen oh-seven');
    expect(sayYear(1900)).toBe('nineteen hundred');
    expect(sayYear(2005)).toBe('two thousand and five');
    expect(speakable('In 1707, four ships sank. 1708 was quieter.')).toBe('In seventeen oh-seven, four ships sank. Seventeen oh-eight was quieter.');
    expect(speakable('It ran 1500 km in the 1920s.')).toBe('It ran 1500 km in the nineteen twenties.');
    const text = 'Paul Fürst engraved him around c. 1656. It was 15 °C.';
    expect(splitLines(speakable(text)).length).toBe(splitLines(text).length);
  });

  it('notices a "say" left behind by an edited caption', () => {
    expect(staleSay('The president played it down, with a propaganda fair about to open.', 'The president played it down, with a propaganda fair about to open.')).toBe(false);
    expect(staleSay('Bankers briefly stopped the slide, buying steel above the market price.', 'Share prices collapsed at the opening bell on Thursday morning.')).toBe(true);
  });

  const story = {
    id: 'onthisday:2026-10-23:x', dateBound: true, expires: '2026-10-24', subject: 'page:X',
    place: { node: 'knowledge.earth.climate', pack: '' },
    media: [
      { key: 'm1', page: 'https://commons.wikimedia.org/wiki/File:A.jpg', src: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/A.jpg', license: 'CC BY 2.0', credit: 'Someone, 2015', mustContain: false },
      { key: 'm2', page: 'https://commons.wikimedia.org/wiki/File:B.jpg', src: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/B.jpg', license: 'CC BY-SA 4.0', credit: 'Other, 2020', mustContain: true },
    ],
    sources: [{ key: 'S1', cite: 'Wikipedia: X' }],
  };
  const draft = {
    story: story.id, template: 'this-day', slug: 'a storm', title: 'A storm', hero: 'm1',
    prediction: { prompt: 'How fast?', choices: [{ id: 'a', label: 'Fast' }, { id: 'b', label: 'Slow' }], answer: 'a', reveal: 1, claims: ['c1'] },
    frames: [{ media: 'm1', x: 50, y: 50, zoom: 1.2, text: 'On 23 October 2015, a storm.', claims: ['c1'] }, { media: 'm2', x: 50, y: 50, zoom: 1.5, text: 'It was fast.', claims: ['c1'] }],
    takeaway: 'Fast.', claims: [{ id: 'c1', claim: 'It was fast', source: 'S1', quote: 'It was very fast indeed.' }], alt: { m1: 'A storm', m2: 'Another' },
  };

  it('fills in the mechanical parts: id, dates, credits, fit, the voice’s years', () => {
    const { reel, problems } = assembleReel(draft, story, '2026-10-23');
    expect(problems).toEqual([]);
    expect(reel).toMatchObject({ id: '2026-10-23-a-storm', from: '2026-10-23', expires: '2026-10-24', nodeId: 'knowledge.earth.climate', packId: '', prediction: { id: 'pre:2026-10-23-a-storm' } });
    expect(reel.media.m1.credit).toBe('Someone, 2015, cropped');
    expect(reel.media.m2).toMatchObject({ fit: 'contain', credit: 'Other, 2020' });
    expect(reel.frames[1].zoom).toBe(1); // ShareAlike: shown whole and unmoved, whatever the draft asked
    expect(reel.frames[0].say).toBe('On 23 October twenty fifteen, a storm.');
    expect(reel.sources[0]).toEqual({ id: 'c1', claim: 'It was fast', cite: 'Wikipedia: X', quote: 'It was very fast indeed.' });
  });

  it('takes a fact-check’s corrected credit and place, and refuses unknown media or sources', () => {
    const { reel } = assembleReel({ ...draft, credit: { m1: 'A Better Name, 2014' }, place: 'knowledge.science.biology.evolution.deep-time' }, story, '2026-10-23', { packAt: node => (node.endsWith('deep-time') ? 'evolution-e06' : undefined) });
    expect(reel.media.m1.credit).toBe('A Better Name, 2014, cropped');
    expect(reel).toMatchObject({ nodeId: 'knowledge.science.biology.evolution.deep-time', packId: 'evolution-e06' });
    const bad = assembleReel({ ...draft, hero: 'm9', claims: [{ ...draft.claims[0], source: 'S7' }] }, story, '2026-10-23');
    expect(bad.problems.join('\n')).toMatch(/media "m9"/);
    expect(bad.problems.join('\n')).toMatch(/cites "S7"/);
  });

  it('inks line art that would vanish on the dark reel, only when its licence allows altering it', () => {
    const vanishes = page => page.endsWith('A.jpg');
    expect(assembleReel(draft, story, '2026-10-23', { vanishes }).reel.media.m1.tone).toBeUndefined(); // CC BY: left alone (the validator refuses it)
    const pd = { ...story, media: story.media.map(m => (m.key === 'm1' ? { ...m, license: 'Public domain' } : m)) };
    expect(assembleReel(draft, pd, '2026-10-23', { vanishes }).reel.media.m1.tone).toBe('ink');
    expect(assembleReel(draft, pd, '2026-10-23').reel.media.m1.tone).toBeUndefined();
  });
});

describe('how a picture reads on the dark reel', () => {
  const ffmpeg = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
  const dir = mkdtempSync(path.join(tmpdir(), 'mok-ondark-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const make = (name, source) => { const file = path.join(dir, name); execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'lavfi', '-i', source, '-frames:v', '1', file]); return file; };

  it.skipIf(!existsSync(ffmpeg))('finds dark lines on a transparent background, and passes opaque pictures and light art', () => {
    // A thin black cross on a clear background (how Commons renders an SVG diagram), a grey photo-like
    // field, and white lines on a clear background.
    const lines = make('lines.png', "color=c=black@0.0:s=120x120,format=rgba,drawbox=x=58:y=0:w=4:h=120:color=black@1:t=fill:replace=1,drawbox=x=0:y=58:w=120:h=4:color=black@1:t=fill:replace=1");
    const photo = make('photo.png', 'color=c=0x806040:s=120x120,format=rgba');
    const light = make('light.png', "color=c=white@0.0:s=120x120,format=rgba,drawbox=x=0:y=0:w=120:h=40:color=white@1:t=fill:replace=1");
    expect(measureOnDark(lines)).toMatchObject({ vanishes: true });
    expect(measureOnDark(photo)).toMatchObject({ vanishes: false, opaque: 1 });
    expect(measureOnDark(light).vanishes).toBe(false);
  });
});

describe('the drafting providers', () => {
  const brief = { date: '2026-10-23', count: 1, templates: { picture: { name: 'The picture' } }, rules: 'Plain English.', schema: '{ "reels": [] }', reserved: ['Daphne Major'], stories: [{ id: 's1', kind: 'picture', place: { name: 'Climate', provable: false }, headline: 'A storm', media: [], sources: [{ key: 'S1', cite: 'Wikipedia: X', sentences: [{ n: 1, text: 'It was fast.' }] }], told: [], reservedHere: [] }] };

  it('are found by name, behind one interface', () => {
    expect(provider('agent')).toBe(agent);
    expect(provider('openrouter')).toBe(openrouter);
    expect(() => provider('nope')).toThrow(/Unknown drafting provider/);
  });

  it('agent: pending until the agent writes drafts.json', async () => {
    expect((await agent.draft(brief, { date: '2026-10-23', dir: '/nonexistent' })).status).toBe('pending');
  });

  it('openrouter: sends the same brief, and reads drafts and usage back', async () => {
    let sent;
    const fetchImpl = async (url, init) => { sent = { url, body: JSON.parse(init.body), auth: init.headers.Authorization }; return new Response(JSON.stringify({ choices: [{ message: { content: '```json\n{"reels":[{"story":"s1"}]}\n```' } }], usage: { prompt_tokens: 1200, completion_tokens: 800, cost: 0.0011 } }), { status: 200 }); };
    const result = await openrouter.draft(brief, { fetchImpl, env: { OPENROUTER_API_KEY: 'test-key', REEL_MODEL: 'some/model' } });
    expect(sent.url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(sent.body.model).toBe('some/model');
    expect(sent.body.messages[0].content).toMatch(/Plain English\./);
    expect(sent.body.messages[1].content).toMatch(/It was fast\./);
    expect(result).toMatchObject({ status: 'done', drafts: { reels: [{ story: 's1' }], drafter: 'some/model' }, usage: { inputTokens: 1200, outputTokens: 800, costUsd: 0.0011 } });
    await expect(openrouter.draft(brief, { fetchImpl, env: {} })).rejects.toThrow(/OPENROUTER_API_KEY/);
    expect(() => parseReply('no json here')).toThrow();
    expect(messages(brief)).toHaveLength(2);
  });
});

describe('the brief, the fact-check sheet and publishing', () => {
  it('splits a source into quotable sentences, not at abbreviations or initials', () => {
    expect(sentences('Op. 23 premiered in Boston. It was by F. Clark Howell. "It ended there," he said at the time. Then more happened here.')).toEqual(['Op. 23 premiered in Boston.', 'It was by F. Clark Howell.', '"It ended there," he said at the time.', 'Then more happened here.']);
    const all = ['The opening sentence of the article is here.', 'A sentence about weather and hurricanes in general terms.', 'Patricia reached 345 km/h winds on 23 October.'];
    expect(relevant(all, 'Patricia record winds', { head: 1, more: 5 }).map(x => x.i)).toEqual([0, 2]);
  });

  it('lists every claim, caption, voice line, image and place as a unit to break', () => {
    const reel = { id: 'r', title: 'T', takeaway: 'K', nodeId: 'n', packId: '', prediction: { prompt: 'P', choices: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], answer: 'a', claims: ['c'] }, frames: [{ text: 'F', say: 'eff', claims: ['c'] }], sources: [{ id: 'c', claim: 'C', cite: 'S', quote: 'Q' }], media: { m1: { alt: 'alt', credit: 'cr', license: 'CC0', page: 'p' } } };
    const ids = units([reel]).map(u => u.id);
    expect(ids).toEqual(['r/title', 'r/f1', 'r/prediction', 'r/takeaway', 'r/claim.c', 'r/media.m1', 'r/place']);
    expect(units([reel]).find(u => u.id === 'r/f1').text).toMatch(/spoken: eff/);
  });

  it('picks evergreen reels in turn after the last deck’s, skipping the week’s and the day’s places', () => {
    const evergreen = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({ id, nodeId: `n${i % 4}` }));
    expect(evergreenPicks(evergreen, [{ nodeId: 'n2' }], '2026-10-24', [['a', 'b']], 2)).toEqual(['d', 'e']);
    expect(evergreenPicks(evergreen, [], '2026-10-24', [['e', 'f']], 2)).toEqual(['a', 'b']);
  });

  it('publishes reels without their quotes', () => {
    expect(published({ id: 'r', sources: [{ id: 'c', claim: 'C', cite: 'S', quote: 'Q' }] })).toEqual({ id: 'r', sources: [{ id: 'c', claim: 'C', cite: 'S' }] });
  });
});
