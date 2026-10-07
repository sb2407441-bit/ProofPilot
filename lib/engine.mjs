const validDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
export function validateProfile(p, now=new Date()) {
  if(!p || typeof p!=='object' || Array.isArray(p)) throw new Error('A profile object is required.');
  const y=now.getUTCFullYear();
  if(!Number.isInteger(p.birthYear)||p.birthYear<1900||p.birthYear>y)throw new Error('Enter a valid birth year.');
  if(!Number.isInteger(p.experienceMonths)||p.experienceMonths<0||p.experienceMonths>720)throw new Error('Experience must be between 0 and 720 months.');
  if(!Number.isInteger(p.weeklyHours)||p.weeklyHours<0||p.weeklyHours>168)throw new Error('Weekly hours must be between 0 and 168.');
  for(const k of ['degreeCompleted','currentStudent','canFrontTravel','trainingComplete','availabilityConfirmed'])if(typeof p[k]!=='boolean')throw new Error(`Invalid ${k} value.`);
  for(const k of ['country','role','degree','leadershipAction'])if(typeof p[k]!=='string'||p[k].length>(k==='leadershipAction'?600:120))throw new Error(`Invalid ${k} value.`);
  return p;
}
export function deadlineState(deadline,now=new Date()) {
  if(!deadline || !validDate(deadline.date))return {kind:'unknown',text:'Verify deadline'};
  if(deadline.precision==='instant') {
    const end=Date.parse(deadline.instant);
    if(Number.isNaN(end))return {kind:'unknown',text:'Verify deadline'};
    return end<now.getTime()?{kind:'closed',text:'Closed'}:{kind:'open',text:'Open'};
  }
  // Date-only deadlines have no invented timezone. Give a conservative buffer.
  const days=Math.floor((Date.parse(deadline.date+'T00:00:00Z')-now.getTime())/86400000);
  if(days< -2)return {kind:'closed',text:'Deadline passed'};
  if(days<=1)return {kind:'verify',text:'Check closing time'};
  return {kind:'open',text:'Open'};
}
export function evaluateOpportunity(op,p,now=new Date()) {
  validateProfile(p,now);
  const checks=[], add=(status,label,detail)=>checks.push({status,label,detail});
  if(op.rules.age) {
    const [lo,hi]=op.rules.age, max=now.getUTCFullYear()-p.birthYear,min=max-1;
    const state=max<lo||min>hi?'fail':min>=lo&&max<=hi?'pass':'unknown';
    add(state,`Age ${lo}–${hi}`,state==='pass'?'Your birth year places you in range.':state==='fail'?'Your birth year falls outside the stated range.':'Your exact birthday is needed to confirm the age boundary.');
  }
  if(op.rules.degree)add(p.degreeCompleted?'pass':'fail','Undergraduate completed',p.degreeCompleted?'A completed degree qualifies for the professional track.':'Complete the required undergraduate degree before applying.');
  if(op.rules.student)add(p.currentStudent?'pass':'fail','Current enrollment',p.currentStudent?'You reported current enrollment.':'This programme requires current student enrollment.');
  if(op.rules.leadership)add(p.leadershipAction.trim()?'reported':'unknown','Leadership example',p.leadershipAction.trim()?'You added an action. Review its accuracy before using it.':'Add one real action before applying.');
  if(op.rules.training)add(p.trainingComplete?'reported':'unknown','Required training',p.trainingComplete?'Training completion is self-reported; retain your organizer confirmation.':'Complete the prerequisite training before applying.');
  if(op.rules.weeklyHours)add(p.weeklyHours>=op.rules.weeklyHours?'pass':'fail',`${op.rules.weeklyHours} hours per week`,p.weeklyHours>=op.rules.weeklyHours?'Your stated availability meets this minimum.':'Increase your availability or choose another opportunity.');
  if(op.rules.availability)add(p.availabilityConfirmed?'reported':'unknown','Programme availability',p.availabilityConfirmed?'Participation availability is self-reported.':`Confirm availability for ${op.rules.availability}.`);
  if(op.funding.type==='reimbursement')add(p.canFrontTravel?'reported':'funding','Upfront travel costs',p.canFrontTravel?'You report an upfront funding plan. Verify eligible reimbursement costs.':'You cannot cover upfront travel; this is a funding blocker.');
  if(!checks.length)add('unknown','Organizer eligibility','Review all current organizer criteria.');
  const deadline=deadlineState(op.deadline,now);
  const stale=(now.getTime()-Date.parse(op.checkedAt+'T00:00:00Z'))>14*86400000;
  const excluded=checks.some(x=>x.status==='fail');
  let status=excluded?'Not eligible':checks.some(x=>x.status==='funding')?'Upfront costs':op.rules.training&&!p.trainingComplete?'Training first':'Likely fit';
  if(deadline.kind==='closed')status='Closed';
  else if(stale||deadline.kind==='verify'||deadline.kind==='unknown')status='Recheck source';
  const tone=['Not eligible','Closed','Upfront costs'].includes(status)?'amber':status==='Likely fit'?'teal':'blue';
  return {status,tone,checks,deadline,stale,coreFit:!excluded,canDraft:deadline.kind!=='closed'&&!excluded,reviewNeeded:stale||checks.some(x=>x.status==='unknown'||x.status==='funding')||deadline.kind!=='open'};
}
export function formatDate(date,short=false) {
  return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:short?'short':'long',...(short?{year:'numeric'}:{}) , timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
}
export function detectSensitiveText(text) {
  // Values are not returned, logged, persisted or sent to a provider.
  const patterns=[[/\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,'API credential'],[/\bgh[pousr]_[A-Za-z0-9]{20,}\b/,'GitHub credential'],[/\bAIza[A-Za-z0-9_-]{30,}\b/,'Google API credential'],[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,'Private key'],[/\b\d{5}-\d{7}-\d\b/,'Identity number'],[/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,'Email address']];
  return [...new Set(patterns.filter(([p])=>p.test(text)).map(([,label])=>label))];
}
