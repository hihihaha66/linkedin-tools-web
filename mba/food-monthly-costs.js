(function initFoodMonthlyCosts(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ready=window.__mbaUnifiedSourceReady&&typeof planFields==='function'&&typeof readUnifiedPlanInput==='function'&&typeof refreshPlanVisibility==='function';
    if(ready){clearInterval(timer);setupFoodMonthlyCosts()}
    else if(tries>240){clearInterval(timer);if(typeof planFields==='function')setupFoodMonthlyCosts()}
  },50);
})();

function setupFoodMonthlyCosts(){
  if(window.__mbaFoodMonthlyCostsReady)return;window.__mbaFoodMonthlyCostsReady=true;

  const previousPlanFields=planFields;
  planFields=function(s,input){
    if(s?.model!=='food')return previousPlanFields(s,input);
    return foodPlanFieldsWithCosts(s,input||{});
  };

  const previousRefresh=refreshPlanVisibility;
  refreshPlanVisibility=function(){previousRefresh();refreshFoodCostMode()};

  const previousReadUnified=readUnifiedPlanInput;
  readUnifiedPlanInput=function(){
    const out=previousReadUnified();
    if(draftStream?.model!=='food'||!$('#unifiedPlanFields .foodMonthlyCosts'))return out;
    const mode=getNested(out,'foodCostMode')||'quick';
    out.foodCostMode=mode;
    if(mode==='detail'){
      const keys=['rent','staff','utilities','marketing','software','other'];
      const total=keys.reduce((sum,key)=>sum+foodMoneyNumber(getNested(out,'fixedCostBreakdown.'+key)),0);
      out.fixedCosts=String(total);
    }else{
      out.fixedCosts=String(foodMoneyNumber(getNested(out,'foodFixedCostsQuick')));
    }
    updateFoodCostTotal(out);
    return out;
  };

  document.addEventListener('input',e=>{
    if(!e.target.closest('.foodMonthlyCosts'))return;
    setTimeout(()=>{try{const x=readUnifiedPlanInput();updateFoodCostTotal(x)}catch(err){}},0);
  });

  document.addEventListener('click',e=>{
    if(!e.target.closest('[data-plan-choice="foodCostMode"] .choice'))return;
    setTimeout(()=>{refreshFoodCostMode();try{const x=readUnifiedPlanInput();updateFoodCostTotal(x)}catch(err){}},30);
  });
}

function foodPlanFieldsWithCosts(s,input){
  const c=s.config||{},u=labelFoodUnit(c),channels=labelsChannels(c.channels,c.channelCustom,'food').join(', ');
  return '<div class="modeNote"><b>Nhập nhanh</b> - MBA dùng số bình quân để cho bạn kết quả đầu tiên. Các kênh bán đã lưu: '+esc(channels)+'.</div>'
    +moneyField('price','Khách trả trung bình cho một '+u,input.price,'50,000')
    +moneyField('directCost','Chi phí trực tiếp cho một '+u,input.directCost,'20,000','Ví dụ: nguyên liệu, bao bì, phí thanh toán và phần ship phát sinh theo '+u+'.')
    +numberField('dailyVolume','Dự kiến bán trung bình mỗi ngày',input.dailyVolume,'40',u+'/ngày')
    +numberField('daysPerMonth','Số ngày bán mỗi tháng',input.daysPerMonth,'30','ngày/tháng')
    +foodMonthlyCostBlock(input);
}

function foodMonthlyCostBlock(input){
  const breakdown=input.fixedCostBreakdown||{};
  const mode=input.foodCostMode||(input.fixedCostBreakdown?'detail':'quick');
  const quickValue=input.foodFixedCostsQuick??input.fixedCosts??'';
  const detailTotal=['rent','staff','utilities','marketing','software','other'].reduce((sum,key)=>sum+foodMoneyNumber(breakdown[key]),0);
  return '<div class="foodMonthlyCosts">'
    +'<div class="foodCostTitle">Chi phí hàng tháng riêng của nguồn thu này</div>'
    +'<div class="foodCostIntro">Đây là các khoản phải trả theo tháng nhưng không tăng trực tiếp theo từng '+esc(labelFoodUnit(draftStream?.config||{}))+'. Bạn có thể nhập một con số tổng hoặc tách từng khoản để MBA tự cộng.</div>'
    +'<div class="foodCostChoiceGrid" data-plan-choice="foodCostMode">'
      +'<button type="button" class="choice '+(mode==='quick'?'selected':'')+'" data-value="quick">Nhập nhanh<small>Tôi đã biết tổng chi phí riêng mỗi tháng.</small></button>'
      +'<button type="button" class="choice '+(mode==='detail'?'selected':'')+'" data-value="detail">Nhập chi tiết<small>Tách từng khoản để MBA tự cộng tổng.</small></button>'
    +'</div>'
    +'<div class="foodCostModeArea '+(mode==='quick'?'on':'')+'" data-food-cost-mode="quick">'
      +moneyField('foodFixedCostsQuick','Tổng chi phí riêng mỗi tháng',quickValue,'40,000,000','Không nhập lại nguyên liệu, bao bì hoặc phí đã nằm trong chi phí trực tiếp mỗi lượt bán.')
    +'</div>'
    +'<div class="foodCostModeArea '+(mode==='detail'?'on':'')+'" data-food-cost-mode="detail">'
      +'<div class="foodCostDetailGrid">'
        +moneyField('fixedCostBreakdown.rent','Thuê mặt bằng riêng',breakdown.rent,'12,000,000')
        +moneyField('fixedCostBreakdown.staff','Nhân sự',breakdown.staff,'18,000,000')
        +moneyField('fixedCostBreakdown.utilities','Điện, nước',breakdown.utilities,'3,000,000')
        +moneyField('fixedCostBreakdown.marketing','Quảng cáo riêng cho nguồn này',breakdown.marketing,'3,000,000')
        +moneyField('fixedCostBreakdown.software','Phần mềm / công cụ',breakdown.software,'1,000,000')
        +moneyField('fixedCostBreakdown.other','Khác / Tự nhập',breakdown.other,'3,000,000')
      +'</div>'
      +'<div class="field foodCostOtherLabel"><label>Tên khoản khác (nếu có)</label><input data-plan-key="fixedCostBreakdown.otherLabel" value="'+escAttr(breakdown.otherLabel||'')+'" placeholder="Ví dụ: thuê máy pha, vệ sinh định kỳ"></div>'
      +'<div class="foodCostTotal"><span>Tổng chi phí riêng mỗi tháng</span><b id="foodCostDetailTotal">'+foodFormatVnd(detailTotal)+'</b></div>'
    +'</div>'
    +'<div class="foodCostScopeNote"><b>Để tránh tính trùng:</b> khoản chỉ phục vụ nguồn thu này nhập ở đây. Khoản dùng chung cho nhiều nguồn thu sẽ được nhập một lần ở bước Tổng hợp toàn hồ sơ.</div>'
    +'</div>';
}

function refreshFoodCostMode(){
  const root=$('#unifiedPlanFields');if(!root)return;
  const selected=root.querySelector('[data-plan-choice="foodCostMode"] .choice.selected')?.dataset.value||'quick';
  root.querySelectorAll('[data-food-cost-mode]').forEach(x=>x.classList.toggle('on',x.dataset.foodCostMode===selected));
}

function updateFoodCostTotal(out){
  const el=$('#foodCostDetailTotal');if(!el)return;
  const b=out?.fixedCostBreakdown||{};
  const total=['rent','staff','utilities','marketing','software','other'].reduce((sum,key)=>sum+foodMoneyNumber(b[key]),0);
  el.textContent=foodFormatVnd(total);
}

function foodMoneyNumber(v){const x=Number(String(v??'').replace(/,/g,''));return Number.isFinite(x)?Math.max(0,x):0}
function foodFormatVnd(v){return Math.round(v||0).toLocaleString('vi-VN')+'đ'}
