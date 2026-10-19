import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReviewJson} from '../lib/review-json.mjs';
import {compareSnapshots,syntheticSnapshots} from '../lib/changes.mjs';
import {demoProfile} from '../data/opportunities.mjs';

const now=new Date('2026-10-19T08:00:00Z');
const original=JSON.stringify(syntheticSnapshots(now).previous);

test('conflicting funding fields cannot become an unchanged likely-fit verdict',()=>{
  const ambiguous=original.replace('"type":"covered"','"type":"reimbursement","type":"covered"');
  assert.throws(()=>compareSnapshots(original,ambiguous,demoProfile,now),/Candidate snapshot repeats an object field/);
  assert.throws(()=>compareSnapshots(ambiguous,original,demoProfile,now),/Previous snapshot repeats an object field/);
});
test('identical repeated fields and overwritten whole objects are also ambiguous',()=>{
  for(const input of ['{"rules":{},"rules":{}}','{"funding":{"type":"covered","type":"covered"}}','{"rules":{"degree":false,"degree":true}}'])
    assert.throws(()=>parseReviewJson(input),/repeats an object field/);
});
test('decoded field names catch Unicode escapes and escaped punctuation',()=>{
  for(const input of [String.raw`{"type":"covered","\u0074ype":"reimbursement"}`,String.raw`{"a/b":0,"a\/b":1}`,String.raw`{"a\"b":0,"a\u0022b":1}`])
    assert.throws(()=>parseReviewJson(input),/repeats an object field/);
});
test('diagnostics locate both definitions without reflecting their names or values',()=>{
  const input='{\r\n  "synthetic-hidden-field": "hidden-first",\r\n  "synthetic-hidden-field": "hidden-second"\r\n}';
  assert.throws(()=>parseReviewJson(input,'Profile'),e=>{
    assert.equal(e.message,'Profile repeats an object field at line 3, column 3 (first at line 2, column 3). Keep one value per field.');
    assert.ok(!e.message.includes('hidden'));return true;
  });
});
test('same names in sibling objects or array elements and strings containing syntax stay valid',()=>{
  const inputs=[{a:{type:1},b:{type:2}},[{type:1},{type:2}],{text:'"type":1, "type":2 } [ \\ "',values:[false,null,2.5e-3,[],{}]},JSON.parse('{"__proto__":1,"constructor":2}')];
  for(const expected of inputs)assert.deepEqual(parseReviewJson(JSON.stringify(expected)),expected);
});
test('native syntax errors stay generic and cannot echo input',()=>{
  for(const input of ['{"hidden-private-value":', '{"a":1,}', '{"a":1 "a":2}', '[1,,2]', String.raw`{"a":"\q"}`, 'true false'])
    assert.throws(()=>parseReviewJson(input),e=>e.message==='Snapshot is not valid JSON. Check quotes, commas and braces.');
});
test('iterative depth guard runs before schema walks and preserves bounded valid nesting',()=>{
  const nested=n=>'['.repeat(n)+'0'+']'.repeat(n);
  assert.deepEqual(parseReviewJson(nested(32)),JSON.parse(nested(32)));
  assert.throws(()=>parseReviewJson(nested(33)),/32-level nesting limit/);
  assert.throws(()=>parseReviewJson(nested(5000)),/32-level nesting limit/);
});
test('length and type guards reject oversized or nontext JSON',()=>{
  for(const value of [null,{},' '.repeat(12001)])assert.throws(()=>parseReviewJson(value),/12,000/);
});
