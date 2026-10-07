import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {opportunities} from '../data/opportunities.mjs';
import {prepareDraft,assembleDraft} from '../lib/drafts.mjs';
import {listLocalModels,selectDraftPlan,localProviderUrl} from './provider.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const baseUrl=localProviderUrl(process.env.LOCAL_AI_URL||'http://127.0.0.1:11434');
const kind=process.env.LOCAL_AI_KIND==='gateway'?'gateway':'ollama';
const port=Number(process.env.PORT||5189);
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
async function body(req) {
  let text='';
  for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>16000)throw new Error('Request too large.');}
  return JSON.parse(text);
}
export function createApp() {
  return http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    if(req.headers.origin&&!/^http:\/\/(127\.0\.0\.1|localhost):(5188|5189)$/.test(req.headers.origin))return json(res,403,{error:'Only the local app may send requests.'});
    if(!/^(127\.0\.0\.1|localhost)(:\d{1,5})?$/.test(req.headers.host||''))return json(res,403,{error:'Invalid local host.'});
    try {
      if(url.pathname==='/api/provider'&&req.method==='GET')return json(res,200,{kind,...await listLocalModels({baseUrl,kind})});
      if(url.pathname==='/api/draft'&&req.method==='POST'){
        if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'JSON is required.'});
        const data=await body(req),op=opportunities.find(x=>x.id===data.opportunityId);
        if(!op)return json(res,400,{error:'Unknown opportunity.'});
        const {catalog,plan}=prepareDraft(op,data.profile);
        let result=plan,provider='template';
        if(data.useAI){
          const available=await listLocalModels({baseUrl,kind});
          if(!available.models.includes(data.model))return json(res,409,{error:'Select an available local model. Template mode remains available.'});
          result=await selectDraftPlan({catalog,baseUrl,kind,model:data.model});provider='local-ai';
        }
        return json(res,200,{...assembleDraft(result,catalog),provider});
      }
      if(url.pathname.startsWith('/api/'))return json(res,404,{error:'Endpoint not found.'});
      if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
      let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
      if(!file.startsWith(root+path.sep))file=path.join(root,'index.html');
      let contents;
      try{contents=await readFile(file);}catch{file=path.join(root,'index.html');contents=await readFile(file);}
      const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'"});res.end(req.method==='HEAD'?undefined:contents);
    }catch(error){json(res,400,{error:['Request too large.','JSON is required.'].includes(error.message)?error.message:error instanceof SyntaxError?'Invalid JSON.':String(error.message).slice(0,240)});}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createApp().listen(port,'127.0.0.1',()=>console.log(`ProofPilot running at http://127.0.0.1:${port}`));
