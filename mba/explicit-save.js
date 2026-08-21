let mbaDirtyScreen=null;
let mbaSaving=false;
let mbaRenameProfileId=null;
let mbaDirtyBaselines={};

(function initExplicitSave(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(typeof askMbaConfirm==='function'&&typeof renderProfileSheet==='function'&&window.__mbaSafeActionsWrapped){
      clearInterval(timer);setupExplicitSave();
    }else if(tries>160){clearInterval(timer);setupExplicitSave()}
  },50);
})();

function setupExplicitSave(){
  if(window.__mbaExplicitSaveReady)return;window.__mbaExplicitSaveReady=true;
  ensureRenameModal();
  applyExplicitSaveCopy();
  captureDirtyBaseline(currentScreenId());
  bindDirtyTracking();
  wrapNavigationGuard();
  wrapExplicitSaveActions();
  wrapProfileRenameUI();
  window.addEventListener('beforeunload',e=>{refreshDirtyState();if(mbaDirtyScreen){e.preventDefault();e.returnValue=''}});
}

function currentScreenId(){return document.querySelector('.screen.on')?.id||''}
function editableScreen(id){return ['newProfile','streamSetup','plan','sharedCosts','planResult'].includes(id)}
function inactiveConditional(el){
  const selectors=['.customArea','.affiliateModeArea','.affiliateEventCustom','.targetForm','.customAllocation'];
  return selectors.some(sel=>{const box=el.closest(sel);return box&&!box.classList.contains('on')});
}
function serializeEditableScreen(id){
  if(!editableScreen(id))return'';
  const screen=$('#'+id);if(!screen)return'';
  const controls=[];
  screen.querySelectorAll('input,textarea,select').forEach((el,index)=>{
    if(inactiveConditional(el))return;
    const key=el.id||el.dataset.planKey||el.name||('control_'+index);
    let value=el.value;
    if(el.type==='checkbox'||el.type==='radio')value=el.checked?'1':'0';
    controls.push([key,String(value??'')]);
  });
  const selections=[];
  screen.querySelectorAll('.choice.selected,[data-allocation].selected,[data-allocation-mode].selected').forEach((el,index)=>{
    if(inactiveConditional(el))return;
    const group=el.closest('[data-choice],[data-multi],[data-plan-choice]');
    const groupKey=group?.dataset.choice||group?.dataset.multi||group?.dataset.planChoice||el.dataset.allocation?'allocation':el.dataset.allocationMode?'allocationMode':('selection_'+index);
    const value=el.dataset.value||el.dataset.allocation||el.dataset.allocationMode||el.textContent.trim();
    selections.push([groupKey,String(value)]);
  });
  return JSON.stringify({controls,selections});
}
function captureDirtyBaseline(id=currentScreenId()){
  if(!editableScreen(id))return;
  mbaDirtyBaselines[id]=serializeEditableScreen(id);
  if(mbaDirtyScreen===id)mbaDirtyScreen=null;
  updateDirtyUI();
}
function refreshDirtyState(id=currentScreenId()){
  if(mbaSaving||!editableScreen(id)){if(mbaDirtyScreen===id){mbaDirtyScreen=null;updateDirtyUI()}return false}
  const current=serializeEditableScreen(id);
  if(!(id in mbaDirtyBaselines)){mbaDirtyBaselines[id]=current;mbaDirtyScreen=null;updateDirtyUI();return false}
  const changed=current!==mbaDirtyBaselines[id];
  mbaDirtyScreen=changed?id:null;
  updateDirtyUI();
  return changed;
}
function markDirty(){
  const id=currentScreenId();if(!editableScreen(id)||mbaSaving)return;
  if(id==='planResult'&&!$('#targetForm')?.classList.contains('on'))return;
  setTimeout(()=>refreshDirtyState(id),0);
}
function clearDirty({capture=true}={}){
  mbaDirtyScreen=null;
  if(capture)captureDirtyBaseline(currentScreenId());
  else updateDirtyUI();
}
function updateDirtyUI(){
  document.querySelectorAll('.explicitSaveNotice').forEach(x=>x.classList.remove('on'));
  if(mbaDirtyScreen){const screen=$('#'+mbaDirtyScreen);let notice=screen?.querySelector('.explicitSaveNotice');if(!notice&&screen){const actions=screen.querySelector('.actions');if(actions){notice=document.createElement('div');notice.className='explicitSaveNotice';notice.textContent='Có thay đổi chưa lưu. Chỉ khi bạn bấm Lưu thì dữ liệu mới được ghi trên thiết bị.';actions.insertAdjacentElement('beforebegin',notice)}}notice?.classList.add('on')}
}
function bindDirtyTracking(){
  document.addEventListener('input',e=>{if(e.target.matches('input,textarea,select'))markDirty()},true);
  document.addEventListener('click',e=>{
    if(e.target.closest('.choice,[data-allocation],[data-allocation-mode],.removeOther'))markDirty();
    if(e.target.closest('button[onclick*="addOtherSharedRow"]'))markDirty();
  },true);
}
async function confirmDiscard(){
  refreshDirtyState();
  if(!mbaDirtyScreen||mbaSaving)return true;
  const promise=askMbaConfirm({title:'Bỏ thay đổi chưa lưu?',message:'Bạn đang có thay đổi chưa được lưu trên màn hình này.',detail:'Nếu rời đi, các dữ liệu đã lưu trước đó vẫn được giữ nguyên, còn phần bạn vừa sửa sẽ bị bỏ.',confirmText:'Bỏ thay đổi',danger:true});
  const cancel=$('#mbaConfirmCancel');if(cancel)cancel.textContent='Ở lại';
  const ok=await promise;
  if(cancel)cancel.textContent='Không, quay lại';
  if(ok)clearDirty({capture:false});
  return ok;
}
function wrapNavigationGuard(){
  const previousGo=go;
  go=function(id){
    const from=currentScreenId();refreshDirtyState(from);
    if(mbaDirtyScreen&&from!==id&&!mbaSaving){confirmDiscard().then(ok=>{if(ok){previousGo(id);applyExplicitSaveCopy();setTimeout(()=>captureDirtyBaseline(id),0)}});return}
    previousGo(id);if(from!==id&&!mbaSaving)mbaDirtyScreen=null;applyExplicitSaveCopy();setTimeout(()=>captureDirtyBaseline(id),0);
  };

  const previousNewProfile=newProfile;
  newProfile=function(){refreshDirtyState();if(mbaDirtyScreen&&!mbaSaving){confirmDiscard().then(ok=>{if(ok)previousNewProfile()});return}previousNewProfile()};

  const previousOpenProfile=openProfile;
  openProfile=function(id){refreshDirtyState();if(mbaDirtyScreen&&!mbaSaving){confirmDiscard().then(ok=>{if(ok)previousOpenProfile(id)});return}previousOpenProfile(id)};

  if(typeof profileSwitchTo==='function'){
    const previousSwitch=profileSwitchTo;
    profileSwitchTo=function(id){refreshDirtyState();if(mbaDirtyScreen&&!mbaSaving){confirmDiscard().then(ok=>{if(ok)previousSwitch(id)});return}previousSwitch(id)};
  }
}
function wrapExplicitSaveActions(){
  continueToFirstSource=function(){
    const name=$('#newProfileName')?.value.trim();if(!name){toast('Nhập tên việc kinh doanh / dự án trước khi lưu.');$('#newProfileName')?.focus();return}
    mbaSaving=true;
    const p={id:uid('profile'),name,status:'draft',currency:'VND',createdAt:now(),updatedAt:now(),sharedCosts:[],streams:[],timeContext:{planningPeriod:'month',viewPeriod:'month',actualRange:null}};
    state.profiles.push(p);state.currentProfileId=p.id;draftName=name;persist();mbaDirtyScreen=null;mbaSaving=false;go('modelRouter');toast('Đã lưu Hồ sơ kinh doanh trên thiết bị.')
  };

  const previousSaveStream=saveStream;
  saveStream=async function(){
    mbaSaving=true;const before=currentScreenId();
    try{await Promise.resolve(previousSaveStream())}finally{mbaSaving=false;if(currentScreenId()!==before){mbaDirtyScreen=null}else{captureDirtyBaseline(before)}applyExplicitSaveCopy()}
  };

  const previousCalculatePlan=calculatePlan;
  calculatePlan=async function(){
    const p=currentProfile(),backup=p?.businessPlan?JSON.parse(JSON.stringify(p.businessPlan)):null;mbaSaving=true;const before=currentScreenId();
    try{await Promise.resolve(previousCalculatePlan())}finally{
      mbaSaving=false;
      if(currentScreenId()!==before)mbaDirtyScreen=null;else captureDirtyBaseline(before);
      if(p&&backup&&!p.businessPlan){p.businessPlan=backup;persist()}
      applyExplicitSaveCopy();
    }
  };

  const previousCalculateBusiness=calculateBusiness;
  calculateBusiness=async function(){mbaSaving=true;const before=currentScreenId();try{await Promise.resolve(previousCalculateBusiness())}finally{mbaSaving=false;if(currentScreenId()!==before)mbaDirtyScreen=null;else captureDirtyBaseline(before);applyExplicitSaveCopy()}};

  if(typeof calculateProfitTarget==='function'){
    const previousTarget=calculateProfitTarget;
    calculateProfitTarget=async function(){const beforeValue=parseMoney($('#targetProfitInput')?.value);mbaSaving=true;try{await Promise.resolve(previousTarget())}finally{mbaSaving=false;const s=currentStream();if(beforeValue>0&&Number(s?.planning?.targetProfit||0)===beforeValue)captureDirtyBaseline('planResult');applyExplicitSaveCopy()}};
  }
}
function applyExplicitSaveCopy(){
  const saveState=$('#builder .saveState');if(saveState){saveState.textContent='✓ Đã lưu trên thiết bị';saveState.classList.add('manualSaved')}
  const newProfileBtn=$('#newProfile .actions .btn:not(.secondary)');if(newProfileBtn)newProfileBtn.textContent='Lưu hồ sơ & tiếp tục';
  const streamBtn=$('#streamSetup .actions .btn:not(.secondary)');if(streamBtn)streamBtn.textContent=editingStreamId?'Lưu thay đổi':'Lưu nguồn thu';
  const planBtn=$('#calculateBtn');if(planBtn&&planBtn.textContent!=='Đang tính...')planBtn.textContent='Lưu & xem kết quả';
  const businessBtn=$('#businessCalculateBtn');if(businessBtn&&businessBtn.textContent!=='Đang tổng hợp...')businessBtn.textContent='Lưu & xem kết quả toàn hồ sơ';
  const targetBtn=$('#targetCalcBtn');if(targetBtn&&targetBtn.textContent!=='Đang tính...')targetBtn.textContent='Lưu mục tiêu & tính';
  const resultText=$('#planResult .head p');if(resultText)resultText.textContent='Kết quả này đã được lưu trên thiết bị.';
  const helper=$('#newProfile .hint');if(helper)helper.textContent='Tên hồ sơ chỉ được lưu khi bạn bấm “Lưu hồ sơ & tiếp tục”.';
}

function wrapProfileRenameUI(){
  const previousRenderProfiles=renderProfiles;
  renderProfiles=function(){previousRenderProfiles();injectRenameButtons()};
  injectRenameButtons();

  const previousSheet=renderProfileSheet;
  renderProfileSheet=function(){previousSheet();const p=currentProfile();if(!p)return;const actions=$('#profileSheet .profileSheetActions');if(actions&&!actions.querySelector('.profileRenameBtn')){const b=document.createElement('button');b.type='button';b.className='btn secondary profileRenameBtn';b.textContent='Đổi tên hồ sơ';b.onclick=()=>openRenameProfile(p.id);actions.appendChild(b)}};
}
function injectRenameButtons(){
  const sorted=state.profiles.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  $$('#profileList .profileCard').forEach((card,i)=>{const p=sorted[i],actions=card.querySelector('.actions');if(!p||!actions||actions.querySelector('.profileRenameBtn'))return;const btn=document.createElement('button');btn.type='button';btn.className='btn secondary profileRenameBtn';btn.textContent='Đổi tên';btn.onclick=()=>openRenameProfile(p.id);const danger=actions.querySelector('.danger');if(danger)actions.insertBefore(btn,danger);else actions.appendChild(btn)})
}
function ensureRenameModal(){
  if($('#mbaRenameModal'))return;
  const backdrop=document.createElement('div');backdrop.id='mbaRenameBackdrop';backdrop.className='renameBackdrop';backdrop.onclick=closeRenameProfile;
  const modal=document.createElement('div');modal.id='mbaRenameModal';modal.className='renameModal';modal.innerHTML='<h2>Đổi tên Hồ sơ kinh doanh</h2><p>Tên mới chỉ được lưu khi bạn bấm “Lưu tên mới”.</p><div class="field"><label>Tên Hồ sơ kinh doanh</label><input id="mbaRenameInput" maxlength="120"></div><div class="renameActions"><button class="btn secondary" type="button" id="mbaRenameCancel">Hủy</button><button class="btn" type="button" id="mbaRenameSave">Lưu tên mới</button></div>';
  document.body.append(backdrop,modal);$('#mbaRenameCancel').onclick=closeRenameProfile;$('#mbaRenameSave').onclick=saveRenameProfile;$('#mbaRenameInput').addEventListener('keydown',e=>{if(e.key==='Enter')saveRenameProfile()});
}
function openRenameProfile(id){const p=state.profiles.find(x=>x.id===id);if(!p)return;closeProfileSheet?.();mbaRenameProfileId=id;$('#mbaRenameInput').value=p.name;$('#mbaRenameBackdrop').classList.add('on');$('#mbaRenameModal').classList.add('on');document.body.classList.add('renameOpen');setTimeout(()=>{$('#mbaRenameInput').focus();$('#mbaRenameInput').select()},60)}
function closeRenameProfile(){mbaRenameProfileId=null;$('#mbaRenameBackdrop')?.classList.remove('on');$('#mbaRenameModal')?.classList.remove('on');document.body.classList.remove('renameOpen')}
function saveRenameProfile(){const p=state.profiles.find(x=>x.id===mbaRenameProfileId),name=$('#mbaRenameInput')?.value.trim();if(!p)return closeRenameProfile();if(!name){toast('Tên hồ sơ không được để trống.');return}if(name===p.name){closeRenameProfile();return}p.name=name;p.updatedAt=now();persist();closeRenameProfile();renderProfiles();renderBuilder?.();renderProfilePill?.();toast('Đã lưu tên Hồ sơ kinh doanh.')}
