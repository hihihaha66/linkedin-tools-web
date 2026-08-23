import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const cases=[['desktop',1280,900],['mobile-320',320,740],['mobile-360',360,800],['mobile-375',375,812],['mobile-390',390,844],['mobile-430',430,932]];
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
  if(label.startsWith('mobile')&&Math.abs(setupLayout.cells[0].y-setupLayout.cells[1].y)>2)throw new Error('mobile: common-context fields stacked instead of sharing a row');
  if(setupLayout.rowCount!==2||!setupLayout.sharedNote)throw new Error(`${label}: BHXH simulator is not 2 compact rows + shared note`);
  await page.locator('#bhSim summary').click();
  await page.locator('#sickDays').fill('5');
  await page.locator('#matSeg [data-v="show"]').click();
  const bhState=await page.locator('#bhSummaryState').textContent();
  if(!bhState.includes('5 ngày ốm')||!bhState.includes('Thai sản: Có'))throw new Error(`${label}: collapsed BHXH summary did not mirror current settings (${bhState})`);
  if(label.startsWith('mobile')){
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

  // Inject a representative long-result fixture matching the Safari screenshots so result CSS is actually exercised.
  await page.evaluate(()=>{
    const host=document.createElement('div');
    host.id='responsiveResultFixture';
    host.innerHTML=`
      <div class="switch-result">
        <h4>Sau khi chuyển, bao lâu thì bù lại phần hụt?</h4>
        <div class="row"><span>Thưởng bỏ lại ở công ty hiện tại</span><span class="v">-62,000,000đ</span></div>
        <div class="row"><span>Khoảng nghỉ giữa hai việc</span><span class="v">1 ngày · hụt ≈ 700,000đ</span></div>
        <div class="row row-wrap break-even-row"><span>Ước tính hòa vốn</span><span class="v">Chưa có mốc hòa vốn từ chênh lệch net hàng tháng hiện tại</span></div>
        <div class="switch-scenarios">
          <div class="switch-scenario-title">Kịch bản từ các input biến động đã nhập</div>
          <div class="switch-scenario-row"><span><b>Kịch bản: OT có lương như đã nhập</b><small>Giả định mức OT hiện tại duy trì tương tự từ onboard đến 31/12.</small></span><span class="v">Chuyển 155,000,000đ · chênh -54,700,000đ</span></div>
          <div class="switch-scenario-row"><span><b>Kịch bản: có thêm thưởng hiệu suất</b><small>Không coi là khoản đảm bảo; tạm phân bổ 7/12 theo tháng onboard.</small></span><span class="v">Chuyển 180,000,000đ · chênh -29,700,000đ</span></div>
          <p class="switch-scenario-note">Không dùng các kịch bản biến động để suy ra ngày hòa vốn chính xác.</p>
        </div>
      </div>
      <div class="verdict">
        <h3>Bạn đang đổi gì lấy gì - bốn trục</h3>
        <p><b>Nếu làm đủ 12 tháng</b> - thu nhập cố định của Offer A cao hơn khoảng 65,852,600đ/năm. Nếu có thêm thưởng hiệu suất đã nhập, Offer A cao hơn khoảng 114,352,600đ/năm.</p>
        <div style="margin:14px 0 4px;padding:12px 13px;border-radius:8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28)"><p>Driver thời gian lớn nhất: Đi lại làm Offer A tốn thêm khoảng 152 giờ/năm so với bên kia.</p></div>
      </div>`;
    document.querySelector('.wrap').appendChild(host);
  });

  await page.evaluate(()=>{
    const box=document.querySelector('#solverBox');
    box.querySelector('#solverEnabledSeg [data-v="on"]').click();
    document.querySelector('#solverResult').innerHTML='<div class="solver-result"><h3>Layer 6 · Offer tối thiểu để đáng chuyển</h3><div class="solver-hero"><span>Mức sàn tài chính</span><strong>Gross 48,500,000đ/tháng</strong><small>≈ Gross 48,500,000đ · Net 41,200,000đ/tháng</small></div><div class="solver-breakdown"><b>Mỗi mục tiêu riêng cần tối thiểu</b><div class="solver-row"><span>Hòa vốn trong 6 tháng</span><span class="v">Gross 48,500,000đ</span></div></div><div class="solver-scenarios"><b>Kịch bản</b><div class="solver-row"><span>Nếu có thêm thưởng hiệu suất đã nhập</span><span class="v">Gross 43,200,000đ</span></div></div></div>';
    document.querySelector('#solverLayer').style.display='';
  });
  const containment=await page.evaluate(()=>{
    const sels=['.switch-result','.verdict','.events','.offer-matrix','.bh-sim','.switch-scenarios','.solver-box','.solver-result'];
    const bad=[];
    for(const sel of sels)for(const el of document.querySelectorAll(sel)){
      const r=el.getBoundingClientRect();
      if(el.scrollWidth>el.clientWidth+2)bad.push(sel+':scroll '+el.scrollWidth+'>'+el.clientWidth);
      if(r.left<-2||r.right>innerWidth+2)bad.push(sel+':viewport '+Math.round(r.left)+'..'+Math.round(r.right)+' / '+innerWidth);
    }
    const be=document.querySelector('#responsiveResultFixture .break-even-row');
    if(be){
      const labelEl=be.children[0],valueEl=be.children[1];
      const lr=labelEl.getBoundingClientRect(),vr=valueEl.getBoundingClientRect();
      if(lr.width<70)bad.push('break-even label crushed to '+Math.round(lr.width)+'px');
      if(vr.right>innerWidth+2)bad.push('break-even value exits viewport');
    }
    return bad;
  });
  if(containment.length)throw new Error(`${label}: result containment failed: ${containment.join(' | ')}`);
  await page.close();
  console.log(`PASS Turn 6 responsive: ${label}`);
 }
} finally {await browser.close();}
