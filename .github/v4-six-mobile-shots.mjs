import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('comparison-shots', {recursive:true});

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:2});
  await page.goto('http://127.0.0.1:8000/net-cao-hon-co-that-tot-hon-v4.html',{waitUntil:'domcontentloaded'});

  await page.locator('#currentEnabledSeg [data-v="on"]').click();
  await page.locator('#currentFields [data-current="gross"]').fill('20000000');
  await page.locator('#currentFields select[data-current="bhMode"]').selectOption('salary');
  await page.locator('#currentFields [data-current="days"]').fill('5');
  await page.locator('#currentFields [data-current="commute"]').fill('45');

  await page.locator('#offersIn [data-i="0"][data-k="gross"]').fill('25000000');
  await page.locator('#offersIn select[data-i="0"][data-k="bhMode"]').selectOption('salary');
  await page.locator('#offersIn [data-i="0"][data-k="days"]').fill('3');
  await page.locator('#offersIn [data-i="0"][data-k="commute"]').fill('25');
  await page.waitForTimeout(1800);

  if(await page.locator('#results.hidden').count()) throw new Error('Results did not render');

  const shotElement=async(sel,path)=>{
    const el=page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await el.screenshot({path,animations:'disabled'});
  };

  // Item 2: insurance warning with the end of offer section / result-start context.
  const note=page.locator('.v4-insurance-note');
  await note.scrollIntoViewIfNeeded(); await page.waitForTimeout(120);
  const b=await note.boundingBox(); if(!b)throw new Error('insurance note box missing');
  const y=Math.max(0,b.y-115), bottom=b.y+b.height+105;
  await page.screenshot({path:'comparison-shots/v4-mobile-item-2-insurance.png',clip:{x:0,y,width:430,height:bottom-y},animations:'disabled'});

  await shotElement('[data-v4-layer="2"]','comparison-shots/v4-mobile-item-3-layer2.png');
  await shotElement('[data-v4-layer="5"]','comparison-shots/v4-mobile-item-5-layer5.png');
  console.log('Captured V4 mobile items 2, 3, 5');
}finally{await browser.close();}