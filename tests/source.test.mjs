import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {gzipSync} from 'node:zlib';
import {extractSourceEvidence} from '../lib/source-evidence.mjs';
import {sourceBrief} from '../lib/source-brief.mjs';
import {sourceDemoHtml} from '../data/source-demo.mjs';
import {capturePublicSource,isPublicAddress,publicSourceUrl,requestPublicPage,SourceError} from '../server/public-source.mjs';
import {createApp} from '../server/index.mjs';

const source='https://example.org/public-programme',time='2026-10-16T07:00:00.000Z';
const publicDNS=async()=>[{address:'93.184.216.34',family:4}];
const html=(body=sourceDemoHtml,headers={})=>({status:200,headers:{'content-type':'text/html; charset=utf-8',...headers},body:Buffer.from(body)});
const capture=(getPage,extra={})=>capturePublicSource(source,{resolveHost:publicDNS,getPage,now:()=>new Date(time),...extra});

test('static source extraction preserves funding conditions/negation and provenance',()=>{
  const r=extractSourceEvidence(Buffer.from(sourceDemoHtml),{source,fetchedAt:time});
  assert.equal(r.mode,'public-page');assert.equal(r.source,source);assert.equal(r.fetchedAt,time);
  assert.match(r.contentSha256,/^[a-f0-9]{64}$/);assert.equal(r.excerpts.length,4);
  assert.match(r.excerpts[0].text,/pay for their tickets first/);
  assert.ok(r.excerpts[1].text.includes('Visa fees are not covered.'));
  assert.equal(r.excerpts[0].source,source+'#travel');assert.equal(r.excerpts[0].heading,'Funding');
  assert.ok(r.excerpts.some(x=>x.categories.includes('Timing')));assert.ok(r.excerpts.some(x=>x.categories.includes('Requirements')));
});
test('page code/assets/hidden chrome are inert, nested text deduplicated and entities decoded',()=>{
  const markup='<title>Review</title><script>throw new Error("not executed")</script><main><p hidden>Funding hidden</p><p aria-hidden="true">Fees hidden</p><li><p>Travel &amp; accommodation are not covered.</p></li><iframe src="https://example.org/private"></iframe></main><footer><p>Funding footer</p></footer>';
  const r=extractSourceEvidence(Buffer.from(markup),{source,fetchedAt:time});
  assert.equal(r.excerpts.length,1);assert.equal(r.excerpts[0].text,'Travel & accommodation are not covered.');
});
test('contact-looking text is omitted rather than copied into result/title/headings',()=>{
  const contact='synthetic'+'@'+'example.org';
  const r=extractSourceEvidence(Buffer.from(`<title>${contact}</title><main><h2>${contact}</h2><p>Funding questions: ${contact}</p><p>Travel is not covered.</p></main>`),{source,fetchedAt:time});
  assert.equal(r.omittedBlocks,1);assert.equal(r.title,'Public page');assert.ok(!JSON.stringify(r).includes(contact));
});
test('empty evidence is explicit and long/large match sets are marked as limited',()=>{
  assert.equal(extractSourceEvidence(Buffer.from('<main><p>Hello world.</p></main>'),{source,fetchedAt:time}).excerpts.length,0);
  const r=extractSourceEvidence(Buffer.from('<main>'+Array.from({length:30},(_,i)=>`<p>Travel condition ${i}: ${'synthetic wording '.repeat(60)}</p>`).join('')+'</main>'),{source,fetchedAt:time});
  assert.equal(r.excerpts.length,24);assert.equal(r.matchingBlocks,30);assert.equal(r.limited,true);assert.equal(r.excerpts[0].truncated,true);assert.equal(r.excerpts[0].text.length,700);
});
test('selected brief only includes selected excerpts and clearly labels synthetic mode',()=>{
  const r=extractSourceEvidence(Buffer.from(sourceDemoHtml),{source,fetchedAt:time,mode:'synthetic'});
  const brief=sourceBrief(r,[r.excerpts[1].id]);
  assert.match(brief,/Synthetic example; no page fetched/);assert.match(brief,/Visa fees are not covered/);
  assert.ok(!brief.includes('pay for their tickets first'));assert.match(brief,/Selected mentions: 1/);
  assert.match(brief,/not an eligibility or funding verdict/);
  const linked=sourceBrief(r,[r.excerpts[0].id]);
  assert.ok(linked.includes(`Surrounding source: ${source}#travel`));
});
test('long pages retain late deadline evidence and discard link-only table-of-contents noise',()=>{
  const markup='<main><ul><li><a href="#funding">Funding contents link</a></li></ul>'+Array.from({length:40},(_,i)=>`<p>General funding introduction ${i}.</p>`).join('')+'<h2 id="closing">Timing</h2><p>The application deadline is 15 December 2027.</p></main>';
  const r=extractSourceEvidence(Buffer.from(markup),{source,fetchedAt:time});
  assert.equal(r.excerpts.length,24);assert.ok(r.excerpts.some(x=>x.categories.includes('Timing')));assert.ok(!JSON.stringify(r.excerpts).includes('contents link'));
  assert.equal(r.excerpts.find(x=>x.categories.includes('Timing')).source,source+'#closing');
});
test('URL policy refuses private/authenticated/non-HTTPS/query/fragment/custom-port inputs',()=>{
  for(const url of ['http://example.org/','https://127.0.0.1/','https://[::1]/','https://localhost/','https://example.local/','https://example.org:444/','https://u:p@example.org/','https://example.org/?key=synthetic','https://example.org/#section','https://example.org/\n','file:///synthetic','https://example.org/synthetic%40example.org'])assert.throws(()=>publicSourceUrl(url),SourceError,url);
  assert.equal(publicSourceUrl('https://www.python.org/psf/grants/').href,'https://www.python.org/psf/grants/');
});
test('address guard excludes private, mapped, metadata, reserved and transition networks',()=>{
  for(const ip of ['127.0.0.1','10.1.2.3','100.64.0.1','169.254.169.254','172.16.0.1','192.168.1.1','192.0.2.1','198.18.0.1','203.0.113.1','224.0.0.1','0.0.0.0','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1','2002:7f00:1::1','64:ff9b::7f00:1','not-an-ip'])assert.equal(isPublicAddress(ip),false,ip);
  assert.equal(isPublicAddress('93.184.216.34'),true);assert.equal(isPublicAddress('2606:4700:4700::1111'),true);
});
test('mixed/private DNS answers fail before any page request',async()=>{
  let calls=0;
  await assert.rejects(capture(async()=>{calls++;return html();},{resolveHost:async()=>[{address:'93.184.216.34',family:4},{address:'127.0.0.1',family:4}]}),e=>e.code==='dns');
  assert.equal(calls,0);
});
test('real transport pins the validated DNS answer and sends no cookies/auth/profile',async()=>{
  let options,lookedUp;
  const request=(url,opt,callback)=>{
    options=opt;opt.lookup(url.hostname,{all:false},(_,address,family)=>{lookedUp={address,family};});
    const req=new EventEmitter();req.end=()=>{const res=new EventEmitter();res.statusCode=200;res.headers={'content-type':'text/html'};res.destroy=()=>{};callback(res);res.emit('data',Buffer.from(sourceDemoHtml));res.emit('end');};return req;
  };
  const address=(await publicDNS())[0];
  const page=await requestPublicPage(new URL(source),address,new AbortController().signal,request);
  assert.equal(page.status,200);assert.deepEqual(lookedUp,address);assert.equal(options.agent,false);assert.equal(options.autoSelectFamily,false);
  assert.ok(!Object.keys(options.headers).some(x=>/cookie|auth|referer/i.test(x)));
});
test('transport bounds streamed response bytes before parsing',async()=>{
  const request=(_url,_options,callback)=>{
    const req=new EventEmitter();req.end=()=>{const res=new EventEmitter();res.statusCode=200;res.headers={'content-type':'text/html'};res.destroy=()=>{};callback(res);res.emit('data',Buffer.alloc(512001));};return req;
  };
  await assert.rejects(requestPublicPage(new URL(source),(await publicDNS())[0],new AbortController().signal,request),e=>e.code==='size');
});
test('every redirect rechecks public DNS and final source identity is retained',async()=>{
  let calls=0;
  const r=await capture(async url=>++calls===1?{status:302,headers:{location:'/reviewed'},body:Buffer.alloc(0)}:html());
  assert.equal(r.source,'https://example.org/reviewed');assert.equal(calls,2);
  calls=0;
  await assert.rejects(capture(async()=>{calls++;return {status:302,headers:{location:'https://private.example.org/'},body:Buffer.alloc(0)};},{resolveHost:async host=>host==='example.org'?publicDNS():[{address:'10.0.0.1',family:4}]}),e=>e.code==='dns');
  assert.equal(calls,1);
});
test('redirects to local URLs and endless redirects cannot bypass the policy',async()=>{
  await assert.rejects(capture(async()=>({status:302,headers:{location:'http://127.0.0.1/'}})),e=>e.code==='url');
  let calls=0;await assert.rejects(capture(async()=>{calls++;return {status:302,headers:{location:'/again'}};}),e=>e.code==='redirect');assert.equal(calls,4);
});
test('HTTP errors, PDFs, oversized and compressed expansion are explicit failures',async()=>{
  await assert.rejects(capture(async()=>({...html(),status:403})),e=>e.code==='http');
  await assert.rejects(capture(async()=>html('synthetic',{'content-type':'application/pdf'})),e=>e.code==='content');
  await assert.rejects(capture(async()=>html(' '.repeat(512001))),e=>e.code==='size');
  await assert.rejects(capture(async()=>html(gzipSync('x'.repeat(1000001)),{'content-encoding':'gzip'})),e=>e.code==='size');
  await assert.rejects(capture(async()=>html('bad',{'content-encoding':'unknown'})),e=>e.code==='encoding');
});
test('gzip page works and stalled DNS/page reads obey total timeout',async()=>{
  const r=await capture(async()=>html(gzipSync(sourceDemoHtml),{'content-encoding':'gzip'}));assert.equal(r.excerpts.length,4);
  // Keep the test event loop alive while the import's intentionally unrefed timer runs.
  const keep=setTimeout(()=>{},1000);
  try{
    await assert.rejects(capture(async()=>new Promise(()=>{}),{timeoutMs:20}),e=>e.code==='timeout');
    await assert.rejects(capture(async()=>html(),{resolveHost:()=>new Promise(()=>{}),timeoutMs:20}),e=>e.code==='timeout');
  }finally{clearTimeout(keep);}
});

async function withServer(captureSource,fn){const server=createApp({captureSource});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await fn(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise(r=>server.close(r));}}
const post=(base,path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('source API accepts only URL payload; profile/foreign-origin/non-JSON requests fail',()=>withServer(async()=>{throw new Error('should not run');},async base=>{
  assert.equal((await post(base,'/api/source',{url:source,profile:{synthetic:true}})).status,400);
  assert.equal((await post(base,'/api/source',{url:source},{Origin:'https://external.example'})).status,403);
  assert.equal((await post(base,'/api/source',{url:source},{'Content-Type':'text/plain'})).status,415);
}));
test('source API returns observed capture and no-store; synthetic API never calls fetcher',()=>withServer(async url=>capturePublicSource(url,{resolveHost:publicDNS,getPage:async()=>html()}),async base=>{
  const live=await post(base,'/api/source',{url:source});assert.equal(live.status,200);assert.equal(live.headers.get('cache-control'),'no-store');assert.equal((await live.json()).mode,'public-page');
  const demo=await post(base,'/api/source/demo',{});assert.equal(demo.status,200);assert.equal((await demo.json()).mode,'synthetic');
}));
test('source API masks unknown transport errors and releases concurrency slot',()=>withServer(async()=>{throw new Error('synthetic-private-stack-path');},async base=>{
  for(let i=0;i<2;i++){const r=await post(base,'/api/source',{url:source});assert.equal(r.status,502);const body=await r.json();assert.equal(body.code,'source_unavailable');assert.ok(!JSON.stringify(body).includes('private-stack'));}
}));

test('source API exposes stable safe failure codes without claiming an empty successful read',()=>withServer(async()=>{throw new SourceError('content');},async base=>{
  const r=await post(base,'/api/source',{url:source});assert.equal(r.status,422);
  const body=await r.json();assert.equal(body.code,'content');assert.match(body.error,/not an HTML page/);assert.ok(!Object.hasOwn(body,'excerpts'));
}));
test('source API allows only one active external capture',async()=>{
  let signalEntered,release;
  const entered=new Promise(resolve=>{signalEntered=resolve;});
  await withServer(async()=>{signalEntered();await new Promise(resolve=>{release=resolve;});return extractSourceEvidence(Buffer.from(sourceDemoHtml),{source,fetchedAt:time});},async base=>{
    const first=post(base,'/api/source',{url:source});await entered;
    const second=await post(base,'/api/source',{url:source});assert.equal(second.status,429);await second.json();
    release();const done=await first;assert.equal(done.status,200);await done.json();
  });
});
