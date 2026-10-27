// Shared hosting publishes locally verified frontend artifacts rather than
// running Vite under its memory limit. Both source and artifact hashes must match.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifestPath=path.join(root,'frontend-build.json');
const textExtensions=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.css','.scss','.html','.json','.svg','.txt','.md','.yml','.yaml','.toml']);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function bytes(file){const contents=fs.readFileSync(file);return textExtensions.has(path.extname(file))?Buffer.from(contents.toString('utf8').replace(/\r\n/g,'\n')):contents;}
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0).flatMap(entry=>{const file=path.join(directory,entry.name);if(entry.isSymbolicLink())throw Error('Linked frontend files are not supported');return entry.isDirectory()?walk(file):[file];});}
const relative=file=>path.relative(root,file).split(path.sep).join('/');
function sourceFingerprint(){
 const inputs=[...walk(path.join(root,'client/src')),...walk(path.join(root,'client/public')),
  ...['index.html','package.json','package-lock.json','tsconfig.json','tsconfig.app.json','tsconfig.node.json','vite.config.ts'].map(file=>path.join(root,'client',file))];
 return hash(inputs.sort((a,b)=>relative(a)<relative(b)?-1:relative(a)>relative(b)?1:0).map(file=>relative(file)+'\0'+hash(bytes(file))).join('\n'));
}
function safePath(name){
 if(typeof name!=='string'||name.startsWith('/')||name.includes('\\')||name.includes(':')||name.split('/').some(part=>!part||part==='..')||['.env','.htaccess','shop.env','backup.cnf'].includes(path.posix.basename(name)))throw Error('Unsafe frontend artifact path');
 return name;
}
function verify(){
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 if(manifest.version!==1||manifest.sourceFingerprint!==sourceFingerprint())throw Error('Frontend artifacts are stale. Run npm run build:client and commit the generated files and frontend-build.json.');
 if(!manifest.files?.length||!manifest.files.some(file=>file.path==='index.html'))throw Error('Frontend index is missing');
 const seen=new Set();
 for(const file of manifest.files){safePath(file.path);if(seen.has(file.path))throw Error('Duplicate frontend artifact');seen.add(file.path);if(hash(bytes(path.join(root,file.path)))!==file.sha256)throw Error('Frontend artifact mismatch: '+file.path);}
 return manifest;
}
if(process.argv[2]==='write'){
 const output=path.join(root,'client/dist');
 const files=walk(output).map(file=>{const name=safePath(path.relative(output,file).split(path.sep).join('/'));const digest=hash(bytes(file));if(hash(bytes(path.join(root,name)))!==digest)throw Error('Copy the built frontend to the repository root first: '+name);return {path:name,sha256:digest};});
 fs.writeFileSync(manifestPath,JSON.stringify({version:1,sourceFingerprint:sourceFingerprint(),files},null,2)+'\n');
 verify();console.log('Frontend manifest saved and verified: '+files.length+' artifacts.');
}else if(process.argv[2]==='stage'){
 const destination=process.argv[3];if(!destination)throw Error('Supply the private staging directory');
 const manifest=verify(),target=path.resolve(destination);
 fs.mkdirSync(target,{recursive:true});
 for(const file of manifest.files){const output=path.join(target,safePath(file.path));fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,bytes(path.join(root,file.path)),{mode:0o644});}
 console.log('Verified frontend staged: '+manifest.files.length+' artifacts.');
}else if(process.argv[2]==='verify'){
 console.log('Frontend sources and '+verify().files.length+' committed artifacts match.');
}else throw Error('Choose write, verify or stage');
