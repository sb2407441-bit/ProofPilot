import {loadBuffer} from 'cheerio';
import {createHash} from 'node:crypto';
import {detectSensitiveText} from './engine.mjs';

const clean=s=>s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim();
const textBoundaries=new Set(['p','li','ul','ol','div','blockquote','br','h1','h2','h3','h4','h5','h6','dl','dt','dd','table','tr','td','th','section','article']);
// Preserve block boundaries without inserting spaces inside inline words.
function listText(root){
  const chunks=[],pending=[root];
  while(pending.length){
    const node=pending.pop();
    if(node===null){chunks.push(' ');continue;}
    if(node.type==='text'){chunks.push(node.data);continue;}
    if(textBoundaries.has(node.tagName)){chunks.push(' ');pending.push(null);}
    if(node.children)for(let i=node.children.length-1;i>=0;i--)pending.push(node.children[i]);
  }
  return clean(chunks.join(''));
}
const categories=[
  ['Funding',/\b(fund(?:ing|ed|s)?|grants?|scholarships?|stipends?|reimburse\w*|travel|accommodation|costs?|fees?|budget|paid|payment|covered)\b/i],
  ['Timing',/\b(deadlines?|closing|closes?|apply by|applications? (?:open|due)|submit.{0,24}before)\b/i],
  ['Requirements',/\b(eligib\w*|requirements?|criteria|must|citizens?|residen\w*|students?)\b/i]
];

// Parse inert markup. Never load scripts, styles, linked pages or page assets.
export function extractSourceEvidence(bytes,{source,fetchedAt,mode='public-page'}){
  const $=loadBuffer(bytes);
  let title=clean($('title').first().text()).slice(0,160)||'Public page';
  if(detectSensitiveText(title).length)title='Public page';
  $('script,style,noscript,template,nav,footer,header,form,iframe,svg,[hidden],[aria-hidden="true"]').remove();
  const main=$('main').first(),article=$('article').first();
  const scope=main.length?main:article.length?article:$('body');
  const seen=new Set(),candidates=[];
  let block=0,heading='',headingAnchor='',omitted=0;
  scope.find('h1,h2,h3,h4,p,li,blockquote,td,dd').each((_,el)=>{
    if(++block>3000)return false;
    const node=$(el);
    // A list item's child paragraphs may depend on its lead-in or nested terms.
    // Keep the outer item together; never emit a detached child as evidence.
    if(node.parents('li').length)return;
    const isList=el.tagName==='li',text=isList?listText(el):clean(node.text());
    if(!text)return;
    if(/^h[1-4]$/.test(el.tagName)){heading=detectSensitiveText(text).length?'':text.slice(0,120);headingAnchor=node.attr('id')||node.closest('[id]').attr('id')||'';return;}
    // Avoid parent/child duplicates, such as a list item wrapping paragraphs.
    if(!isList&&node.find('p,li,blockquote,td,dd').length)return;
    if(node.find('a').length&&clean(node.find('a').text())===text)return;
    if(seen.has(text))return;
    seen.add(text);
    const tags=categories.filter(([,rx])=>rx.test(text)).map(([name])=>name);
    if(!tags.length)return;
    if(detectSensitiveText(text).length){omitted++;return;}
    const anchor=node.attr('id')||node.closest('[id]').attr('id')||headingAnchor;
    const link=anchor&&/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(anchor)?source+'#'+anchor:source;
    const priority=tags.length+(/\b(reimburse\w*|stipend|scholarship|travel|accommodation|fees?|costs?|covered|pay|payment)\b/i.test(text)?5:0)+(/\b(deadline|closing|apply by|submit.{0,24}before)\b/i.test(text)?7:0)+(/\b(must|not eligible|required|criteria)\b/i.test(text)?3:0)+(/[$€£]\s?\d|\b\d[\d,.]*\s?(?:USD|EUR|GBP)\b/i.test(text)?3:0);
    candidates.push({id:`block-${block}`,block,heading,context:isList?'list-item':'text-block',categories:tags,text:text.slice(0,700),truncated:text.length>700,source:link,priority});
  });
  const ranked=candidates.sort((a,b)=>b.priority-a.priority||a.block-b.block),kept=new Set();
  // Preserve category coverage so a long funding page cannot crowd out timing.
  for(const [category] of categories)for(const x of ranked.filter(x=>x.categories.includes(category)).slice(0,2))kept.add(x.id);
  for(const x of ranked){if(kept.size>=24)break;kept.add(x.id);}
  const excerpts=ranked.filter(x=>kept.has(x.id)).sort((a,b)=>a.block-b.block).map(({priority,...x})=>x);
  return {schemaVersion:1,mode,source,fetchedAt,title,contentSha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,excerpts,matchingBlocks:candidates.length,omittedBlocks:omitted,limited:candidates.length>excerpts.length||block>3000,
    limits:['Keyword matches are possible mentions, not verified funding or eligibility decisions.','List items retain nested wording as one excerpt; other surrounding conditions may still be missing.','Whitespace-normalized page text; truncated excerpts are marked. Read the surrounding source.','Static HTML only; JavaScript-rendered content, PDFs and linked pages are not read.','No personal profile is sent. No live AI, application submission or funding guarantee.']};
}
