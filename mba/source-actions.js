let mbaConfirmResolve=null;

(function initSafeSourceActions(){
  ensureConfirmModal();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ready=typeof affiliatePlanFields==='function'&&typeof planningPeriodLabel==='function'&&typeof calculateBusiness==='function';
    if(ready){clearInterval(timer);wrapSavedDataActions()}
    else if(tries>120){clearInterval(timer);wrapSavedDataActions()}
  },50);
})();

function ensureConfirmModal(){
  if($('#mbaConfirmModal'))return;
  const backdrop=document.createElement('div');
  backdrop.id='mbaConfirmBackdrop';backdrop.className='confirmBackdrop';
  backdrop.onclick=()=>closeMbaConfirm(false);
  const modal=document.createElement('div');
  modal.id='mbaConfirmModal';modal.className='confirmModal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','mbaConfirmTitle');
  modal.innerHTML='<div class="confirmIcon" id="mbaConfirmIcon">?</div><h2 id="mbaConfirmTitle">Xác nhận thay đổi</h2><p id="mbaConfirmMessage"></p><div id="mbaConfirmDetail" class="confirmDetail hidden"></div><div class="confirmActions"><button type="button" class="btn secondary" id="mbaConfirmCancel">Không, quay lại</button><button type="button" class="btn confirmPrimary" id="mbaConfirmOk">Xác nhận</button></div>';
  document.body.append(backdrop,modal);
  $('#mbaConfirmCancel').onclick=()=>closeMbaConfirm(false);
  $('#mbaConfirmOk').onclick=()=>closeMbaConfirm(true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#mbaConfirmModal')?.classList.contains('on'))closeMbaConfirm(false)});
}
function askMbaConfirm({title='Xác nhận thay đổi',message='',detail='',confirmText='Xác nhận',danger=false}={}){
  ensureConfirmModal();
  if(mbaConfirmResolve)closeMbaConfirm(false);
  $('#mbaConfirmTitle').textContent=title;
  $('#mbaConfirmMessage').textContent=message;
  $('#mbaConfirmOk').textContent=confirmText;
  $('#mbaConfirmIcon').textContent=danger?'!':'✓';
  const detailBox=$('#mbaConfirmDetail');
  detailBox.textContent=detail||'';detailBox.classList.toggle('hidden',!detail);
  $('#mbaConfirmModal').classList.toggle('danger',!!danger);
  $('#mbaConfirmBackdrop').classList.add('on');$('#mbaConfirmModal').classList.add('on');document.body.classList.add('confirmOpen');
  setTimeout(()=>$('#mbaConfirmCancel')?.focus(),60);
  return new Promise(resolve=>{mbaConfirmResolve=resolve});
}
function closeMbaConfirm(answer){
  $('#mbaConfirmBackdrop')?.classList.remove('on');$('#mbaConfirmModal')?.classList.remove('on');document.body.classList.remove('confirmOpen');
  const resolve=mbaConfirmResolve;mbaConfirmResolve=null;if(resolve)resolve(!!answer);
}
function stableJson(v){return JSON.stringify(sortObject(v))}
function sortObject(v){if(Array.isArray(v))return v.map(sortObject);if(v&&typeof v==='object'){return Object.keys(v).sort().reduce((o,k)=>{o[k]=sortObject(v[k]);return o},{})}return v}
function planComparable(v){const x=JSON.parse(JSON.stringify(v||{}));delete x.targetProfit;return x}

function wrapSavedDataActions(){
  if(window.__mbaSafeActionsWrapped)return;window.__mbaSafeActionsWrapped=true;

  const originalSaveStream=saveStream;
  saveStream=async function(){
    if(!editingStreamId)return originalSaveStream();
    const p=currentProfile(),old=p?.streams.find(x=>x.id===editingStreamId);if(!old)return originalSaveStream();
    const newName=$('#streamName')?.value.trim()||'';
    let newConfig={};try{newConfig=collectConfig(draftStream.model)}catch(e){return originalSaveStream()}
    const nameChanged=newName!==old.name;
    const structureChanged=stableJson(newConfig)!==stableJson(old.config||{});
    if(!nameChanged&&!structureChanged)return originalSaveStream();
    const ok=await askMbaConfirm({
      title:'Lưu thay đổi nguồn thu?',
      message:'Bạn đang cập nhật nguồn thu “'+old.name+'”. MBA chỉ thay dữ liệu sau khi bạn xác nhận.',
      detail:structureChanged&&old.planning?.result?.status==='ok'?'Cấu trúc nguồn thu đã thay đổi nên Kế hoạch nhanh cũ sẽ được bỏ để tránh giữ một kết quả tính theo cấu trúc không còn đúng.':'Các thay đổi đã lưu trước đó sẽ được thay bằng nội dung mới.',
      confirmText:'Lưu thay đổi'
    });
    if(!ok)return;
    const sourceId=editingStreamId;
    originalSaveStream();
    if(structureChanged){
      const updated=currentProfile()?.streams.find(x=>x.id===sourceId);
      if(updated){updated.planning=null;updated.updatedAt=now();currentProfile().businessPlan=null;currentProfile().updatedAt=now();persist();renderBuilder()}
    }
  };

  const latestCalculatePlan=calculatePlan;
  calculatePlan=async function(){
    const s=currentStream();if(!s?.planning?.result?.status)return latestCalculatePlan();
    const nextInput=planComparable(readPlanInput()),oldInput=planComparable(s.planning.input||{});
    if(stableJson(nextInput)===stableJson(oldInput))return latestCalculatePlan();
    const ok=await askMbaConfirm({
      title:'Cập nhật Kế hoạch nhanh?',
      message:'Các số liệu mới sẽ thay kết quả đang lưu của nguồn thu “'+s.name+'”.',
      detail:currentProfile()?.businessPlan?.result?.status==='ok'?'Kết quả toàn hồ sơ hiện tại cũng sẽ cần tổng hợp lại sau thay đổi này.':'Bạn có thể sửa lại số liệu sau nếu cần.',
      confirmText:'Cập nhật kết quả'
    });
    if(ok)return latestCalculatePlan();
  };

  const latestCalculateBusiness=calculateBusiness;
  calculateBusiness=async function(){
    const p=currentProfile();if(!p?.businessPlan?.result?.status)return latestCalculateBusiness();
    const newShared=readSharedCosts(),newAllocation=collectAllocation();
    const oldShared=p.businessPlan.sharedCosts||[],oldAllocation=p.businessPlan.allocation||{};
    if(stableJson(newShared)===stableJson(oldShared)&&stableJson(newAllocation)===stableJson(oldAllocation))return latestCalculateBusiness();
    const ok=await askMbaConfirm({
      title:'Cập nhật kết quả toàn hồ sơ?',
      message:'Chi phí dùng chung hoặc cách phân bổ đã thay đổi. Kết quả toàn hồ sơ đang lưu sẽ được tính lại.',
      detail:'Kế hoạch riêng của từng nguồn thu không bị xóa.',
      confirmText:'Tính lại kết quả'
    });
    if(ok)return latestCalculateBusiness();
  };

  deleteSource=async function(id){
    const p=currentProfile(),s=p?.streams.find(x=>x.id===id);if(!p||!s)return;
    const ok=await askMbaConfirm({
      title:'Xóa nguồn thu này?',
      message:'Bạn sắp xóa “'+s.name+'” khỏi Hồ sơ kinh doanh.',
      detail:'Kế hoạch nhanh và kết quả đã lưu của nguồn này cũng sẽ bị xóa. Thao tác này không thể hoàn tác.',
      confirmText:'Xóa nguồn thu',danger:true
    });
    if(!ok)return;
    p.streams=p.streams.filter(x=>x.id!==id);p.status='draft';p.businessPlan=null;p.updatedAt=now();persist();
    if(!p.streams.length){toast('Đã xóa nguồn thu. Hồ sơ hiện chưa có nguồn thu nào.');addSource();return}
    renderBuilder();toast('Đã xóa nguồn thu.')
  };

  deleteProfile=async function(id){
    const p=state.profiles.find(x=>x.id===id);if(!p)return;
    const ok=await askMbaConfirm({
      title:'Xóa Hồ sơ kinh doanh?',
      message:'Bạn sắp xóa toàn bộ hồ sơ “'+p.name+'”.',
      detail:'Tất cả nguồn thu, Kế hoạch nhanh, chi phí dùng chung và kết quả đã lưu trên thiết bị của hồ sơ này sẽ bị xóa. Thao tác này không thể hoàn tác.',
      confirmText:'Xóa hồ sơ',danger:true
    });
    if(!ok)return;
    state.profiles=state.profiles.filter(x=>x.id!==id);if(state.currentProfileId===id)state.currentProfileId=null;persist();renderProfiles();toast('Đã xóa hồ sơ.')
  };
}
