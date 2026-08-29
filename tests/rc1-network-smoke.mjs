import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const url=process.env.RC1_URL;
if(!url)throw new Error('RC1_URL is required');

const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const page=await browser.newPage();
const all=[];
page.on('request',req=>all.push({url:req.url(),type:req.resourceType(),method:req.method()}));
page.setDefaultTimeout(15000);
await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
await page.waitForTimeout(2000);
assert.equal((await page.locator('h1').textContent())?.trim(),'Net cao hơn có thật tốt hơn?','Preview did not load RC1 page');
const initial=[...all];
all.length=0;

await page.fill('#deps','0');
const salary=page.locator('input[data-i="0"][data-k="gross"]');
await salary.fill('30000000');
await page.waitForTimeout(1200);

const afterInput=[...all];
const staticTypes=new Set(['document','script','stylesheet','font','image','media']);
const business=afterInput.filter(r=>['xhr','fetch','websocket','eventsource'].includes(r.type)||r.method!=='GET'||!staticTypes.has(r.type));
console.log('INITIAL_REQUESTS');
for(const r of initial)console.log(r.type+' '+r.method+' '+r.url);
console.log('AFTER_INPUT_REQUESTS');
for(const r of afterInput)console.log(r.type+' '+r.method+' '+r.url);
console.log('BUSINESS_REQUESTS_AFTER_INPUT='+business.length);
assert.equal(business.length,0,'Unexpected business request after input: '+JSON.stringify(business));
assert.ok(afterInput.every(r=>staticTypes.has(r.type)&&r.method==='GET'),'Only static GET resources may load after input');

const emptyText=await page.locator('#empty').textContent();
const resultsHidden=await page.locator('#results').evaluate(el=>el.classList.contains('hidden'));
console.log('RESULT_STATE='+JSON.stringify({emptyText,resultsHidden}));
assert.equal(resultsHidden,false,'Results should render locally after valid salary input');
await browser.close();
console.log('RC1_NETWORK_SMOKE=PASS');
