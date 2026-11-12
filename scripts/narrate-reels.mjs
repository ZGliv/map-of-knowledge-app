// Pre-generates every Explore reel's narration with Piper (the public-domain LJ Speech voice,
// as installed for shortgen) and keys the captions to the real audio timing.
//
//   node scripts/narrate-reels.mjs            regenerate reels whose captions changed
//   node scripts/narrate-reels.mjs --all      regenerate every reel
//   node scripts/narrate-reels.mjs --check    also transcribe each file with whisper.cpp and report word error rates
//
// Writes public/explore/narration/<reel>.mp3 (mono MP3, 40 kbps) and src/explore/narration.json
// (per frame: a hash of its caption, its start and end, and each spoken line's span, in seconds).
// Overrides: PIPER_PYTHON, PIPER_MODEL, FFMPEG, WHISPER_CLI, WHISPER_MODEL.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOME = homedir();
const PYTHON = process.env.PIPER_PYTHON || path.join(HOME, 'Developer/shortgen/.venv/bin/python');
const MODEL = process.env.PIPER_MODEL || path.join(HOME, 'Developer/shortgen/models/en/en_US/ljspeech/high/en_US-ljspeech-high.onnx');
const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
const WHISPER = process.env.WHISPER_CLI || '/opt/homebrew/bin/whisper-cli';
const WHISPER_MODEL = process.env.WHISPER_MODEL || path.join(HOME, 'Library/Application Support/superwhisper/ggml-small.bin');
const OUT = path.join(ROOT, 'public/explore/narration');
const MANIFEST = path.join(ROOT, 'src/explore/narration.json');
const GAPS = { lead: 0.25, line: 0.3, frame: 0.62, tail: 1.1 };
const LENGTH_SCALE = 1.04;

const args = new Set(process.argv.slice(2));
const { splitLines, spokenText, frameHash } = await import(pathToFileURL(path.join(ROOT, 'src/explore/narrationText.ts')).href);
const reels = [];
for (const file of readdirSync(path.join(ROOT, 'src/explore/reels')).filter(name => name.endsWith('.ts')).sort()) {
  const module = await import(pathToFileURL(path.join(ROOT, 'src/explore/reels', file)).href);
  for (const value of Object.values(module)) if (Array.isArray(value)) reels.push(...value);
}
// Generated places keep their reels in their bundle (src/places/generated/<id>.ts, type imports only).
for (const file of readdirSync(path.join(ROOT, 'src/places/generated')).filter(name => name.endsWith('.ts') && name !== 'index.ts').sort()) {
  const module = await import(pathToFileURL(path.join(ROOT, 'src/places/generated', file)).href);
  for (const value of Object.values(module)) if (value && typeof value === 'object' && Array.isArray(value.reels)) reels.push(...value.reels);
}
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { reels: {} };
manifest.voice = 'Piper 1.4 · en_US-ljspeech-high (LJ Speech, public domain)';
const stale = reels.filter(reel => {
  const saved = manifest.reels[reel.id];
  if (args.has('--all') || !saved || !existsSync(path.join(ROOT, 'public', saved.src))) return true;
  return saved.frames.length !== reel.frames.length || reel.frames.some((frame, i) => saved.frames[i].hash !== frameHash(frame));
});
for (const id of Object.keys(manifest.reels)) if (!reels.some(reel => reel.id === id)) delete manifest.reels[id];

mkdirSync(OUT, { recursive: true });
const work = mkdtempSync(path.join(tmpdir(), 'mok-narration-'));
try {
  if (stale.length) {
    console.log(`Synthesizing ${stale.length} reel(s): ${stale.map(reel => reel.id).join(', ')}`);
    const job = { model: MODEL, length_scale: LENGTH_SCALE, gaps: GAPS, reels: stale.map(reel => ({ id: reel.id, frames: reel.frames.map(frame => ({ lines: splitLines(spokenText(frame)) })) })) };
    writeFileSync(path.join(work, 'job.json'), JSON.stringify(job));
    const report = JSON.parse(execFileSync(PYTHON, ['-I', path.join(ROOT, 'scripts/narration/piper_reels.py'), path.join(work, 'job.json'), work], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 << 20 }));
    for (const reel of stale) {
      const timing = report[reel.id];
      const mp3 = path.join(OUT, `${reel.id}.mp3`);
      execFileSync(FFMPEG, ['-loglevel', 'error', '-y', '-i', path.join(work, `${reel.id}.wav`), '-af', 'loudnorm=I=-17:TP=-1.5:LRA=11', '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '40k', mp3]);
      manifest.reels[reel.id] = {
        src: `explore/narration/${reel.id}.mp3`,
        bytes: statSync(mp3).size,
        duration: timing.duration,
        frames: reel.frames.map((frame, i) => ({ hash: frameHash(frame), start: timing.frames[i].start, end: timing.frames[i].end, lines: timing.frames[i].lines })),
      };
      console.log(`  ${reel.id}: ${timing.duration.toFixed(1)} s, ${(statSync(mp3).size / 1024).toFixed(0)} KB`);
    }
    const ordered = { voice: manifest.voice, reels: Object.fromEntries(reels.map(reel => [reel.id, manifest.reels[reel.id]]).filter(([, value]) => value)) };
    writeFileSync(MANIFEST, `${JSON.stringify(ordered, null, 1)}\n`);
  } else console.log('Every reel’s narration matches its captions.');

  if (args.has('--check')) {
    // Intelligibility: transcribe each file and compare with what it was meant to say.
    const words = text => text.toLowerCase().replace(/[“”"’‘]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const distance = (a, b) => {
      const row = Array.from({ length: b.length + 1 }, (_, i) => i);
      for (let i = 1; i <= a.length; i += 1) {
        let prev = row[0]; row[0] = i;
        for (let j = 1; j <= b.length; j += 1) { const keep = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = keep; }
      }
      return row[b.length];
    };
    let errors = 0, total = 0;
    for (const reel of reels) {
      const wav = path.join(work, `${reel.id}.16k.wav`);
      execFileSync(FFMPEG, ['-loglevel', 'error', '-y', '-i', path.join(ROOT, 'public', manifest.reels[reel.id].src), '-ar', '16000', '-ac', '1', wav]);
      const heard = execFileSync(WHISPER, ['-m', WHISPER_MODEL, '-f', wav, '-nt', '-np', '-l', 'en'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const expected = words(reel.frames.map(frame => frame.text).join(' '));
      const d = distance(expected, words(heard));
      errors += d; total += expected.length;
      console.log(`  ${reel.id.padEnd(34)} WER ${(100 * d / expected.length).toFixed(1)}%  heard: ${heard.trim().slice(0, 110)}…`);
    }
    console.log(`Overall word error rate against the captions: ${(100 * errors / total).toFixed(1)}%`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
