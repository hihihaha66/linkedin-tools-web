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
    const rects=[...row.children].slice(0,3).map(e=>{const x=e.getBoundingClientRect();return{x:x.x,y:x.y,w:x.width,h:x.height,cy:x.y+x.height/2}});
    const cs=getComputedStyle(row);
    return{rects,display:cs.display,grid:cs.gridTemplateColumns,scroll:document.documentElement.scrollWidth,inner:window.innerWidth};
   });
   if(r.rects.length!==3)throw new Error(`${label}/${phase}: header is not 3 columns`);
   if(r.display!=='grid'||r.grid.split(' ').filter(Boolean).length<3)throw new Error(`${label}/${phase}: header is not a 3-track CSS grid (${r.display}; ${r.grid})`);
   if(!(Math.abs(r.rects[0].cy-r.rects[1].cy)<2&&Math.abs(r.rects[1].cy-r.rects[2].cy)<2))throw new Error(`${label}/${phase}: columns do not share the same row center`);
   if(!(r.rects[0].x<r.rects[1].x&&r.rects[1].x<r.rects[2].x&&r.rects.every(x=>x.w>40)))throw new Error(`${label}/${phase}: invalid column geometry`);
   if(r.scroll>r.inner+2)throw new Error(`${label}/${phase}: horizontal overflow ${r.scroll}px > ${r.inner}px`);
  };
  await check('blank');
  const setupLayout=await page.evaluate(()=>{
    const ctx=document.querySelector('.ctx');
    const cells=[...ctx.children].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}});
    const bh=document.querySelector('#bhSim');
    const rows=[...document.querySelectorAll('.bh-compact-row')];
    return{ctxDisplay:getComputedStyle(ctx).display,ctxCols:getComputedStyle(ctx).gridTemplateColumns,cells,bhHeight:bh.getBoundingClientRect().height,rowCount:rows.length,sharedNote:!!document.querySelector('.bh-shared-note')};
  });
  if(setupLayout.ctxDisplay!=='grid'||setupLayout.ctxCols.split(' ').filter(Boolean).length<2)throw new Error(`${label}: common context is not a compact two-column grid`);
  if(label==='mobile'&&Math.abs(setupLayout.cells[0].y-setupLayout.cells[1].y)>2)throw new Error('mobile: common-context fields stacked instead of sharing a row');
  if(setupLayout.rowCount!==2||!setupLayout.sharedNote)throw new Error(`${label}: BHXH simulator is not 2 compact rows + shared note`);
  await page.locator('#bhSim summary').click();
  await page.locator('#sickDays').fill('5');
  await page.locator('#matSeg [data-v="show"]').click();
  const bhState=await page.locator('#bhSummaryState').textContent();
  if(!bhState.includes('5 ngày ốm')||!bhState.includes('Thai sản: Có'))throw new Error(`${label}: collapsed BHXH summary did not mirror current settings (${bhState})`);
  if(label==='mobile'){
    const openHeight=await page.locator('#bhSim').evaluate(e=>e.getBoundingClientRect().height);
    if(openHeight>300)throw new Error(`mobile: compact BHXH simulator still too tall (${openHeight}px)`);
  }
  const toggleIcons=await page.evaluate(()=>{
    const d=document.createElement('details');
    d.innerHTML='<summary class="calc-summary">Xem cách tính</summary><div>detail</div>';
    document.body.appendChild(d);
    const summary=d.querySelector('summary');
    const closed=getComputedStyle(summary,'::before').content;
    d.open=true;
    const opened=getComputedStyle(summary,'::before').content;
    d.remove();
    return{closed,opened};
  });
  if(!toggleIcons.closed.includes('＋')||!toggleIcons.opened.includes('−'))throw new Error(`${label}: calculation disclosure icon did not switch + -> - (${toggleIcons.closed} / ${toggleIcons.opened})`);
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
