import {useState,useEffect,useMemo} from 'react';
import {opportunities,demoProfile} from '../data/opportunities.mjs';
import {evaluateOpportunity,validateProfile} from '../lib/engine.mjs';
import {exportBrief} from '../lib/drafts.mjs';
import OpportunityList from './components/OpportunityList.jsx';
import OpportunityDetail from './components/OpportunityDetail.jsx';
import ProfileForm from './components/ProfileForm.jsx';
import ReviewPane from './components/ReviewPane.jsx';
export default function App() {
  const [profile,setProfile]=useState({...demoProfile}),[selected,setSelected]=useState('glc'),[nav,setNav]=useState('Opportunities');
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('All'),[tab,setTab]=useState('Eligibility & funding');
  const [drafts,setDrafts]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState('');
  const [provider,setProvider]=useState({available:false,models:[]}),[model,setModel]=useState(''),[useAI,setUseAI]=useState(false);
  useEffect(()=>{let disposed=false;fetch('/api/provider').then(r=>r.json()).then(d=>{if(!disposed){setProvider(d);setModel(d.models?.[0]||'');}}).catch(()=>{});return()=>{disposed=true;};},[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(timer);},[toast]);
  const now=useMemo(()=>new Date(),[]);
  const evaluated=useMemo(()=>opportunities.map(op=>{try{return {op,fit:evaluateOpportunity(op,profile,now)};}catch{return {op,fit:evaluateOpportunity(op,demoProfile,now)};}}),[profile,now]);
  const {op,fit}=evaluated.find(x=>x.op.id===selected),draft=drafts[selected];
  const items=evaluated.filter(x=>(x.op.name+' '+x.op.category).toLowerCase().includes(query.toLowerCase())&&(filter==='All'||filter==='Best fit'&&x.fit.status==='Likely fit'||filter==='Needs review'&&x.fit.reviewNeeded));
  function updateProfile(p){setProfile(p);setDrafts({});setError('');}
  function choose(id){setSelected(id);setTab('Eligibility & funding');setError('');}
  async function generate(){
    setBusy(true);setError('');setTab('Application draft');
    try{validateProfile(profile);const r=await fetch('/api/draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({opportunityId:selected,profile,useAI,model})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Draft could not be prepared.');setDrafts(x=>({...x,[selected]:d}));}
    catch(e){setError(e.message==='Failed to fetch'?'The local server is offline. Restart ProofPilot and try again.':e.message);}finally{setBusy(false);}
  }
  function download(){try{validateProfile(profile);const text=exportBrief(op,profile,draft,fit,now),url=URL.createObjectURL(new Blob([text],{type:'text/markdown'}));const a=document.createElement('a');a.href=url;a.download=`proofpilot-${op.id}-brief.md`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setToast('Brief download requested. Review the file before sharing.');}catch(e){setError(e.message);}}
  function finishProfile(){try{validateProfile(profile);setNav('Opportunities');setToast('Profile updated. Previous drafts cleared.');}catch(e){setError(e.message);}}
  return <><header className="app-header"><a className="wordmark" href="#" onClick={e=>{e.preventDefault();setNav('Opportunities');}}>ProofPilot</a><nav aria-label="Main navigation">{['Opportunities','Profile','Review'].map(x=><button key={x} className={nav===x?'active':''} onClick={()=>{setNav(x);setError('');}}>{x}</button>)}</nav><button className="primary export-button" onClick={download}>Export brief</button></header>
    <main><div className="intro"><h1>Find your next chapter.</h1><p>Check your fit. Understand the funding. Draft with evidence.</p></div>
      {nav==='Opportunities'?<div className="workbench"><OpportunityList items={items} selected={selected} onSelect={choose} query={query} onQuery={setQuery} filter={filter} onFilter={setFilter}/><OpportunityDetail op={op} fit={fit} tab={tab} onTab={setTab} draft={draft} onDraft={generate} busy={busy} error={error} provider={provider} model={model} onModel={setModel} useAI={useAI} onAI={setUseAI}/></div>:nav==='Profile'?<ProfileForm profile={profile} onChange={updateProfile} onDone={finishProfile}/>:<ReviewPane op={op} fit={fit} draft={draft} profile={profile} now={now} onExport={download} onBack={()=>setNav('Opportunities')}/>}
      {nav!=='Opportunities'&&error&&<p className="inline-warning" role="alert">{error}</p>}
      <p className="workspace-note">Sample evidence · Recheck the official source before submitting. <span>Demo profile · In-memory data</span></p>
    </main>{toast&&<div className="toast" role="status">{toast}</div>}</>;
}
