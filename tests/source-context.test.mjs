import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSourceEvidence} from '../lib/source-evidence.mjs';
import {sourceBrief} from '../lib/source-brief.mjs';
import {createApp} from '../server/index.mjs';

const source='https://example.org/conditions',fetchedAt='2026-10-20T09:40:00.000Z';
const extract=body=>extractSourceEvidence(Buffer.from(`<main>${body}</main>`),{source,fetchedAt,mode:'synthetic'});

test('list lead-ins and trailing conditions stay with the matching child paragraph',()=>{
  const r=extract('<h2 id="funding">Funding</h2><ul><li id="travel">Only after attendance:<p>Travel costs are covered.</p>Participants must buy tickets first.</li></ul>');
  assert.equal(r.excerpts.length,1);
  assert.equal(r.excerpts[0].text,'Only after attendance: Travel costs are covered. Participants must buy tickets first.');
  assert.equal(r.excerpts[0].context,'list-item');
  assert.equal(r.excerpts[0].source,source+'#travel');
  assert.deepEqual(r.excerpts[0].categories,['Funding','Requirements']);
});

test('nested exceptions remain in the outer list item without detached child excerpts',()=>{
  const r=extract('<ul><li><p>Travel is covered.</p><ul><li>Only after attendance.</li><li>Visa fees are not covered.</li></ul><p>Receipts are required.</p></li><li>Accommodation is not covered.</li></ul>');
  assert.equal(r.excerpts.length,2);
  assert.equal(r.excerpts[0].text,'Travel is covered. Only after attendance. Visa fees are not covered. Receipts are required.');
  assert.equal(r.excerpts[1].text,'Accommodation is not covered.');
});

test('context inserts block and line-break boundaries but preserves inline words and entities',()=>{
  const r=extract('<ol><li>Travel reim<strong>bursed</strong><br>only after attendance.<p>Costs &amp; fees require receipts.</p><!-- ignored --></li></ol>');
  assert.equal(r.excerpts[0].text,'Travel reimbursed only after attendance. Costs & fees require receipts.');
});

test('sensitive-looking context omits the entire item instead of exporting its safe-looking child',()=>{
  const contact='synthetic'+'@'+'example.org';
  const r=extract(`<ul><li>Contact ${contact}<p>Travel is covered.</p><ul><li>Fees are reimbursed.</li></ul></li></ul><p>Accommodation is not covered.</p>`);
  assert.equal(r.omittedBlocks,1);assert.equal(r.excerpts.length,1);
  assert.equal(r.excerpts[0].text,'Accommodation is not covered.');
  assert.ok(!JSON.stringify(r).includes(contact));
});

test('long list context is explicitly truncated and cannot leak detached child claims',()=>{
  const r=extract(`<ul><li><p>Travel costs: ${'synthetic wording '.repeat(60)}</p><p>Only after attendance; participants must pay first.</p></li></ul>`);
  assert.equal(r.excerpts.length,1);assert.equal(r.excerpts[0].text.length,700);
  assert.equal(r.excerpts[0].truncated,true);
  const brief=sourceBrief(r,[r.excerpts[0].id]);
  assert.match(brief,/Excerpt \(truncated\)/);assert.match(brief,/conditions.*truncated/);
});

test('list-local headings do not relabel later unrelated paragraphs; hidden context stays removed',()=>{
  const r=extract('<h2 id="funding">Funding</h2><ul><li><h3>Nested travel note</h3><p>Travel is reimbursed.</p><p hidden>Private funding note</p></li></ul><p>Fees are not covered.</p>');
  assert.equal(r.excerpts.length,2);
  assert.equal(r.excerpts[1].heading,'Funding');assert.equal(r.excerpts[1].source,source+'#funding');
  assert.ok(!JSON.stringify(r).includes('Private funding note'));
});

test('plain paragraphs and link-only list noise keep the established behavior',()=>{
  const r=extract('<ul><li><a href="#funding">Funding contents</a></li></ul><h2 id="funding">Funding</h2><p>Travel is not covered.</p><p>The deadline is 15 December 2027.</p>');
  assert.equal(r.excerpts.length,2);assert.equal(r.excerpts[0].context,'text-block');
  assert.equal(r.excerpts[0].text,'Travel is not covered.');assert.equal(r.excerpts[0].source,source+'#funding');
});

test('actual synthetic API and selected brief carry the same complete list context',async()=>{
  const server=createApp({captureSource:async()=>{throw new Error('synthetic mode must not fetch');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const response=await fetch(`http://127.0.0.1:${server.address().port}/api/source/demo`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert.equal(response.status,200);
    const r=await response.json();assert.equal(r.mode,'synthetic');assert.equal(r.excerpts.length,4);
    const travel=r.excerpts.find(x=>x.context==='list-item');assert.ok(travel);
    assert.match(travel.text,/pay for their tickets first/);assert.match(travel.text,/attendance and receipts/);
    const brief=sourceBrief(r,[travel.id]);
    assert.match(brief,/Context: List item/);assert.match(brief,/attendance and receipts/);
    assert.ok(!brief.includes('Visa fees are not covered'));assert.match(brief,/Selected mentions: 1/);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
