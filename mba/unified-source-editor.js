let mbaUnifiedSource=null;
let mbaUnifiedPreviewTimer=null;

(function initUnifiedSourceEditor(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    const ready=window.__mbaExplicitSaveReady&&window.__mbaStructureNavigationReady&&typeof askMbaConfirm==='function'&&typeof previewRequest==='function'&&typeof planFields==='function'&&typeof MECHANISM_OPTIONS!=='undefined';
    if(ready){clearInterval(timer);setupUnifiedSourceEditor()}
    else if(tries>240){clearInterval(timer);setupUnifiedSourceEditor()}
  },50);
})();

function setupUnifiedSourceEditor(){
  if(window.__mbaUnifiedSourceReady)return;window.__mbaUnifiedSourceReady=true;

  const previousApply=typeof applyExplicitSaveCopy==='function'?applyExplicitSaveCopy:null;
  if(previousApply){
    applyExplicitSaveCopy=function(){previousApply();if(mbaUnifiedSource?.active)applyUnifiedEditorChrome()};
  }

  editSource=function(id){openUnifiedSourceEditor(id)};
  openPlanning=function(id){openUnifiedSourceEditor(id)};

  selectModel=function(model){
    const returnScreen=currentScreenIdSafeUnified()||'modelRouter';
    if(typeof pushStructureScreen==='function')pushStructureScreen(returnScreen);
    editingStreamId=null;planningStreamId=null;
    draftStream={model,config:{}};
    mbaUnifiedSource={active:true,isNew:true,sourceId:null,returnScreen,backup:null,savedPlanInput:{},planDraft:{},savedSchemaKey:'',lastSchemaKey:'',structureWarning:false};
    renderStreamSetup();
    activateUnifiedEditor();
    go('streamSetup');
    setTimeout(()=>{applyUnifiedEditorChrome();if(typeof captureDirtyBaseline==='function')captureDirtyBaseline('streamSetup')},20);
  };

  const sourceList=$('#sourceList');
  if(sourceList){
    new MutationObserver(()=>rewriteUnifiedSourceCards()).observe(sourceList,{childList:true,subtree:true});
  }
  rewriteUnifiedSourceCards();
}

function currentScreenIdSafeUnified(){return typeof currentScreenId==='function'?currentScreenId():(document.querySelector('.screen.on')?.id||'')}
function cloneUnified(v){return JSON.parse(JSON.stringify(v??null))}
function stableUnified(v){return typeof stableJson==='function'?stableJson(v):JSON.stringify(v)}

function rewriteUnifiedSourceCards(){
  const p=currentProfile();if(!p)return;
  $$('#sourceList .sourceCard').forEach((card,i)=>{
    const s=p.streams[i],actions=card.querySelector('.sourceActions');if(!s||!actions)return;
    const has=s.planning?.result?.status==='ok';
    actions.classList.add('unifiedSourceActions');
    actions.innerHTML='<button type="button" class="unifiedUpdateSource" onclick="openUnifiedSourceEditor(\''+s.id+'\')">'+(has?'Cập nhật nguồn thu':'Thiết lập nguồn thu')+'</button><button type="button" class="delete" onclick="deleteSource(\''+s.id+'\')">Xóa nguồn thu</button>';
  });
}

function openUnifiedSourceEditor(id){
  const p=currentProfile(),s=p?.streams.find(x=>x.id===id);if(!s)return;
  const returnScreen=currentScreenIdSafeUnified()||'builder';
  editingStreamId=id;planningStreamId=id;
  draftStream={model:s.model,config:cloneUnified(s.config||{}),name:s.name};
  const savedInput=cloneUnified(s.planning?.input||{})||{};
  mbaUnifiedSource={active:true,isNew:false,sourceId:id,returnScreen,backup:cloneUnified(s),savedPlanInput:savedInput,planDraft:cloneUnified(savedInput),savedSchemaKey:unifiedSchemaKey(s.model,s.config||{}),lastSchemaKey:'',structureWarning:false};
  renderStreamSetup();
  activateUnifiedEditor();
  go('streamSetup');
  setTimeout(()=>{applyUnifiedEditorChrome();if(typeof captureDirtyBaseline==='function')captureDirtyBaseline('streamSetup')},20);
}

function activateUnifiedEditor(){
  const screen=$('#streamSetup');if(!screen||!mbaUnifiedSource)return;
  screen.classList.add('streamSetupUnified');
  $('#streamSetupTitle').textContent=mbaUnifiedSource.isNew?'Thiết lập nguồn thu':'Cập nhật nguồn thu';
  $('#streamSetupText').textContent='Chọn cách nguồn thu tạo tiền, nhập các số cần thiết và xem phép tính ngay trên cùng một màn hình. Dữ liệu chỉ được ghi khi bạn bấm “Lưu & xem kết quả”.';
  $('#planFields').innerHTML='';

  const box=screen.querySelector('.box'),actions=box?.querySelector('.actions');if(!box||!actions)return;
  let section=$('#unifiedPlanSection');
  if(!section){
    section=document.createElement('div');section.id='unifiedPlanSection';section.className='unifiedPlanSection';actions.insertAdjacentElement('beforebegin',section);
  }
  applyUnifiedEditorChrome();
  bindUnifiedStructureEvents();
  fixUnifiedCustomVisibility();
  refreshUnifiedPlanSection(true);
}

function applyUnifiedEditorChrome(){
  if(!mbaUnifiedSource?.active)return;
  const actions=$('#streamSetup .actions');if(!actions)return;
  actions.className='actions unifiedEditorActions';
  actions.innerHTML='<button type="button" class="btn secondary" id="unifiedBackBtn">Quay lại</button><button type="button" class="btn primarySave" id="unifiedSaveBtn">Lưu & xem kết quả</button>';
  $('#unifiedBackBtn').onclick=backFromUnifiedSource;
  $('#unifiedSaveBtn').onclick=saveUnifiedSourceAndView;
}

function backFromUnifiedSource(){
  const target=mbaUnifiedSource?.returnScreen||'builder';
  if(target==='builder')renderBuilder();
  go(target);
}

function bindUnifiedStructureEvents(){
  const root=$('#dynamicFields');if(!root||root.dataset.unifiedBound)return;root.dataset.unifiedBound='1';
  root.addEventListener('click',e=>{
    if(!e.target.closest('.choice'))return;
    setTimeout(()=>{fixUnifiedCustomVisibility();refreshUnifiedPlanSection(false)},30);
  });
  root.addEventListener('input',e=>{
    if(!e.target.matches('input,textarea,select'))return;
    clearTimeout(root._unifiedInputTimer);root._unifiedInputTimer=setTimeout(()=>{fixUnifiedCustomVisibility();refreshUnifiedPlanSection(false)},280);
  });
}

function fixUnifiedCustomVisibility(){
  if(typeof toggleCustom==='function'){
    toggleCustom('mechanismBilling','mechanismBillingCustomWrap');
    toggleCustom('billing','billingCustomWrap');
  }
}

function unifiedSchemaKey(model,c){
  c=c||{};
  if(model==='food')return'model:food|unit:'+(c.unit||'')+'|custom:'+(c.unitCustom||'');
  if(model==='goods')return'model:goods';
  if(model==='service')return'model:service|basis:'+(c.basis||'')+'|custom:'+(c.basisCustom||'');
  if(model==='mmo')return'model:mmo|type:'+(c.type||'')+'|custom:'+(c.typeCustom||'');
  if(model==='digital')return'model:digital';
  if(model==='recurring')return'model:recurring|mechanism:'+(c.revenueMechanism||c.revenueBasis||'')+'|billing:'+(c.billing||'')+'|billingCustom:'+(c.billingCustom||'')+'|unit:'+(c.billingUnit||'')+'|asset:'+(c.assetType||'')+'|time:'+(c.timeUnit||'')+'|usage:'+(c.usageUnit||'')+'|service:'+(c.serviceUnit||'');
  return'model:'+model+'|unit:'+(c.unit||'');
}

function collectUnifiedConfig(){
  try{return collectConfig(draftStream.model)}catch(e){return{}}
}

function refreshUnifiedPlanSection(initial){
  const section=$('#unifiedPlanSection');if(!section||!mbaUnifiedSource)return;
  if(!initial)mbaUnifiedSource.planDraft=readUnifiedPlanInput();
  const config=collectUnifiedConfig();
  const error=validateConfig(draftStream.model,config);
  const schema=unifiedSchemaKey(draftStream.model,config);

  if(!initial&&mbaUnifiedSource.lastSchemaKey&&schema!==mbaUnifiedSource.lastSchemaKey){
    const backToSaved=!mbaUnifiedSource.isNew&&schema===mbaUnifiedSource.savedSchemaKey;
    mbaUnifiedSource.planDraft=backToSaved?cloneUnified(mbaUnifiedSource.savedPlanInput):{};
    mbaUnifiedSource.structureWarning=!backToSaved;
  }
  mbaUnifiedSource.lastSchemaKey=schema;

  if(error){
    section.innerHTML='<div class="unifiedPlanHead"><div class="unifiedPlanNo">02 / SỐ LIỆU</div><h3>Nhập số liệu nguồn thu</h3><p>MBA sẽ mở đúng bộ câu hỏi sau khi bạn hoàn tất phần thiết lập phía trên.</p></div><div class="unifiedPlanWaiting">'+esc(error)+'</div>';
    return;
  }

  const temp={model:draftStream.model,config,name:$('#streamName')?.value.trim()||'Nguồn thu'};
  const warning=mbaUnifiedSource.structureWarning?'<div class="unifiedStructureWarning on">Bạn đã đổi cách MBA tính nguồn thu. Các số liệu của cách tính cũ không được tự mang sang vì có thể khác ý nghĩa. Dữ liệu cũ vẫn được giữ nguyên cho đến khi bạn bấm “Lưu & xem kết quả”.</div>':'';
  section.innerHTML='<div class="unifiedPlanHead"><div class="unifiedPlanNo">02 / SỐ LIỆU</div><h3>Nhập số liệu nguồn thu</h3><p>Các câu hỏi dưới đây thay đổi theo cách tạo tiền bạn vừa chọn.</p></div>'+warning+'<div id="unifiedPlanFields">'+planFields(temp,mbaUnifiedSource.planDraft||{})+'</div><div id="unifiedCalcPreview" class="calcPreview unifiedCalcPreview"><div class="previewTitle">MBA đang tính như thế nào?</div><div id="unifiedPreviewLines"><div class="previewEmpty">Nhập các số ở trên, MBA sẽ cho bạn xem phép tính ngay tại đây.</div></div><div id="unifiedPreviewWarnings"></div></div>';
  bindPlanUI();
  if(typeof enhanceMoneyUnderstanding==='function')enhanceMoneyUnderstanding($('#unifiedPlanFields'));
  bindUnifiedPlanEvents();
  requestUnifiedPreview();
}

function inactiveUnifiedPlanControl(el){
  const checks=['.customArea','.affiliateModeArea','.affiliateEventCustom'];
  return checks.some(sel=>{const box=el.closest(sel);return box&&!box.classList.contains('on')});
}
function readUnifiedPlanInput(){
  const root=$('#unifiedPlanFields');if(!root)return mbaUnifiedSource?.planDraft||{};
  const out={};
  root.querySelectorAll('[data-plan-key]').forEach(el=>{if(!inactiveUnifiedPlanControl(el))setNested(out,el.dataset.planKey,el.value)});
  root.querySelectorAll('[data-plan-choice]').forEach(g=>setNested(out,g.dataset.planChoice,g.querySelector('.choice.selected')?.dataset.value||''));
  const preset=getNested(out,'capacity.realisticPreset');if(preset&&preset!=='custom')setNested(out,'capacity.realisticPct',preset);
  return out;
}

function bindUnifiedPlanEvents(){
  const root=$('#unifiedPlanFields');if(!root)return;
  root.addEventListener('input',()=>{mbaUnifiedSource.planDraft=readUnifiedPlanInput();scheduleUnifiedPreview()});
  root.addEventListener('click',e=>{if(e.target.closest('.choice'))setTimeout(()=>{mbaUnifiedSource.planDraft=readUnifiedPlanInput();scheduleUnifiedPreview()},40)});
}
function scheduleUnifiedPreview(){clearTimeout(mbaUnifiedPreviewTimer);mbaUnifiedPreviewTimer=setTimeout(requestUnifiedPreview,300)}
async function requestUnifiedPreview(){
  const root=$('#unifiedPlanFields'),lines=$('#unifiedPreviewLines'),warnings=$('#unifiedPreviewWarnings');if(!root||!lines)return;
  const config=collectUnifiedConfig();if(validateConfig(draftStream.model,config))return;
  const input=readUnifiedPlanInput();mbaUnifiedSource.planDraft=cloneUnified(input);
  const stream={model:draftStream.model,config,name:$('#streamName')?.value.trim()||'Nguồn thu'};
  try{
    const data=await previewRequest(stream,input);
    if(typeof renderPreviewBox==='function')renderPreviewBox(data,lines,warnings);
    else{const arr=data?.preview?.lines||[];lines.innerHTML=arr.length?arr.map(x=>'<div class="previewLine">'+esc(x)+'</div>').join(''):'<div class="previewEmpty">Nhập thêm số để xem phép tính.</div>'}
  }catch(e){lines.innerHTML='<div class="previewEmpty">Chưa tải được phép tính thử. Bạn vẫn có thể lưu khi đã nhập đủ số liệu.</div>';if(warnings)warnings.innerHTML=''}
}

const _unifiedOriginalReadPlanInput=typeof readPlanInput==='function'?readPlanInput:null;
if(_unifiedOriginalReadPlanInput){
  readPlanInput=function(){
    if(mbaUnifiedSource?.active&&currentScreenIdSafeUnified()==='streamSetup'&&$('#unifiedPlanFields'))return readUnifiedPlanInput();
    return _unifiedOriginalReadPlanInput();
  };
}

async function saveUnifiedSourceAndView(){
  if(!mbaUnifiedSource)return;
  const p=currentProfile();if(!p)return;
  const name=$('#streamName')?.value.trim();if(!name){toast('Nhập tên nguồn thu.');$('#streamName')?.focus();return}
  const config=collectUnifiedConfig(),error=validateConfig(draftStream.model,config);if(error){toast(error);return}
  if(!$('#unifiedPlanFields')){toast('Hoàn tất phần thiết lập nguồn thu trước khi lưu.');return}
  const input=readUnifiedPlanInput();mbaUnifiedSource.planDraft=cloneUnified(input);

  const existing=mbaUnifiedSource.sourceId?p.streams.find(x=>x.id===mbaUnifiedSource.sourceId):null;
  const structureChanged=existing&&(name!==existing.name||stableUnified(config)!==stableUnified(existing.config||{}));
  if(structureChanged){
    const ok=await askMbaConfirm({title:'Lưu thay đổi nguồn thu?',message:'Bạn đang thay đổi cách thiết lập nguồn thu “'+existing.name+'”.',detail:existing.planning?.result?.status==='ok'?'MBA sẽ tính lại kết quả bằng cách thiết lập mới. Số liệu không còn phù hợp với cách tính cũ sẽ không được giữ lại.':'Thiết lập cũ chỉ được thay sau khi phép tính mới thành công.',confirmText:'Lưu và tính lại'});
    if(!ok)return;
  }

  const businessBackup=cloneUnified(p.businessPlan);
  const existingIndex=existing?p.streams.findIndex(x=>x.id===existing.id):-1;
  const streamBackup=existing?cloneUnified(existing):null;
  let sourceId=existing?.id||uid('stream');
  const temp={id:sourceId,name,model:draftStream.model,config:cloneUnified(config),status:'structured',planning:structureChanged?null:(existing?.planning||null),createdAt:existing?.createdAt||now(),updatedAt:now()};
  if(existingIndex>=0)p.streams[existingIndex]=temp;else p.streams.push(temp);
  planningStreamId=sourceId;editingStreamId=sourceId;draftStream={model:temp.model,config:cloneUnified(config),name};

  const saveBtn=$('#unifiedSaveBtn');if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Đang tính...'}
  try{
    await Promise.resolve(calculatePlan());
    const success=currentScreenIdSafeUnified()==='planResult'&&currentProfile()?.streams.find(x=>x.id===sourceId)?.planning?.result?.status==='ok';
    if(success){
      const saved=currentProfile().streams.find(x=>x.id===sourceId);if(saved){saved.name=name;saved.config=cloneUnified(config);saved.updatedAt=now()}
      currentProfile().businessPlan=null;currentProfile().updatedAt=now();persist();
      mbaUnifiedSource.active=false;toast('Đã lưu nguồn thu và kết quả trên thiết bị.');return;
    }
    if(existingIndex>=0)p.streams[existingIndex]=streamBackup;else p.streams=p.streams.filter(x=>x.id!==sourceId);
    p.businessPlan=businessBackup;
  }catch(e){
    if(existingIndex>=0)p.streams[existingIndex]=streamBackup;else p.streams=p.streams.filter(x=>x.id!==sourceId);
    p.businessPlan=businessBackup;toast('Chưa thể lưu nguồn thu. Hãy kiểm tra lại số liệu và thử lại.');
  }finally{
    if(saveBtn&&currentScreenIdSafeUnified()==='streamSetup'){saveBtn.disabled=false;saveBtn.textContent='Lưu & xem kết quả'}
  }
}
