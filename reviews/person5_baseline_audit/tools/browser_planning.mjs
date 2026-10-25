import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),snapshot=resolve(root,'snapshot');
const require=createRequire(resolve(snapshot,'web/package.json'));
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/zaid/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const python=process.env.AUDIT_PYTHON||'/Users/zaid/Larp-MAXXX/hackathon/.venv/bin/python';
const bridge=spawn(python,[resolve(root,'tools/api_bridge.py')],{cwd:snapshot,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONPATH:snapshot},stdio:['pipe','pipe','pipe']});
let seq=0;const pending=new Map(),bridgeErrors=[];bridge.stderr.on('data',b=>bridgeErrors.push(String(b)));
createInterface({input:bridge.stdout}).on('line',line=>{const r=JSON.parse(line);pending.get(r.id)?.(r);pending.delete(r.id);});
function api(method,path,headers={},body){return new Promise(resolve=>{const id=++seq;pending.set(id,resolve);bridge.stdin.write(JSON.stringify({id,method,path,headers,body})+'\n');});}
const results=[],observations=[],screenshots=[];let browser;
const check=async(name,fn)=>{if(!name.startsWith('Keyboard crew'))return;try{const detail=await fn();results.push({case:name,passed:true,detail});}catch(e){results.push({case:name,passed:false,error:String(e)});}};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function open(route,{width=1440,height=1000,noGraphics=false,failBattery=false,failCurrent=false}={}) {
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage();const flags={failBattery,failCurrent,selectDelays:{}};const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(noGraphics)await page.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).startsWith('webgl')?null:old.call(this,type,...args);};});
 await page.route('http://baseline.fixture/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname.startsWith('/api/')) {
   if(url.pathname==='/api/topology/geojson'&&flags.topologyMode==='error')return route.fulfill({status:503,body:'offline'});
   if(url.pathname==='/api/topology/geojson'&&flags.topologyMode==='empty')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({type:'FeatureCollection',features:[],status:'UNKNOWN'})});
   if(url.pathname==='/api/scenario/current'&&flags.failCurrent){flags.failCurrent=false;return route.fulfill({status:503,body:'offline'});}
   if(url.pathname==='/api/customer/battery-runtime'&&flags.failBattery){return route.fulfill({status:503,body:'offline'});}
   let body;try{body=request.postDataJSON();}catch{}
   const r=await api(request.method(),url.pathname+url.search,await request.allHeaders(),body);
   const delay=url.pathname==='/api/scenario/select'?flags.selectDelays[body?.scenario_id]||0:0;if(delay)await pause(delay);
   return route.fulfill({status:r.status,contentType:r.content_type,body:r.body});
  }
  const dist=resolve(snapshot,'web/dist');const path=decodeURIComponent(url.pathname);let file=resolve(dist,'.'+path);
  if(path==='/'||!extname(path))file=resolve(dist,'index.html');
  if(!file.startsWith(dist+'/'))return route.abort();
  try{await route.fulfill({status:200,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'})[extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'not found'});}
 });
 await page.goto('http://baseline.fixture/'+route);await page.waitForTimeout(1500);
 return {page,context,flags,errors};
}
async function ready(page,route){await page.locator(route.includes('sentinel')?'.sp-inspection':route.includes('operator')?'.utility-decision-brief':route.includes('customer')?'.customer-dashboard':'.hero').waitFor();if(route.includes('customer'))await page.getByText('Conservative planning runtime',{exact:true}).waitFor();}
async function capture(page,name){
 const model=page.locator('.utility-asset-panel').first();if(await model.count()){await model.scrollIntoViewIfNeeded();await page.waitForTimeout(800);}
 await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(100);const file=resolve(root,'screenshots',name+'.png');await page.screenshot({path:file,fullPage:true});screenshots.push('screenshots/'+name+'.png');
}
async function domAudit(page,name){
 const info=await page.evaluate(()=>{
  const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
  const ids=[...document.querySelectorAll('[id]')].map(e=>e.id),dupes=ids.filter((x,i)=>ids.indexOf(x)!==i);
  const controls=[...document.querySelectorAll('button,a,input,select,summary,[role="button"]')].filter(visible);
  const small=controls.map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,label:(e.getAttribute('aria-label')||e.innerText||e.id||'').slice(0,100),width:Math.round(r.width),height:Math.round(r.height)};}).filter(x=>x.width<44||x.height<44);
  const unlabeled=[...document.querySelectorAll('input,select,textarea')].filter(visible).filter(e=>!e.labels?.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')).map(e=>({tag:e.tagName,id:e.id}));
  const contrastSamples=['.customer-heading h1','.customer-heading p','.customer-battery > h2','.customer-actions h3','.customer-alerts h2','.counterfactual-metrics dt'].flatMap(selector=>{
   const e=document.querySelector(selector);if(!e)return [];let p=e,bg=null;
   while(p){const c=getComputedStyle(p).backgroundColor;if(c!=='rgba(0, 0, 0, 0)'&&c!=='transparent'){bg=c;break;}p=p.parentElement;}
   const cs=getComputedStyle(e);return [{selector,foreground:cs.color,background:bg,fontSize:cs.fontSize,fontWeight:cs.fontWeight,text:e.textContent.trim().slice(0,100)}];
  });
  return {contrastSamples,width:innerWidth,documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,duplicateIds:[...new Set(dupes)],unlabeledInputs:unlabeled,smallTargets:small,mainLandmarks:document.querySelectorAll('main').length,headings:[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>({level:e.tagName,text:e.textContent.trim().slice(0,100)}))};
 });observations.push({surface:name,...info});assert.equal(info.overflow,false,`document width ${info.documentWidth}>viewport ${info.width}`);assert.deepEqual(info.unlabeledInputs,[]);assert.deepEqual(info.duplicateIds,[]);return info;
}

try {
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
 await check('Feeder map hit regions stay transparent and symbols have strokes',async()=>{
  const {page,context}=await open('operator');try{await ready(page,'operator');await page.locator('.utility-feeder-node').first().waitFor();const style=await page.locator('.utility-feeder-hit').first().evaluate(e=>({fill:getComputedStyle(e).fill,stroke:getComputedStyle(e).stroke}));const symbol=await page.locator('.utility-feeder-symbol').first().evaluate(e=>({stroke:getComputedStyle(e).stroke}));observations.push({surface:'feeder-computed-style',hit:style,symbol});assert.match(style.fill,/transparent|rgba\(0, 0, 0, 0\)/);assert.notEqual(symbol.stroke,'none');}finally{await context.close();}
 });
 await check('Keyboard crew and access sliders update shared planning and customer range',async()=>{
  const {page,context}=await open('operator');try{await ready(page,'operator');await page.locator('.incident-bar select').first().selectOption('confirmed_replacement');await page.locator('.utility-range').waitFor();for(const [selector,key] of [['#planning-crew-size','End'],['#planning-crew-size','ArrowLeft'],['#planning-crew-size','ArrowLeft'],['#planning-access-hours','ArrowRight'],['#planning-access-hours','ArrowRight']]){await page.locator(selector).press(key);await page.waitForTimeout(500);}await page.waitForTimeout(600);const applied=await page.locator('.utility-applied-inputs').innerText();const range=await page.locator('.utility-range').innerText();const priority=await page.locator('.utility-priority-comparison').count();assert.match(applied,/6 lineworkers · 2 h access delay/);assert.match(range,/3\.5(?:0)? h/);await page.locator('.utility-priority-comparison summary').click();await page.getByText('Illustrative scheduling under assumed facility associations.',{exact:false}).waitFor();await capture(page,'operator-planning-and-priority');await page.locator('.site-header-tools').getByRole('link',{name:'Customer view',exact:true}).click();await ready(page,'customer');await page.waitForFunction(()=>document.querySelector('.customer-window')?.textContent?.includes('hours · planning window'));const customer=await page.locator('.customer-window').innerText();observations.push({surface:'planning-shared',applied,range,priority,customer});assert.match(customer,/hours · planning window/);await capture(page,'customer-shared-planning');}finally{await context.close();}
 });
 await check('Customer Scenario 4 suppresses confirmed outage and repair window',async()=>{
  const {page,context}=await open('customer');try{await ready(page,'customer');await page.locator('.incident-bar select').first().selectOption('insufficient_evidence');await page.locator('.customer-status').filter({hasText:'Under review'}).waitFor();assert.equal(await page.locator('.customer-window').innerText(),'No confirmed restoration estimate');assert.doesNotMatch(await page.locator('.customer-service').innerText(),/Confirmed outage/);await capture(page,'customer-abstention');}finally{await context.close();}
 });
 await check('Feeder API error retries, empty geometry remains explicit, keyboard node selection works',async()=>{
  const {page,context,flags}=await open('operator');try{await ready(page,'operator');await page.locator('.utility-feeder-node').first().waitFor();const node=page.locator('.utility-feeder-node').last();await node.focus();await node.press('Enter');assert.equal(await node.getAttribute('aria-pressed'),'true');flags.topologyMode='error';await page.reload();await ready(page,'operator');await page.getByRole('button',{name:'Retry topology',exact:true}).waitFor();flags.topologyMode='empty';await page.getByRole('button',{name:'Retry topology',exact:true}).click();await page.getByText('No equipment geometry supplied.',{exact:true}).waitFor();await capture(page,'operator-empty-feeder');}finally{await context.close();}
 });
} catch(e){results.push({case:'supplemental harness/browser launch',passed:false,error:String(e)});}finally{
 await browser?.close();bridge.stdin.end();bridge.kill();await writeFile(resolve(root,'receipts/browser-planning.json'),JSON.stringify({baseline:'1ee72a24eea12b140182cb8f7ddd9cf83d2509d6',recorded_at:new Date().toISOString(),results,observations,screenshots},null,2)+'\n');console.log(JSON.stringify({results,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length},null,2));process.exitCode=results.some(x=>!x.passed)?1:0;
}
