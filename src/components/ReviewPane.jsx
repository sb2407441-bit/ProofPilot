import {exportBrief} from '../../lib/drafts.mjs';
import {validateProfile} from '../../lib/engine.mjs';
export default function ReviewPane({op,fit,draft,profile,now,onExport,onBack}) {
  let preview='',previewError='';
  try{validateProfile(profile);preview=exportBrief(op,profile,draft,fit,now);}catch(e){previewError=e.message;}
  return <section className="review-pane"><div className="pane-heading"><div><h2>Review before you send</h2><p>ProofPilot prepares a brief. It does not submit applications or certify your claims.</p></div><button className="primary" onClick={onExport}>Export brief</button></div>
    <div className="review-section"><h3>{op.name}</h3><p>{fit.status}. {fit.reviewNeeded?'There are facts or source details still to review.':'Review the current organizer rules before applying.'}</p><h4>Funding</h4><p>{op.funding.detail}</p><h4>Draft status</h4><p>{draft?`${draft.wordCount} words prepared using ${draft.provider==='local-ai'?'a local AI plan':'a template'}.`:'No application draft prepared yet.'}</p><h4>Required next steps</h4><ul>{op.requirements.map(x=><li key={x}>{x}</li>)}</ul><p className="muted">A portrait, identity document or CV is never uploaded by this app. Export only the facts you have reviewed.</p><button className="text-button" onClick={onBack}>Back to opportunity</button></div>
    <details className="brief-preview"><summary>Preview export text</summary>{previewError?<p role="alert">{previewError}</p>:<><p>You can select and copy this text if your browser blocks file downloads.</p><textarea aria-label="Export text" readOnly value={preview} rows={18}/></>}</details>
  </section>;
}
