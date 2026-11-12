// The agent provider: the brief is already on disk (brief.md); a Claude Code agent running the
// generate-reels skill reads it and writes drafts.json. Until that file exists the stage is pending.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readJson } from '../lib.mjs';

export const agent = {
  name: 'agent',
  async draft(brief, { date, dir }) {
    const file = path.join(dir, 'drafts.json');
    if (!existsSync(file)) return { status: 'pending', message: `Draft the reels from content/reels/${date}/brief.md into content/reels/${date}/drafts.json, then run: node scripts/reels/engine.mjs assemble ${date}` };
    const drafts = readJson(file);
    if (!Array.isArray(drafts?.reels)) throw new Error(`${file} has no "reels" array`);
    return { status: 'done', drafts };
  },
};
