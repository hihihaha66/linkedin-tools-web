import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  for(const [label,width,height] of [['desktop',1280,900],['mobile-320',320,740],['mobile-375',375,812],['mobile-430',430,932]]){
    const page=await browser.newPage({viewport:{width,height}});const bodies=[],apiUrls=[];
    await page.route('**/api/offer-value-v4',async route=>{apiUrls.push(route.request().url());try{bodies.push(JSON.parse(route.request().postData()||'{}'))}catch{};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({hasResults:false,v3:true,availableOptions:[],comparison:{left:null,right:null},comparisonMode:'pair',summaryHtml:'',modeTitle:'',l1cols:'',annualcols:'',tcols:'',l2basis:'',l3events:'',verdictHtml:'',showSwitching:false,switchingHtml:'',showLayer6:false,layer6Html:'',exportText:''})})});
    await page.goto('http://127.0.0.1:8000/net-cao-hon-co-that-tot-hon-v4.html',{waitUntil:'domcontentloaded'});
    if(!(await page.title()).includes('V4')||(await page.title()).includes('V3'))throw new Error(label+': wrong V4 title '+await page.title());
    const text=await page.locator('body').innerText();
    for(const must of ['So công việc hiện tại với 1-2 offer','Thêm khi muốn so offer mới với phương án ở lại.','Có 1 offer thì nhập Offer A; có thêm Offer B thì bật “2 offer”.','BH chưa rõ?','Chọn mục tiêu; tool tính mức lương tối thiểu cần thương lượng theo điều kiện của offer.'])if(!text.includes(must))throw new Error(label+': compact copy missing '+must);
    for(const old of ['Tool đưa tiền, thời gian, bảo hiểm và tác động khi chuyển việc về cùng một khung','Không cần nhập lại lương hiện tại ở phần chuyển việc.','Các điều kiện khác của từng offer như bảo hiểm, thử việc, thưởng, OT và phụ cấp được giữ nguyên'])if(text.includes(old))throw new Error(label+': old verbose copy still visible '+old);
    const legal=page.locator('.v4-legal');if(await legal.count()!==1)throw new Error(label+': missing legal disclosure');if(await legal.getAttribute('open')!==null)throw new Error(label+': legal disclosure must default collapsed');
    if(!await legal.locator('summary').getByText('Giả định & nguồn pháp lý').count())throw new Error(label+': legal disclosure label missing');
    await legal.locator('summary').click();if(!(await legal.innerText()).includes('Nguồn pháp lý chính'))throw new Error(label+': legal content was lost');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(overflow>2)throw new Error(label+': horizontal overflow '+overflow);
    await page.locator('#offerCountSeg [data-v="2"]').click();await page.locator('#offersIn [data-i="0"][data-k="gross"]').fill('25000000');await page.waitForTimeout(700);
    if(!bodies.length||String(bodies.at(-1)?.offers?.[0]?.gross)!=='25000000')throw new Error(label+': V4 no longer sends the V3-compatible offer payload');
    if(!apiUrls.length||apiUrls.some(u=>!u.endsWith('/api/offer-value-v4')||u.includes('/api/offer-value-v3')))throw new Error(label+': V4 endpoint isolation failed '+JSON.stringify(apiUrls));
    await page.close();
  }
  console.log('PASS V4 clean UI clone');
}finally{await browser.close()}
