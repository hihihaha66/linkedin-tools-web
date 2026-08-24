import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 for(const [label,width,height] of [['desktop',1280,900],['mobile-320',320,740],['mobile-375',375,812],['mobile-430',430,932]]){
  const page=await browser.newPage({viewport:{width,height}});let bodies=[];
  await page.route('**/api/offer-value-v3',async route=>{let body={};try{body=route.request().postDataJSON()}catch{}bodies.push(body);const avail=[];if(body.currentJobEnabled&&Number(String(body.currentJob?.gross||'').replace(/,/g,''))>0)avail.push({id:'current',name:body.currentJob?.name||'Công việc hiện tại',kind:'current'});if(Number(String(body.offers?.[0]?.gross||'').replace(/,/g,''))>0)avail.push({id:'0',name:body.offers?.[0]?.name||'Offer A',kind:'offer'});if(body.offerCount===2&&Number(String(body.offers?.[1]?.gross||'').replace(/,/g,''))>0)avail.push({id:'1',name:body.offers?.[1]?.name||'Offer B',kind:'offer'});const pair=body.comparison?.left&&body.comparison?.right?body.comparison:{left:avail[0]?.id||null,right:avail[1]?.id||null};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({hasResults:avail.length>0,v3:true,modeTitle:avail.length===3?'Ở lại, chọn A hay B?':'So sánh phương án',summaryHtml:'<div class="v3-summary"><div class="v3-summary-grid">'+avail.map(x=>'<div class="v3-summary-card">'+x.name+'</div>').join('')+'</div></div>',availableOptions:avail,comparison:pair,showPairSelector:avail.length>2,l1cols:'',l1delta:'',showL1Delta:false,annualcols:'',annualdelta:'',showAnnualDelta:false,tcols:'',tdelta:'',showTDelta:false,l2basis:'',l3events:'',verdictHtml:'<p>V3 verdict</p>',showAssumptions:false,assumptionsHtml:'',showSwitching:false,switchingHtml:'',showLayer6:false,layer6Html:'',exportText:'V3'})});});
  await page.goto('http://127.0.0.1:8000/net-cao-hon-co-that-tot-hon-v3.html',{waitUntil:'domcontentloaded'});
  if(!(await page.locator('#offersIn').evaluate(e=>e.classList.contains('one-offer'))))throw new Error(label+': default should be one offer');
  const ctxAudit=await page.evaluate(()=>{
    const ctx=document.querySelector('.ctx'),fields=[...ctx.querySelectorAll(':scope > .field')];
    const fr=fields.map(f=>f.getBoundingClientRect()),lr=fields.map(f=>f.querySelector('label').getBoundingClientRect()),cr=fields.map(f=>f.querySelector('input,select').getBoundingClientRect());
    return{height:ctx.getBoundingClientRect().height,fieldWidths:fr.map(r=>r.width),labelY:lr.map(r=>r.y),labelH:lr.map(r=>r.height),controlY:cr.map(r=>r.y),controlH:cr.map(r=>r.height),depsPlaceholder:document.querySelector('#deps').placeholder,depsUnit:document.querySelector('#deps').parentElement.querySelector('.suffix')?.textContent||''};
  });
  if(Math.abs(ctxAudit.fieldWidths[0]-ctxAudit.fieldWidths[1])>2)throw new Error(label+': context columns not balanced '+ctxAudit.fieldWidths.join('/'));
  if(Math.abs(ctxAudit.controlY[0]-ctxAudit.controlY[1])>2||Math.abs(ctxAudit.controlH[0]-ctxAudit.controlH[1])>2)throw new Error(label+': context controls not aligned');
  if(Math.abs(ctxAudit.labelH[0]-ctxAudit.labelH[1])>2)throw new Error(label+': context labels not equal height');
  if(label.startsWith('mobile')&&ctxAudit.height>90)throw new Error(label+': compact context became too tall '+ctxAudit.height+'px');
  if(ctxAudit.depsPlaceholder!=='Ví dụ: 0'||ctxAudit.depsUnit!=='người')throw new Error(label+': dependent example/unit missing');
  await page.locator('#bhSim summary').click();
  const sickAudit=await page.evaluate(()=>({placeholder:document.querySelector('#sickDays').placeholder,unit:document.querySelector('#sickDays').parentElement.querySelector('.suffix')?.textContent||''}));
  if(sickAudit.placeholder!=='Ví dụ: 5'||sickAudit.unit!=='ngày')throw new Error(label+': sick-days example/unit missing');
  await page.locator('#bhSim summary').click();
  await page.locator('#currentEnabledSeg [data-v="on"]').click();await page.locator('[data-current="gross"]').fill('30000000');await page.locator('#offersIn input[data-i="0"][data-k="gross"]').fill('35000000');await page.waitForTimeout(750);
  if(!bodies.length||!bodies.at(-1).currentJobEnabled)throw new Error(label+': Current Job missing from V3 API body');
  await page.locator('#offerCountSeg [data-v="2"]').click();await page.locator('#offersIn input[data-i="1"][data-k="gross"]').fill('40000000');await page.waitForTimeout(750);
  await page.locator('#offersIn input[data-i="1"][data-k="otMonthly"]').fill('12');await page.locator('[data-seg="probationEnabled"][data-i="1"] [data-v="yes"]').click();await page.locator('#offerCountSeg [data-v="1"]').click();await page.waitForTimeout(80);const hiddenInfluence=await page.evaluate(()=>({trial:!!document.querySelector('#offersIn [data-k="probDurationValue"]'),otPaid:getComputedStyle(document.querySelector('#offersIn .ot-paid-row')).display}));if(hiddenInfluence.trial||hiddenInfluence.otPaid!=='none')throw new Error(label+': retained hidden Offer B influenced one-offer disclosure');await page.locator('#offerCountSeg [data-v="2"]').click();await page.waitForTimeout(80);
  const body=bodies.at(-1);if(body.offerCount!==2)throw new Error(label+': offerCount=2 missing');if(!body.currentJob||!Array.isArray(body.offers))throw new Error(label+': V3 state shape invalid');
  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,current:document.querySelector('#currentBox').scrollWidth,solver:document.querySelector('#solverBox').scrollWidth}));if(overflow.scroll>overflow.inner+2)throw new Error(label+': horizontal overflow '+overflow.scroll+'>'+overflow.inner);
  await page.locator('#solverEnabledSeg [data-v="on"]').click();
  const solverIntro=(await page.locator('#solverBox .solver-copy .hint').innerText()).trim();
  const expectedIntro='Chọn mục tiêu bạn muốn đạt, tool sẽ tính mức lương tối thiểu cần thương lượng. Các điều kiện khác của từng offer như bảo hiểm, thử việc, thưởng, OT và phụ cấp được giữ nguyên; Công việc hiện tại được dùng để so với phương án ở lại.';
  if(solverIntro!==expectedIntro)throw new Error(label+': Layer 6 intro mismatch: '+solverIntro);
  const solverQuestion=(await page.locator('#solverFields .solver-wide label').first().innerText()).trim();
  if(solverQuestion!=='Bạn cần tìm mức lương tối thiểu cho offer nào?')throw new Error(label+': Layer 6 offer question mismatch: '+solverQuestion);
  const solverHelper=(await page.locator('#solverFields .solver-wide .solver-note').first().innerText()).trim();
  const expectedHelper='Tool giữ nguyên bảo hiểm, thử việc, thưởng, OT và phụ cấp của offer được chọn, rồi chỉ thay đổi mức lương để tìm mức tối thiểu đạt các mục tiêu bên dưới. Nếu chọn Cả hai, tool tính riêng cho từng offer.';
  if(solverHelper!==expectedHelper)throw new Error(label+': Layer 6 offer helper mismatch: '+solverHelper);
  const solverOptions=await page.locator('#solverFields select[data-sol="templateOffer"] option').allTextContents();
  if(solverOptions.some(x=>x.includes('cấu trúc')||x.includes('mức sàn')))throw new Error(label+': Layer 6 option still uses jargon '+solverOptions.join(' | '));
  await page.locator('[data-sw="onboardDate"]').fill('2027-01-05');await page.waitForTimeout(60);
  const copyAudit=await page.evaluate(()=>{
    const box=document.querySelector('#solverBox'),txt=box.innerText;
    const placeholders=[...document.querySelectorAll('#offersIn input[placeholder],#currentFields input[placeholder],#switchFields input[placeholder],#solverFields input[placeholder]')].map(x=>x.placeholder).filter(Boolean);
    return{txt,placeholders};
  });
  for(const must of ['31/12/2027','Bù hết phần hụt do chuyển việc trong','Đạt mục tiêu Net/tháng','Net tối thiểu/tháng','Đạt mục tiêu Net/năm','Net tối thiểu/năm','Tool ước tính phần hụt ban đầu từ khoảng nghỉ và thưởng bị mất','Gồm lương, phụ cấp cố định và thưởng đảm bảo sau bảo hiểm và thuế'])if(!copyAudit.txt.includes(must))throw new Error(label+': missing Layer 6 copy '+must);
  for(const bad of ['backend','threshold','baseline','timeline mục tiêu','target Net','target thu nhập'])if(copyAudit.txt.includes(bad))throw new Error(label+': developer wording leaked '+bad);
  for(const ph of copyAudit.placeholders){if(/^vd\b/i.test(ph))throw new Error(label+': abbreviated placeholder '+ph);if(/^\d[\d,]*(?:\.\d+)?$/.test(ph))throw new Error(label+': numeric example placeholder missing “Ví dụ:” '+ph);}
  const publicText=await page.locator('body').innerText();for(const bad of ['backend','threshold','baseline','template','timeline mục tiêu','target Net','target thu nhập'])if(publicText.toLowerCase().includes(bad.toLowerCase()))throw new Error(label+': developer wording remains visible: '+bad);

  // Guided diagnostic navigation - Current Job can be activated from the error card.
  await page.locator('#currentEnabledSeg [data-v="off"]').click();
  await page.evaluate(()=>{document.querySelector('#solverLayer').style.display='';document.querySelector('#solverResult').innerHTML='<div class="solver-needs diag-card"><div class="diag-item"><div class="diag-copy"><b>Thiếu lương hiện tại</b><span class="diag-path">Công việc hiện tại → Lương / tháng</span></div><button type="button" class="diag-action" data-diag-scope="current" data-diag-field="gross" data-diag-activate="1">Đi tới</button></div></div>'});
  await page.locator('#solverResult .diag-action').click();await page.waitForTimeout(120);
  if(!(await page.locator('#currentEnabledSeg [data-v="on"]').evaluate(e=>e.classList.contains('on'))))throw new Error(label+': diagnostic CTA did not activate Current Job');
  const currentFocused=await page.evaluate(()=>document.activeElement?.getAttribute('data-current')==='gross'&&document.querySelector('[data-current="gross"]')?.classList.contains('diag-focus'));
  if(!currentFocused)throw new Error(label+': diagnostic CTA did not focus/highlight Current salary');

  // Transition and Layer 6 actions also land on the exact requested field.
  await page.evaluate(()=>{document.querySelector('#solverResult').innerHTML='<button type="button" class="diag-action" data-diag-scope="switching" data-diag-field="onboardDate">Đi tới</button>'});
  await page.evaluate(()=>document.querySelector('#solverResult .diag-action')?.click());await page.waitForTimeout(100);
  if(!(await page.evaluate(()=>document.activeElement?.getAttribute('data-sw')==='onboardDate')))throw new Error(label+': switching diagnostic did not focus onboard date');
  await page.waitForTimeout(650);
  await page.evaluate(()=>{document.querySelector('#solverLayer').style.display='';document.querySelector('#solverResult').innerHTML='<button type="button" class="diag-action" data-diag-scope="solver" data-diag-field="targetMonthlyNet">Chỉnh mục tiêu</button>'});
  await page.evaluate(()=>document.querySelector('#solverResult .diag-action')?.click());await page.waitForTimeout(100);
  if(!(await page.evaluate(()=>document.activeElement?.getAttribute('data-sol')==='targetMonthlyNet')))throw new Error(label+': solver diagnostic did not focus monthly Net target');
  const diagOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(diagOverflow>2)throw new Error(label+': diagnostic UI caused horizontal overflow '+diagOverflow);

  await page.close();console.log('PASS V3 responsive '+label);
 }
}finally{await browser.close()}
