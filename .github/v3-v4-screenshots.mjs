import { chromium } from 'playwright';
import fs from 'node:fs';

fs.mkdirSync('comparison-shots', { recursive: true });

const pages = [
  ['v3','net-cao-hon-co-that-tot-hon-v3.html'],
  ['v4','net-cao-hon-co-that-tot-hon-v4.html'],
];

async function fillCommon(page){
  await page.locator('#currentEnabledSeg [data-v="on"]').click();
  await page.locator('#currentFields [data-current="gross"]').fill('20000000');
  await page.locator('#currentFields select[data-current="bhMode"]').selectOption('salary');
  await page.locator('#currentFields [data-current="days"]').fill('5');
  await page.locator('#currentFields [data-current="commute"]').fill('45');
  await page.locator('#currentFields [data-current="otMonthly"]').fill('8');

  await page.locator('#offersIn [data-i="0"][data-k="gross"]').fill('25000000');
  await page.locator('#offersIn select[data-i="0"][data-k="bhMode"]').selectOption('salary');
  await page.locator('#offersIn [data-i="0"][data-k="days"]').fill('3');
  await page.locator('#offersIn [data-i="0"][data-k="commute"]').fill('25');
  await page.locator('#offersIn [data-i="0"][data-k="otMonthly"]').fill('8');
  await page.waitForTimeout(1400);
}

async function shotElement(page, selector, path, pad=18){
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  const box = await el.boundingBox();
  if(!box) throw new Error('No box for '+selector);
  const x=Math.max(0,box.x-pad), y=Math.max(0,box.y-pad), width=Math.min(1280-x,box.width+pad*2), height=box.height+pad*2;
  await page.screenshot({path, clip:{x,y,width,height}, animations:'disabled'});
}

const browser = await chromium.launch({headless:true});
try{
  for(const [ver,file] of pages){
    const page = await browser.newPage({ viewport:{width:1280,height:900}, deviceScaleFactor:1 });
    await page.goto(`http://127.0.0.1:8000/${file}`, {waitUntil:'domcontentloaded'});
    await fillCommon(page);

    // Input comparison: Context + Current + Offer section.
    const ctx = await page.locator('.context').boundingBox();
    const offers = await page.locator('#offersIn').boundingBox();
    if(!ctx || !offers) throw new Error(ver+': input bounds missing');
    const inputY=Math.max(0,ctx.y-18), inputBottom=offers.y+offers.height+24;
    await page.screenshot({path:`comparison-shots/${ver}-inputs.png`,clip:{x:18,y:inputY,width:1244,height:inputBottom-inputY},animations:'disabled'});

    // Results 1-5.
    await shotElement(page,'#results',`comparison-shots/${ver}-results.png`,20);

    // Switching + Layer 6, both enabled.
    const swOn=page.locator('#switchEnabledSeg [data-v="on"]'); if(await swOn.count()) await swOn.click();
    const solOn=page.locator('#solverEnabledSeg [data-v="on"]'); if(await solOn.count()) await solOn.click();
    await page.waitForTimeout(400);
    const sw=await page.locator('.switch-box-results').boundingBox();
    const solver=await page.locator('#solverBox').boundingBox();
    if(!sw || !solver) throw new Error(ver+': switch/solver bounds missing');
    const y=Math.max(0,sw.y-18), bottom=solver.y+solver.height+20;
    await page.screenshot({path:`comparison-shots/${ver}-switch-solver.png`,clip:{x:18,y,width:1244,height:bottom-y},animations:'disabled'});

    await page.close();
  }
  console.log('Created V3/V4 screenshots');
} finally { await browser.close(); }
