let profileSheetLastFocus=null;

(function initProfileSwitcher(){
  const pill=$('#profilePill');
  if(pill){pill.onclick=openProfileSheet;pill.setAttribute('aria-haspopup','dialog');pill.setAttribute('aria-expanded','false')}
  ensureProfileSheet();
  const previousSyncHeader=syncHeader;
  syncHeader=function(){previousSyncHeader();renderProfilePill()};
  renderProfilePill();
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeProfileSheet()});
})();

function renderProfilePill(){
  const pill=$('#profilePill');if(!pill)return;
  const p=currentProfile();
  if(!p){
    pill.innerHTML='<span class="profilePrefix">Hồ sơ</span><span class="profileChevron">⌄</span>';
    pill.title='Chọn Hồ sơ kinh doanh';
    return;
  }
  pill.innerHTML='<span class="profilePrefix">Hồ sơ ·</span><span class="profileName">'+esc(p.name)+'</span><span class="profileChevron">⌄</span>';
  pill.title='Hồ sơ đang dùng: '+p.name;
}
function ensureProfileSheet(){
  if($('#profileSheet'))return;
  const backdrop=document.createElement('div');backdrop.id='profileSheetBackdrop';backdrop.className='profileSheetBackdrop';backdrop.onclick=closeProfileSheet;
  const sheet=document.createElement('div');sheet.id='profileSheet';sheet.className='profileSheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','profileSheetTitle');
  sheet.innerHTML='<div class="profileSheetHandle"></div><div class="profileSheetHead"><div><div class="eyebrow">Hồ sơ</div><h2 id="profileSheetTitle">Hồ sơ kinh doanh</h2></div><button class="profileSheetClose" type="button" aria-label="Đóng" onclick="closeProfileSheet()">×</button></div><div id="profileSheetBody"></div>';
  document.body.append(backdrop,sheet);
}
function openProfileSheet(){
  ensureProfileSheet();renderProfileSheet();profileSheetLastFocus=document.activeElement;
  $('#profileSheetBackdrop').classList.add('on');$('#profileSheet').classList.add('on');document.body.classList.add('profileSheetOpen');$('#profilePill')?.setAttribute('aria-expanded','true');
  setTimeout(()=>$('#profileSheet .profileSheetClose')?.focus(),80);
}
function closeProfileSheet(){
  $('#profileSheetBackdrop')?.classList.remove('on');$('#profileSheet')?.classList.remove('on');document.body.classList.remove('profileSheetOpen');$('#profilePill')?.setAttribute('aria-expanded','false');
  if(profileSheetLastFocus&&document.contains(profileSheetLastFocus))profileSheetLastFocus.focus();
}
function renderProfileSheet(){
  const host=$('#profileSheetBody');if(!host)return;
  const p=currentProfile();
  if(!p){
    host.innerHTML='<div class="profileSheetEmpty" style="margin-top:15px">Bạn chưa có Hồ sơ kinh doanh nào đang được chọn.</div><div class="profileSheetFooter"><button class="btn" type="button" onclick="profileCreateNew()">+ Tạo hồ sơ mới</button><button class="btn secondary" type="button" onclick="profileManageAll()">Quản lý hồ sơ</button></div>';
    return;
  }
  const planned=p.streams.filter(s=>s.planning?.result?.status==='ok').length,total=p.streams.length,hasBusiness=p.businessPlan?.result?.status==='ok';
  let statusText='',statusClass='';
  if(hasBusiness)statusText='Kết quả toàn hồ sơ đã cập nhật';
  else if(total>0&&planned===total)statusText='Đã đủ Kế hoạch nhanh - sẵn sàng tổng hợp';
  else{statusText=(total-planned)+' nguồn chưa có Kế hoạch nhanh';statusClass=' pending'}
  const others=state.profiles.filter(x=>x.id!==p.id);
  host.innerHTML='<div class="profileCurrent"><div class="currentLabel">Hồ sơ đang dùng</div><h3>'+esc(p.name)+'</h3><div class="profileCurrentMeta">'+total+' nguồn thu · '+planned+'/'+total+' nguồn đã có Kế hoạch nhanh</div><div class="profileStatus'+statusClass+'">'+esc(statusText)+'</div><div class="profileSheetActions"><button class="btn" type="button" onclick="profileContinueCurrent()">Tiếp tục hồ sơ này</button>'+(hasBusiness?'<button class="btn secondary" type="button" onclick="profileViewBusinessResult()">Xem kết quả toàn hồ sơ</button>':'<button class="btn secondary" type="button" onclick="profileGoToSummary()">'+(planned===total&&total>0?'Tổng hợp toàn hồ sơ':'Xem các nguồn thu')+'</button>')+'</div></div>'+(others.length?'<div class="profileSheetSection"><div class="profileSheetSectionTitle">Đổi sang hồ sơ khác</div><div class="profileSwitchList">'+others.map(x=>profileSwitchItem(x)).join('')+'</div></div>':'')+'<div class="profileSheetFooter"><button class="btn secondary" type="button" onclick="profileCreateNew()">+ Tạo hồ sơ mới</button><button class="btn secondary" type="button" onclick="profileManageAll()">Quản lý hồ sơ</button></div>';
}
function profileSwitchItem(p){
  const planned=p.streams.filter(s=>s.planning?.result?.status==='ok').length;
  return '<button class="profileSwitchItem" type="button" onclick="profileSwitchTo(\''+p.id+'\')"><div><strong>'+esc(p.name)+'</strong><span>'+p.streams.length+' nguồn thu · '+planned+'/'+p.streams.length+' đã có Kế hoạch nhanh</span></div><div class="profileSwitchArrow">›</div></button>';
}
function profileContinueCurrent(){closeProfileSheet();renderBuilder();go('builder')}
function profileGoToSummary(){const p=currentProfile();closeProfileSheet();if(!p)return;if(p.streams.length&&p.streams.every(s=>s.planning?.result?.status==='ok'))openM3();else{renderBuilder();go('builder')}}
function profileViewBusinessResult(){const p=currentProfile();if(!p?.businessPlan?.result)return;closeProfileSheet();renderBusinessResult(p.businessPlan.result);go('businessResult')}
function profileSwitchTo(id){state.currentProfileId=id;persist();closeProfileSheet();renderBuilder();go('builder')}
function profileCreateNew(){closeProfileSheet();newProfile()}
function profileManageAll(){closeProfileSheet();openProfiles()}
