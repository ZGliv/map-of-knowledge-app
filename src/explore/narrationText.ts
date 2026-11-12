// Shared by the app, the validator and scripts/narrate-reels.mjs (run by Node with type
// stripping, so this file must stay import-free).

/** A frame's caption split into the sentences the narration speaks one at a time. */
export function splitLines(text: string): string[] {
  return text
    .split(/(?<=[.!?…][”’"]?)\s+(?=[A-Z0-9“‘"])/u)
    .map(line => line.trim())
    .filter(Boolean);
}

/** FNV-1a, 32-bit: enough to notice that a caption changed after its audio was made. */
export function textHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** What the voice says for a frame, and the fingerprint the audio was made from. */
export const spokenText = (frame: { text: string; say?: string }) => frame.say ?? frame.text;
export const frameHash = (frame: { text: string; say?: string }) => textHash(`${frame.text}\u0000${spokenText(frame)}`);
