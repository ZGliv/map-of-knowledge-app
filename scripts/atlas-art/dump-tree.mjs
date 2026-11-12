// The current tree of one subject as indented text, marking places that hold content (never expanded).
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
const { catalog } = await server.ssrLoadModule('/src/core/catalog.ts');
const subject = process.argv[2];
const lines = [];
const walk = node => {
  const locked = node.description || node.objective || node.id.endsWith('.demonstration');
  lines.push(`${'  '.repeat(node.depth - 1)}${node.name}  [${node.id}]${locked ? '  LOCKED' : ''}`);
  if (!locked) catalog.getChildren(node).forEach(walk);
};
walk(catalog.get(`knowledge.${subject}`));
process.stdout.write(lines.join('\n') + '\n');
await server.close();
