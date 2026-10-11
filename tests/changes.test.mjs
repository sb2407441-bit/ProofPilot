import test from 'node:test';
import assert from 'node:assert/strict';
import {changeReport,compareSnapshots,parseSnapshot,syntheticSnapshots} from '../lib/changes.mjs';
import {demoProfile} from '../data/opportunities.mjs';
const now=new Date('2026-10-11T08:00:00Z');
const samples=syntheticSnapshots(now),json=JSON.stringify;
const run=(candidate,profile=demoProfile,previous=samples.previous)=>compareSnapshots(json(previous),json(candidate),profile,now);
const changed=fn=>{const s=structuredClone(samples.previous);fn(s);return s;};

test('funding reversal changes the actual funding decision and preserves both evidence versions',()=>{
  const r=run(samples.funding);
  assert.equal(r.beforeFit.status,'Likely fit');assert.equal(r.afterFit.status,'Upfront costs');
  assert.equal(r.state,'Decision changed');assert.equal(r.reviewRequired,true);
  assert.deepEqual(r.checks.map(x=>[x.label,x.before,x.after]),[['Upfront travel costs','not required','funding']]);
  assert.equal(r.changes.length,3);assert.equal(samples.previous.funding.type,'covered');
});
test('a profile with an upfront plan receives a self-reported consequence rather than a funding block',()=>{
  const r=run(samples.funding,{...demoProfile,canFrontTravel:true});assert.equal(r.afterFit.status,'Likely fit');assert.equal(r.checks[0].after,'reported');assert.equal(r.state,'Decision changed');
});
test('a closed candidate disables drafting even though the previous decision allowed it',()=>{
  const r=run(samples.deadline);assert.equal(r.afterFit.status,'Closed');assert.equal(r.beforeFit.canDraft,true);assert.equal(r.afterFit.canDraft,false);
});
test('increased time commitment is linked to the changed eligibility check',()=>{
  const r=run(changed(s=>s.rules.weeklyHours=8));assert.equal(r.afterFit.status,'Not eligible');assert.ok(r.checks.some(x=>x.label==='8 hours per week'&&x.after==='fail'));
});
test('changed source prose needs review even without a changed decision',()=>{
  const r=run(changed(s=>s.funding.detail='Synthetic travel support is conditional on approval.'));assert.equal(r.state,'Evidence changed');assert.equal(r.decisionChanged,false);assert.equal(r.reviewRequired,true);
});
test('source identity changes remain visible and explicit in the report',()=>{
  const r=run(changed(s=>s.source='https://example.org/another-programme'));assert.equal(r.sourceChanged,true);assert.match(changeReport(r),/Changed — confirm/);
});
test('identical snapshots and differently ordered keys have no differences',()=>{
  const s=samples.previous;const r=run({funding:s.funding,rules:{weeklyHours:4,degree:true},deadline:s.deadline,checkedAt:s.checkedAt,source:s.source,name:s.name});assert.equal(r.state,'No changes');assert.equal(r.reviewRequired,false);assert.equal(r.changes.length,0);
});
test('date refresh alone is distinct from a substantive evidence change',()=>{
  const previous=changed(s=>s.checkedAt='2026-10-10');const r=run(samples.previous,demoProfile,previous);assert.equal(r.state,'Check date changed');assert.equal(r.reviewRequired,false);
});
test('stale-to-current refresh changes the review decision',()=>{
  const previous=changed(s=>s.checkedAt='2026-09-01');const r=run(samples.previous,demoProfile,previous);assert.equal(r.beforeFit.stale,true);assert.equal(r.afterFit.stale,false);assert.equal(r.state,'Decision changed');
});
test('missing/invalid/unknown JSON does not produce a no-change verdict',()=>{
  for(const input of ['','{','null','[]','{}',json({...samples.previous,unexpected:true})])assert.throws(()=>parseSnapshot(input,now));
  assert.throws(()=>parseSnapshot(' '.repeat(12001),now),/12,000/);
});
test('false booleans, unknown rules and invalid funding values are rejected',()=>{
  for(const fn of [s=>s.rules.degree='false',s=>s.rules.custom=true,s=>s.rules.weeklyHours=0,s=>s.rules.age=[30,21],s=>s.funding.type='guaranteed',s=>s.funding.extra=true])assert.throws(()=>parseSnapshot(json(changed(fn)),now));
});
test('impossible and future evidence dates are rejected',()=>{
  for(const fn of [s=>s.checkedAt='2026-02-30',s=>s.checkedAt='2027-01-01',s=>s.deadline.date='2027-02-29'])assert.throws(()=>parseSnapshot(json(changed(fn)),now));
});
test('timestamp deadlines require explicit timezone and a matching real date/time',()=>{
  for(const instant of ['2026-10-11T12:00:00','2026-10-11T24:00:00Z','2026-02-30T12:00:00Z','2026-10-12T12:00:00Z'])assert.throws(()=>parseSnapshot(json(changed(s=>s.deadline={date:'2026-10-11',precision:'instant',instant})),now));
  const r=run(changed(s=>s.deadline={date:'2026-10-11',precision:'instant',instant:'2026-10-11T12:00:00+05:00'}));assert.equal(r.afterFit.deadline.kind,'closed');
});
test('date-only evidence retains uncertainty and rejects hidden instant fields',()=>{
  const r=run(changed(s=>s.deadline.date='2026-10-11'));assert.equal(r.afterFit.deadline.kind,'verify');assert.equal(r.afterFit.status,'Recheck source');
  assert.throws(()=>parseSnapshot(json(changed(s=>s.deadline.instant='2026-10-11T12:00:00Z')),now),/omit instant/);
});
test('public source URLs cannot carry credentials, queries or local addresses',()=>{
  for(const source of ['http://example.org/terms','https://user:pass@example.org/terms','https://example.org/?private=value','https://example.org/#private','https://127.0.0.1/','https://localhost/','https://sample.local/','https://sample.local./','https://app.localhost./','https://[::1]/'])assert.throws(()=>parseSnapshot(json(changed(s=>s.source=source)),now),/Source|sensitive/);
});
test('sensitive-input rejection uses a category-free message without echoing the supplied value',()=>{
  const input=json(changed(s=>s.funding.detail='person'+'@'+'example.com'));
  assert.throws(()=>parseSnapshot(input,now),error=>error.message.includes('sensitive')&&!error.message.includes('person'));
  const escaped=input.replace('@','\\u0040');assert.throws(()=>parseSnapshot(escaped,now),/sensitive/);
});
test('report omits raw profile details, escapes Markdown and retains limits',()=>{
  const r=run(changed(s=>s.name='Sample [studio](https://example.org) <b>'),{...demoProfile,leadershipAction:'Synthetic private profile sentence',role:'Synthetic profile role'});const report=changeReport(r);
  assert.ok(!report.includes('Synthetic private profile sentence'));assert.ok(!report.includes('Synthetic profile role'));assert.ok(report.includes('\\[studio\\]'));assert.ok(report.includes('No scraping, live AI'));assert.ok(report.includes(now.toISOString()));
});
test('invalid profiles cannot silently fall back to the demo profile',()=>{
  assert.throws(()=>run(samples.funding,{...demoProfile,weeklyHours:999}),/Weekly hours/);
});
