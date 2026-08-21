const FOOD_V3_API='https://linkedin-tools-api-test.vercel.app/api/mba-food-v3';
const FOOD_CHANNEL_META={
  store:{label:'Tại quán',note:'Không có phí nền tảng mặc định.'},
  takeaway:{label:'Mang đi',note:'Chi phí trực tiếp thường có thêm bao bì.'},
  grab:{label:'GrabFood',note:'Tách phí nền tảng khỏi nguyên liệu và bao bì.'},
  shopeefood:{label:'ShopeeFood',note:'Tách phí nền tảng khỏi nguyên liệu và bao bì.'},
  custom:{label:'Kênh khác',note:'Có thể nhập phí kênh nếu kênh này thu theo %.'}
};

(function initFoodEconomicsV3(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ready=window.__mbaFoodMonthlyCostsReady&&window.__mbaUnifiedSourceReady&&typeof foodPlanFieldsWithCosts==='function'&&typeof previewRequest==='function';
    if(ready){clearInterval(timer);setupFoodEconomicsV3()}
    else if(tries>260){clearInterval(timer);if(typeof foodPlanFieldsWithCosts==='function')setupFoodEconomicsV3()}
  },50);
})();

function setupFoodEconomicsV3(){
  if(window.__mbaFoodEconomicsV3Ready)return;window.__mbaFoodEconomicsV3Ready=true;

  foodPlanFieldsWithCosts=function(s,input){return foodV3PlanFields(s,input||{})};
  refreshFoodCostMode=function(){refreshFoodV3Visibility()};

  const previousRead=readUnifiedPlanInput;
  readUnifiedPlanInput=function(){
    const out=previousRead();
    if(draftStream?.model!=='food'||!$('#unifiedPlanFields .foodV3Root'))return out;
    const costMode=getNested(out,'foodCostMode')||'quick';out.foodCostMode=costMode;
    if(costMode==='detail')out.fixedCosts=String(foodV3DetailedFixedTotal(out));
    else out.fixedCosts=String(foodV3Money(getNested(out,'foodFixedCostsQuick')));
    const channels=draftStream?.config?.channels||[];
    if(channels.length<2)out.foodChannelMode='average';
    else out.foodChannelMode=getNested(out,'foodChannelMode')||'average';
    updateFoodV3CostTotal(out);
    return out;
  };

  const previousRefresh=refreshPlanVisibility;
  refreshPlanVisibility=function(){previousRefresh();refreshFoodV3Visibility()};

  const previousPreview=previewRequest;
  previewRequest=async function(stream,input){
    if(stream?.model!=='food')return previousPreview(stream,input);
    const r=await fetch(FOOD_V3_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'preview',config:stream.config||{},input:input||{}})});
    if(!r.ok)throw new Error('HTTP '+r.status);return r.json();
  };

  const previousCalculate=calculatePlan;
  calculatePlan=async function(){
    const s=currentStream();if(s?.model!=='food')return previousCalculate();
    const input=readPlanInput(),btn=$('#calculateBtn');if(btn){btn.disabled=true;btn.textContent='Đang tính...'}
    try{
      const r=await fetch(FOOD_V3_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'calculate',config:s.config||{},input})});
      if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();if(data.status!=='ok'){toast(data.message||'Chưa thể tính với dữ liệu này.');return}
      s.planning={mode:input.foodChannelMode==='detail'?'detail':'quick',input,result:data,updatedAt:now()};const p=currentProfile();p.updatedAt=now();persist();renderPlanResult(s,data);go('planResult');
    }catch(e){toast('Không kết nối được với bộ máy tính F&B. Thử lại sau ít phút.')}
    finally{if(btn){btn.disabled=false;btn.textContent='Xem kết quả'}}
  };

  if(typeof calculateProfitTarget==='function'){
    const previousTarget=calculateProfitTarget;
    calculateProfitTarget=async function(){
      const s=currentStream();if(s?.model!=='food')return previousTarget();
      const amount=parseMoney($('#targetProfitInput')?.value);if(!amount){toast('Nhập mức lợi nhuận bạn muốn đạt.');return}
      const btn=$('#targetCalcBtn');if(btn){btn.disabled=true;btn.textContent='Đang tính...'}
      try{const r=await fetch(FOOD_V3_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'target',config:s.config||{},input:s.planning?.input||{},targetProfit:amount})});if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();if(data.status!=='ok'){toast(data.message||'Chưa thể tính mục tiêu.');return}s.planning.targetProfit=amount;s.planning.targetResult=data;s.updatedAt=now();currentProfile().updatedAt=now();persist();renderSavedTarget(data,amount)}catch(e){toast('Không kết nối được với bộ máy tính mục tiêu F&B.')}finally{if(btn){btn.disabled=false;btn.textContent='Tính mức cần đạt'}}
    };
  }

  const previousResult=renderPlanResult;
  renderPlanResult=function(s,data){previousResult(s,data);renderFoodV3Breakdown(s,data)};

  document.addEventListener('click',e=>{
    const add=e.target.closest('[data-food-add-cost]');if(add){e.preventDefault();foodV3AddCustomCost();return}
    const remove=e.target.closest('[data-food-remove-cost]');if(remove){e.preventDefault();remove.closest('.foodCustomCostRow')?.remove();foodV3AfterDynamicChange();return}
    if(e.target.closest('[data-plan-choice="foodChannelMode"] .choice')||e.target.closest('[data-plan-choice="foodCostMode"] .choice'))setTimeout(refreshFoodV3Visibility,35);
  });
  document.addEventListener('input',e=>{if(e.target.closest('.foodV3Root'))setTimeout(()=>{try{updateFoodV3CostTotal(readUnifiedPlanInput())}catch(err){}},0)});
}

function foodV3PlanFields(s,input){
  const c=s.config||{},u=labelFoodUnit(c),keys=Array.isArray(c.channels)?c.channels:[],labels=keys.map(k=>foodV3ChannelLabel(k,c));
  const multi=keys.length>1,channelMode=multi?(input.foodChannelMode||(input.channelDetails?'detail':'average')):'average';
  let html='<div class="foodV3Root"><div class="modeNote"><b>Kênh bán:</b> '+esc(labels.join(', '))+'. '+(multi?'Bạn có thể dùng một mức bình quân chung hoặc tách riêng để MBA thấy chênh lệch giữa các kênh.':'MBA sẽ tính theo kênh bán đã chọn.')+'</div>';
  if(multi){html+='<div class="foodChannelMode"><div class="foodChannelModeTitle">Bạn muốn tính các kênh này như thế nào?</div><div class="foodChannelModeHelp">Tách riêng khi giá bán, bao bì hoặc phí nền tảng giữa các kênh khác nhau đáng kể.</div><div class="foodChannelModeGrid" data-plan-choice="foodChannelMode">'
    +'<button type="button" class="choice '+(channelMode==='average'?'selected':'')+'" data-value="average">Dùng mức bình quân chung<small>Ít số phải nhập, phù hợp để ước tính nhanh.</small></button>'
    +'<button type="button" class="choice '+(channelMode==='detail'?'selected':'')+'" data-value="detail">Tách riêng từng kênh<small>MBA tính giá, chi phí và phí kênh riêng rồi ghép lại.</small></button></div></div>'}
  else html+='<input type="hidden" data-plan-key="foodChannelMode" value="average">';
  html+=numberField('daysPerMonth','Số ngày bán mỗi tháng',input.daysPerMonth,'30','ngày/tháng');
  html+='<div class="foodChannelArea '+(channelMode==='average'?'on':'')+'" data-food-channel-area="average">'
    +moneyField('price','Khách trả trung bình cho một '+u,input.price,'50,000')
    +moneyField('directCost','Chi phí trực tiếp cho một '+u,input.directCost,'20,000','Ví dụ: nguyên liệu, bao bì, phí thanh toán và phần ship phát sinh theo '+u+'.')
    +numberField('dailyVolume','Dự kiến bán trung bình mỗi ngày',input.dailyVolume,'40',u+'/ngày')+'</div>';
  if(multi){html+='<div class="foodChannelArea '+(channelMode==='detail'?'on':'')+'" data-food-channel-area="detail"><div class="foodChannelCards">'+keys.map(k=>foodV3ChannelCard(k,c,u,input.channelDetails?.[k]||{})).join('')+'</div></div>'}
  html+=foodMonthlyCostBlockV3(input,u)+'</div>';return html;
}

function foodV3ChannelCard(key,c,u,x){
  const label=foodV3ChannelLabel(key,c),app=key==='grab'||key==='shopeefood'||key==='custom';
  const helper=key==='takeaway'?'Gồm nguyên liệu, bao bì và các khoản phát sinh trực tiếp trên lượt bán.':app?'Nhập nguyên liệu, bao bì và chi phí trực tiếp trước phí nền tảng.':'Gồm nguyên liệu và các khoản phát sinh trực tiếp trên lượt bán.';
  let fields=numberField('channelDetails.'+key+'.dailyVolume','Dự kiến bán mỗi ngày',x.dailyVolume,'20',u+'/ngày')
    +moneyField('channelDetails.'+key+'.price','Khách trả trung bình / '+u,x.price,key==='grab'||key==='shopeefood'?'60,000':'50,000')
    +moneyField('channelDetails.'+key+'.directCost','Chi phí trực tiếp / '+u,x.directCost,'20,000',helper);
  if(app)fields+=numberField('channelDetails.'+key+'.platformFeeRate','Phí kênh / nền tảng',x.platformFeeRate,'20','%','MBA tính tỷ lệ này trên số tiền khách trả. Nhập 0 nếu không có.');
  return '<div class="foodChannelCard"><div class="foodChannelCardHead"><b>'+esc(label)+'</b><span>'+esc(FOOD_CHANNEL_META[key]?.note||'')+'</span></div><div class="foodChannelFields">'+fields+'</div></div>';
}

function foodMonthlyCostBlockV3(input,u){
  const b=input.fixedCostBreakdown||{},mode=input.foodCostMode||(input.fixedCostBreakdown?'detail':'quick'),quick=input.foodFixedCostsQuick??input.fixedCosts??'';
  const custom=foodV3ExistingCustomRows(b),total=foodV3FixedBaseTotal(b)+custom.reduce((s,r)=>s+foodV3Money(r.amount),0);
  return '<div class="foodMonthlyCosts"><div class="foodCostTitle">Chi phí hàng tháng riêng của nguồn thu này</div><div class="foodCostIntro">Các khoản phải trả theo tháng nhưng không tăng trực tiếp theo từng '+esc(u)+'. Có thể nhập tổng hoặc tách từng khoản để MBA tự cộng.</div>'
    +'<div class="foodCostChoiceGrid" data-plan-choice="foodCostMode"><button type="button" class="choice '+(mode==='quick'?'selected':'')+'" data-value="quick">Nhập nhanh<small>Tôi đã biết tổng chi phí riêng mỗi tháng.</small></button><button type="button" class="choice '+(mode==='detail'?'selected':'')+'" data-value="detail">Nhập chi tiết<small>Tách từng khoản và thêm bao nhiêu khoản khác tùy cần.</small></button></div>'
    +'<div class="foodCostModeArea '+(mode==='quick'?'on':'')+'" data-food-cost-mode="quick">'+moneyField('foodFixedCostsQuick','Tổng chi phí riêng mỗi tháng',quick,'40,000,000','Không nhập lại chi phí đã nằm trong từng lượt bán hoặc từng kênh.')+'</div>'
    +'<div class="foodCostModeArea '+(mode==='detail'?'on':'')+'" data-food-cost-mode="detail"><div class="foodCostDetailGrid">'
      +moneyField('fixedCostBreakdown.rent','Thuê mặt bằng riêng',b.rent,'12,000,000')+moneyField('fixedCostBreakdown.staff','Nhân sự',b.staff,'18,000,000')+moneyField('fixedCostBreakdown.utilities','Điện, nước',b.utilities,'3,000,000')+moneyField('fixedCostBreakdown.marketing','Quảng cáo riêng cho nguồn này',b.marketing,'3,000,000')+moneyField('fixedCostBreakdown.software','Phần mềm / công cụ',b.software,'1,000,000')+'</div>'
      +'<div id="foodCustomCostList" class="foodCustomCostList">'+custom.map(r=>foodV3CustomCostRow(r.id,r.label,r.amount)).join('')+'</div><button type="button" class="foodAddCost" data-food-add-cost>+ Thêm khoản khác</button><div class="foodCostTotal"><span>Tổng chi phí riêng mỗi tháng</span><b id="foodCostDetailTotal">'+foodFormatVnd(total)+'</b></div></div>'
    +'<div class="foodCostScopeNote"><b>Để tránh tính trùng:</b> khoản chỉ phục vụ nguồn thu này nhập ở đây. Khoản dùng chung cho nhiều nguồn thu nhập một lần ở bước Tổng hợp toàn hồ sơ.</div></div>';
}

function foodV3ExistingCustomRows(b){
  const rows=[];if(b.custom&&typeof b.custom==='object')Object.entries(b.custom).forEach(([id,x])=>{if(x&&(x.label||x.amount))rows.push({id,label:x.label||'',amount:x.amount||''})});
  if(!rows.length&&(b.other||b.otherLabel))rows.push({id:'legacy',label:b.otherLabel||'Khoản khác',amount:b.other||''});return rows;
}
function foodV3CustomCostRow(id,label,amount){return '<div class="foodCustomCostRow" data-food-custom-row="'+escAttr(id)+'"><div class="field"><label>Tên khoản</label><input data-plan-key="fixedCostBreakdown.custom.'+escAttr(id)+'.label" value="'+escAttr(label||'')+'" placeholder="Ví dụ: thuê máy pha"></div><div class="field foodCustomAmount"><label>Số tiền / tháng</label><div class="amount"><input class="money" inputmode="numeric" data-plan-key="fixedCostBreakdown.custom.'+escAttr(id)+'.amount" value="'+moneyInputValue(amount)+'" placeholder="3,000,000"><span>đ</span></div></div><button type="button" class="foodCustomCostRemove" data-food-remove-cost aria-label="Xóa khoản">×</button></div>'}
function foodV3AddCustomCost(){const host=$('#foodCustomCostList');if(!host)return;const id='c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);host.insertAdjacentHTML('beforeend',foodV3CustomCostRow(id,'',''));bindMoneyInputs();if(typeof enhanceMoneyUnderstanding==='function')enhanceMoneyUnderstanding(host);host.querySelector('[data-food-custom-row="'+id+'"] input')?.focus();foodV3AfterDynamicChange()}
function foodV3AfterDynamicChange(){if(typeof mbaUnifiedSource!=='undefined'&&mbaUnifiedSource?.active){mbaUnifiedSource.planDraft=readUnifiedPlanInput();if(typeof scheduleUnifiedPreview==='function')scheduleUnifiedPreview()}else if(typeof schedulePlanPreview==='function')schedulePlanPreview();try{updateFoodV3CostTotal(readUnifiedPlanInput())}catch(e){}}
function foodV3FixedBaseTotal(b){return['rent','staff','utilities','marketing','software'].reduce((s,k)=>s+foodV3Money(b?.[k]),0)}
function foodV3DetailedFixedTotal(out){const b=out?.fixedCostBreakdown||{};let total=foodV3FixedBaseTotal(b);if(b.custom&&typeof b.custom==='object')Object.values(b.custom).forEach(x=>{total+=foodV3Money(x?.amount)});return total}
function updateFoodV3CostTotal(out){const el=$('#foodCostDetailTotal');if(el)el.textContent=foodFormatVnd(foodV3DetailedFixedTotal(out))}
function foodV3Money(v){const x=Number(String(v??'').replace(/,/g,''));return Number.isFinite(x)?Math.max(0,x):0}
function foodV3ChannelLabel(key,c){if(key==='custom')return String(c?.channelCustom||'Kênh khác');return FOOD_CHANNEL_META[key]?.label||key}
function refreshFoodV3Visibility(){const root=$('#unifiedPlanFields')||$('#planFields');if(!root)return;const channel=root.querySelector('[data-plan-choice="foodChannelMode"] .choice.selected')?.dataset.value||'average';root.querySelectorAll('[data-food-channel-area]').forEach(x=>x.classList.toggle('on',x.dataset.foodChannelArea===channel));const cost=root.querySelector('[data-plan-choice="foodCostMode"] .choice.selected')?.dataset.value||'quick';root.querySelectorAll('[data-food-cost-mode]').forEach(x=>x.classList.toggle('on',x.dataset.foodCostMode===cost))}

function renderFoodV3Breakdown(s,data){
  const old=$('#foodChannelBreakdown');old?.remove();if(s?.model!=='food'||!Array.isArray(data?.channelBreakdown)||!data.channelBreakdown.length)return;
  const insight=$('#planResult .insight');if(!insight)return;const host=document.createElement('div');host.id='foodChannelBreakdown';host.className='foodBreakdown';host.innerHTML='<h3>Kết quả theo từng kênh</h3><p>MBA tính từng kênh riêng trước khi ghép thành kết quả toàn nguồn thu.</p><div class="foodBreakdownGrid">'+data.channelBreakdown.map(x=>'<div class="foodBreakdownCard"><b>'+esc(x.label)+'</b><div class="foodBreakdownMetric"><span>Doanh thu</span><strong>'+foodV3FormatMoney(x.revenue)+'</strong></div><div class="foodBreakdownMetric"><span>Phần còn lại trước chi phí tháng</span><strong>'+foodV3FormatMoney(x.contribution)+'</strong></div><div class="foodBreakdownMetric"><span>Còn lại / '+esc(labelFoodUnit(s.config||{}))+'</span><strong>'+foodV3FormatMoney(x.contributionPerUnit)+'</strong></div><div class="foodBreakdownMetric"><span>Tỷ trọng doanh thu</span><strong>'+foodV3Pct(x.revenueShare)+'</strong></div></div>').join('')+'</div>';insight.insertAdjacentElement('beforebegin',host);
}
function foodV3FormatMoney(v){return new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(Math.round(Number(v)||0))+'đ'}
function foodV3Pct(v){return new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format((Number(v)||0)*100)+'%'}
