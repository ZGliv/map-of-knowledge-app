// Checks the general layers: every open territory down to depth 4 has children, so every subject
// runs four levels below its fields (to depth 5). Content places (a description, an objective) stay
// leaves. Run: node scripts/atlas-art/check-layers.mjs [subject]
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
let failed = false;
try {
  const { catalog } = await server.ssrLoadModule('/src/core/catalog.ts');
  const subjects = process.argv[2] ? [process.argv[2]] : ['science', 'technology', 'humanities', 'society', 'mathematics', 'arts', 'earth', 'economics'];
  for (const subject of subjects) {
    const problems = [];
    let count = 0;
    const walk = node => {
      count++;
      // Lesson places: content nodes, plus the plain nodes a lesson is pinned to (expeditions/registry.ts).
      const locked = node.description || node.objective || node.id.endsWith('.demonstration') || node.id === 'knowledge.arts.music.harmony';
      const kids = catalog.getChildren(node);
      if (locked && kids.length && node.depth >= 4) problems.push(`content place has children: ${node.id}`);
      if (!locked && node.depth < 5 && kids.length === 0) problems.push(`needs children: ${node.id}`);
      if (kids.length > 9 && !kids.some(kid => kid.description)) problems.push(`more than 9 children: ${node.id}`);
      for (const kid of kids) if (kid.name.length > 32) problems.push(`name too long: ${kid.id}`);
      kids.forEach(walk);
    };
    walk(catalog.get(`knowledge.${subject}`));
    console.log(`${subject}: ${count} territories, ${problems.length} problems`);
    for (const problem of problems.slice(0, 40)) console.log(`  ${problem}`);
    if (problems.length) failed = true;
  }
} catch (error) { console.log(`ERROR ${error.message}`); failed = true; }
await server.close();
process.exit(failed ? 1 : 0);
