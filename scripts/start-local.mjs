import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const cwd=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const children=[];let closing=false;
function close(code=0){if(closing)return;closing=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code;}
for(const args of [['scripts/guide-server.mjs'],['node_modules/vite/bin/vite.js','preview','--configLoader','runner','--host','127.0.0.1','--port','4178','--strictPort']]){
 const child=spawn(process.execPath,args,{cwd,stdio:'inherit'});children.push(child);
 child.on('error',error=>{console.error(error.message);close(1)});
 child.on('exit',code=>{if(!closing)close(code||0)});
}
process.on('SIGINT',()=>close());process.on('SIGTERM',()=>close());
