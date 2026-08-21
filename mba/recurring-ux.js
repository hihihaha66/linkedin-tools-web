const RECURRING_API_URL='https://linkedin-tools-api-test.vercel.app/api/mba-recurring';
const RECURRING_BASIS_OPTIONS=[
  ['active','Mỗi người / tài khoản / tài sản trả một khoản định kỳ','Ví dụ người, phòng, tài khoản, hợp đồng, thiết bị...'],
  ['usage','Tính theo mức sử dụng','Ví dụ giờ, GB, lượt sử dụng, km, kWh...'],
  ['total','Tôi chỉ biết tổng khoản thu','Dùng tổng số từ kế hoạch, dashboard hoặc đối soát.']
];
const RECURRING_UNIT_OPTIONS=[
  ['person','Người / thành viên','người'],
  ['account','Tài khoản / thuê bao','tài khoản'],
  ['business','Khách hàng / doanh nghiệp','khách hàng'],
  ['rental','Phòng / căn / chỗ thuê','phòng'],
  ['seat','Chỗ ngồi / vị trí','chỗ ngồi'],
  ['contract','Hợp đồng / gói dịch vụ','hợp đồng'],
  ['license','Giấy phép sử dụng','giấy phép'],
  ['device','Thiết bị / máy','thiết bị'],
  ['vehicle','Xe / phương tiện','xe'],
  ['location','Chi nhánh / địa điểm','địa điểm'],
  ['website','Website / tên miền','website'],
  ['store','Cửa hàng / điểm bán','điểm bán'],
  ['storage','Tủ / ô / khoang','ô lưu trữ'],
  ['project','Dự án / hồ sơ đang duy trì','hồ sơ'],
  ['custom','Khác / Tự nhập','']
];
const RECURRING_USAGE_OPTIONS=[
  ['storage','Dung lượng','GB'],
  ['hour','Giờ','giờ'],
  ['minute','Phút','phút'],
  ['use','Lượt sử dụng','lượt sử dụng'],
  ['api','Lượt gọi API','lượt gọi API'],
  ['distance','Quãng đường','km'],
  ['energy','Điện năng','kWh'],
  ['custom','Khác / Tự nhập','']
];

(function initRecurringUx(){
  if(!document.querySelector('link[data-recurring-flow]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='recurring-flow.css';link.dataset.recurringFlow='1';document.head.appendChild(link);
  }
  wrapRecurringStructure();wrapRecurringPlanFields();wrapRecurringCalculation();
  let tries=0;const timer=setInterval(()=>{tries++;if(typeof previewLineHtml==='function'&&typeof previewRequest==='function'&&typeof calculateProfitTarget==='function'){clearInterval(timer);wrapRecurringPreviewRequest();wrapRecurringTarget();wrapRecurringPreviewLine()}else if(tries>140)clearInterval(timer)},50);
})();

function recurringBasis(config,input={}){if(config?.revenueBasis)return config.revenueBasis;if(config?.billingUnit||input?.activeSubscribers||input?.monthlySubscribers||input?.yearlySubscribers)return'active';return''}
function recurringUnitLabel(config){return String(config?.billingUnitName||config?.billingUnitCustom||'đơn vị').trim()||'đơn vị'}
function recurringUsageLabel(config){return String(config?.usageUnitName||config?.usageUnitCustom||'đơn vị sử dụng').trim()||'đơn vị sử dụng'}
function recurringUnitChoiceLabel(config){const found=RECURRING_UNIT_OPTIONS.find(x=>x[0]===config?.billingUnit);return found?.[1]||'Chưa chọn'}
function recurringUsageChoiceLabel(config){const found=RECURRING_USAGE_OPTIONS.find(x=>x[0]===config?.usageUnit);return found?.[1]||'Chưa chọn'}
function recurringBasisLabel(config){const found=RECURRING_BASIS_OPTIONS.find(x=>x[0]===config?.revenueBasis);return found?.[1]||'Chưa chọn'}
function suggestedName(list,value){return list.find(x=>x[0]===value)?.[2]||''}
function recurringRow(no,question,help,body){return'<div class="recurringFlowRow"><div class="recurringFlowRowHead"><div class="recurringFlowNo">'+no+'</div><div><div class="recurringFlowQuestion">'+question+'</div>'+(help?'<div class="recurringFlowHelp">'+help+'</div>':'')+'</div></div>'+body+'</div>'}
function recurringChoiceGrid(id,items,selected){return'<div class="choiceGrid recurringWide" data-choice="'+id+'">'+items.map(([v,t,sub])=>'<button type="button" class="choice '+(selected===v?'selected':'')+'" data-value="'+v+'">'+t+(sub?'<small>'+sub+'</small>':'')+'</button>').join('')+'</div>'}

function wrapRecurringStructure(){
  if(fieldsForModel._recurringFlow)return;
  const previousFields=fieldsForModel;
  fieldsForModel=function(model,c){
    if(model!=='recurring')return previousFields(model,c);
    const billing=c.billing||'';
    let html='<div class="recurringFlow">';
    html+=recurringRow('01','Bạn thu tiền theo chu kỳ nào?','Chu kỳ này dùng để MBA quy đổi các gói dài hơn một tháng về cùng kỳ kế hoạch.',choiceBlock('', 'billing',[['month','Theo tháng'],['year','Theo năm'],['both','Có cả tháng và năm'],['custom','Khác / Tự nhập']],billing)+customInput('billingCustom','Chu kỳ của bạn là bao nhiêu tháng?',c.billingCustom,'Ví dụ: 3'));
    html+=recurringRow('02','Khoản thu định kỳ của bạn được tính dựa trên gì?','Chọn cách gần nhất với thực tế. Lựa chọn này quyết định những câu hỏi tiếp theo.',recurringChoiceGrid('recurringBasis',RECURRING_BASIS_OPTIONS,c.revenueBasis||''));
    html+='<div class="recurringBranch '+(c.revenueBasis==='active'?'on':'')+'" data-recurring-branch="active">';
    html+=recurringRow('03A','Bạn thu tiền cho mỗi cái gì?','Chọn nhóm gần nhất, sau đó đặt tên chính xác MBA sẽ dùng trong toàn bộ kết quả.',recurringChoiceGrid('recurringUnit',RECURRING_UNIT_OPTIONS,c.billingUnit||'')+'<div class="recurringUnitName"><div class="field"><label>Bạn muốn MBA gọi đơn vị này là gì?</label><input id="recurringUnitName" value="'+escAttr(c.billingUnitName||c.billingUnitCustom||'')+'" placeholder="Ví dụ: phòng"><div class="hint">Ví dụ chọn “Phòng / căn / chỗ thuê”, bạn có thể đặt tên là “phòng”.</div></div></div>');
    html+='</div>';
    html+='<div class="recurringBranch '+(c.revenueBasis==='usage'?'on':'')+'" data-recurring-branch="usage">';
    html+=recurringRow('03B','Bạn tính phí dựa trên mức sử dụng nào?','Dùng cho mô hình tính theo lượng dùng thay vì số người/tài khoản đang hoạt động.',recurringChoiceGrid('recurringUsage',RECURRING_USAGE_OPTIONS,c.usageUnit||'')+'<div class="recurringUnitName"><div class="field"><label>Bạn muốn MBA gọi đơn vị sử dụng này là gì?</label><input id="recurringUsageName" value="'+escAttr(c.usageUnitName||c.usageUnitCustom||'')+'" placeholder="Ví dụ: GB, giờ máy, lượt gọi API"></div></div>');
    html+='</div>';
    html+='<div class="recurringBranch '+(c.revenueBasis==='total'?'on':'')+'" data-recurring-branch="total">';
    html+=recurringRow('03C','Bạn chỉ cần nhập tổng khoản thu','Bạn chưa cần biết số lượng × đơn giá. MBA vẫn tính được doanh thu và lợi nhuận, nhưng sẽ chỉ quy hòa vốn về số lượng nếu bạn bổ sung thêm dữ liệu sau.','<div class="recurringBranchNote">Nhánh này phù hợp khi bạn đang có con số tổng từ dashboard, kế hoạch hoặc đối soát.</div>');
    html+='</div></div>';
    return html;
  };
  fieldsForModel._recurringFlow=true;

  const previousRefresh=refreshCustomVisibility;
  refreshCustomVisibility=function(){previousRefresh();toggleCustom('billing','billingCustomWrap');refreshRecurringStructureVisibility()};

  const previousCollect=collectConfig;
  collectConfig=function(model){
    const c=previousCollect(model);if(model!=='recurring')return c;
    c.billing=readChoice('billing');c.billingCustom=val('billingCustom');c.revenueBasis=readChoice('recurringBasis');
    if(c.revenueBasis==='active'){c.billingUnit=readChoice('recurringUnit');c.billingUnitName=val('recurringUnitName');c.billingUnitCustom=c.billingUnitName}
    else{delete c.billingUnit;delete c.billingUnitName;delete c.billingUnitCustom}
    if(c.revenueBasis==='usage'){c.usageUnit=readChoice('recurringUsage');c.usageUnitName=val('recurringUsageName');c.usageUnitCustom=c.usageUnitName}
    else{delete c.usageUnit;delete c.usageUnitName;delete c.usageUnitCustom}
    return c;
  };

  const previousValidate=validateConfig;
  validateConfig=function(model,c){
    if(model!=='recurring')return previousValidate(model,c);
    if(!c.billing)return'Chọn chu kỳ thu tiền.';
    if(c.billing==='custom'&&(!c.billingCustom||Number(c.billingCustom)<=0))return'Nhập số tháng trong một chu kỳ.';
    if(!c.revenueBasis)return'Chọn cách khoản thu định kỳ của bạn được tính.';
    if(c.revenueBasis==='active'){
      if(!c.billingUnit)return'Chọn thứ đang tạo khoản thu định kỳ.';
      if(!c.billingUnitName)return'Nhập tên đơn vị MBA sẽ dùng, ví dụ “phòng” hoặc “tài khoản”.';
    }
    if(c.revenueBasis==='usage'){
      if(!c.usageUnit)return'Chọn đơn vị mức sử dụng.';
      if(!c.usageUnitName)return'Nhập tên đơn vị sử dụng MBA sẽ dùng.';
    }
    return'';
  };

  const previousSummary=summaryFor;
  summaryFor=function(s){
    if(s.model!=='recurring')return previousSummary(s);
    const c=s.config||{},b=recurringBasis(c);
    if(b==='active')return'Chu kỳ: '+labelBilling(c)+' · Tính theo: '+recurringUnitLabel(c);
    if(b==='usage')return'Chu kỳ: '+labelBilling(c)+' · Theo mức sử dụng: '+recurringUsageLabel(c);
    if(b==='total')return'Chu kỳ: '+labelBilling(c)+' · Dùng tổng khoản thu';
    return'Chu kỳ: '+labelBilling(c)+' · Chưa chọn cách tính khoản thu';
  };
}

function refreshRecurringStructureVisibility(){
  const screen=$('#streamSetup');if(!screen||!screen.classList.contains('on'))return;
  const b=readChoice('recurringBasis');$$('[data-recurring-branch]').forEach(x=>x.classList.toggle('on',x.dataset.recurringBranch===b));
  const unit=readChoice('recurringUnit'),unitInput=$('#recurringUnitName');if(unitInput&&unit){const next=suggestedName(RECURRING_UNIT_OPTIONS,unit);if(!unitInput.value||unitInput.dataset.suggested==='1'){unitInput.value=next;unitInput.dataset.suggested='1'}}
  const usage=readChoice('recurringUsage'),usageInput=$('#recurringUsageName');if(usageInput&&usage){const next=suggestedName(RECURRING_USAGE_OPTIONS,usage);if(!usageInput.value||usageInput.dataset.suggested==='1'){usageInput.value=next;usageInput.dataset.suggested='1'}}
  if(unitInput&&!unitInput.dataset.manualBound){unitInput.addEventListener('input',()=>unitInput.dataset.suggested='0');unitInput.dataset.manualBound='1'}
  if(usageInput&&!usageInput.dataset.manualBound){usageInput.addEventListener('input',()=>usageInput.dataset.suggested='0');usageInput.dataset.manualBound='1'}
}

function wrapRecurringPlanFields(){
  recurringPlanFields=function(s,input){
    const c=s.config||{},b=recurringBasis(c,input),billing=c.billing||'month';
    if(!b){return'<div class="recurringMissing"><h3>Chưa chọn cách tính khoản thu</h3><p>Nguồn thu cũ này chưa có bước H02. Hãy vào Chỉnh cấu trúc để chọn “theo số lượng”, “theo mức sử dụng” hoặc “chỉ biết tổng khoản thu”.</p><button type="button" class="btn secondary" onclick="editSource(\''+s.id+'\')">Chỉnh cấu trúc</button></div>'}
    if(b==='active'){
      const u=recurringUnitLabel(c);let html='<div class="recurringPlanIntro"><b>Tính theo '+esc(u)+'</b> · Chu kỳ '+esc(labelBilling(c))+'. MBA sẽ dùng đúng chữ “'+esc(u)+'” trong preview, hòa vốn và mục tiêu.</div>';
      if(billing==='both')html+=numberField('monthlySubscribers','Số '+u+' ở gói tháng',input.monthlySubscribers,'140',u)+moneyField('monthlyPrice','Mỗi '+u+' trả bao nhiêu mỗi tháng?',input.monthlyPrice,'199,000')+numberField('yearlySubscribers','Số '+u+' ở gói năm',input.yearlySubscribers,'60',u)+moneyField('yearlyPrice','Mỗi '+u+' trả bao nhiêu mỗi năm?',input.yearlyPrice,'1,990,000');
      else html+=numberField('activeSubscribers','Hiện có bao nhiêu '+u+' đang tạo khoản thu?',input.activeSubscribers,'200',u)+moneyField('pricePerCycle',billing==='year'?'Mỗi '+u+' trả bao nhiêu mỗi năm?':billing==='custom'?'Mỗi '+u+' trả bao nhiêu mỗi chu kỳ?':'Mỗi '+u+' trả bao nhiêu mỗi tháng?',input.pricePerCycle,billing==='year'?'1,990,000':'199,000');
      html+=numberField('newSubscribers','Mỗi tháng tăng thêm khoảng bao nhiêu '+u+'?',input.newSubscribers,'0',u+'/tháng')+numberField('lostSubscribers','Mỗi tháng giảm khoảng bao nhiêu '+u+'?',input.lostSubscribers,'0',u+'/tháng')+moneyField('variablePerSubscriber','Mỗi '+u+' làm phát sinh thêm bao nhiêu chi phí mỗi tháng?',input.variablePerSubscriber,'0','Chỉ nhập phần chi phí tăng theo từng '+u+'. Nếu thêm 1 '+u+' mà tổng chi phí không đổi, nhập 0đ.')+moneyField('fixedCosts','Chi phí cố định mỗi tháng',input.fixedCosts,'20,000,000');
      return html;
    }
    if(b==='usage'){
      const u=recurringUsageLabel(c);return'<div class="recurringPlanIntro"><b>Tính theo mức sử dụng</b> · Đơn vị: <b>'+esc(u)+'</b>. Kế hoạch nhanh đang chuẩn hóa mức sử dụng và chi phí về tháng.</div>'+numberField('usageAmount','Mỗi tháng dự kiến sử dụng bao nhiêu '+u+'?',input.usageAmount,'1000',u+'/tháng')+moneyField('pricePerUsage','Giá cho mỗi '+u,input.pricePerUsage,'10,000')+moneyField('variablePerUsage','Mỗi '+u+' làm phát sinh thêm bao nhiêu chi phí?',input.variablePerUsage,'0','Ví dụ chi phí hạ tầng, đối tác hoặc tài nguyên tăng theo mức sử dụng. Nếu không có, nhập 0đ.')+moneyField('fixedCosts','Chi phí cố định mỗi tháng',input.fixedCosts,'20,000,000');
    }
    let html='<div class="recurringPlanIntro"><b>Tôi chỉ biết tổng khoản thu</b> · MBA không ép bạn phải biết số lượng × đơn giá ngay.</div>';
    const revenueLabel=billing==='year'?'Tổng khoản thu định kỳ dự kiến trong năm':billing==='both'?'Tổng khoản thu định kỳ đã quy đổi về tháng':'Tổng khoản thu định kỳ dự kiến trong kỳ';
    html+=moneyField('totalRevenuePerCycle',revenueLabel,input.totalRevenuePerCycle,'50,000,000',billing==='both'?'Nếu có cả gói tháng và năm, hãy nhập tổng khoản thu đã quy đổi về một tháng.':'');
    html+=planChoiceBlock('Bạn có biết số lượng đang tạo ra khoản thu này không?','countKnown',[['no','Chưa biết / chưa cần','MBA vẫn tính được lợi nhuận.'],['yes','Có, tôi muốn bổ sung','MBA có thể suy ra mức bình quân và hòa vốn theo số lượng.']],input.countKnown||'no');
    html+='<div class="customArea '+(input.countKnown==='yes'?'on':'')+'" data-recurring-count-known>'+numberField('knownCount','Số lượng hiện tại',input.knownCount,'10','')+'<div class="field"><label>Bạn muốn gọi số lượng này là gì?</label><input data-plan-key="knownCountUnit" value="'+escAttr(input.knownCountUnit||'')+'" placeholder="Ví dụ: phòng, tài khoản, khách hàng"></div></div>';
    html+=moneyField('fixedCosts','Chi phí cố định mỗi tháng',input.fixedCosts,'20,000,000')+moneyField('otherCosts','Chi phí khác mỗi tháng',input.otherCosts,'0','Các khoản chi phí chưa nằm ở ô trên.');return html;
  };

  const previousRefresh=refreshPlanVisibility;
  refreshPlanVisibility=function(){previousRefresh();const selected=$('[data-plan-choice="countKnown"] .choice.selected')?.dataset.value;const box=$('[data-recurring-count-known]');if(box)box.classList.toggle('on',selected==='yes')};
}

function wrapRecurringCalculation(){
  if(calculatePlan._recurringFlow)return;const previous=calculatePlan;
  calculatePlan=async function(){
    const s=currentStream();if(s?.model!=='recurring')return previous();const p=currentProfile(),input=readPlanInput(),btn=$('#calculateBtn');btn.disabled=true;btn.textContent='Đang tính...';
    try{const r=await fetch(RECURRING_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'calculate',config:s.config,input})});if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();if(data.status!=='ok'){toast(data.message||'Chưa thể tính với dữ liệu này.');return}s.planning={mode:'quick',input,result:data,updatedAt:now()};p.businessPlan=null;p.updatedAt=now();persist();renderPlanResult(s,data);go('planResult')}catch(e){toast('Không kết nối được với bộ máy tính nguồn thu định kỳ. Thử lại sau ít phút.')}finally{btn.disabled=false;btn.textContent='Lưu & xem kết quả'}
  };calculatePlan._recurringFlow=true;
}

function wrapRecurringPreviewRequest(){if(previewRequest._recurringFlow)return;const previous=previewRequest;previewRequest=async function(stream,input){if(stream?.model!=='recurring')return previous(stream,input);const r=await fetch(RECURRING_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'preview',config:stream.config,input})});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()};previewRequest._recurringFlow=true}
function wrapRecurringTarget(){if(calculateProfitTarget._recurringFlow)return;const previous=calculateProfitTarget;calculateProfitTarget=async function(){const s=currentStream();if(s?.model!=='recurring')return previous();const amount=parseMoney($('#targetProfitInput')?.value);if(!amount){toast('Nhập mức lợi nhuận bạn muốn đạt.');return}const btn=$('#targetCalcBtn');btn.disabled=true;btn.textContent='Đang tính...';const input=JSON.parse(JSON.stringify(s.planning?.input||{}));delete input.targetProfit;try{const r=await fetch(RECURRING_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'target',config:s.config,input,targetProfit:amount})});if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();if(data.status!=='ok'){toast(data.message||'Chưa thể tính mục tiêu từ dữ liệu hiện tại.');return}s.planning.targetProfit=amount;s.planning.targetResult=data;s.updatedAt=now();currentProfile().updatedAt=now();persist();renderSavedTarget(data,amount)}catch(e){toast('Không kết nối được với bộ máy tính mục tiêu. Thử lại sau ít phút.')}finally{btn.disabled=false;btn.textContent='Lưu mục tiêu & tính'}};calculateProfitTarget._recurringFlow=true}
function wrapRecurringPreviewLine(){if(previewLineHtml._recurringFlow)return;const previous=previewLineHtml;previewLineHtml=function(line){const s=currentStream();if(s?.model!=='recurring')return previous(line);const raw=String(line||'').trim();if(raw.startsWith('Doanh thu:')){const text=raw.replace(/^Doanh thu:\s*/,'').replace(/\s*\/tháng quy đổi$/,'').replace(/\s*\/tháng$/,'').trim();const period=raw.includes('/tháng quy đổi')?'/tháng quy đổi':'/tháng';return'<span class="previewLabel">Doanh thu:</span> '+esc(text)+' <span class="previewPeriod">'+period+'</span>'}if(raw.startsWith('Lợi nhuận:')){const text=raw.replace(/^Lợi nhuận:\s*/,'').replace(/\s*\/tháng$/,'').trim();return'<span class="previewLabel">Lợi nhuận:</span> '+esc(text)+' <span class="previewPeriod">/tháng</span>'}if(raw.includes('=')&&raw.includes('/tháng quy đổi')&&!raw.includes('lợi nhuận')){const text=raw.replace('/tháng quy đổi','').trim();return'<span class="previewLabel">Doanh thu:</span> '+esc(text)+' <span class="previewPeriod">/tháng quy đổi</span>'}if(/ lợi nhuận\/tháng$/.test(raw)){const text=raw.replace(/ lợi nhuận\/tháng$/,'').trim();return'<span class="previewLabel">Lợi nhuận:</span> '+esc(text)+' <span class="previewPeriod">/tháng</span>'}return previous(line)};previewLineHtml._recurringFlow=true}
