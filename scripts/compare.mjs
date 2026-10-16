import {open,lstat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {compareSnapshots,changeReport,syntheticSnapshots} from '../lib/changes.mjs';
import {detectSensitiveText,validateProfile} from '../lib/engine.mjs';
import {demoProfile} from '../data/opportunities.mjs';
import {junitReport} from '../lib/junit.mjs';

const help=`ProofPilot offline evidence comparison (Node.js 24+)

node scripts/compare.mjs --demo funding|deadline|unchanged
node scripts/compare.mjs --previous before.json --candidate after.json [--profile profile.json]

Options:
  --format markdown|json|junit  Markdown by default; JUnit omits evidence values
  --fail-on none|review|decision Default none; use review for conservative CI gates
  --now YYYY-MM-DDTHH:mm:ssZ     Fixed UTC evaluation time for reproducible reviews
  --help                       Show this help

Exit codes: 0 valid comparison / gate passed; 2 valid comparison / gate blocked;
1 unavailable comparison (invalid options, files or evidence).
No fetching, live AI, telemetry or source verification. The default profile is
synthetic demo data. Supply only a synthetic or non-sensitive public profile.
Reports omit profile fields but contain supplied evidence; review before sharing.
JUnit contains only gate metadata/counts. Preview policy none is a skipped test.
`;

function options(args){
  const out={format:'markdown','fail-on':'none'};
  const seen=new Set();
  for(let i=0;i<args.length;i++){
    const key=args[i].slice(2);
    if(!args[i].startsWith('--')||!['demo','previous','candidate','profile','format','fail-on','now','help'].includes(key)||seen.has(key))throw new Error('Invalid or repeated option. Use --help.');
    seen.add(key);
    if(key==='help'){out.help=true;continue;}
    if(!args[i+1]||args[i+1].startsWith('--'))throw new Error('An option is missing its value. Use --help.');
    out[key]=args[++i];
  }
  if(out.help){if(args.length!==1)throw new Error('Use --help on its own.');return out;}
  if(!['markdown','json','junit'].includes(out.format)||!['none','review','decision'].includes(out['fail-on']))throw new Error('Unsupported format or gate policy. Use --help.');
  if(out.demo){
    if(!['funding','deadline','unchanged'].includes(out.demo)||out.previous||out.candidate||out.profile)throw new Error('Demo requires a known scenario and cannot be combined with input files.');
  }else if(!out.previous||!out.candidate)throw new Error('Provide both snapshot files, or use --demo.');
  return out;
}

function evaluationTime(value){
  if(value===undefined)return new Date();
  const time=new Date(value);
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)||!Number.isFinite(time.getTime())||time.toISOString()!==value.replace('Z','.000Z'))throw new Error('Evaluation time must be a real UTC timestamp: YYYY-MM-DDTHH:mm:ssZ.');
  return time;
}

// Bound actual reads, not just stat size; never echo supplied paths or OS errors.
async function readInput(path,label,maxBytes){
  let handle;
  try{
    if(!(await lstat(path)).isFile())throw new Error();
    handle=await open(path,'r');
    if(!(await handle.stat()).isFile())throw new Error();
    const buffer=Buffer.alloc(maxBytes+1);
    let size=0;
    while(size<buffer.length){
      const {bytesRead}=await handle.read(buffer,size,buffer.length-size,null);
      if(!bytesRead)break;
      size+=bytesRead;
    }
    if(size>maxBytes)throw new Error();
    return new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,size));
  }catch{throw new Error(`${label} must be a readable UTF-8 regular file of at most ${maxBytes} bytes.`);}
  finally{if(handle)await handle.close();}
}

function profileFrom(text,now){
  let profile;
  try{profile=JSON.parse(text);}catch{throw new Error('Profile is not valid JSON.');}
  if(!profile||typeof profile!=='object'||Array.isArray(profile)||Object.keys(profile).some(k=>!Object.hasOwn(demoProfile,k)))throw new Error('Profile must use only the documented profile fields.');
  if(detectSensitiveText(JSON.stringify(profile)).length)throw new Error('Remove sensitive information from the profile.');
  return validateProfile(profile,now);
}

export async function runComparison(args){
  const opt=options(args);
  if(opt.help)return {output:help,code:0};
  const now=evaluationTime(opt.now);
  let previous,candidate,profile=demoProfile;
  if(opt.demo){
    const samples=syntheticSnapshots(now);
    previous=JSON.stringify(samples.previous);
    candidate=JSON.stringify(opt.demo==='unchanged'?samples.previous:samples[opt.demo]);
  }else{
    previous=await readInput(opt.previous,'Previous snapshot',48000);
    candidate=await readInput(opt.candidate,'Candidate snapshot',48000);
    if(opt.profile)profile=profileFrom(await readInput(opt.profile,'Profile',12000),now);
  }
  const result=compareSnapshots(previous,candidate,profile,now);
  const blocked=opt['fail-on']==='review'?result.reviewRequired||result.decisionChanged:opt['fail-on']==='decision'?result.decisionChanged:false;
  const gate={policy:opt['fail-on'],blocked};
  const profileMode=opt.profile?'supplied':'synthetic-demo';
  // Allowlisted summary: never serialize the profile or the raw internal object.
  const report={schemaVersion:1,available:true,mode:'offline',profileMode,evaluatedAt:result.evaluatedAt,state:result.state,gate,reviewRequired:result.reviewRequired,decisionChanged:result.decisionChanged,sourceChanged:result.sourceChanged,sources:{previous:result.before.source,candidate:result.after.source},decisions:{previous:result.beforeFit.status,candidate:result.afterFit.status},changes:result.changes,checks:result.checks,limits:['Manually supplied evidence; sources not fetched or verified.','Supported structured rules only; prose is not interpreted.','Profile fields omitted; evidence is included. Review before sharing.','No live AI, telemetry, monitoring or application submission.']};
  const output=opt.format==='junit'?junitReport(report):opt.format==='json'?JSON.stringify(report,null,2)+'\n':changeReport(result)+`\nProfile mode: ${profileMode}\nGate policy: ${gate.policy}\nGate blocked: ${blocked?'Yes':'No'}\n`;
  return {output,code:blocked?2:0};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const {output,code}=await runComparison(process.argv.slice(2));
    process.stdout.write(output);process.exitCode=code;
  }catch(error){
    // Only our fixed messages escape; no raw JSON, paths, stack traces or OS errors.
    const known=/^(Invalid or repeated option|An option is missing|Use --help|Unsupported format|Demo requires|Provide both|Evaluation time|Previous snapshot must|Candidate snapshot must|Profile must|Profile is not|Remove sensitive|Snapshot |Source |Checked |Deadline|A date-only|Instant |Rule |Age |Weekly hours|Availability |Funding |Programme name|Travel summary|Enter a valid birth year|Experience must|Invalid (?:degreeCompleted|currentStudent|canFrontTravel|trainingComplete|availabilityConfirmed|country|role|degree|leadershipAction) value|A profile object)/;
    const message=known.test(error.message)?error.message:'Input could not be evaluated.';
    process.stderr.write(`Comparison unavailable: ${message}\n`);process.exitCode=1;
  }
}
