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
