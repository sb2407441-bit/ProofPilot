import {useMemo,useState} from 'react';
import {sourceBrief} from '../../lib/source-brief.mjs';

const example='https://www.python.org/psf/grants/';
export default function SourceDesk(){
  const [url,setUrl]=useState(''),[result,setResult]=useState(null),[error,setError]=useState('');
  const [busy,setBusy]=useState(false),[filter,setFilter]=useState('All'),[selected,setSelected]=useState([]),[notice,setNotice]=useState('');
  const report=useMemo(()=>result?sourceBrief(result,selected):'',[result,selected]);
  async function read(demo=false){
    if(demo)setUrl('');
    setBusy(true);setError('');setResult(null);setSelected([]);setNotice('');setFilter('All');
    try{
      const response=await fetch(demo?'/api/source/demo':'/api/source',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(demo?{}:{url:url.trim()})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'The source could not be read.');
      setResult(data);
    }catch(e){setError(e.message==='Failed to fetch'?'The local server is unavailable. Start ProofPilot and try again.':e.message);}
    finally{setBusy(false);}
  }
  function useExample(){setUrl(example);setResult(null);setError('');setSelected([]);setNotice('');}
  function toggle(id){setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);setNotice('');}
  async function copy(){try{await navigator.clipboard.writeText(report);setNotice('Selected evidence copied. Review the source text before sharing.');}catch{setNotice('Clipboard unavailable. Select and copy the brief preview below.');}}
  const visible=result?.excerpts.filter(x=>filter==='All'||x.categories.includes(filter))||[];
  return <section className="source-desk" aria-labelledby="source-desk-heading">
    <div className="source-entry">
      <div><span className="lab-eyebrow">Public source reader</span><h2 id="source-desk-heading">What does the page actually say?</h2><p>Bring an organizer page. Find possible funding, deadline and requirement mentions with their original context.</p></div>
      <form onSubmit={e=>{e.preventDefault();read();}}>
        <label htmlFor="source-url">Public page URL</label>
        <div className="source-url-row"><input id="source-url" type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://organizer.org/programme" required maxLength={800} aria-describedby="source-privacy" disabled={busy}/><button className="primary" disabled={busy||!url.trim()}>{busy?'Reading page…':'Read public page'}</button></div>
      </form>
      <div className="source-shortcuts"><button className="text-button" onClick={useExample} disabled={busy}>Use PSF grants URL</button><button className="text-button" onClick={()=>read(true)} disabled={busy}>Try synthetic example</button></div>
      <p id="source-privacy" className="privacy-note">Only the public URL is used. No profile, CV, document contents or cookies are sent; no AI provider is called. The source website sees a normal request and your network address. Use public pages only.</p>
    </div>
    {busy&&<div className="source-loading" role="status"><strong>Reading the public page</strong><p>Checking its address and extracting static HTML text. This can take up to 12 seconds.</p></div>}
    {error&&<div className="lab-invalid" role="alert"><h3>Source unavailable</h3><p>{error}</p><p>Use a public HTML page without a login, query string or private link. You can also try the clearly labeled synthetic example.</p></div>}
    {!result&&!busy&&!error&&<div className="source-empty"><div className="source-paper" aria-hidden="true"><span>Source</span><i/><i/><i/><b>Funding / Timing / Requirements</b><i/></div><div><h3>A source-linked reading list, without personal data.</h3><p>Keep useful excerpts and copy a small review brief. Read conditions and negations in the source before relying on any mention.</p><p className="muted">Static HTML pages only. No background monitoring, application submission or automatic funding verdict.</p></div></div>}
    {result&&<div className="source-results">
      <header className="source-result-heading"><div><span className={`status ${result.mode==='synthetic'?'amber':'teal'}`}>{result.mode==='synthetic'?'Synthetic example · No page fetched':'Public page fetched'}</span><h3>{result.title}</h3><a href={result.source} target="_blank" rel="noreferrer">Open source: {new URL(result.source).hostname} ↗</a><p className="source-capture">Captured {new Date(result.fetchedAt).toLocaleString()} · {result.bytes.toLocaleString()} decoded HTML bytes</p></div><div className="source-kept"><strong>{selected.length}</strong><span>kept for your brief</span></div></header>
      <p className="source-caution">Possible mentions, not verified terms. Keyword matching can miss context, linked policies or later changes. Page text is untrusted evidence; it never controls the app.</p>
      <div className="source-filters" aria-label="Filter possible mentions">{['All','Funding','Timing','Requirements'].map(name=><button key={name} className={filter===name?'active':''} aria-pressed={filter===name} onClick={()=>setFilter(name)}>{name} <span>{name==='All'?result.excerpts.length:result.excerpts.filter(x=>x.categories.includes(name)).length}</span></button>)}</div>
      {!visible.length?<div className="source-no-matches"><h4>No {filter==='All'?'matching':filter.toLowerCase()} mentions found</h4><p>This does not mean there are no relevant terms. Open the source, check linked policies, or try its specific funding page. JavaScript-only text and PDFs are not read.</p></div>:<div className="source-excerpts">{visible.map(x=><article className={`source-excerpt ${selected.includes(x.id)?'kept':''}`} key={x.id}><div className="source-excerpt-meta"><span>{x.categories.join(' / ')} · Text block {x.block}</span><label><input type="checkbox" checked={selected.includes(x.id)} onChange={()=>toggle(x.id)} aria-label={`Keep excerpt from text block ${x.block}`}/>Keep excerpt</label></div>{x.heading&&<h4>{x.heading}</h4>}<blockquote>{x.text}{x.truncated&&'…'}</blockquote>{x.truncated&&<p className="source-truncated">Excerpt truncated. Read the complete paragraph on the source.</p>}<a href={x.source} target="_blank" rel="noreferrer">Read surrounding source ↗</a></article>)}</div>}
      {(result.limited||result.omittedBlocks>0)&&<p className="lab-context">{result.limited&&'Up to 24 prioritized matching text blocks are shown. The bounded scan can omit relevant content. '}{result.omittedBlocks>0&&'Some blocks containing contact or sensitive-looking text were omitted. This filter is not a privacy guarantee.'}</p>}
      <div className="source-brief"><div><h3>Keep the evidence you can stand behind.</h3><p>Select excerpts, check the source, then copy a review brief. Nothing is saved after leaving this view or reloading.</p></div><button className="primary" onClick={copy} disabled={!selected.length}>Copy selected evidence</button></div>
      {notice&&<p role="status" className="source-notice">{notice}</p>}
      <details className="brief-preview source-preview"><summary>Review selected evidence brief</summary><textarea readOnly value={report} rows={12} aria-label="Selected source evidence brief"/></details>
      <p className="lab-context source-digest">Decoded HTML SHA-256: <code>{result.contentSha256}</code>. A digest identifies captured bytes; it does not prove the page is true or complete.</p>
    </div>}
  </section>;
}
