import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  for(const [label,width,height] of [['desktop',1280,900],['mobile',375,812]]){
    const page=await browser.newPage({viewport:{width,height}});
    await page.route('**/api/offer-value-v3',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({hasResults:false,v3:true,availableOptions:[],comparison:{left:null,right:null},showPairSelector:false,showSwitching:false,showLayer6:false})}));
    await page.goto('http://127.0.0.1:8000/net-cao-hon-co-that-tot-hon-v3.html',{waitUntil:'domcontentloaded'});
    const btn=page.locator('#uiLabelBtn');if(await btn.count()!==1)throw new Error(label+': missing PO/Dev label toggle');
    if(await btn.getAttribute('aria-pressed')!=='false')throw new Error(label+': labels must default off');
    if(await page.locator('.ui-dev-tag').count())throw new Error(label+': labels visible before opt-in');
    await btn.click();await page.waitForTimeout(80);
    if(await btn.getAttribute('aria-pressed')!=='true'||(await btn.innerText()).trim()!=='Ẩn nhãn')throw new Error(label+': toggle did not activate');
    const tags=await page.locator('.ui-dev-tag').allTextContents();
    for(const must of ['Button | import/upload','Number input | enter/edit','Select / Dropdown | select option','Accordion / Disclosure | expand/collapse','Segmented control | select/toggle','Matrix / Table | input/compare'])if(!tags.includes(must))throw new Error(label+': missing terminology tag '+must+'; got '+tags.join(' || '));
    const outlined=await page.locator('.ui-tag-target').count();if(outlined<6)throw new Error(label+': too few components annotated '+outlined);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(overflow>2)throw new Error(label+': annotation overlay caused horizontal overflow '+overflow);
    await page.locator('#bhSim summary').click();await page.waitForTimeout(80);
    const afterOpen=await page.locator('.ui-dev-tag').allTextContents();if(!afterOpen.includes('Number input | enter/edit'))throw new Error(label+': newly visible accordion control not annotated');
    await btn.click();await page.waitForTimeout(30);if(await page.locator('.ui-dev-tag').count())throw new Error(label+': labels not cleared after toggle off');if(await page.locator('.ui-tag-target').count())throw new Error(label+': outlines not cleared after toggle off');
    await page.close();
  }
  console.log('PASS V3 PO/Dev component label mode');
}finally{await browser.close()}
