const MBA_TIME_LABELS={day:'Ngày',week:'Tuần',month:'Tháng',quarter:'Quý',year:'Năm'};

(function initTimeContext(){
  let changed=false;
  state.profiles.forEach(p=>{if(ensureProfileTimeContext(p))changed=true});
  if(changed)persist();

  const previousGo=go;
  go=function(id){previousGo(id);renderTimeContextForScreen(id)};

  const previousOpenProfile=openProfile;
  openProfile=function(id){previousOpenProfile(id);const p=currentProfile();if(p&&ensureProfileTimeContext(p))persist();renderTimeContextForScreen('builder')};

  const previousSaveStream=saveStream;
  saveStream=function(){previousSaveStream();const p=currentProfile();if(p&&ensureProfileTimeContext(p))persist()};

  waitForProfileSheet();
})();

function ensureProfileTimeContext(p){
  if(!p)return false;let changed=false;
  if(!p.timeContext){p.timeContext={planningPeriod:'month',viewPeriod:'month',actualRange:null};changed=true}
  if(!p.timeContext.planningPeriod){p.timeContext.planningPeriod='month';changed=true}
  if(!p.timeContext.viewPeriod){p.timeContext.viewPeriod='month';changed=true}
  if(!('actualRange' in p.timeContext)){p.timeContext.actualRange=null;changed=true}
  return changed;
}
function planningPeriodLabel(){const p=currentProfile();if(!p)return'Tháng';ensureProfileTimeContext(p);return MBA_TIME_LABELS[p.timeContext.planningPeriod]||'Tháng'}
function viewPeriodLabel(){const p=currentProfile();if(!p)return'Tháng';ensureProfileTimeContext(p);return MBA_TIME_LABELS[p.timeContext.viewPeriod]||'Tháng'}
function renderTimeContextForScreen(id){
  const p=currentProfile();if(!p)return;ensureProfileTimeContext(p);
  if(!['plan','planResult','sharedCosts','businessResult','builder'].includes(id))return;
  const screen=$('#'+id);if(!screen)return;
  let anchor=screen.querySelector('.head')||screen.querySelector('.profileBar');if(!anchor)return;
  let bar=screen.querySelector('.timeContextBar');
  if(!bar){bar=document.createElement('div');bar.className='timeContextBar';anchor.insertAdjacentElement('afterend',bar)}
  bar.innerHTML='<div class="timeContextMain"><span class="timeContextLabel">Kỳ kế hoạch</span><span class="timeContextValue">'+esc(planningPeriodLabel())+'</span></div><div class="timeContextHint">Các nguồn thu trong cùng hồ sơ đang được chuẩn hóa về cùng một kỳ.</div>';
}
function waitForProfileSheet(){
  let tries=0;const timer=setInterval(()=>{
    tries++;
    if(typeof renderProfileSheet==='function'){
      clearInterval(timer);wrapProfileSheetTimeContext();
    }else if(tries>80)clearInterval(timer);
  },50);
}
function wrapProfileSheetTimeContext(){
  if(renderProfileSheet._timeWrapped)return;
  const previous=renderProfileSheet;
  renderProfileSheet=function(){previous();appendTimeContextToProfileSheet()};
  renderProfileSheet._timeWrapped=true;
}
function appendTimeContextToProfileSheet(){
  const p=currentProfile(),host=$('#profileSheetBody');if(!p||!host)return;ensureProfileTimeContext(p);
  host.querySelector('.timeContextSheet')?.remove();
  const block=document.createElement('div');block.className='timeContextSheet';
  block.innerHTML='<div class="timeContextSheetTitle">Thời gian</div><div class="timeContextRow"><span>Kỳ kế hoạch chuẩn</span><b>'+esc(planningPeriodLabel())+'</b></div><div class="timeContextRow"><span>Kỳ xem kế hoạch</span><b>'+esc(viewPeriodLabel())+'</b></div><div class="timeContextRow"><span>Khoảng thời gian thực tế</span><b>'+(p.timeContext.actualRange?'Đã thiết lập':'Chưa có dữ liệu thực tế')+'</b></div><div class="timeContextExplain">MBA đang dùng tháng làm kỳ chuẩn để các nguồn thu có thể cộng và so sánh với nhau. Khi có dữ liệu thực tế, khoảng thời gian xem sẽ được tách riêng khỏi kỳ kế hoạch.</div>';
  host.appendChild(block);
}
