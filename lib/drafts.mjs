import {detectSensitiveText,validateProfile,evaluateOpportunity} from './engine.mjs';
export function makeFactCatalog(op,p) {
  validateProfile(p);
  const profile={
    'profile.role':{label:'Professional role',text:`I work as an ${p.role.trim()||'early-career professional'}.`,kind:'self-reported'},
    'profile.degree':{label:'Education',text:p.degreeCompleted?`I have completed undergraduate studies in ${p.degree.trim()||'my chosen discipline'}.`:`My academic interest is ${p.degree.trim()||'my chosen discipline'}.`,kind:'self-reported'},
    'profile.experience':{label:'Experience',text:`I have ${p.experienceMonths} months of experience in my field.`,kind:'self-reported'},
  };
  if(p.leadershipAction.trim())profile['profile.action']={label:'Personal action',text:p.leadershipAction.trim(),kind:'self-reported'};
  const catalog={...profile};
  for(const f of op.facts)catalog[f.id]={...f,kind:'organizer',source:op.source};
  return catalog;
}
const openings={career:'I am interested in this opportunity to develop my professional skills.',collaboration:'I would value the opportunity to learn with people from different backgrounds.',leadership:'I want to develop my ability to make responsible decisions in my work.'};
const closings={learning:'I hope to learn from the programme and apply those insights in my work.',contribution:'I would bring my perspective to the group while learning from other participants.'};
export function defaultPlan(catalog) {return {openingId:'collaboration',factIds:Object.keys(catalog).filter(x=>x.startsWith('profile.')),closingId:'learning'};}
export function assembleDraft(plan,catalog) {
  if(!plan||!openings[plan.openingId]||!closings[plan.closingId]||!Array.isArray(plan.factIds)||plan.factIds.length>8)throw new Error('The model returned an unsupported draft plan.');
  if(plan.factIds.some(x=>typeof x!=='string'||!catalog[x]))throw new Error('The model referenced an unknown fact.');
  const ids=[...new Set(plan.factIds)];
  if(!ids.some(x=>x.startsWith('profile.')))throw new Error('The plan must use a profile fact.');
  // No model-written prose is rendered. Only confirmed catalog text and fixed transitions.
  const text=[openings[plan.openingId],...ids.map(x=>catalog[x].text),closings[plan.closingId]].join(' ');
  if(detectSensitiveText(text).length)throw new Error('Remove contact details or credentials from the profile before preparing a draft.');
  return {text,facts:ids.map(id=>({id,...catalog[id]})),wordCount:text.split(/\s+/).length,limitations:['Profile statements are self-reported.','Review the organizer rules and your own words before submission.']};
}
export function prepareDraft(op,p,now=new Date()) {
  const fit=evaluateOpportunity(op,p,now);
  if(!fit.canDraft)throw new Error('This opportunity is closed or the profile does not meet a stated requirement.');
  const catalog=makeFactCatalog(op,p);
  const sensitive=detectSensitiveText(JSON.stringify(p));
  if(sensitive.length)throw new Error(`Remove sensitive content before drafting: ${sensitive.join(', ')}.`);
  return {catalog,plan:defaultPlan(catalog),fit};
}
export function exportBrief(op,p,draft,fit,now=new Date()) {
  if(detectSensitiveText(JSON.stringify(p)).length)throw new Error('Remove sensitive content before exporting.');
  return `# ${op.name}\n\nPrepared ${now.toISOString().slice(0,10)}. This is a review brief, not a submitted application.\n\n## Eligibility\n\n${fit.checks.map(x=>`- ${x.label}: ${x.detail}`).join('\n')}\n\n## Funding\n\n${op.funding.detail}\n\n## Application draft\n\n${draft?.text||'No draft prepared.'}\n\n## Still required\n\n${op.requirements.map(x=>`- ${x}`).join('\n')}\n\n## Evidence\n\nOrganizer: ${op.source}\nChecked: ${op.checkedAt}. Deadline timezone ${op.deadline.precision==='instant'?'is specified by the organizer':'has not been verified; recheck the official source'}.\n\n${draft?.facts.map(x=>`- ${x.id}: ${x.kind}${x.source?` (${x.source})`:''}`).join('\n')||''}\n`;
}
