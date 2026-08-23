import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const cases=[['desktop',1280,900],['mobile',375,812]];
try{
 for(const [label,width,height] of cases){
  const page=await browser.newPage({viewport:{width,height}});
  await page.goto('http://127.0.0.1:8000/net-cao-hon-co-that-tot-hon-v2.html',{waitUntil:'domcontentloaded'});
  const check=async phase=>{
   const r=await page.evaluate(()=>{
    const row=document.querySelector('.offer-mrow.head');
    const rects=[...row.children].slice(0,3).map(e=>{const x=e.getBoundingClientRect();return{x:x.x,y:x.y,w:x.width,h:x.height}});
    return{rects,scroll:document.documentElement.scrollWidth,inner:window.innerWidth};
   });
   if(r.rects.length!==3)throw new Error(`${label}/${phase}: header is not 3 columns`);
   if(!(Math.abs(r.rects[0].y-r.rects[1].y)<2&&Math.abs(r.rects[1].y-r.rects[2].y)<2))throw new Error(`${label}/${phase}: columns stacked vertically`);
   if(!(r.rects[0].x<r.rects[1].x&&r.rects[1].x<r.rects[2].x&&r.rects.every(x=>x.w>40)))throw new Error(`${label}/${phase}: invalid column geometry`);
   if(r.scroll>r.inner+2)throw new Error(`${label}/${phase}: horizontal overflow ${r.scroll}px > ${r.inner}px`);
  };
  await check('blank');
  await page.locator('[data-seg="probationEnabled"][data-i="0"] [data-v="yes"]').click();
  await page.locator('input[data-i="0"][data-k="probDurationValue"]').fill('60');
  await page.locator('select[data-i="0"][data-k="probDurationUnit"]').selectOption('days');
  await page.locator('select[data-i="0"][data-k="probJobType"]').selectOption('college');
  await page.locator('input[data-i="0"][data-k="otMonthly"]').fill('45');
  await page.locator('[data-seg="otPaid"][data-i="0"] [data-v="yes"]').click();
  await page.locator('select[data-i="0"][data-k="otType"]').selectOption('mixed');
  await check('expanded-trial-ot');
  await page.close();
  console.log(`PASS Turn 6 responsive: ${label}`);
 }
} finally {await browser.close();}
