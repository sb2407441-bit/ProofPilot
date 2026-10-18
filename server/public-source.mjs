import https from 'node:https';
import {lookup} from 'node:dns/promises';
import {BlockList,isIP} from 'node:net';
import {gunzip,brotliDecompress,inflate} from 'node:zlib';
import {promisify} from 'node:util';
import {extractSourceEvidence} from '../lib/source-evidence.mjs';
import {detectSensitiveText} from '../lib/engine.mjs';

const MAX_WIRE=512000,MAX_HTML=1000000;
const messages={url:'Use a public HTTPS page URL without credentials, query, fragment or a custom port.',dns:'The hostname must resolve only to public internet addresses.',fetch:'The public page could not be reached. Check the URL or try another source.',timeout:'The source took too long. Try again or choose another public HTML page.',http:'The source returned a non-success HTTP response. Login and access restrictions are not bypassed.',content:'This source is not an HTML page. PDFs and other file formats are not supported.',size:'The page exceeds the bounded import size. Choose a smaller source page.',encoding:'The page uses an unsupported or invalid content encoding.',redirect:'The page redirected too many times. Use its final public URL.'};
export class SourceError extends Error{constructor(code){super(messages[code]||messages.fetch);this.code=Object.hasOwn(messages,code)?code:'fetch';}}
const blocked=new BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]])blocked.addSubnet(address,prefix,'ipv4');
const globalV6=new BlockList();globalV6.addSubnet('2000::',3,'ipv6');
for(const [address,prefix] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]])blocked.addSubnet(address,prefix,'ipv6');
export function isPublicAddress(address){
  const family=isIP(address);
  return family===4?!blocked.check(address,'ipv4'):family===6&&globalV6.check(address,'ipv6')&&!blocked.check(address,'ipv6');
}
export function publicSourceUrl(input){
  if(typeof input!=='string'||input.length>800||/[\u0000-\u0020\u007f]/.test(input))throw new SourceError('url');
  let url;try{url=new URL(input);}catch{throw new SourceError('url');}
  const host=url.hostname.toLowerCase().replace(/\.$/,'');
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port||isIP(host)||!host.includes('.')||!host.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))||/\.(local|localhost|internal|test|invalid|onion)$/.test(host))throw new SourceError('url');
  let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{throw new SourceError('url');}
  if(detectSensitiveText(decoded).length)throw new SourceError('url');
  url.hostname=host;
  return url;
}

export function requestPublicPage(url,address,signal,request=https.request){
  return new Promise((resolve,reject)=>{
    const req=request(url,{method:'GET',agent:false,signal,family:address.family,autoSelectFamily:false,maxHeaderSize:16384,
      // Pin the validated DNS answer while retaining HTTPS hostname/TLS checks.
      lookup:(_host,options,cb)=>options.all?cb(null,[address]):cb(null,address.address,address.family),
      headers:{'User-Agent':'ProofPilot/0.1 PublicSourceReview (+https://github.com/sb2407441-bit/ProofPilot)','Accept':'text/html, application/xhtml+xml','Accept-Encoding':'gzip, deflate, br'}},res=>{
      if([301,302,303,307,308].includes(res.statusCode)){resolve({status:res.statusCode,headers:res.headers,body:Buffer.alloc(0)});res.destroy();return;}
      if(res.statusCode<200||res.statusCode>=300){res.destroy();reject(new SourceError('http'));return;}
      if(!/^(text\/html|application\/xhtml\+xml)(?:;|$)/i.test(res.headers['content-type']||'')){res.destroy();reject(new SourceError('content'));return;}
      const chunks=[];let size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>MAX_WIRE){reject(new SourceError('size'));res.destroy();}else chunks.push(chunk);});
      res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
      res.on('error',()=>reject(new SourceError('fetch')));
      res.on('aborted',()=>reject(new SourceError('fetch')));
    });
    req.on('error',error=>reject(error instanceof SourceError?error:new SourceError(signal.aborted?'timeout':'fetch')));
    req.end();
  });
}

export async function capturePublicSource(input,{resolveHost=host=>lookup(host,{all:true,verbatim:true}),getPage=requestPublicPage,now=()=>new Date(),timeoutMs=12000}={}){
  let url=publicSourceUrl(input);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);timer.unref();
  const aborted=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(new SourceError('timeout')),{once:true}));
  try{
    for(let hop=0;hop<=3;hop++){
      const answers=await Promise.race([resolveHost(url.hostname),aborted]);
      if(!Array.isArray(answers)||!answers.length||answers.some(x=>!isPublicAddress(x.address)||x.family!==isIP(x.address)))throw new SourceError('dns');
      const address=answers.find(x=>x.family===4)||answers[0];
      const page=await Promise.race([getPage(url,address,controller.signal),aborted]);
      if([301,302,303,307,308].includes(page.status)){
        if(hop===3)throw new SourceError('redirect');
        if(typeof page.headers.location!=='string')throw new SourceError('redirect');
        url=publicSourceUrl(new URL(page.headers.location,url).href);continue;
      }
      if(page.status<200||page.status>=300)throw new SourceError('http');
      if(!/^(text\/html|application\/xhtml\+xml)(?:;|$)/i.test(page.headers['content-type']||''))throw new SourceError('content');
      if(!Buffer.isBuffer(page.body)||page.body.length>MAX_WIRE)throw new SourceError('size');
      const encoding=page.headers['content-encoding']?.toLowerCase()||'identity';
      let bytes=page.body;
      if(encoding!=='identity'){
        const decode={gzip:gunzip,deflate:inflate,br:brotliDecompress}[encoding];
        if(!decode)throw new SourceError('encoding');
        try{bytes=await Promise.race([promisify(decode)(bytes,{maxOutputLength:MAX_HTML}),aborted]);}catch(e){if(e instanceof SourceError)throw e;throw new SourceError(e.code==='ERR_BUFFER_TOO_LARGE'?'size':'encoding');}
      }
      if(bytes.length>MAX_HTML)throw new SourceError('size');
      return extractSourceEvidence(bytes,{source:url.href,fetchedAt:now().toISOString()});
    }
  }catch(error){throw error instanceof SourceError?error:new SourceError(controller.signal.aborted?'timeout':'fetch');}
  finally{clearTimeout(timer);}
}
