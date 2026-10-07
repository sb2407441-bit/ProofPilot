const flags=[['degreeCompleted','Undergraduate degree completed'],['currentStudent','Currently enrolled as a student'],['canFrontTravel','I can cover travel costs upfront'],['trainingComplete','Internet Society training completed'],['availabilityConfirmed','Available for GLC, 10–14 December']];
export default function ProfileForm({profile,onChange,onDone}) {
  const set=(key,value)=>onChange({...profile,[key]:value});
  return <section className="profile-pane"><div className="pane-heading"><div><h2>Your professional profile</h2><p>Start with facts you can stand behind. This profile stays in memory until you export a brief.</p></div><button className="primary" onClick={onDone}>Use this profile</button></div>
    <div className="profile-grid">
      <label>Birth year<input type="number" min="1900" max={new Date().getFullYear()} value={profile.birthYear} onChange={e=>set('birthYear',Number(e.target.value))}/></label>
      <label>Country<input value={profile.country} maxLength="120" onChange={e=>set('country',e.target.value)}/></label>
      <label>Professional role<input value={profile.role} maxLength="120" onChange={e=>set('role',e.target.value)}/></label>
      <label>Degree subject<input value={profile.degree} maxLength="120" onChange={e=>set('degree',e.target.value)}/></label>
      <label>Experience in months<input type="number" min="0" max="720" value={profile.experienceMonths} onChange={e=>set('experienceMonths',Number(e.target.value))}/></label>
      <label>Available hours per week<input type="number" min="0" max="168" value={profile.weeklyHours} onChange={e=>set('weeklyHours',Number(e.target.value))}/></label>
    </div>
    <div className="check-fields">{flags.map(([key,label])=><label key={key}><input type="checkbox" checked={profile[key]} onChange={e=>set(key,e.target.checked)}/><span>{label}</span></label>)}</div>
    <label className="action-label">A real action you personally took<textarea value={profile.leadershipAction} maxLength="600" rows="4" placeholder="What did you do, who did it help, and what happened? Leave blank if you haven't chosen an example." onChange={e=>set('leadershipAction',e.target.value)}/></label>
    <p className="privacy-note">Use professional facts only. Keep passwords, API keys, identity numbers and contact details out of these fields.</p>
  </section>;
}
