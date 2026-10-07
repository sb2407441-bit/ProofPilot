import {formatDate} from '../../lib/engine.mjs';
export default function OpportunityList({items,selected,onSelect,query,onQuery,filter,onFilter}) {
  return <aside className="opportunity-list" aria-label="Opportunity list">
    <div className="search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input aria-label="Search opportunities" placeholder="Search opportunities" value={query} onChange={e=>onQuery(e.target.value)}/></div>
    <div className="filter-tabs" role="group" aria-label="Filter opportunities">{['All','Best fit','Needs review'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>onFilter(x)}>{x}</button>)}</div>
    <div className="list-rows">{items.length?items.map(({op,fit})=><button key={op.id} className={'opportunity-row '+(selected===op.id?'selected':'')} onClick={()=>onSelect(op.id)} aria-pressed={selected===op.id}><div className="row-top"><strong>{op.name}</strong><span className={'status '+fit.tone}>{fit.status}</span></div><span className="row-description">{op.category} · {op.location}</span><time className="row-date" dateTime={op.deadline.date}>{formatDate(op.deadline.date,true).toUpperCase()}</time></button>):<div className="empty-list"><strong>No matching opportunities</strong><p>Change your search or choose another filter.</p><button className="text-button" onClick={()=>{onQuery('');onFilter('All');}}>Clear filters</button></div>}</div>
  </aside>;
}
