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
