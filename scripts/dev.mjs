import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const children=[spawn(process.execPath,['server/index.mjs'],{stdio:'inherit'}),spawn(process.execPath,[fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url))],{stdio:'inherit'})];
for(const child of children)child.on('exit',()=>{for(const other of children)other.kill();});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const child of children)child.kill();process.exit();});
