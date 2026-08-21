const _m3RenderSharedCosts=renderSharedCosts;
renderSharedCosts=function(){
  const p=currentProfile();
  const a=p?.businessPlan?.allocation;
  let originalMethod=null;
  if(a && (a.method==='custom_percent'||a.method==='custom_amount')){
    originalMethod=a.method;
    a.method='custom';
    a.customMode=originalMethod==='custom_amount'?'amount':'percent';
  }
  _m3RenderSharedCosts();
  if(a && originalMethod) a.method=originalMethod;
};

const _m3OpenPlanning=openPlanning;
openPlanning=function(id){
  _m3OpenPlanning(id);
  const p=currentProfile();
  if(!p || p.streams.length<2) return;
  document.querySelectorAll('#planFields .field label').forEach(label=>{
    const text=label.textContent.trim();
    if(text==='Tổng chi phí hàng tháng' || text==='Chi phí cố định mỗi tháng'){
      label.textContent='Chi phí hàng tháng riêng của nguồn này';
      const field=label.closest('.field');
      if(field && !field.querySelector('[data-shared-cost-hint]')){
        const hint=document.createElement('div');
        hint.className='hint';
        hint.dataset.sharedCostHint='1';
        hint.textContent='Không nhập các khoản dùng chung cho nhiều nguồn ở đây. MBA sẽ hỏi một lần ở bước tổng hợp để tránh tính trùng.';
        field.appendChild(hint);
      }
    }
  });
};

(function loadMbaUxUpgrade(){
  if(!document.querySelector('link[data-mba-ux]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='m2-ux.css';link.dataset.mbaUx='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-mba-ux]')){
    const script=document.createElement('script');
    script.src='m2-ux.js';script.dataset.mbaUx='1';
    document.body.appendChild(script);
  }
})();

(function loadBusinessProfileSwitcher(){
  if(!document.querySelector('link[data-profile-switcher]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='profile-switcher.css';link.dataset.profileSwitcher='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-profile-switcher]')){
    const script=document.createElement('script');
    script.src='profile-switcher.js';script.dataset.profileSwitcher='1';
    document.body.appendChild(script);
  }
})();

(function loadProductCopyCleanup(){
  if(!document.querySelector('script[data-product-copy]')){
    const script=document.createElement('script');
    script.src='product-copy.js';script.dataset.productCopy='1';
    document.body.appendChild(script);
  }
})();

(function loadTimeContext(){
  if(!document.querySelector('link[data-time-context]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='time-context.css';link.dataset.timeContext='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-time-context]')){
    const script=document.createElement('script');
    script.src='time-context.js';script.dataset.timeContext='1';
    document.body.appendChild(script);
  }
})();

(function loadAffiliateV2(){
  if(!document.querySelector('link[data-affiliate-v2]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='affiliate-v2.css';link.dataset.affiliateV2='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-affiliate-v2]')){
    const script=document.createElement('script');
    script.src='affiliate-v2.js';script.dataset.affiliateV2='1';
    document.body.appendChild(script);
  }
})();

(function loadSafeSourceActions(){
  if(!document.querySelector('link[data-source-actions]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='source-actions.css';link.dataset.sourceActions='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-source-actions]')){
    const script=document.createElement('script');
    script.src='source-actions.js';script.dataset.sourceActions='1';
    document.body.appendChild(script);
  }
})();

function loadRentalCapacityPeriod(){
  if(!document.querySelector('link[data-rental-capacity-period]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='rental-capacity-period.css';link.dataset.rentalCapacityPeriod='1';
    document.head.appendChild(link);
  }
  if(document.querySelector('script[data-rental-capacity-period]'))return;
  const script=document.createElement('script');
  script.src='rental-capacity-period.js';script.dataset.rentalCapacityPeriod='1';
  document.body.appendChild(script);
}

function loadRevenueMechanismV3(){
  const existing=document.querySelector('script[data-revenue-mechanism-v3]');
  if(existing){
    if(typeof MECHANISM_OPTIONS!=='undefined')loadRentalCapacityPeriod();
    else existing.addEventListener('load',loadRentalCapacityPeriod,{once:true});
    return;
  }
  const script=document.createElement('script');
  script.src='revenue-mechanism-v3.js';script.dataset.revenueMechanismV3='1';
  script.addEventListener('load',loadRentalCapacityPeriod,{once:true});
  document.body.appendChild(script);
}

(function loadRecurringUx(){
  const existing=document.querySelector('script[data-recurring-ux]');
  if(existing){
    if(typeof RECURRING_BASIS_OPTIONS!=='undefined')loadRevenueMechanismV3();
    else existing.addEventListener('load',loadRevenueMechanismV3,{once:true});
    return;
  }
  const script=document.createElement('script');
  script.src='recurring-ux.js';script.dataset.recurringUx='1';
  script.addEventListener('load',loadRevenueMechanismV3,{once:true});
  document.body.appendChild(script);
})();

(function loadExplicitSave(){
  if(!document.querySelector('link[data-explicit-save]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='explicit-save.css';link.dataset.explicitSave='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-explicit-save]')){
    const script=document.createElement('script');
    script.src='explicit-save.js';script.dataset.explicitSave='1';
    document.body.appendChild(script);
  }
})();

(function loadStructureNavigation(){
  if(!document.querySelector('link[data-structure-navigation]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='structure-navigation.css';link.dataset.structureNavigation='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-structure-navigation]')){
    const script=document.createElement('script');
    script.src='structure-navigation.js';script.dataset.structureNavigation='1';
    document.body.appendChild(script);
  }
})();

(function loadMoneyFormatter(){
  if(!document.querySelector('script[data-money-format]')){
    const script=document.createElement('script');
    script.src='money-format.js';script.dataset.moneyFormat='1';
    document.body.appendChild(script);
  }
})();

(function loadSourceCardUx(){
  if(!document.querySelector('script[data-source-card-ux]')){
    const script=document.createElement('script');
    script.src='source-card-ux.js';script.dataset.sourceCardUx='1';
    document.body.appendChild(script);
  }
})();

(function loadUnifiedSourceEditor(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(window.__mbaRentalCapacityReady || tries>240){
      clearInterval(timer);
      if(!document.querySelector('link[data-unified-source-editor]')){
        const link=document.createElement('link');
        link.rel='stylesheet';link.href='unified-source-editor.css';link.dataset.unifiedSourceEditor='1';
        document.head.appendChild(link);
      }
      if(!document.querySelector('script[data-unified-source-editor]')){
        const script=document.createElement('script');
        script.src='unified-source-editor.js';script.dataset.unifiedSourceEditor='1';
        document.body.appendChild(script);
      }
    }
  },50);
})();
