const AFFILIATE_API_URL='https://linkedin-tools-api-test.vercel.app/api/mba-affiliate';

(function initAffiliateV2(){
  const oldMmoPlanFields=mmoPlanFields;
  mmoPlanFields=function(s,input){
    if(s.config?.type!=='affiliate')return oldMmoPlanFields(s,input);
    return affiliatePlanFields(s,input||{});
  };

  const oldRefresh=refreshPlanVisibility;
  refreshPlanVisibility=function(){
    oldRefresh();
    refreshAffiliateVisibility();
  };

  const oldCalculatePlan=calculatePlan;
  calculatePlan=async function(){
    const s=currentStream();
    if(!(s?.model==='mmo'&&s.config?.type==='affiliate'))return oldCalculatePlan();
    const p=currentProfile();if(p){p.businessPlan=null;persist()}
    const input=readPlanInput(),btn=$('#calculateBtn');btn.disabled=true;btn.textContent='Đang tính...';
    try{
      const r=await fetch(AFFILIATE_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'calculate',input})});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const data=await r.json();
      if(data.status!=='ok'){toast(data.message||'Chưa thể tính với dữ liệu này.');return}
      s.planning={mode:'quick',input,result:data,updatedAt:now()};p.updatedAt=now();persist();renderPlanResult(s,data);go('planResult');
    }catch(e){toast('Không kết nối được với bộ máy tính Affiliate. Thử lại sau ít phút.')}
    finally{btn.disabled=false;btn.textContent='Xem kết quả'}
  };

  const oldFormatMetric=formatMetric;
  formatMetric=function(m){if(m?.format==='text')return String(m.value||'');return oldFormatMetric(m)};

  waitForAffiliateUxHooks();
})();

function affiliatePlanFields(s,input){
  const legacy=!!(input.conversions||input.revenuePerConversion);
  const eventType=input.eventType||(legacy?'custom':'');
  const eventCustom=input.eventCustom||(legacy?'chuyển đổi':'');
  const commissionMode=input.commissionMode||(legacy?'fixed':'');
  const events=input.events??input.conversions??'';
  const commissionPerEvent=input.commissionPerEvent??input.revenuePerConversion??'';
  let html='<div class="modeNote"><b>Affiliate</b> - MBA cần biết bạn được trả tiền khi điều gì xảy ra và hoa hồng được tính theo cách nào. Hai lựa chọn này quyết định công thức.</div>';
  html+='<div class="affiliateSection"><div class="affiliateSectionTitle">Bạn được trả tiền khi điều gì xảy ra?</div>';
  html+=planChoiceBlock('', 'eventType', [
    ['order','Đơn hàng thành công','Đơn đủ điều kiện nhận hoa hồng'],
    ['lead','Khách hàng tiềm năng đủ điều kiện','Lead được đối tác chấp nhận'],
    ['signup','Đăng ký / mở tài khoản hợp lệ','Đăng ký đáp ứng điều kiện trả thưởng'],
    ['install','Cài đặt / kích hoạt hợp lệ','Ứng dụng hoặc dịch vụ được kích hoạt đủ điều kiện'],
    ['custom','Khác / Tự nhập','Bạn tự đặt tên kết quả được trả tiền']
  ],eventType);
  html+='<div class="affiliateEventCustom '+(eventType==='custom'?'on':'')+'" data-aff-event-custom><div class="field"><label>Tên kết quả được trả tiền</label><input data-plan-key="eventCustom" value="'+escAttr(eventCustom)+'" placeholder="Ví dụ: cuộc hẹn đủ điều kiện, hồ sơ được duyệt"></div></div></div>';

  html+='<div class="affiliateSection"><div class="affiliateSectionTitle">Hoa hồng được tính như thế nào?</div>';
  html+=planChoiceBlock('', 'commissionMode', [
    ['percent','Theo % giá trị','Ví dụ nhận 10% giá trị đơn hàng thành công'],
    ['fixed','Số tiền cố định cho mỗi kết quả','Ví dụ 50.000đ cho mỗi đơn hoặc lead đủ điều kiện'],
    ['total','Tôi chỉ biết tổng hoa hồng','Dùng số tổng từ dashboard hoặc đối soát'],
    ['variable','Hoa hồng thay đổi nhiều','Dùng tổng hoa hồng và số kết quả để suy ra mức bình quân'],
    ['custom','Khác / Tự nhập','Mô tả cách tính riêng của chương trình Affiliate']
  ],commissionMode);

  html+='<div class="affiliateModeArea '+(commissionMode==='fixed'?'on':'')+'" data-aff-mode="fixed">'+numberField('events','Số kết quả được trả tiền dự kiến mỗi tháng',events,'500','/tháng','Chỉ nhập những kết quả đủ điều kiện nhận hoa hồng.')+moneyField('commissionPerEvent','Hoa hồng cố định cho mỗi kết quả',commissionPerEvent,'50,000','Đây là số tiền, không phải tỷ lệ %.')+'</div>';

  html+='<div class="affiliateModeArea '+(commissionMode==='percent'?'on':'')+'" data-aff-mode="percent">'+numberField('events','Số kết quả được trả tiền dự kiến mỗi tháng',events,'500','/tháng','Ví dụ số đơn hàng thành công đủ điều kiện nhận hoa hồng.')+moneyField('averageValue','Giá trị trung bình của mỗi kết quả',input.averageValue,'500,000','Ví dụ giá trị trung bình của một đơn hàng thành công.')+numberField('commissionRate','Tỷ lệ hoa hồng',input.commissionRate,'10','%','Nhập 10 nếu hoa hồng là 10%.')+'<div class="affiliateFormulaHint"><b>MBA sẽ tính:</b> Giá trị trung bình × tỷ lệ hoa hồng = hoa hồng bình quân mỗi kết quả.</div></div>';

  html+='<div class="affiliateModeArea '+(commissionMode==='total'?'on':'')+'" data-aff-mode="total">'+moneyField('totalCommission','Tổng hoa hồng dự kiến trong tháng',input.totalCommission,'20,000,000','Có thể lấy trực tiếp từ dashboard hoặc số đối soát.')+numberField('events','Số kết quả được trả tiền trong tháng (nếu biết)',events,'500','/tháng','Không bắt buộc. Nếu có, MBA sẽ suy ra hoa hồng bình quân và hòa vốn theo số kết quả.')+'</div>';

  html+='<div class="affiliateModeArea '+(commissionMode==='variable'?'on':'')+'" data-aff-mode="variable">'+numberField('events','Số kết quả được trả tiền dự kiến mỗi tháng',events,'500','/tháng')+moneyField('totalCommission','Tổng hoa hồng dự kiến trong tháng',input.totalCommission,'20,000,000','MBA sẽ chia tổng hoa hồng cho số kết quả để lấy mức bình quân phục vụ mô phỏng nhanh.')+'</div>';

  html+='<div class="affiliateModeArea '+(commissionMode==='custom'?'on':'')+'" data-aff-mode="custom"><div class="field"><label>Mô tả cách hoa hồng được tính</label><textarea data-plan-key="commissionCustom" placeholder="Ví dụ: 5% cho đơn dưới 1 triệu, 8% cho đơn từ 1 triệu trở lên">'+esc(input.commissionCustom||'')+'</textarea></div>'+moneyField('totalCommission','Tổng hoa hồng dự kiến trong tháng',input.totalCommission,'20,000,000','Bản Nhập nhanh dùng tổng này để tính doanh thu và lợi nhuận.')+numberField('events','Số kết quả được trả tiền trong tháng (nếu biết)',events,'500','/tháng')+'</div></div>';

  html+='<div class="affiliateSection">'+moneyField('fixedCosts','Chi phí hàng tháng riêng của nguồn này',input.fixedCosts,'10,000,000','Ví dụ quảng cáo, nội dung thuê ngoài, công cụ hoặc nhân sự chỉ phục vụ nguồn Affiliate này.')+'</div>';
  return html;
}

function refreshAffiliateVisibility(){
  const stream=currentStream();if(!(stream?.model==='mmo'&&stream.config?.type==='affiliate'))return;
  const eventType=$('[data-plan-choice="eventType"] .choice.selected')?.dataset.value||'';
  const commissionMode=$('[data-plan-choice="commissionMode"] .choice.selected')?.dataset.value||'';
  const custom=$('[data-aff-event-custom]');if(custom)custom.classList.toggle('on',eventType==='custom');
  $$('[data-aff-mode]').forEach(x=>x.classList.toggle('on',x.dataset.affMode===commissionMode));
}

function waitForAffiliateUxHooks(){
  let tries=0;const timer=setInterval(()=>{
    tries++;
    if(typeof previewRequest==='function'&&typeof calculateProfitTarget==='function'&&typeof renderWarnings==='function'){
      clearInterval(timer);hookAffiliatePreview();hookAffiliateTarget();hookAffiliateWarnings();
    }else if(tries>100)clearInterval(timer);
  },50);
}

function hookAffiliatePreview(){
  if(previewRequest._affiliateV2)return;
  const previous=previewRequest;
  previewRequest=async function(stream,input){
    if(!(stream?.model==='mmo'&&stream.config?.type==='affiliate'))return previous(stream,input);
    const r=await fetch(AFFILIATE_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'preview',input})});
    if(!r.ok)throw new Error('HTTP '+r.status);return r.json();
  };
  previewRequest._affiliateV2=true;
}

function hookAffiliateTarget(){
  if(calculateProfitTarget._affiliateV2)return;
  const previous=calculateProfitTarget;
  calculateProfitTarget=async function(){
    const s=currentStream();if(!(s?.model==='mmo'&&s.config?.type==='affiliate'))return previous();
    const amount=parseMoney($('#targetProfitInput')?.value);if(!amount){toast('Nhập mức lợi nhuận bạn muốn đạt.');return}
    const btn=$('#targetCalcBtn');btn.disabled=true;btn.textContent='Đang tính...';const input=JSON.parse(JSON.stringify(s.planning?.input||{}));delete input.targetProfit;
    try{
      const r=await fetch(AFFILIATE_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'target',input,targetProfit:amount})});
      if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();
      if(data.status!=='ok'){toast(data.message||'Chưa thể tính mục tiêu từ dữ liệu hiện tại.');return}
      s.planning.targetProfit=amount;s.planning.targetResult=data;s.updatedAt=now();currentProfile().updatedAt=now();persist();renderSavedTarget(data,amount);
    }catch(e){toast('Không kết nối được với bộ máy tính mục tiêu Affiliate. Thử lại sau ít phút.')}
    finally{btn.disabled=false;btn.textContent='Tính mức cần đạt'}
  };
  calculateProfitTarget._affiliateV2=true;
}

function hookAffiliateWarnings(){
  if(renderWarnings._affiliateV2)return;
  const previous=renderWarnings;
  renderWarnings=function(warnings,host){
    const s=currentStream();
    if(!(s?.model==='mmo'&&s.config?.type==='affiliate'))return previous(warnings,host);
    if(!host)return;
    host.innerHTML=warnings?.length?'<div class="sanityBox confirm"><b>Xác nhận cách nhập</b>'+warnings.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':'';
  };
  renderWarnings._affiliateV2=true;
}
