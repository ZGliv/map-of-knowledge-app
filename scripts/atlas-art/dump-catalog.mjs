// Prints every atlas node (id, name, depth) as JSON, loading the TypeScript catalog through Vite.
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
const { catalog } = await server.ssrLoadModule('/src/core/catalog.ts');
const nodes = [];
const walk = node => { nodes.push({ id: node.id, name: node.name, depth: node.depth, sample: !!node.sample }); catalog.getChildren(node).forEach(walk); };
walk(catalog.root);
process.stdout.write(JSON.stringify(nodes));
await server.close();
