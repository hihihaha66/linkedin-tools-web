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
let resultsHidden=await page.locator('#results').evaluate(el=>el.classList.contains('hidden'));
console.log('RESULT_STATE='+JSON.stringify({emptyText,resultsHidden}));
assert.equal(resultsHidden,false,'Results should render locally after valid salary input');

// 1.7 UI bad salary behavior: invalid non-empty keeps last valid; blank returns to exact empty state.
await salary.fill('abc');
await page.waitForTimeout(100);
assert.equal(await salary.inputValue(),'30,000,000','Letter input must keep nearest valid salary');
await salary.fill('-100');
await page.waitForTimeout(100);
assert.equal(await salary.inputValue(),'30,000,000','Negative input must keep nearest valid salary');
await salary.fill('');
await page.waitForTimeout(800);
resultsHidden=await page.locator('#results').evaluate(el=>el.classList.contains('hidden'));
assert.equal(resultsHidden,true,'Blank salary must hide results');
assert.equal((await page.locator('#empty').textContent())?.trim(),'Nhập lương để bắt đầu','Blank salary must show exact empty-state copy');
await salary.fill('30000000');
await page.waitForTimeout(800);

// B7: CTA must activate simulation state, not only scroll/open.
const bhCta=page.locator('#enableBhSimFromL5');
assert.equal(await bhCta.count(),1,'Layer 5 CTA must exist before simulation is enabled');
await bhCta.click();
await page.waitForTimeout(500);
assert.equal(await page.locator('#bhSim').evaluate(el=>el.open),true,'B7 CTA must open BH simulation controls');
assert.equal(await page.locator('#sickDays').inputValue(),'0','B7 CTA must activate existing simulation state with explicit 0 sick days');
assert.ok((await page.locator('#bhSummaryState').textContent()).includes('0 ngày ốm'),'BH summary must reflect enabled state');
assert.equal(await page.locator('#enableBhSimFromL5').count(),0,'Layer 5 CTA must disappear after simulation is enabled');
assert.equal(await page.locator('#sickDays').isVisible(),true,'Sick-days field must be visible after activation');
assert.equal(await page.locator('#matSeg').isVisible(),true,'Maternity control must be visible after activation');

// 2.1 segmented control remains Thêm/Bỏ qua with the final label.
const currentBox=page.locator('#currentBox');
assert.ok((await currentBox.textContent()).includes('Đưa công việc hiện tại vào so sánh?'));
await page.locator('#currentEnabledSeg button[data-v="on"]').click();
assert.equal(await page.locator('#currentFields').isVisible(),true,'Thêm must enable currentJobEnabled UI');
await page.locator('#currentEnabledSeg button[data-v="off"]').click();
assert.equal(await page.locator('#currentFields').isVisible(),false,'Bỏ qua must disable currentJobEnabled UI');

// 2.2 clear remains two-click; first click is visibly armed and must not erase.
const clear=page.locator('#clearBtn');
await clear.click();
assert.equal((await clear.textContent())?.trim(),'Bấm lại để xoá');
assert.equal(await clear.evaluate(el=>el.classList.contains('clear-armed')),true,'First click must visibly arm delete');
assert.equal(await salary.inputValue(),'30,000,000','First clear click must not delete data');
await clear.click();
await page.waitForTimeout(200);
assert.equal((await clear.textContent())?.trim(),'Xoá hết');
assert.equal(await page.locator('input[data-i="0"][data-k="gross"]').inputValue(),'','Second clear click must delete data');

await browser.close();
console.log('RC1_NETWORK_SMOKE=PASS');
