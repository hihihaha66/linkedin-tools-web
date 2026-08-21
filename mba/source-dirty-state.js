(function initSourceDirtyState(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(window.__mbaUnifiedSourceReady&&typeof saveUnifiedSourceAndView==='function'&&typeof askMbaConfirm==='function'){
      clearInterval(timer);setupSourceDirtyState();
    }else if(tries>240)clearInterval(timer);
  },50);
})();

function setupSourceDirtyState(){
  if(window.__mbaSourceDirtyReady)return;window.__mbaSourceDirtyReady=true;
  const originalSave=saveUnifiedSourceAndView;
  const originalChrome=applyUnifiedEditorChrome;

  function snapshot(){
    if(!mbaUnifiedSource?.active)return'';
    let config={};let input={};
    try{config=collectUnifiedConfig()}catch(e){}
    try{input=readUnifiedPlanInput()}catch(e){input=mbaUnifiedSource.planDraft||{}}
    const name=$('#streamName')?.value.trim()||'';
    return dirtyStable({name,config,input});
  }

  function hasSavedResult(){
    if(mbaUnifiedSource?.isNew)return false;
    const p=currentProfile(),s=p?.streams.find(x=>x.id===mbaUnifiedSource?.sourceId);
    return s?.planning?.result?.status==='ok';
  }

  function captureBaseline(force){
    if(!mbaUnifiedSource?.active)return;
    if(mbaUnifiedSource.isNew){mbaUnifiedSource._dirtyBaseline='';mbaUnifiedSource._dirtyReady=true;updateButton();return}
    if(mbaUnifiedSource._dirtyReady&&!force)return;
    mbaUnifiedSource._dirtyBaseline=snapshot();
    mbaUnifiedSource._dirtyReady=true;
    updateButton();
  }

  function isDirty(){
    if(!mbaUnifiedSource?.active)return false;
    if(mbaUnifiedSource.isNew)return true;
    if(!mbaUnifiedSource._dirtyReady)return false;
    return snapshot()!==mbaUnifiedSource._dirtyBaseline;
  }

  function updateButton(){
    const btn=$('#unifiedSaveBtn');if(!btn||!mbaUnifiedSource?.active)return;
    const dirty=isDirty();
    btn.dataset.dirty=dirty?'1':'0';
    btn.textContent=dirty||!hasSavedResult()?'Lưu & xem kết quả':'Xem kết quả';
    btn.onclick=primaryAction;
  }

  async function primaryAction(){
    if(!mbaUnifiedSource?.active)return;
    if(!isDirty()&&hasSavedResult()){
      const p=currentProfile(),s=p?.streams.find(x=>x.id===mbaUnifiedSource.sourceId);if(!s)return;
      planningStreamId=s.id;editingStreamId=s.id;
      renderPlanResult(s,s.planning.result);go('planResult');
      return;
    }

    const p=currentProfile(),existing=mbaUnifiedSource.sourceId?p?.streams.find(x=>x.id===mbaUnifiedSource.sourceId):null;
    if(existing&&isDirty()){
      let config={};try{config=collectUnifiedConfig()}catch(e){}
      const name=$('#streamName')?.value.trim()||'';
      const structureChanged=name!==existing.name||dirtyStable(config)!==dirtyStable(existing.config||{});
      if(!structureChanged){
        const ok=await askMbaConfirm({
          title:'Lưu thay đổi nguồn thu?',
          message:'Bạn đã thay đổi số liệu của nguồn thu “'+existing.name+'”.',
          detail:'MBA sẽ lưu các số mới trên thiết bị và tính lại kết quả. Dữ liệu đã lưu trước đó chỉ được thay sau khi phép tính mới thành công.',
          confirmText:'Lưu & xem kết quả'
        });
        if(!ok)return;
      }
    }
    return originalSave();
  }

  applyUnifiedEditorChrome=function(){
    originalChrome();
    setTimeout(()=>{installWatchers();scheduleBaseline();updateButton()},0);
  };

  function scheduleBaseline(){
    if(!mbaUnifiedSource?.active||mbaUnifiedSource.isNew)return updateButton();
    const token=mbaUnifiedSource;
    setTimeout(()=>{if(mbaUnifiedSource!==token)return;captureBaseline(false)},180);
  }

  function installWatchers(){
    const screen=$('#streamSetup');if(!screen||screen.dataset.dirtyStateBound)return;
    screen.dataset.dirtyStateBound='1';
    screen.addEventListener('input',()=>setTimeout(updateButton,0),true);
    screen.addEventListener('change',()=>setTimeout(updateButton,0),true);
    screen.addEventListener('click',e=>{
      if(e.target.closest('.choice,[data-food-add-cost],[data-food-remove-cost]'))setTimeout(updateButton,70);
    },true);
    new MutationObserver(()=>{
      if(!mbaUnifiedSource?.active)return;
      if(!mbaUnifiedSource._dirtyReady&&!mbaUnifiedSource.isNew)scheduleBaseline();
      setTimeout(updateButton,0);
    }).observe(screen,{childList:true,subtree:true});
  }

  const originalOpen=openUnifiedSourceEditor;
  openUnifiedSourceEditor=function(id){
    originalOpen(id);
    const token=mbaUnifiedSource;if(token){token._dirtyReady=false;token._dirtyBaseline=''}
    setTimeout(()=>{if(mbaUnifiedSource!==token)return;installWatchers();captureBaseline(true);updateButton()},30);
  };

  const originalSelect=selectModel;
  selectModel=function(model){
    originalSelect(model);
    setTimeout(()=>{installWatchers();updateButton()},50);
  };

  installWatchers();
  if(mbaUnifiedSource?.active){setTimeout(()=>{captureBaseline(true);updateButton()},30)}
}

function dirtyStable(value){
  function norm(v){
    if(Array.isArray(v))return v.map(norm);
    if(v&&typeof v==='object')return Object.keys(v).sort().reduce((o,k)=>{const n=norm(v[k]);if(n!==undefined)o[k]=n;return o},{});
    if(typeof v==='string')return v.trim();
    return v;
  }
  return JSON.stringify(norm(value));
}
