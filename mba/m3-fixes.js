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
