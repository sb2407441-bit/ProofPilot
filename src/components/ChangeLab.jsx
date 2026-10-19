import {useMemo,useState} from 'react';
import {changeReport,compareSnapshots,syntheticSnapshots} from '../../lib/changes.mjs';

const stringify=x=>JSON.stringify(x,null,2);
export default function ChangeLab({profile}){
  const [now]=useState(()=>new Date());
  const samples=useMemo(()=>syntheticSnapshots(now),[now]);
  const [previous,setPrevious]=useState(()=>stringify(samples.previous));
  const [candidate,setCandidate]=useState(()=>stringify(samples.funding));
  const [notice,setNotice]=useState('');
  const review=useMemo(()=>{try{return {result:compareSnapshots(previous,candidate,profile,now)};}catch(e){return {error:e.message};}},[previous,candidate,profile,now]);
  const r=review.result,report=r?changeReport(r):'';
  function load(kind){setPrevious(stringify(samples.previous));setCandidate(kind==='invalid'?'{"name": "Incomplete evidence"}':kind==='duplicate'?stringify(samples.previous).replace('"type": "covered"','"type": "reimbursement",\n    "type": "covered"'):stringify(kind==='same'?samples.previous:samples[kind]));setNotice('');}
  function edit(setter,value){setter(value);setNotice('');}
  async function copy(){try{await navigator.clipboard.writeText(report);setNotice('Review report copied. Check it before sharing.');}catch{setNotice('Clipboard unavailable. Select and copy the report preview below.');}}
  return <section className="change-lab" aria-labelledby="change-lab-heading">
    <div className="lab-heading"><div><span className="lab-eyebrow">Offline evidence review</span><h2 id="change-lab-heading">What changed your decision?</h2><p>Compare reviewed requirements against the same profile. See the change and its consequence together.</p></div><span className="status blue">Deterministic · No AI call</span></div>
    <div className="lab-samples" aria-label="Synthetic examples"><span>Try synthetic evidence</span>{[['funding','Funding switches'],['deadline','Deadline closes'],['same','No change'],['invalid','Invalid evidence'],['duplicate','Conflicting fields']].map(([kind,label])=><button className="lab-sample" key={kind} onClick={()=>load(kind)}>{label}</button>)}</div>
    <p className="lab-context">Uses your current in-memory profile; the default is anonymous demo data. The sample programme and example.org URL are fictional. URLs are never fetched.</p>
    <div className="snapshot-editors">{[['Previous snapshot',previous,setPrevious],['Candidate snapshot',candidate,setCandidate]].map(([label,value,setter])=><label key={label}>{label}<textarea spellCheck="false" value={value} maxLength={12000} onChange={e=>edit(setter,e.target.value)} aria-describedby="snapshot-help"/></label>)}</div>
    <p id="snapshot-help" className="lab-context">Paste public or synthetic JSON only. Each snapshot needs name, source, checkedAt, deadline, rules and funding. Use each field once per object; repeated fields are rejected with line and column positions. <a href="https://github.com/sb2407441-bit/ProofPilot/blob/main/docs/change-lab.md" target="_blank" rel="noreferrer">Snapshot format ↗</a></p>
    {review.error?<div className="lab-invalid" role="alert"><h3>Comparison unavailable</h3><p>{review.error}</p><p>Fix the snapshot or load a synthetic example. Invalid evidence is never treated as “no change”.</p></div>:<>
      <div className="lab-result" aria-live="polite"><div className="lab-result-header"><strong>{r.state}</strong><span>{r.changes.length} changed {r.changes.length===1?'field':'fields'}</span></div><div className="decision-bridge"><div><span>Previous decision</span><strong>{r.beforeFit.status}</strong></div><span className="decision-arrow" aria-hidden="true">→</span><div><span>Candidate decision</span><strong>{r.afterFit.status}</strong></div></div><p>{r.reviewRequired?'Changed evidence needs human review, even when the overall decision stays the same.':'No substantive field change. This does not verify either source.'}</p>{r.sourceChanged&&<p className="inline-warning">Source URL changed. Confirm both snapshots describe the same programme.</p>}</div>
      <div className="lab-diffs"><section><h3>Evidence changes</h3>{r.changes.length?<div className="change-rows">{r.changes.map(x=><article className="change-row" key={x.path}><h4>{x.label}</h4><div><span className="change-before">{x.before}</span><span className="change-after">{x.after}</span></div></article>)}</div>:<p className="muted">The supported fields match. Key ordering does not create a change.</p>}</section><section><h3>Consequences</h3>{r.checks.length?r.checks.map(x=><article className="consequence" key={x.label}><h4>{x.label}</h4><span className="status blue">{x.before} → {x.after}</span><p>{x.detail}</p></article>):<p className="muted">No check-status changes. Review altered dates, wording or source links in the evidence column.</p>}<p className="lab-context">Only supported rules are evaluated. Supplied checked dates are unverified; date-only deadlines do not imply a timezone.</p></section></div>
      <details className="brief-preview lab-report"><summary>Review report preview</summary><button className="primary" onClick={copy}>Copy review report</button>{notice&&<p role="status">{notice}</p>}<textarea readOnly value={report} rows={15} aria-label="Change review Markdown report"/></details>
    </>}
  </section>;
}
