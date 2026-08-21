(function initRentalCapacityPeriod(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(typeof recurringPlanFields==='function'&&typeof bindPlanUI==='function'&&typeof previewRequest==='function'&&typeof calculatePlan==='function'){
      clearInterval(timer);setupRentalCapacityPeriod();
    }else if(tries>200){clearInterval(timer)}
  },50);
})();

function setupRentalCapacityPeriod(){
  if(window.__mbaRentalCapacityReady)return;
  window.__mbaRentalCapacityReady=true;

  const previousRecurringPlanFields=recurringPlanFields;
  recurringPlanFields=function(s,input){
    const c=s?.config||{},m=c.revenueMechanism||c.revenueBasis||'';
    if(m!=='rental_time')return previousRecurringPlanFields(s,input);
    return rentalFlexibleCapacityFields(s,input||{});
  };

  const previousBindPlanUI=bindPlanUI;
  bindPlanUI=function(){
    previousBindPlanUI();
    bindRentalCapacityPeriodUI();
  };

  const previousPreviewRequest=previewRequest;
  previewRequest=function(stream,input){
    return previousPreviewRequest(stream,normalizeRentalCapacityInput(input,stream?.config||{}));
  };

  const previousCalculatePlan=calculatePlan;
  calculatePlan=async function(){
    const originalRead=readPlanInput;
    readPlanInput=function(){
      const raw=originalRead();
      const stream=typeof currentStream==='function'?currentStream():null;
      const config=(typeof draftStream!=='undefined'&&draftStream?.config)||stream?.config||{};
      return normalizeRentalCapacityInput(raw,config);
    };
    try{return await previousCalculatePlan()}finally{readPlanInput=originalRead}
  };
}

function rentalFlexibleCapacityFields(s,input){
  const c=s.config||{},asset=c.assetName||'tài sản',timeUnit=c.timeUnitName||'giờ';
  const legacyOnly=input.capacityPerAsset&&!input.capacityAmount;
  const period=input.capacityPeriod||(legacyOnly?'month':'');
  const amount=input.capacityAmount??(legacyOnly?input.capacityPerAsset:'');
  let html='<div class="recurringPlanIntro"><b>Cho thuê theo thời gian</b> · '+esc(asset)+' · tính giá theo '+esc(timeUnit)+'.</div>';
  html+=numberField('assetCount','Có bao nhiêu '+asset+' có thể cho thuê?',input.assetCount,'4',asset);
  html+='<div class="rentalCapacityBlock">';
  html+=numberField('capacityAmount','Mỗi '+asset+' có thể cho thuê tối đa khoảng bao nhiêu '+timeUnit+'?',amount,'12',timeUnit,'Nhập theo khoảng thời gian bạn dễ nhớ nhất. MBA sẽ tự quy đổi về tháng.');
  html+='<div class="field rentalCapacityPeriod"><label>Bạn đang nhớ mức tối đa này theo khoảng nào?</label><div class="choiceGrid" data-plan-choice="capacityPeriod">'
    +rentalPeriodChoice('day','Theo ngày','Ví dụ 12 '+timeUnit+'/ngày',period)
    +rentalPeriodChoice('week','Theo tuần','Ví dụ 80 '+timeUnit+'/tuần',period)
    +rentalPeriodChoice('month','Theo tháng','Nếu bạn đã biết con số theo tháng',period)
    +'</div></div>';
  html+='<div class="rentalCapacitySubfield customArea '+(period==='day'?'on':'')+'" data-rental-period="day">'
    +numberField('operatingDaysPerMonth','Một tháng bạn hoạt động khoảng bao nhiêu ngày?',input.operatingDaysPerMonth,'30','ngày/tháng','MBA dùng số này để quy đổi về khả năng cho thuê theo tháng.')+'</div>';
  html+='<div class="rentalCapacitySubfield customArea '+(period==='week'?'on':'')+'" data-rental-period="week">'
    +numberField('operatingWeeksPerMonth','Một tháng bạn hoạt động khoảng bao nhiêu tuần?',input.operatingWeeksPerMonth,'4.35','tuần/tháng','Nếu hoạt động đều quanh năm, 4,35 tuần/tháng là mức bình quân tham khảo. Đây chỉ là gợi ý, không tự điền vào phép tính.')+'</div>';
  html+='<div class="rentalCapacityConversion waiting" data-rental-capacity-preview data-asset="'+escAttr(asset)+'" data-time-unit="'+escAttr(timeUnit)+'">Chọn khoảng thời gian và nhập số cần thiết để MBA tự quy đổi.</div>';
  html+='</div>';
  html+=numberField('utilizationRate','Bạn dự kiến bao nhiêu % khả năng cho thuê này thực sự có khách?',input.utilizationRate,'60','%','Ví dụ 60% nghĩa là khoảng 60% số '+timeUnit+' có thể bán thực sự được thuê.');
  html+=moneyField('pricePerTimeUnit','Giá thuê trung bình cho mỗi '+timeUnit,input.pricePerTimeUnit,'200,000');
  html+=moneyField('variablePerTimeUnit','Chi phí trực tiếp phát sinh cho mỗi '+timeUnit+' được thuê',input.variablePerTimeUnit,'0','Chỉ nhập phần phát sinh khi có khách thuê.');
  html+=moneyField('fixedCosts','Chi phí cố định mỗi tháng',input.fixedCosts,'20,000,000');
  return html;
}

function rentalPeriodChoice(value,title,sub,selected){
  return '<button type="button" class="choice '+(selected===value?'selected':'')+'" data-value="'+value+'">'+title+'<small>'+sub+'</small></button>';
}

function bindRentalCapacityPeriodUI(){
  document.querySelectorAll('[data-rental-capacity-preview]').forEach(preview=>{
    const root=preview.closest('.rentalCapacityBlock')?.parentElement||preview.parentElement;
    if(!root||root.dataset.rentalCapacityBound==='1'){refreshRentalCapacityPeriodUI(root);return}
    root.dataset.rentalCapacityBound='1';
    root.addEventListener('input',()=>refreshRentalCapacityPeriodUI(root));
    root.addEventListener('click',e=>{if(e.target.closest('[data-plan-choice="capacityPeriod"] .choice'))setTimeout(()=>refreshRentalCapacityPeriodUI(root),20)});
    refreshRentalCapacityPeriodUI(root);
  });
}

function refreshRentalCapacityPeriodUI(root){
  if(!root)return;
  const selected=root.querySelector('[data-plan-choice="capacityPeriod"] .choice.selected')?.dataset.value||'';
  root.querySelectorAll('[data-rental-period]').forEach(box=>box.classList.toggle('on',box.dataset.rentalPeriod===selected));
  const preview=root.querySelector('[data-rental-capacity-preview]');if(!preview)return;
  const amount=rentalNum(root.querySelector('[data-plan-key="capacityAmount"]')?.value);
  const asset=preview.dataset.asset||'tài sản',tu=preview.dataset.timeUnit||'giờ';
  let monthly=0,text='';
  if(!amount||!selected){text='Chọn khoảng thời gian và nhập số cần thiết để MBA tự quy đổi.'}
  else if(selected==='day'){
    const days=rentalNum(root.querySelector('[data-plan-key="operatingDaysPerMonth"]')?.value);
    if(!days)text='Nhập số ngày hoạt động trong tháng để MBA tự quy đổi.';
    else{monthly=amount*days;text='<b>MBA quy đổi:</b> '+rentalFmt(amount)+' '+esc(tu)+'/'+esc(asset)+'/ngày × '+rentalFmt(days)+' ngày = <b>'+rentalFmt(monthly)+' '+esc(tu)+'/'+esc(asset)+'/tháng</b>'}
  }else if(selected==='week'){
    const weeks=rentalNum(root.querySelector('[data-plan-key="operatingWeeksPerMonth"]')?.value);
    if(!weeks)text='Nhập số tuần hoạt động trong tháng để MBA tự quy đổi.';
    else{monthly=amount*weeks;text='<b>MBA quy đổi:</b> '+rentalFmt(amount)+' '+esc(tu)+'/'+esc(asset)+'/tuần × '+rentalFmt(weeks)+' tuần = <b>'+rentalFmt(monthly)+' '+esc(tu)+'/'+esc(asset)+'/tháng</b>'}
  }else{
    monthly=amount;text='<b>MBA dùng trực tiếp:</b> '+rentalFmt(monthly)+' '+esc(tu)+'/'+esc(asset)+'/tháng.';
  }
  preview.classList.toggle('waiting',!monthly);
  preview.innerHTML=text;
}

function normalizeRentalCapacityInput(input,config){
  const out=JSON.parse(JSON.stringify(input||{}));
  const m=config?.revenueMechanism||config?.revenueBasis||'';
  if(m!=='rental_time')return out;
  const amount=rentalNum(out.capacityAmount);
  const period=out.capacityPeriod||((out.capacityPerAsset&&!out.capacityAmount)?'month':'');
  if(!amount){return out}
  if(period==='day')out.capacityPerAsset=amount*rentalNum(out.operatingDaysPerMonth);
  else if(period==='week')out.capacityPerAsset=amount*rentalNum(out.operatingWeeksPerMonth);
  else if(period==='month')out.capacityPerAsset=amount;
  return out;
}

function rentalNum(v){const x=parseFloat(String(v??'').replace(/,/g,''));return Number.isFinite(x)&&x>0?x:0}
function rentalFmt(v){return new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(Number(v)||0)}
