import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
import {dirname,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
// A fingerprint of everything a check's grade depends on: src/checks/progress.ts and every file it
// imports, transitively. The map trusts its remembered check coloring (src/checks/coloredCache.ts)
// only under the same fingerprint, so a deploy that changes grading never paints a stale copy.
const gradingKey=(()=>{
 const src=fileURLToPath(new URL('./src/',import.meta.url));const files=new Set<string>();
 const isFile=(path:string)=>{try{return statSync(path).isFile()}catch{return false}};
 const visit=(file:string)=>{if(files.has(file))return;files.add(file);for(const [,spec] of readFileSync(file,'utf8').matchAll(/(?:import|export)[^'"]*?from\s*['"](\.[^'"]+)['"]/g)){const base=resolve(dirname(file),spec);const found=[base,`${base}.ts`,`${base}.tsx`,`${base}/index.ts`].find(isFile);if(found)visit(found)}};
 visit(resolve(src,'checks/progress.ts'));
 const hash=createHash('sha256');for(const file of [...files].sort()){hash.update(relative(src,file));hash.update(readFileSync(file))}return hash.digest('hex').slice(0,16);
})();
// The personal guide and the rich-link reader each run as their own local process in development
// (npm run guide, npm run unfurl); on Vercel they are the api/ functions.
const guideProxy={'/api/guide':{target:'http://127.0.0.1:5189',changeOrigin:false},'/api/unfurl':{target:'http://127.0.0.1:5191',changeOrigin:false}};
// Each worktree keeps its own dependency cache: node_modules is a shared symlink, so the default cache would be shared too.
export default defineConfig({plugins:[react()],define:{__MOK_GRADING_KEY__:JSON.stringify(gradingKey)},cacheDir:'.vite',server:{host:'127.0.0.1',port:5178,strictPort:true,fs:{strict:false},proxy:guideProxy},preview:{proxy:guideProxy},build:{target:'es2022',rolldownOptions:{output:{codeSplitting:{groups:[{name:'react',test:/node_modules[\\/](react|react-dom|scheduler)[\\/]/}]}}}}});
