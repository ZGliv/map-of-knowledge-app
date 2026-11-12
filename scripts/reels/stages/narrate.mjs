// Stage 5a: narration with Piper (the public-domain LJ Speech voice, as installed for shortgen),
// keyed to the captions' exact timing, as scripts/narrate-reels.mjs does for the evergreen deck.
//   content/reels/<date>/reels.json → public/explore/decks/<date>/<reel>.mp3 + each reel's `narration`
// Only reels whose captions changed (or whose file is missing) are synthesised again.
// Overrides: PIPER_PYTHON, PIPER_MODEL, FFMPEG.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { dayDir, deckAudioDir, ensure, logStage, readJson, ROOT, writeJson } from '../lib.mjs';
import { frameHash, spokenText, splitLines } from '../../../src/explore/narrationText.ts';

const HOME = homedir();
const PYTHON = process.env.PIPER_PYTHON || path.join(HOME, 'Developer/shortgen/.venv/bin/python');
const MODEL = process.env.PIPER_MODEL || path.join(HOME, 'Developer/shortgen/models/en/en_US/ljspeech/high/en_US-ljspeech-high.onnx');
const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
// The same pacing as the evergreen deck (scripts/narrate-reels.mjs).
const GAPS = { lead: 0.25, line: 0.3, frame: 0.62, tail: 1.1 };
const LENGTH_SCALE = 1.04;

const current = reel => reel.narration?.frames?.length === reel.frames.length && reel.narration.frames.every((f, i) => f.hash === frameHash(reel.frames[i])) && existsSync(path.join(ROOT, 'public', reel.narration.src));

export function narrate(date, { all = false } = {}) {
  const started = Date.now();
  const file = path.join(dayDir(date), 'reels.json');
  const record = readJson(file);
  if (!record?.reels?.length) throw new Error(`No reels for ${date}: run assemble first`);
  const out = ensure(deckAudioDir(date));
  const stale = record.reels.filter(reel => all || !current(reel));
  if (stale.length) {
    const work = mkdtempSync(path.join(tmpdir(), 'mok-reel-narration-'));
    try {
      console.log(`Synthesizing ${stale.length} reel(s): ${stale.map(r => r.id).join(', ')}`);
      const job = { model: MODEL, length_scale: LENGTH_SCALE, gaps: GAPS, reels: stale.map(reel => ({ id: reel.id, frames: reel.frames.map(frame => ({ lines: splitLines(spokenText(frame)) })) })) };
      writeFileSync(path.join(work, 'job.json'), JSON.stringify(job));
      const report = JSON.parse(execFileSync(PYTHON, ['-I', path.join(ROOT, 'scripts/narration/piper_reels.py'), path.join(work, 'job.json'), work], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 << 20 }));
      for (const reel of stale) {
        const timing = report[reel.id];
        const mp3 = path.join(out, `${reel.id}.mp3`);
        execFileSync(FFMPEG, ['-loglevel', 'error', '-y', '-i', path.join(work, `${reel.id}.wav`), '-af', 'loudnorm=I=-17:TP=-1.5:LRA=11', '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '40k', mp3]);
        reel.narration = {
          src: `explore/decks/${date}/${reel.id}.mp3`,
          bytes: statSync(mp3).size,
          duration: timing.duration,
          frames: reel.frames.map((frame, i) => ({ hash: frameHash(frame), start: timing.frames[i].start, end: timing.frames[i].end, lines: timing.frames[i].lines })),
        };
        console.log(`  ${reel.id}: ${timing.duration.toFixed(1)} s, ${(reel.narration.bytes / 1024).toFixed(0)} KB`);
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  } else console.log('Every reel’s narration matches its captions.');
  // Files left from reels that were cut.
  const keep = new Set(record.reels.map(r => `${r.id}.mp3`));
  for (const name of readdirSync(out)) if (name.endsWith('.mp3') && !keep.has(name)) unlinkSync(path.join(out, name));
  writeJson(file, record);
  const minutes = logStage(date, 'narrate', 'script', started, { synthesized: stale.length, seconds: Math.round(record.reels.reduce((a, r) => a + (r.narration?.duration ?? 0), 0)) });
  console.log(`Narration done (${minutes} min)`);
  return record.reels;
}
