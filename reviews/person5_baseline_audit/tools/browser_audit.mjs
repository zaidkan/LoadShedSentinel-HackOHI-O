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
const check=async(name,fn)=>{try{const detail=await fn();results.push({case:name,passed:true,detail});}catch(e){results.push({case:name,passed:false,error:String(e)});}};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function open(route,{width=1440,height=1000,noGraphics=false,failBattery=false,failCurrent=false}={}) {
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage();const flags={failBattery,failCurrent,selectDelays:{}};const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(noGraphics)await page.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).startsWith('webgl')?null:old.call(this,type,...args);};});
 await page.route('http://baseline.fixture/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname.startsWith('/api/')) {
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
 for(const [name,route] of [['landing',''],['operator','#/operator'],['customer','#/customer'],['sentinel','#/sentinel']])for(const mobile of [false,true]) {
  await check(`${name} ${mobile?'mobile':'desktop'}: load, labels, overflow and capture`,async()=>{
   const {page,context,errors}=await open(route,mobile?{width:390,height:844}:{});try{await ready(page,route);const info=await domAudit(page,`${name}-${mobile?'mobile':'desktop'}`);await capture(page,`${name}-${mobile?'mobile':'desktop'}`);assert.deepEqual(errors,[]);return {headings:info.headings,canvasCount:await page.locator('canvas').count()};}finally{await context.close();}
  });
 }
 await check('Landing primary navigation reaches operator and customer',async()=>{
  const {page,context}=await open('');try{await page.getByRole('button',{name:'Operator console',exact:true}).click();await ready(page,'#/operator');await page.locator('.site-header-tools').getByRole('link',{name:'Customer view',exact:true}).click();await ready(page,'#/customer');return {pathname:await page.evaluate(()=>location.pathname)};}finally{await context.close();}
 });
 await check('Hash operator: recommended next-action anchor retains operator route',async()=>{
  const {page,context}=await open('#/operator');try{await ready(page,'#/operator');await page.locator('.utility-action-link').click();await page.waitForTimeout(300);const remains=await page.locator('.utility-decision-brief').count();const url=page.url();await capture(page,'operator-hash-anchor-result');assert.equal(remains,1,`operator disappeared after local anchor; ${url}`);return url;}finally{await context.close();}
 });
 await check('Hash customer: household anchor retains concierge route',async()=>{
  const {page,context}=await open('#/customer');try{await ready(page,'#/customer');await page.getByRole('link',{name:'Update household needs'}).click();await page.waitForTimeout(300);assert.equal(await page.locator('.customer-dashboard').count(),1,`customer disappeared; ${page.url()}`);}finally{await context.close();}
 });
 await check('Scenario 4 UI and comparator preserve abstention',async()=>{
  const {page,context}=await open('operator');try{await ready(page,'operator');await page.locator('.incident-bar select').first().selectOption('insufficient_evidence');await page.getByRole('heading',{name:'Contradictory telemetry',exact:true}).waitFor();const c02=await page.locator('.utility-counterfactual-card').innerText();await capture(page,'operator-abstention');observations.push({surface:'abstention-comparator',text:c02});assert.doesNotMatch(c02,/confirms transformer energization|Misdispatch Prevented|Required Dispatch|\$12,000/,'comparator asserts operational result while status is under review');}finally{await context.close();}
 });
 await check('Selected asset footprint agrees with active comparator',async()=>{
  const {page,context}=await open('operator');try{await ready(page,'operator');const sid=await page.evaluate(()=>sessionStorage.getItem('loadshed_session_id'));const assets=JSON.parse((await api('GET','/api/aep/assets')).body);const a=assets.find(a=>a.kind==='TRANSFORMER'&&a.dependent_premises_in_sample!==3);assert.ok(a);await page.locator('.incident-bar select').nth(1).selectOption(a.asset_token);await page.waitForTimeout(500);const active=await page.locator('.counterfactual-col.active').innerText();await capture(page,'operator-alternate-asset');observations.push({surface:'selected-asset-comparator',asset:a,activeText:active,brief:await page.locator('.utility-incident-facts').innerText()});assert.match(active,new RegExp(`${a.dependent_premises_in_sample} Sample Premises`));return {sidPresent:!!sid};}finally{await context.close();}
 });
 await check('Latest scenario selection wins when older response finishes last',async()=>{
  const {page,context,flags}=await open('operator');try{await ready(page,'operator');flags.selectDelays.confirmed_replacement=1000;flags.selectDelays.upstream_feeder=20;await page.locator('.incident-bar select').first().selectOption('confirmed_replacement');await page.getByRole('button',{name:'Compare Upstream Feeder',exact:true}).click();await page.waitForTimeout(1500);const text=await page.locator('#utility-page-heading').innerText();await capture(page,'operator-response-race');observations.push({surface:'response-race',lastRequested:'upstream_feeder',finalHeading:text});assert.equal(text,'Upstream feeder interruption');}finally{await context.close();}
 });
 await check('Customer household persistence, battery retry and invalid/no-battery recovery',async()=>{
  const {page,context,flags}=await open('customer',{failBattery:true});try{await ready(page,'customer');await page.getByRole('button',{name:'Retry battery estimate',exact:true}).waitFor();flags.failBattery=false;await page.getByRole('button',{name:'Retry battery estimate',exact:true}).click();await page.locator('.customer-runtime-value').waitFor();await page.getByLabel('Essential medical equipment',{exact:false}).check();await page.getByLabel('Refrigerated medication',{exact:false}).check();await page.getByLabel('Mobility & accessibility',{exact:false}).check();await page.reload();await ready(page,'customer');assert.equal(await page.getByLabel('Essential medical equipment',{exact:false}).isChecked(),true);await page.locator('#battery-load-input').fill('0');assert.equal(await page.locator('.customer-runtime-value').count(),0);await page.getByLabel('I have a backup battery',{exact:false}).uncheck();await page.getByText('No battery runtime is assumed.',{exact:false}).waitFor();await capture(page,'customer-needs-and-recovery');}finally{await context.close();}
 });
 await check('Initial API failure offers a working connection retry',async()=>{
  const {page,context}=await open('operator',{failCurrent:true});try{await page.getByRole('button',{name:'Retry connection',exact:true}).waitFor();await capture(page,'operator-connection-error');await page.getByRole('button',{name:'Retry connection',exact:true}).click();await ready(page,'operator');}finally{await context.close();}
 });
 await check('Operator 3D controls retain 2D fallback and state labels',async()=>{
  const {page,context}=await open('operator');try{await ready(page,'operator');const button=page.getByRole('button',{name:'2D diagram',exact:true});if(!await button.isDisabled()){await page.locator('.utility-asset-panel').scrollIntoViewIfNeeded();await button.click();assert.ok(await page.locator('.utility-pole-diagram').count());await button.click();}else assert.ok(await page.locator('.utility-pole-diagram').count());return {graphicsCanvas:await page.locator('canvas').count()};}finally{await context.close();}
 });
 await check('Sentinel preview OPEN/CLOSED/UNKNOWN controls and back destination',async()=>{
  const {page,context}=await open('#/sentinel');try{await ready(page,'#/sentinel');for(const label of ['Open','Closed','Unknown']){await page.getByRole('group',{name:'Preview cutout state'}).getByRole('button',{name:label,exact:true}).click();assert.equal(await page.locator('.utility-scene').getAttribute('data-cutout-status'),label.toUpperCase());}await capture(page,'sentinel-unknown');await page.getByRole('link',{name:'Back to console',exact:true}).click();await page.waitForTimeout(500);assert.equal(await page.locator('.utility-decision-brief').count(),1,`Back to console routes to ${page.url()}`);}finally{await context.close();}
 });
 await check('No-WebGL operator retains readable diagram fallback',async()=>{
  const {page,context}=await open('operator',{noGraphics:true,width:390,height:844});try{await ready(page,'operator');assert.ok(await page.locator('.utility-pole-diagram').count());await capture(page,'operator-webgl-fallback');}finally{await context.close();}
 });
} catch(e){results.push({case:'audit harness/browser launch',passed:false,error:String(e)});}finally {
 await browser?.close();bridge.stdin.end();bridge.kill();await mkdir(resolve(root,'receipts'),{recursive:true});
 await writeFile(resolve(root,'receipts/browser-audit.json'),JSON.stringify({baseline:'1ee72a24eea12b140182cb8f7ddd9cf83d2509d6',recorded_at:new Date().toISOString(),results,observations,screenshots,limitations:['Chromium with emulated viewports, not physical devices','API handled by actual immutable-snapshot FastAPI TestClient over subprocess transport, not an HTTP server deployment','Reduced-motion setting enabled for deterministic captures']},null,2)+'\n');
 await writeFile(resolve(root,'receipts/browser-api-bridge.log'),bridgeErrors.join(''));console.log(JSON.stringify({results,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length},null,2));process.exitCode=results.some(x=>!x.passed)?1:0;
}
