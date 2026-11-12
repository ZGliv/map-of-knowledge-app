// All sound is synthesized: no audio files, exact pitches, any ratio on demand.
// Tones are rendered sample by sample so two notes in a 3:2 ratio are exactly
// 3:2. A rounded delay line would detune them and add beating that isn't real.

let context: AudioContext | null = null;
const playing = new Set<AudioBufferSourceNode>();
const cache = new Map<string, AudioBuffer>();

function audio(): AudioContext {
  if (!context) context = new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

type Voice = { freq: number; gain?: number };

function render(key: string, voices: Voice[], seconds: number, shape: 'organ' | 'pluck'): AudioBuffer {
  const hit = cache.get(key);
  if (hit) return hit;
  const ctx = audio();
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(1, length, rate);
  const out = buffer.getChannelData(0);
  const harmonics = shape === 'pluck' ? 10 : 6;
  for (const voice of voices) {
    for (let h = 1; h <= harmonics; h++) {
      const f = voice.freq * h;
      if (f > rate / 2.2) break;
      // A string plucked near its end: odd/even mix that falls off with h².
      const amp = shape === 'pluck'
        ? Math.abs(Math.sin(h * Math.PI * 0.2)) / (h * h) * 1.6
        : 0.55 / h;
      const decay = shape === 'pluck' ? 1.4 + 0.9 * (h - 1) : 0;
      const w = (2 * Math.PI * f) / rate;
      const step = Math.exp(-decay / rate);
      let level = amp * (voice.gain ?? 1);
      for (let i = 0; i < length; i++) {
        out[i] += level * Math.sin(w * i);
        level *= step;
      }
    }
  }
  // Envelope: short attack, gentle release. Then normalize to a safe level.
  const attack = Math.floor(rate * (shape === 'pluck' ? 0.004 : 0.03));
  const release = Math.floor(rate * 0.25);
  let peak = 0;
  for (let i = 0; i < length; i++) {
    let env = 1;
    if (i < attack) env = i / attack;
    else if (i > length - release) env = (length - i) / release;
    out[i] *= env;
    peak = Math.max(peak, Math.abs(out[i]));
  }
  const scale = peak > 0 ? 0.32 / peak : 1;
  for (let i = 0; i < length; i++) out[i] *= scale;
  cache.set(key, buffer);
  return buffer;
}

function play(buffer: AudioBuffer, exclusive = true) {
  const ctx = audio();
  if (exclusive) stopAll();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.onended = () => playing.delete(source);
  playing.add(source);
  source.start();
}

export function stopAll() {
  for (const source of playing) { try { source.stop(); } catch { /* already stopped */ } }
  playing.clear();
}

/** Two sustained notes, the upper one at base × hi/lo. */
export function playInterval(base: number, ratio: [number, number], seconds = 1.8) {
  const upper = base * ratio[0] / ratio[1];
  play(render(`i:${base}:${ratio.join('/')}:${seconds}`, [{ freq: base }, { freq: upper }], seconds, 'organ'));
}

/** A plucked string; pass several frequencies to pluck strings together. */
export function pluck(freqs: number[], seconds = 2.8) {
  const key = `p:${freqs.map(f => f.toFixed(3)).join(',')}`;
  play(render(key, freqs.map(freq => ({ freq })), seconds, 'pluck'));
}
