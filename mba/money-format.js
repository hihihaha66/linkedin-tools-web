(function initMoneyFormat(){
  function formatMoneyInput(el){
    if(!el||!el.classList?.contains('money'))return;
    const digits=String(el.value||'').replace(/\D/g,'');
    if(!digits){if(el.value)el.value='';return}
    const num=Number(digits);if(Number.isFinite(num))el.value=num.toLocaleString('en-US');
  }
  function bind(el){
    if(!el||!el.classList?.contains('money'))return;
    formatMoneyInput(el);
    if(el.dataset.globalMoneyFormatBound)return;
    el.dataset.globalMoneyFormatBound='1';
    el.addEventListener('input',()=>formatMoneyInput(el));
    el.addEventListener('focus',()=>formatMoneyInput(el));
    el.addEventListener('blur',()=>formatMoneyInput(el));
  }
  function scan(root=document){
    if(root.matches?.('input.money'))bind(root);
    root.querySelectorAll?.('input.money').forEach(bind);
  }
  scan(document);
  const observer=new MutationObserver(mutations=>mutations.forEach(m=>m.addedNodes.forEach(node=>{if(node.nodeType===1)scan(node)})));
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('focusin',e=>{if(e.target.matches?.('input.money'))bind(e.target)},true);
})();
