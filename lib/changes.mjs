import {detectSensitiveText,evaluateOpportunity} from './engine.mjs';

const ruleKeys=['age','degree','student','leadership','training','weeklyHours','availability'];
const fundingTypes=['covered','conditional','project','reimbursement','none'];
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function object(value,allowed,required,label){
  if(!isObject(value))throw new Error(`${label} must be an object.`);
  if(Object.keys(value).some(k=>!allowed.includes(k)))throw new Error(`${label} contains an unsupported field. Remove it and try again.`);
  if(required.some(k=>!Object.hasOwn(value,k)))throw new Error(`${label} is missing a required field.`);
}
function date(value,label){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw new Error(`${label} must be a real date in YYYY-MM-DD format.`);
}
function text(value,max,label){
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f]/.test(value))throw new Error(`${label} must be nonempty text of at most ${max} characters.`);
}

// Deliberately narrow, plain-data schema. No fetched URLs, model judgment or persisted input.
export function parseSnapshot(input,now=new Date()){
  if(typeof input!=='string'||input.length>12000)throw new Error('Snapshot must be JSON text of at most 12,000 characters.');
  if(detectSensitiveText(input).length)throw new Error('Remove sensitive information from the snapshot. Use public or synthetic evidence only.');
  let s;
  try{s=JSON.parse(input);}catch{throw new Error('Snapshot is not valid JSON. Check quotes, commas and braces.');}
  if(detectSensitiveText(JSON.stringify(s)).length)throw new Error('Remove sensitive information from the snapshot. Use public or synthetic evidence only.');
  object(s,['name','source','checkedAt','deadline','rules','funding'],['name','source','checkedAt','deadline','rules','funding'],'Snapshot');
  text(s.name,120,'Programme name');text(s.source,500,'Source URL');
  let url;try{url=new URL(s.source);}catch{throw new Error('Source must be a public HTTPS URL without credentials, query or fragment.');}
  const hostname=url.hostname.toLowerCase().replace(/\.$/,'');
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!hostname.includes('.')||hostname.endsWith('.local')||/^[\d.]+$/.test(hostname)||hostname==='localhost'||hostname.endsWith('.localhost')||hostname.startsWith('['))throw new Error('Source must be a public HTTPS URL without credentials, query or fragment.');
  date(s.checkedAt,'Checked date');
  if(s.checkedAt>now.toISOString().slice(0,10))throw new Error('Checked date cannot be in the future.');
  object(s.deadline,['date','precision','instant'],['date','precision'],'Deadline');date(s.deadline.date,'Deadline date');
  if(!['date','instant'].includes(s.deadline.precision))throw new Error('Deadline precision must be date or instant.');
  if(s.deadline.precision==='date'&&Object.hasOwn(s.deadline,'instant'))throw new Error('A date-only deadline must omit instant.');
  if(s.deadline.precision==='instant'){
    const instant=s.deadline.instant;
    if(typeof instant!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(instant)||!Number.isFinite(Date.parse(instant)))throw new Error('Instant deadline requires a valid timestamp with a timezone.');
    date(instant.slice(0,10),'Instant date');
    if(instant.slice(0,10)!==s.deadline.date||Number(instant.slice(11,13))>23||Number(instant.slice(14,16))>59||Number(instant.slice(17,19))>59)throw new Error('Instant deadline must match the stated date and use a valid time.');
  }
  object(s.rules,ruleKeys,[],'Rules');
  for(const key of ['degree','student','leadership','training'])if(Object.hasOwn(s.rules,key)&&typeof s.rules[key]!=='boolean')throw new Error(`Rule ${key} must be true or false.`);
  if(Object.hasOwn(s.rules,'age')&&(!Array.isArray(s.rules.age)||s.rules.age.length!==2||!s.rules.age.every(x=>Number.isInteger(x)&&x>=0&&x<=120)||s.rules.age[0]>s.rules.age[1]))throw new Error('Age must be an ordered pair of whole numbers from 0 to 120.');
  if(Object.hasOwn(s.rules,'weeklyHours')&&(!Number.isInteger(s.rules.weeklyHours)||s.rules.weeklyHours<1||s.rules.weeklyHours>168))throw new Error('Weekly hours must be a whole number from 1 to 168.');
  if(Object.hasOwn(s.rules,'availability'))text(s.rules.availability,120,'Availability');
  object(s.funding,['type','travel','detail'],['type','travel','detail'],'Funding');
  if(!fundingTypes.includes(s.funding.type))throw new Error(`Funding type must be one of: ${fundingTypes.join(', ')}.`);
  text(s.funding.travel,120,'Travel summary');text(s.funding.detail,600,'Funding detail');
  return s;
}

const paths=[['name','Programme'],['source','Source URL'],['checkedAt','Checked date'],['deadline.date','Deadline date'],['deadline.precision','Deadline precision'],['deadline.instant','Closing timestamp'],...ruleKeys.map(k=>[`rules.${k}`,`Rule: ${k}`]),['funding.type','Funding type'],['funding.travel','Travel summary'],['funding.detail','Funding detail']];
const get=(s,path)=>path.split('.').reduce((value,key)=>value?.[key],s);
const display=value=>value===undefined?'Not specified':typeof value==='string'?value:JSON.stringify(value);
const asOpportunity=s=>({...s,id:'review',funding:{...s.funding,headline:s.funding.travel}});

export function compareSnapshots(previous,candidate,profile,now=new Date()){
  const before=parseSnapshot(previous,now),after=parseSnapshot(candidate,now);
  const beforeFit=evaluateOpportunity(asOpportunity(before),profile,now),afterFit=evaluateOpportunity(asOpportunity(after),profile,now);
  const changes=paths.filter(([path])=>JSON.stringify(get(before,path))!==JSON.stringify(get(after,path))).map(([path,label])=>({path,label,before:display(get(before,path)),after:display(get(after,path))}));
  const labels=[...new Set([...beforeFit.checks,...afterFit.checks].map(x=>x.label))];
  const checks=labels.map(label=>{
    const old=beforeFit.checks.find(x=>x.label===label),next=afterFit.checks.find(x=>x.label===label);
    return {label,before:old?.status||'not required',after:next?.status||'not required',detail:next?.detail||'This check is absent from the candidate snapshot.'};
  }).filter(x=>x.before!==x.after);
  const decisionChanged=['status','coreFit','canDraft','reviewNeeded','stale'].some(k=>beforeFit[k]!==afterFit[k])||beforeFit.deadline.kind!==afterFit.deadline.kind||checks.length>0;
  const substantive=changes.some(x=>x.path!=='checkedAt');
  const state=!changes.length?'No changes':decisionChanged?'Decision changed':substantive?'Evidence changed':'Check date changed';
  return {before,after,beforeFit,afterFit,changes,checks,state,decisionChanged,reviewRequired:substantive,evaluatedAt:now.toISOString(),sourceChanged:before.source!==after.source};
}

const markdown=value=>String(value).replace(/[\r\n]/g,' ').replace(/([\\`*_{}\[\]<>|])/g,'\\$1');
export function changeReport(result){
  const r=result;
  return ['# ProofPilot change review','',`Result: ${r.state}`,`Evaluated: ${r.evaluatedAt}`,'',`Previous programme: ${markdown(r.before.name)}`,`Candidate programme: ${markdown(r.after.name)}`,`Previous source: ${markdown(r.before.source)}`,`Candidate source: ${markdown(r.after.source)}`,`Source identity: ${r.sourceChanged?'Changed — confirm that these describe the same programme.':'Same supplied URL; identity and content are not independently verified.'}`,'',`Previous decision: ${r.beforeFit.status}`,`Candidate decision: ${r.afterFit.status}`,`Evidence review required: ${r.reviewRequired?'Yes':'No substantive field change; source accuracy still requires manual verification.'}`,'','## Changed fields',...(r.changes.length?r.changes.map(x=>`- ${x.label}: ${markdown(x.before)} → ${markdown(x.after)}`):['No field changes.']),'','## Changed checks',...(r.checks.length?r.checks.map(x=>`- ${markdown(x.label)}: ${x.before} → ${x.after}. ${markdown(x.detail)}`):['No check-status changes.']),'','## Limits','Deterministic comparison of manually supplied snapshots against the same in-memory profile. No scraping, live AI, automated verification, application submission or legal certification. Supported rules only; source prose can contain requirements this schema does not express. A stable decision does not mean changed evidence is safe to ignore. Profile text is omitted from this report. Review the report before sharing.',''].join('\n');
}

export function syntheticSnapshots(now=new Date()){
  const checkedAt=now.toISOString().slice(0,10);
  const previous={name:'Sample Founder Studio',source:'https://example.org/synthetic-founder-studio',checkedAt,deadline:{date:`${now.getUTCFullYear()+1}-12-15`,precision:'date'},rules:{degree:true,weeklyHours:4},funding:{type:'covered',travel:'Travel arranged before participation',detail:'Synthetic terms: approved travel is booked before participation.'}};
  const funding=structuredClone(previous);funding.funding={type:'reimbursement',travel:'Paid after participation',detail:'Synthetic revised terms: participants pay first; reimbursement follows participation.'};
  const deadline=structuredClone(previous);deadline.deadline.date='2020-01-01';
  return {previous,funding,deadline};
}
