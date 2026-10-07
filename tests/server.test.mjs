import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createApp} from '../server/index.mjs';
import {demoProfile} from '../data/opportunities.mjs';
async function withServer(fn){const server=createApp();await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await fn(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise(r=>server.close(r));}}
const headers={'Host':'127.0.0.1:5189','Content-Type':'application/json'};
test('API creates a labeled template draft end to end',()=>withServer(async base=>{const r=await fetch(base+'/api/draft',{method:'POST',headers,body:JSON.stringify({opportunityId:'glc',profile:demoProfile,useAI:false})});const d=await r.json();assert.equal(r.status,200);assert.equal(d.provider,'template');assert.ok(d.facts.length>0);assert.ok(d.text.includes('Entrepreneurship'));}));
test('external browser origins cannot invoke local drafting',()=>withServer(async base=>{const r=await fetch(base+'/api/draft',{method:'POST',headers:{...headers,Origin:'https://external.example'},body:'{}'});assert.equal(r.status,403);}));
test('arbitrary DNS host is blocked to resist rebinding',()=>withServer(async base=>{const status=await new Promise((resolve,reject)=>{const r=http.request(base+'/api/provider',{headers:{Host:'external.example'}},res=>{res.resume();resolve(res.statusCode);});r.on('error',reject);r.end();});assert.equal(status,403);}));
test('unknown program and invalid JSON give safe validation errors',()=>withServer(async base=>{const r=await fetch(base+'/api/draft',{method:'POST',headers,body:JSON.stringify({opportunityId:'missing',profile:demoProfile})});assert.equal(r.status,400);const bad=await fetch(base+'/api/draft',{method:'POST',headers,body:'{broken'});assert.deepEqual(await bad.json(),{error:'Invalid JSON.'});}));
test('non-JSON write requests are refused',()=>withServer(async base=>{const r=await fetch(base+'/api/draft',{method:'POST',headers:{Host:'127.0.0.1:5189','Content-Type':'text/plain'},body:'{}'});assert.equal(r.status,415);}));
