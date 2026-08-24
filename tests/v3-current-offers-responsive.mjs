import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 for(const [label,width,height] of [['desktop',1280,900],['mobile-320',320,740],['mobile-375',375,812],['mobile-430',430,932]]){
  const page=await browser.newPage({viewport:{width,height}});let bodies=[];
  await page.route('**/api/offer-value-v3',async route=>{let body={};try{body=route.request().postDataJSON()}catch{}bodies.push(body);const avail=[];if(body.currentJobEnabled&&Number(String(body.currentJob?.gross||'').replace(/,/g,''))>0)avail.push({id:'current',name:body.currentJob?.name||'Công việc hiện tại',kind:'current'});if(Number(String(body.offers?.[0]?.gross||'').replace(/,/g,''))>0)avail.push({id:'0',name:body.offers?.[0]?.name||'Offer A',kind:'offer'});if(body.offerCount===2&&Number(String(body.offers?.[1]?.gross||'').replace(/,/g,''))>0)avail.push({id:'1',name:body.offers?.[1]?.name||'Offer B',kind:'offer'});const rawPair=body.comparison?.left&&body.comparison?.right?body.comparison:{left:avail[0]?.id||null,right:avail[1]?.id||null},pair={left:rawPair.left,right:rawPair.right},comparisonMode=body.comparison?.mode==='all'&&avail.length===3?'all':'pair',marker=comparisonMode==='all'?'ALL':String(pair.left)+'~'+String(pair.right),layer=n=>'<div class="'+(comparisonMode==='all'?'v3-three-matrix':'')+'" data-view="'+marker+'">L'+n+' '+marker+'</div>';await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({hasResults:avail.length>0,v3:true,modeTitle:avail.length===3?'Ở lại, chọn A hay B?':'So sánh phương án',summaryHtml:'<div class="v3-summary"><div class="v3-summary-grid">'+avail.map(x=>'<div class="v3-summary-card">'+x.name+'</div>').join('')+'</div></div>',availableOptions:avail,comparison:pair,comparisonMode,showPairSelector:avail.length>2,l1cols:layer(1),l1delta:'L1 delta '+marker,showL1Delta:true,annualcols:layer(2),annualdelta:'L2 delta '+marker,showAnnualDelta:true,tcols:layer(3),tdelta:'L3 delta '+marker,showTDelta:true,l2basis:layer(4),l3events:layer(5),verdictHtml:'<p>V3 verdict '+marker+'</p>',showAssumptions:false,assumptionsHtml:'',showSwitching:false,switchingHtml:'',showLayer6:false,layer6Html:'',exportText:'V3'})});});
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
  if(ctxAudit.depsPlaceholder!=='VD: 0 người'||ctxAudit.depsUnit!=='người')throw new Error(label+': dependent example/unit missing');
  await page.locator('#bhSim summary').click();
  const sickAudit=await page.evaluate(()=>({placeholder:document.querySelector('#sickDays').placeholder,unit:document.querySelector('#sickDays').parentElement.querySelector('.suffix')?.textContent||''}));
  if(sickAudit.placeholder!=='VD: 5 ngày'||sickAudit.unit!=='ngày')throw new Error(label+': sick-days example/unit missing');
  await page.locator('#bhSim summary').click();
  await page.locator('#currentEnabledSeg [data-v="on"]').click();
  const story=await page.evaluate(()=>({current:document.querySelector('[data-current="gross"]')?.placeholder,a:document.querySelector('#offersIn [data-i="0"][data-k="gross"]')?.placeholder}));
  if(story.current!=='VD: 20 triệu'||story.a!=='VD: 25 triệu')throw new Error(label+': salary placeholder narrative mismatch '+JSON.stringify(story));
  await page.locator('#offerCountSeg [data-v="2"]').click();await page.waitForTimeout(50);
  const bPlaceholder=await page.locator('#offersIn [data-i="1"][data-k="gross"]').getAttribute('placeholder');if(bPlaceholder!=='VD: 30 triệu')throw new Error(label+': Offer B salary placeholder narrative mismatch '+bPlaceholder);
  await page.locator('#offerCountSeg [data-v="1"]').click();await page.waitForTimeout(40);
  await page.locator('[data-current="gross"]').fill('30000000');await page.locator('#offersIn input[data-i="0"][data-k="gross"]').fill('35000000');await page.waitForTimeout(750);
  const currentMatrix=page.locator('#currentFields > .v3-current-matrix');if(await currentMatrix.count()!==1)throw new Error(label+': Current Job is not using the offer matrix grammar');
  if(await page.locator('#currentFields .v3-current-grid').count())throw new Error(label+': legacy Current Job form grid still rendered');
  const currentLabels=await currentMatrix.locator(':scope > .offer-mrow > .offer-mlabel').allTextContents();
  const expectedCurrent=['Chỉ tiêu','Lương hiện tại ghi theo','Lương / tháng','Công ty dùng mức nào để đóng BH?','Lên văn phòng / tuần','Di chuyển 1 chiều','Làm thêm giờ (OT) trung bình / tháng','OT có được trả tiền không?','OT chủ yếu rơi vào','Hệ số OT','OT ngày thường','OT ngày nghỉ hằng tuần','OT ngày lễ/Tết','Mức lương dùng để tính OT'];
  if(currentLabels.join('|')!==expectedCurrent.join('|'))throw new Error(label+': Current Job row order drifted: '+currentLabels.join(' | '));
  const currentName=page.locator('#currentFields .v3-current-matrix .offer-mrow.head [data-current="name"]').first();if(await currentName.count()!==1)throw new Error(label+': Current Job name is not editable in matrix header');
  if(await page.locator('#currentFields [data-k="probationEnabled"],#currentFields [data-current="probationEnabled"]').count())throw new Error(label+': Current Job unexpectedly contains probation controls');
  const matrixGeom=await currentMatrix.evaluate(e=>{const r=e.getBoundingClientRect(),row=e.querySelector('.offer-mrow').getBoundingClientRect();return{w:r.width,scroll:e.scrollWidth,rowW:row.width}});if(matrixGeom.scroll>matrixGeom.w+2||matrixGeom.rowW>matrixGeom.w+2)throw new Error(label+': Current matrix overflow');
  const otPaidRow=page.locator('#currentFields [data-current-ot-row="paid"]');if(await otPaidRow.isVisible())throw new Error(label+': Current OT paid row should start hidden when OT is blank');
  await page.locator('#currentFields [data-current="otMonthly"]').fill('8');await page.waitForTimeout(40);if(!(await otPaidRow.isVisible()))throw new Error(label+': Current OT disclosure did not open immediately after typing hours');
  await page.locator('#currentFields [data-current-seg="otPaid"] [data-v="yes"]').click();await page.waitForTimeout(40);if(!(await page.locator('#currentFields [data-current-ot-row="type"]').isVisible()))throw new Error(label+': Current OT type row did not follow paid OT selection');
  const benefits=page.locator('#currentFields .v3-current-benefits');await benefits.locator('summary').click();if(!(await benefits.locator('.v3-current-matrix').isVisible()))throw new Error(label+': Current benefits did not use the matrix grammar');
  if(!bodies.length||!bodies.at(-1).currentJobEnabled)throw new Error(label+': Current Job missing from V3 API body');
  await page.locator('#offerCountSeg [data-v="2"]').click();await page.locator('#offersIn input[data-i="1"][data-k="gross"]').fill('40000000');await page.waitForTimeout(750);
  await page.locator('#offersIn input[data-i="1"][data-k="otMonthly"]').fill('12');await page.locator('[data-seg="probationEnabled"][data-i="1"] [data-v="yes"]').click();await page.locator('#offerCountSeg [data-v="1"]').click();await page.waitForTimeout(80);const hiddenInfluence=await page.evaluate(()=>({trial:!!document.querySelector('#offersIn [data-k="probDurationValue"]'),otPaid:getComputedStyle(document.querySelector('#offersIn .ot-paid-row')).display}));if(hiddenInfluence.trial||hiddenInfluence.otPaid!=='none')throw new Error(label+': retained hidden Offer B influenced one-offer disclosure');await page.locator('#offerCountSeg [data-v="2"]').click();await page.waitForTimeout(80);
  const body=bodies.at(-1);if(body.offerCount!==2)throw new Error(label+': offerCount=2 missing');if(!body.currentJob||!Array.isArray(body.offers))throw new Error(label+': V3 state shape invalid');
  const selectorLabels=await page.locator('#v3Pairs .v3-pair-btn').allTextContents();if(selectorLabels.length!==4||selectorLabels[0]!=='Cả 3')throw new Error(label+': expected Cả 3 + three pair buttons, got '+selectorLabels.join(' | '));
  await page.locator('#v3Pairs [data-view="all"]').click();await page.waitForTimeout(750);
  if(bodies.at(-1)?.comparison?.mode!=='all')throw new Error(label+': Cả 3 mode not sent to API');
  for(const id of ['l1cols','annualcols','tcols','l2basis','l3events']){const txt=(await page.locator('#'+id).innerText()).trim();if(!txt.includes('ALL'))throw new Error(label+': '+id+' did not switch to Cả 3');}
  const allHint=(await page.locator('#v3PairHint').innerText()).trim();if(!allHint.includes('Lớp 1-5'))throw new Error(label+': all-three helper missing synchronized-layer copy');
  const allOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(allOverflow>2)throw new Error(label+': all-three view caused horizontal overflow '+allOverflow);
  await page.locator('#v3Pairs [data-left="current"][data-right="1"]').click();await page.waitForTimeout(750);
  const pairBody=bodies.at(-1);if(pairBody?.comparison?.mode!=='pair'||pairBody?.comparison?.left!=='current'||pairBody?.comparison?.right!=='1')throw new Error(label+': pair selection state not synchronized');
  for(const id of ['l1cols','annualcols','tcols','l2basis','l3events']){const txt=(await page.locator('#'+id).innerText()).trim();if(!txt.includes('current~1'))throw new Error(label+': '+id+' did not synchronize to Current/B pair');}
  const pairHint=(await page.locator('#v3PairHint').innerText()).trim();if(pairHint!=='Lựa chọn này áp dụng đồng bộ cho Lớp 1-5.')throw new Error(label+': pair synchronization helper mismatch: '+pairHint);
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
  for(const ph of copyAudit.placeholders){if(!/^VD:\s/.test(ph))throw new Error(label+': placeholder must use compact VD format: '+ph);if(/\d{1,3}(?:,\d{3})+/.test(ph))throw new Error(label+': placeholder uses visually long raw number: '+ph);if(!/(người|ngày|tháng|buổi|phút|giờ|%|triệu|đ|năm)/i.test(ph))throw new Error(label+': placeholder missing unit/context: '+ph);}
  const publicText=await page.locator('body').innerText();for(const bad of ['backend','threshold','baseline','template','timeline mục tiêu','target Net','target thu nhập'])if(publicText.toLowerCase().includes(bad.toLowerCase()))throw new Error(label+': developer wording remains visible: '+bad);
  if(label.startsWith('mobile')){
    const zoomRisk=await page.evaluate(()=>[...document.querySelectorAll('input[type=text],input[type=number],input[type=date]')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0}).map(el=>({field:el.getAttribute('data-k')||el.getAttribute('data-current')||el.getAttribute('data-sw')||el.getAttribute('data-sol')||el.id||el.className,font:parseFloat(getComputedStyle(el).fontSize),placeholder:el.placeholder})).filter(x=>x.font<15.99));
    if(zoomRisk.length)throw new Error(label+': iOS focus-zoom risk '+JSON.stringify(zoomRisk));
    const matrixPlaceholders=await page.evaluate(()=>[...document.querySelectorAll('#offersIn .offer-mcell input[placeholder],#currentFields .offer-mcell input[placeholder]')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&el.value===''}).map(el=>({ph:el.placeholder,w:el.clientWidth,font:getComputedStyle(el,'::placeholder').fontSize})));
    for(const x of matrixPlaceholders){if(x.ph.length>18)throw new Error(label+': matrix placeholder too verbose '+JSON.stringify(x));}
  }

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

  // Mobile blur commit regression: the visible DOM value must be accepted without pressing Done/OK.
  await page.locator('#switchEnabledSeg [data-v="on"]').click();await page.waitForTimeout(60);
  await page.locator('[data-sw="newBonusRule"]').selectOption('custom');await page.waitForTimeout(80);
  const beforeBlurRequests=bodies.length;
  await page.evaluate(()=>{const el=document.querySelector('[data-sw="newBonusCustom"]');el.focus();el.value='30000000';document.querySelector('[data-sw="currentBonusRule"]').focus()});
  await page.waitForTimeout(180);
  if(bodies.length<=beforeBlurRequests)throw new Error(label+': blur did not trigger an immediate calculation');
  if(String(bodies.at(-1)?.switching?.newBonusCustom)!=='30000000')throw new Error(label+': switching money value was not committed on blur');
  if((await page.locator('[data-sw="newBonusCustom"]').inputValue())!=='30,000,000')throw new Error(label+': switching money value was not normalized on blur');

  await page.evaluate(()=>{const el=document.querySelector('#offersIn input[data-i="0"][data-k="gross"]');el.focus();el.value='36000000';document.querySelector('#offerCountSeg button').focus()});await page.waitForTimeout(180);
  if(String(bodies.at(-1)?.offers?.[0]?.gross)!=='36000000')throw new Error(label+': offer salary was not committed on blur');
  await page.evaluate(()=>{const el=document.querySelector('[data-current="gross"]');el.focus();el.value='31000000';document.querySelector('#currentEnabledSeg button').focus()});await page.waitForTimeout(180);
  if(String(bodies.at(-1)?.currentJob?.gross)!=='31000000')throw new Error(label+': Current Job salary was not committed on blur');
  await page.evaluate(()=>{const el=document.querySelector('[data-sol="targetMonthlyNet"]');el.focus();el.value='37000000';document.querySelector('#solverEnabledSeg button').focus()});await page.waitForTimeout(180);
  if(String(bodies.at(-1)?.solver?.targetMonthlyNet)!=='37000000')throw new Error(label+': Layer 6 money target was not committed on blur');

  await page.close();console.log('PASS V3 responsive '+label);
 }
}finally{await browser.close()}
