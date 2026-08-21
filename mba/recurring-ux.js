const RECURRING_API_URL='https://linkedin-tools-api-test.vercel.app/api/mba-recurring';
const RECURRING_UNIT_OPTIONS=[
  ['person','Người / thành viên'],
  ['account','Tài khoản / thuê bao'],
  ['business','Khách hàng / doanh nghiệp'],
  ['rental','Phòng / căn / chỗ thuê'],
  ['device','Thiết bị / chỗ ngồi'],
  ['contract','Hợp đồng / gói'],
  ['custom','Khác / Tự nhập']
];

(function initRecurringUx(){
  wrapRecurringStructure();
  wrapRecurringPlanFields();
  wrapRecurringCalculation();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(typeof previewLineHtml==='function'&&typeof previewRequest==='function'&&typeof calculateProfitTarget==='function'){
      clearInterval(timer);wrapRecurringPreviewRequest();wrapRecurringTarget();wrapRecurringPreviewLine();
    }else if(tries>140)clearInterval(timer);
  },50);
})();

function recurringUnitLabel(config){
  const v=config?.billingUnit;
  if(v==='person')return'người/thành viên';
  if(v==='account')return'tài khoản/thuê bao';
  if(v==='business')return'khách hàng/doanh nghiệp';
  if(v==='rental')return'phòng/căn';
  if(v==='device')return'thiết bị/chỗ ngồi';
  if(v==='contract')return'hợp đồng/gói';
  if(v==='custom'&&String(config?.billingUnitCustom||'').trim())return String(config.billingUnitCustom).trim();
  return'đơn vị';
}
function recurringUnitChoiceLabel(config){
  const found=RECURRING_UNIT_OPTIONS.find(x=>x[0]===config?.billingUnit);
  return config?.billingUnit==='custom'?(config.billingUnitCustom||'Tự nhập'):(found?.[1]||'Chưa chọn');
}

function wrapRecurringStructure(){
  if(fieldsForModel._recurringUnit)return;
  const previousFields=fieldsForModel;
  fieldsForModel=function(model,c){
    const base=previousFields(model,c);
    if(model!=='recurring')return base;
    return base+choiceBlock('Bạn muốn MBA đếm nguồn thu định kỳ theo đơn vị nào?','recurringUnit',RECURRING_UNIT_OPTIONS,c.billingUnit)+customInput('recurringUnitCustom','Tên đơn vị bạn muốn dùng',c.billingUnitCustom,'Ví dụ: phòng, căn hộ, học viên, cửa hàng');
  };
  fieldsForModel._recurringUnit=true;

  const previousRefresh=refreshCustomVisibility;
  refreshCustomVisibility=function(){previousRefresh();toggleCustom('recurringUnit','recurringUnitCustomWrap')};

  const previousCollect=collectConfig;
  collectConfig=function(model){
    const c=previousCollect(model);
    if(model==='recurring'){c.billingUnit=readChoice('recurringUnit');c.billingUnitCustom=val('recurringUnitCustom')}
    return c;
  };

  const previousValidate=validateConfig;
  validateConfig=function(model,c){
    const base=previousValidate(model,c);if(base)return base;
    if(model==='recurring'){
      if(!c.billingUnit)return'Chọn đơn vị MBA sẽ dùng để đếm nguồn thu định kỳ.';
      if(c.billingUnit==='custom'&&!c.billingUnitCustom)return'Nhập tên đơn vị bạn muốn dùng.';
    }
    return'';
  };

  const previousSummary=summaryFor;
  summaryFor=function(s){
    const base=previousSummary(s);
    if(s.model!=='recurring')return base;
    return base+' · Đơn vị: '+recurringUnitChoiceLabel(s.config||{});
  };
}

function wrapRecurringPlanFields(){
  recurringPlanFields=function(s,input){
    const b=s.config?.billing||'month',u=recurringUnitLabel(s.config),unitMissing=!s.config?.billingUnit;
    let html='<div class="modeNote"><b>Thu phí định kỳ</b> - chu kỳ: <b>'+esc(labelBilling(s.config))+'</b> · đơn vị: <b>'+esc(unitMissing?'Chưa chọn':recurringUnitChoiceLabel(s.config))+'</b>.'+(unitMissing?' Hồ sơ cũ này chưa có đơn vị tính; MBA tạm dùng chữ “đơn vị”. Hãy Chỉnh cấu trúc để chọn đơn vị phù hợp.':' Gói dài hơn một tháng sẽ được quy đổi về tháng.')+'</div>';
    if(b==='both'){
      html+=numberField('monthlySubscribers','Số '+u+' ở gói tháng',input.monthlySubscribers,'140',u)+moneyField('monthlyPrice','Mỗi '+u+' trả bao nhiêu mỗi tháng?',input.monthlyPrice,'199,000')+numberField('yearlySubscribers','Số '+u+' ở gói năm',input.yearlySubscribers,'60',u)+moneyField('yearlyPrice','Mỗi '+u+' trả bao nhiêu mỗi năm?',input.yearlyPrice,'1,990,000');
    }else{
      html+=numberField('activeSubscribers','Số '+u+' đang tạo khoản thu định kỳ',input.activeSubscribers,'200',u)+moneyField('pricePerCycle',b==='year'?'Mỗi '+u+' trả bao nhiêu mỗi năm?':b==='custom'?'Mỗi '+u+' trả bao nhiêu mỗi chu kỳ?':'Mỗi '+u+' trả bao nhiêu mỗi tháng?',input.pricePerCycle,b==='year'?'1,990,000':'199,000');
    }
    html+=numberField('newSubscribers','Mỗi tháng tăng thêm khoảng bao nhiêu '+u+'?',input.newSubscribers,'25',u+'/tháng')+numberField('lostSubscribers','Mỗi tháng giảm khoảng bao nhiêu '+u+'?',input.lostSubscribers,'12',u+'/tháng')+moneyField('variablePerSubscriber','Mỗi '+u+' làm phát sinh thêm bao nhiêu chi phí mỗi tháng?',input.variablePerSubscriber,'20,000','Chỉ nhập phần chi phí tăng theo số '+u+'. Nếu thêm 1 '+u+' mà tổng chi phí không đổi, nhập 0đ.')+moneyField('fixedCosts','Chi phí cố định mỗi tháng',input.fixedCosts,'20,000,000');
    return html;
  };
}

function wrapRecurringCalculation(){
  if(calculatePlan._recurringUnit)return;
  const previous=calculatePlan;
  calculatePlan=async function(){
    const s=currentStream();if(s?.model!=='recurring')return previous();
    const p=currentProfile(),input=readPlanInput(),btn=$('#calculateBtn');btn.disabled=true;btn.textContent='Đang tính...';
    try{
      const r=await fetch(RECURRING_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'calculate',config:s.config,input})});
      if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();if(data.status!=='ok'){toast(data.message||'Chưa thể tính với dữ liệu này.');return}
      s.planning={mode:'quick',input,result:data,updatedAt:now()};p.businessPlan=null;p.updatedAt=now();persist();renderPlanResult(s,data);go('planResult');
    }catch(e){toast('Không kết nối được với bộ máy tính nguồn thu định kỳ. Thử lại sau ít phút.')}
    finally{btn.disabled=false;btn.textContent='Lưu & xem kết quả'}
  };
  calculatePlan._recurringUnit=true;
}

function wrapRecurringPreviewRequest(){
  if(previewRequest._recurringUnit)return;
  const previous=previewRequest;
  previewRequest=async function(stream,input){
    if(stream?.model!=='recurring')return previous(stream,input);
    const r=await fetch(RECURRING_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'preview',config:stream.config,input})});
    if(!r.ok)throw new Error('HTTP '+r.status);return r.json();
  };
  previewRequest._recurringUnit=true;
}

function wrapRecurringTarget(){
  if(calculateProfitTarget._recurringUnit)return;
  const previous=calculateProfitTarget;
  calculateProfitTarget=async function(){
    const s=currentStream();if(s?.model!=='recurring')return previous();
    const amount=parseMoney($('#targetProfitInput')?.value);if(!amount){toast('Nhập mức lợi nhuận bạn muốn đạt.');return}
    const btn=$('#targetCalcBtn');btn.disabled=true;btn.textContent='Đang tính...';const input=JSON.parse(JSON.stringify(s.planning?.input||{}));delete input.targetProfit;
    try{
      const r=await fetch(RECURRING_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'target',config:s.config,input,targetProfit:amount})});
      if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();if(data.status!=='ok'){toast(data.message||'Chưa thể tính mục tiêu từ dữ liệu hiện tại.');return}
      s.planning.targetProfit=amount;s.planning.targetResult=data;s.updatedAt=now();currentProfile().updatedAt=now();persist();renderSavedTarget(data,amount);
    }catch(e){toast('Không kết nối được với bộ máy tính mục tiêu. Thử lại sau ít phút.')}
    finally{btn.disabled=false;btn.textContent='Lưu mục tiêu & tính'}
  };
  calculateProfitTarget._recurringUnit=true;
}

function wrapRecurringPreviewLine(){
  if(previewLineHtml._recurringUnit)return;
  const previous=previewLineHtml;
  previewLineHtml=function(line){
    const s=currentStream();if(s?.model!=='recurring')return previous(line);
    const raw=String(line||'').trim();
    if(raw.includes('=')&&raw.includes('/tháng quy đổi')&&!raw.includes('lợi nhuận')){
      const text=raw.replace('/tháng quy đổi','').trim();
      return '<span class="previewLabel">Doanh thu:</span> '+esc(text)+' <span class="previewPeriod">/tháng quy đổi</span>';
    }
    if(/ lợi nhuận\/tháng$/.test(raw)){
      const text=raw.replace(/ lợi nhuận\/tháng$/,'').trim();
      return '<span class="previewLabel">Lợi nhuận:</span> '+esc(text)+' <span class="previewPeriod">/tháng</span>';
    }
    return previous(line);
  };
  previewLineHtml._recurringUnit=true;
}
