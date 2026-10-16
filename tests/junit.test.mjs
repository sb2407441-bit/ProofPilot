import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {syntheticSnapshots} from '../lib/changes.mjs';
import {demoProfile} from '../data/opportunities.mjs';

const cli=fileURLToPath(new URL('../scripts/compare.mjs',import.meta.url));
const now='2026-10-16T03:00:00Z';
const run=(...args)=>spawnSync(process.execPath,[cli,'--now',now,'--format','junit',...args],{encoding:'utf8',timeout:10000});
async function files(t){
  const dir=await mkdtemp(join(tmpdir(),'proofpilot-junit-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const samples=syntheticSnapshots(new Date(now));
  const previous=join(dir,'synthetic-input-before.json'),candidate=join(dir,'synthetic-input-after.json'),profile=join(dir,'synthetic-input-profile.json');
  await writeFile(previous,JSON.stringify(samples.previous));
  await writeFile(candidate,JSON.stringify(samples.funding));
  await writeFile(profile,JSON.stringify(demoProfile));
  return {previous,candidate,profile,samples,args:['--previous',previous,'--candidate',candidate,'--profile',profile]};
}

test('JUnit blocked gate has one actionable failure and preserves exit 2',()=>{
  const r=run('--demo','funding','--fail-on','review');
  assert.equal(r.status,2);assert.equal(r.stderr,'');
  assert.ok(r.stdout.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'));
  assert.match(r.stdout,/<testsuites tests="1" failures="1" errors="0" skipped="0">/);
  assert.equal((r.stdout.match(/<testcase /g)||[]).length,1);
  assert.equal((r.stdout.match(/<failure /g)||[]).length,1);
  assert.match(r.stdout,/HumanReviewRequired/);assert.match(r.stdout,/Review the inputs locally/);
  assert.ok(!r.stdout.includes('<skipped'));
});
test('JUnit identical evidence passes both enforced policies',()=>{
  for(const policy of ['review','decision']){
    const r=run('--demo','unchanged','--fail-on',policy);
    assert.equal(r.status,0);assert.equal(r.stderr,'');
    assert.match(r.stdout,/tests="1" failures="0" errors="0" skipped="0"/);
    assert.ok(!r.stdout.includes('<failure'));assert.ok(!r.stdout.includes('<skipped'));
    assert.match(r.stdout,/Changed fields: 0\. Changed checks: 0\./);
  }
});
test('JUnit preview is skipped rather than a misleading passed policy',()=>{
  const r=run('--demo','funding');
  assert.equal(r.status,0);assert.match(r.stdout,/tests="1" failures="0" errors="0" skipped="1"/);
  assert.match(r.stdout,/<skipped message="Preview only;/);assert.ok(!r.stdout.includes('<failure'));
});
test('JUnit policy results preserve prose-only review versus decision semantics',async t=>{
  const f=await files(t);
  await writeFile(f.candidate,JSON.stringify({...f.samples.previous,funding:{...f.samples.previous.funding,detail:'Synthetic altered terms.'}}));
  const review=run(...f.args,'--fail-on','review'),decision=run(...f.args,'--fail-on','decision');
  assert.equal(review.status,2);assert.match(review.stdout,/<failure /);
  assert.equal(decision.status,0);assert.ok(!decision.stdout.includes('<failure'));
  assert.match(decision.stdout,/Changed fields: 1\. Changed checks: 0\./);
});
test('JUnit never interpolates supplied evidence, profile, paths or XML/CI payloads',async t=>{
  const f=await files(t),s=structuredClone(f.samples.funding);
  s.name='Synthetic <failure> & "name"';s.source='https://example.org/synthetic-source-marker';
  s.funding.detail='Synthetic </system-out><failure>injection</failure> ::error::marker';
  await writeFile(f.candidate,JSON.stringify(s));
  await writeFile(f.profile,JSON.stringify({...demoProfile,role:'Synthetic profile role marker',leadershipAction:'Synthetic private narrative marker'}));
  const r=run(...f.args,'--fail-on','review');assert.equal(r.status,2);assert.equal(r.stderr,'');
  for(const value of [s.name,s.source,s.funding.detail,'synthetic-input-','profile role marker','private narrative marker','example.org','::error::','Upfront costs','birthYear','country'])assert.ok(!r.stdout.includes(value),value);
  assert.equal((r.stdout.match(/<failure /g)||[]).length,1);
  assert.match(r.stdout,/Profile mode: supplied/);
});
test('JUnit invalid and missing inputs remain exit 1 without a false test report',async t=>{
  const f=await files(t);
  for(const content of ['{"name":"Synthetic malformed marker",','{"name":"Synthetic incomplete marker"}']){
    await writeFile(f.candidate,content);
    const r=run(...f.args,'--fail-on','review');assert.equal(r.status,1);assert.equal(r.stdout,'');
    assert.match(r.stderr,/Comparison unavailable/);assert.ok(!r.stderr.includes('marker'));
  }
  const missing=run('--previous',f.previous+'-absent','--candidate',f.candidate);
  assert.equal(missing.status,1);assert.equal(missing.stdout,'');assert.ok(!missing.stderr.includes(f.previous));
});
test('JUnit is repeatable at a fixed clock and discloses limited gate meaning',()=>{
  const a=run('--demo','deadline','--fail-on','decision'),b=run('--demo','deadline','--fail-on','decision');
  assert.equal(a.status,2);assert.equal(a.stdout,b.stdout);
  assert.match(a.stdout,/Evaluated: 2026-10-16T03:00:00\.000Z/);
  assert.match(a.stdout,/does not certify eligibility or source accuracy/);
});
