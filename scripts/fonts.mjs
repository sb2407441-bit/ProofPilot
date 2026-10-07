import {mkdir,writeFile} from 'node:fs/promises';
const dir=new URL('../public/fonts/',import.meta.url);await mkdir(dir,{recursive:true});
for(const [family,file,repo] of [['Manrope','manrope-latin','manrope'],['Source Sans 3','source-sans-latin','sourcesans3']]){
  const url='https://fonts.googleapis.com/css2?family='+encodeURIComponent(family)+':wght@200..800&display=swap';
  const css=await (await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}})).text();
  const urls=[...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(x=>x[1]);
  if(!urls.length)throw new Error('No font asset found for '+family);
  const asset=await fetch(urls.at(-1));if(!asset.ok)throw new Error('Font download failed');
  await writeFile(new URL(file+'.woff2',dir),Buffer.from(await asset.arrayBuffer()));
  const license=await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/'+repo+'/OFL.txt');
  if(!license.ok)throw new Error('Font license download failed');
  await writeFile(new URL(repo+'-OFL.txt',dir),await license.text());
  console.log('Saved '+family+' and its open font license.');
}
