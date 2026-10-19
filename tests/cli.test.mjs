import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {syntheticSnapshots,compareSnapshots} from '../lib/changes.mjs';
import {demoProfile} from '../data/opportunities.mjs';

const cli=fileURLToPath(new URL('../scripts/compare.mjs',import.meta.url));
const now='2026-10-12T03:00:00Z';
const run=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:10000});
const demo=(scenario,...args)=>run('--demo',scenario,'--now',now,...args);
async function files(t){
  const dir=await mkdtemp(join(tmpdir(),'proofpilot-synthetic-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const samples=syntheticSnapshots(new Date(now));
  const previous=join(dir,'before.json'),candidate=join(dir,'after.json'),profile=join(dir,'profile.json');
  await writeFile(previous,JSON.stringify(samples.previous));
  await writeFile(candidate,JSON.stringify(samples.funding));
  await writeFile(profile,JSON.stringify(demoProfile));
  return {dir,previous,candidate,profile,samples,args:['--previous',previous,'--candidate',candidate,'--now',now]};
}

test('CLI funding demo produces actual decisions and conservative gate exit 2',()=>{
  const r=demo('funding','--format','json','--fail-on','review');
  assert.equal(r.status,2);assert.equal(r.stderr,'');
  const report=JSON.parse(r.stdout);
  assert.equal(report.schemaVersion,1);assert.equal(report.mode,'offline');
  assert.deepEqual(report.decisions,{previous:'Likely fit',candidate:'Upfront costs'});
  assert.deepEqual(report.gate,{policy:'review',blocked:true});
});
test('identical demo passes both gate policies and never writes diagnostics',()=>{
  for(const policy of ['review','decision']){
    const r=demo('unchanged','--fail-on',policy,'--format','json');
    assert.equal(r.status,0);assert.equal(r.stderr,'');assert.equal(JSON.parse(r.stdout).state,'No changes');
  }
});
test('deadline demo blocks decision gate and reports closed candidate',()=>{
  const r=demo('deadline','--fail-on','decision','--format','json');assert.equal(r.status,2);assert.equal(JSON.parse(r.stdout).decisions.candidate,'Closed');
});
test('default preview returns success with Markdown and explicit synthetic profile',()=>{
  const r=demo('funding');assert.equal(r.status,0);assert.match(r.stdout,/# ProofPilot change review/);assert.match(r.stdout,/Profile mode: synthetic-demo/);assert.match(r.stdout,/Gate policy: none/);
});
test('file workflow matches shared browser engine and JSON omits profile fields',async t=>{
  const f=await files(t);
  const p={...demoProfile,canFrontTravel:true,role:'Synthetic role not for export',leadershipAction:'Synthetic personal text not for export'};
  await writeFile(f.profile,JSON.stringify(p));
  const r=run(...f.args,'--profile',f.profile,'--format','json');assert.equal(r.status,0);
  const actual=JSON.parse(r.stdout),expected=compareSnapshots(JSON.stringify(f.samples.previous),JSON.stringify(f.samples.funding),p,new Date(now));
  assert.deepEqual(actual.changes,expected.changes);assert.deepEqual(actual.checks,expected.checks);
  assert.equal(actual.decisions.candidate,expected.afterFit.status);assert.equal(actual.profileMode,'supplied');
  for(const value of [p.role,p.leadershipAction,'birthYear','country','degreeCompleted','experienceMonths'])assert.ok(!r.stdout.includes(value));
});
test('wording-only change blocks review gate while narrower decision gate passes',async t=>{
  const f=await files(t);const prose=structuredClone(f.samples.previous);prose.funding.detail='Synthetic wording revision needing human review.';
  await writeFile(f.candidate,JSON.stringify(prose));
  assert.equal(run(...f.args,'--fail-on','review').status,2);
  const r=run(...f.args,'--fail-on','decision','--format','json');assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).reviewRequired,true);
});
test('stale-to-current refresh blocks conservative gate even without substantive field changes',async t=>{
  const f=await files(t);f.samples.previous.checkedAt='2026-09-01';
  await writeFile(f.previous,JSON.stringify(f.samples.previous));await writeFile(f.candidate,JSON.stringify({...f.samples.previous,checkedAt:'2026-10-12'}));
  const r=run(...f.args,'--fail-on','review','--format','json');assert.equal(r.status,2);assert.equal(JSON.parse(r.stdout).reviewRequired,false);assert.equal(JSON.parse(r.stdout).decisionChanged,true);
});
test('malformed evidence yields unavailable on stderr, exit 1 and no success report',async t=>{
  const f=await files(t);await writeFile(f.candidate,'{"name":"synthetic raw value that must not leak",');
  const r=run(...f.args,'--format','json');assert.equal(r.status,1);assert.equal(r.stdout,'');assert.match(r.stderr,/Comparison unavailable/);assert.ok(!r.stderr.includes('synthetic raw value'));
});
test('missing file error never echoes its supplied path',async t=>{
  const f=await files(t);const path=join(f.dir,'synthetic-path-that-must-not-leak');
  const r=run('--previous',path,'--candidate',f.candidate);assert.equal(r.status,1);assert.equal(r.stdout,'');assert.ok(!r.stderr.includes(path));assert.ok(!r.stderr.includes('synthetic-path'));
});
test('oversized and non-UTF8 files fail before producing comparison output',async t=>{
  const f=await files(t);
  for(const data of [' '.repeat(48001),Buffer.from([0xff,0xfe])]){
    await writeFile(f.candidate,data);const r=run(...f.args);assert.equal(r.status,1);assert.equal(r.stdout,'');assert.match(r.stderr,/UTF-8/);
  }
});
test('directory input is rejected as an unavailable comparison',async t=>{
  const f=await files(t);const r=run('--previous',f.dir,'--candidate',f.candidate);assert.equal(r.status,1);assert.equal(r.stdout,'');
});
test('unknown, repeated, missing or mixed options cannot silently select a demo',()=>{
  for(const args of [[],['--demo'],['--demo','unknown'],['--demo','funding','--demo','unchanged'],['--demo','funding','--previous','fake'],['--demo','funding','--profile','fake'],['--demo','funding','--format','xml'],['--demo','funding','--fail-on','ignore'],['--unexpected','synthetic-private-value'],['--help','--demo','funding']]){
    const r=run(...args);assert.equal(r.status,1);assert.equal(r.stdout,'');assert.ok(!r.stderr.includes('synthetic-private-value'));
  }
});
test('invalid evaluation timestamps cannot roll over into apparently valid dates',()=>{
  for(const value of ['2026-02-30T03:00:00Z','2026-10-12','2026-10-12T24:00:00Z','2026-10-12T03:00:00+05:00']){
    const r=run('--demo','funding','--now',value);assert.equal(r.status,1);assert.equal(r.stdout,'');assert.ok(!r.stderr.includes(value));
  }
});
test('sensitive or escaped contact text in supplied profile is rejected without disclosure',async t=>{
  const f=await files(t);
  for(const role of ['synthetic'+'@'+'example.com','synthetic\\u0040example.com']){
    const input=JSON.stringify({...demoProfile,role}).replace('\\\\u0040','\\u0040');await writeFile(f.profile,input);
    const r=run(...f.args,'--profile',f.profile);assert.equal(r.status,1);assert.equal(r.stdout,'');assert.ok(!r.stderr.includes('example.com'));
  }
});
test('unknown or incomplete supplied profile never falls back to demo',async t=>{
  const f=await files(t);
  for(const p of [{...demoProfile,extra:'synthetic-private-value'},{weeklyHours:4},null]){
    await writeFile(f.profile,JSON.stringify(p));const r=run(...f.args,'--profile',f.profile);assert.equal(r.status,1);assert.equal(r.stdout,'');assert.ok(!r.stderr.includes('synthetic-private-value'));
  }
});
test('fixed-time JSON demo output is reproducible',()=>{
  assert.equal(demo('funding','--format','json').stdout,demo('funding','--format','json').stdout);
});
test('help works without files and discloses exit codes and offline limitations',()=>{
  const r=run('--help');assert.equal(r.status,0);assert.equal(r.stderr,'');assert.match(r.stdout,/Exit codes/);assert.match(r.stdout,/No fetching, live AI/);
});

test('duplicate snapshot fields make every output format unavailable with no report',async t=>{
  const f=await files(t);
  const ambiguous=JSON.stringify(f.samples.previous).replace('"type":"covered"','"type":"reimbursement","type":"covered"');
  await writeFile(f.candidate,ambiguous);
  for(const format of ['markdown','json','junit']){
    const r=run(...f.args,'--format',format,'--fail-on','review');
    assert.equal(r.status,1);assert.equal(r.stdout,'');assert.match(r.stderr,/Candidate snapshot repeats an object field at line 1, column/);
    assert.ok(!r.stderr.includes('reimbursement'));assert.ok(!r.stderr.includes(f.candidate));
  }
  await writeFile(f.candidate,JSON.stringify(f.samples.previous));
  const recovered=run(...f.args,'--format','json','--fail-on','review');
  assert.equal(recovered.status,0);assert.equal(JSON.parse(recovered.stdout).state,'No changes');
});
test('duplicate supplied profile fields cannot hide a conflicting funding plan',async t=>{
  const f=await files(t);
  const ambiguous=JSON.stringify(demoProfile).replace('"canFrontTravel":false','"canFrontTravel":true,"canFrontTravel":false');
  assert.notEqual(ambiguous,JSON.stringify(demoProfile));
  await writeFile(f.profile,ambiguous);
  const r=run(...f.args,'--profile',f.profile,'--format','junit');
  assert.equal(r.status,1);assert.equal(r.stdout,'');assert.match(r.stderr,/Profile repeats an object field/);
  assert.ok(!r.stderr.includes('canFrontTravel'));
});
