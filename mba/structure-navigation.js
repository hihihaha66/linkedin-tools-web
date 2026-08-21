let mbaStructureHistory=[];

(function initStructureNavigation(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ready=typeof editSource==='function'&&typeof addSource==='function'&&typeof selectModel==='function'&&typeof renderStreamSetup==='function'&&typeof go==='function';
    if(ready){clearInterval(timer);setupStructureNavigation()}
    else if(tries>160){clearInterval(timer);setupStructureNavigation()}
  },50);
})();

function setupStructureNavigation(){
  if(window.__mbaStructureNavigationReady)return;window.__mbaStructureNavigationReady=true;

  const originalEditSource=editSource;
  editSource=function(id){
    mbaStructureHistory=[currentScreenIdSafe()||'builder'];
    originalEditSource(id);
  };

  const originalAddSource=addSource;
  addSource=function(){
    mbaStructureHistory=[currentScreenIdSafe()||'builder'];
    originalAddSource();
  };

  const originalSelectModel=selectModel;
  selectModel=function(model){
    pushStructureScreen(currentScreenIdSafe()||'modelRouter');
    originalSelectModel(model);
  };

  if(typeof continueToFirstSource==='function'){
    const originalContinue=continueToFirstSource;
    continueToFirstSource=function(){
      const name=$('#newProfileName')?.value.trim();
      if(name)mbaStructureHistory=['newProfile'];
      return originalContinue();
    };
  }

  const originalRenderStreamSetup=renderStreamSetup;
  renderStreamSetup=function(){
    originalRenderStreamSetup();
    installStreamSetupNavigation();
  };

  const originalBackFromRouter=backFromRouter;
  backFromRouter=function(){
    if(mbaStructureHistory.length)return goBackStructure();
    return originalBackFromRouter();
  };

  const originalSaveStream=saveStream;
  saveStream=async function(){
    const before=currentScreenIdSafe();
    const out=await Promise.resolve(originalSaveStream());
    if(before==='streamSetup'&&currentScreenIdSafe()!=='streamSetup')mbaStructureHistory=[];
    return out;
  };

  if(typeof openProfile==='function'){
    const originalOpenProfile=openProfile;
    openProfile=function(id){mbaStructureHistory=[];return originalOpenProfile(id)};
  }

  installStreamSetupNavigation();
}

function currentScreenIdSafe(){
  if(typeof currentScreenId==='function')return currentScreenId();
  return document.querySelector('.screen.on')?.id||'';
}
function pushStructureScreen(id){
  if(!id)return;
  if(mbaStructureHistory[mbaStructureHistory.length-1]!==id)mbaStructureHistory.push(id);
}
async function discardIfNeededForStructure(){
  if(typeof mbaDirtyScreen!=='undefined'&&mbaDirtyScreen&&typeof confirmDiscard==='function')return await confirmDiscard();
  return true;
}
async function goBackStructure(){
  if(!mbaStructureHistory.length){go('builder');return}
  const ok=await discardIfNeededForStructure();if(!ok)return;
  const target=mbaStructureHistory.pop()||'builder';
  go(target);
  if(target==='streamSetup')installStreamSetupNavigation();
}
async function changeEarningMethod(){
  const ok=await discardIfNeededForStructure();if(!ok)return;
  pushStructureScreen('streamSetup');
  go('modelRouter');
}
function installStreamSetupNavigation(){
  const screen=$('#streamSetup');if(!screen)return;
  const actions=screen.querySelector('.actions');if(!actions)return;
  actions.classList.add('streamSetupActions');

  const back=actions.querySelector('.btn.secondary:not(.structureChangeMethodBtn)');
  if(back){
    back.textContent='Quay lại';
    back.removeAttribute('onclick');
    back.onclick=goBackStructure;
  }

  let change=actions.querySelector('.structureChangeMethodBtn');
  if(editingStreamId){
    if(!change){
      change=document.createElement('button');
      change.type='button';change.className='btn secondary structureChangeMethodBtn';
      change.textContent='Đổi cách kiếm tiền';
      const save=actions.querySelector('.btn:not(.secondary)');
      if(save)actions.insertBefore(change,save);else actions.appendChild(change);
    }
    change.onclick=changeEarningMethod;
    actions.classList.add('hasStructureChange');
  }else{
    change?.remove();
    actions.classList.remove('hasStructureChange');
  }
}
