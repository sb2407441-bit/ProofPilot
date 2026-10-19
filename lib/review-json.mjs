// Native JSON.parse remains the syntax authority. This second, iterative pass
// checks object names before schema validation can lose overwritten members.
// Callers provide fixed labels, never input-derived names or paths.
export class ReviewJsonError extends Error {}
export function parseReviewJson(input,label='Snapshot'){
  if(typeof input!=='string'||input.length>12000)throw new ReviewJsonError(`${label} must be JSON text of at most 12,000 characters.`);
  let value;
  try{value=JSON.parse(input);}catch{throw new ReviewJsonError(`${label} is not valid JSON. Check quotes, commas and braces.`);}
  const stack=[];
  const tokens=/"(?:[^"\\]|\\[\s\S])*"|[{}\[\],:]|[^\s{}\[\],:]+/g;
  function position(offset){
    const lines=input.slice(0,offset).split(/\r\n|\r|\n/);
    return `line ${lines.length}, column ${lines.at(-1).length+1}`;
  }
  for(const token of input.matchAll(tokens)){
    const text=token[0],frame=stack.at(-1);
    if(text==='{'||text==='['){
      stack.push(text==='{'?{keys:new Map(),expectKey:true}:{});
      if(stack.length>32)throw new ReviewJsonError(`${label} exceeds the 32-level nesting limit. Use the documented flat snapshot or profile format.`);
    }else if(text==='}'||text===']')stack.pop();
    else if(text===','){if(frame?.keys)frame.expectKey=true;}
    else if(frame?.expectKey&&text.startsWith('"')){
      const key=JSON.parse(text);
      if(frame.keys.has(key))throw new ReviewJsonError(`${label} repeats an object field at ${position(token.index)} (first at ${position(frame.keys.get(key))}). Keep one value per field.`);
      frame.keys.set(key,token.index);frame.expectKey=false;
    }
  }
  return value;
}
