from pathlib import Path
import base64,hashlib,re

HTML=Path('net-cao-hon-co-that-tot-hon-v2.html')
SMOKE=Path('tests/v2-turn6-final-smoke.js')
RESP=Path('tests/v2-turn6-responsive.mjs')
s=HTML.read_text(); smoke=SMOKE.read_text(); resp=RESP.read_text()

# CSS for Layer 6 input + result cards.
anchor=".switch-scenario-note{font-size:10.5px;color:var(--ink-soft);line-height:1.45;margin:7px 0 0;padding-top:6px;border-top:1px solid var(--line)}"
css=anchor+".solver-box{margin:22px 0 20px;background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:16px}.solver-head{display:flex;gap:18px;justify-content:space-between;align-items:flex-start}.solver-copy{min-width:0;flex:1}.solver-toggle{width:210px;flex:0 0 210px}.solver-fields{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}.solver-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}.solver-wide{grid-column:1/-1}.solver-goal{border:1px solid var(--line);border-radius:8px;padding:10px;background:var(--paper)}.solver-goal-head{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--ink);font-weight:500}.solver-goal-head input{margin-top:3px;flex:0 0 auto}.solver-goal .sub-input{margin-top:7px}.solver-goal .sub-input[aria-disabled='true']{opacity:.48;pointer-events:none}.solver-note{font-size:11px;line-height:1.5;color:var(--ink-soft);margin:8px 0 0}.solver-layer{margin-top:14px}.solver-result{background:#fff;border-top:1px solid var(--line);padding-top:15px}.solver-result h3{font-family:var(--serif);font-size:20px;margin:0 0 4px}.solver-sub,.solver-foot{font-size:12px;color:var(--ink-soft);line-height:1.5}.solver-hero{background:var(--moss);color:#fff;border-radius:9px;padding:14px 16px;margin:12px 0}.solver-hero span,.solver-hero small{display:block}.solver-hero span{font-size:11px;text-transform:uppercase;letter-spacing:.05em;opacity:.85}.solver-hero strong{display:block;font-family:var(--mono);font-size:21px;line-height:1.25;margin:4px 0}.solver-hero small{font-size:11px;opacity:.9}.solver-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px dotted var(--line);font-size:12.5px}.solver-row .v{font-family:var(--mono);text-align:right;white-space:normal;overflow-wrap:anywhere}.solver-breakdown,.solver-scenarios,.solver-buffer,.solver-annotations,.solver-needs{margin-top:12px;padding:10px 12px;background:var(--paper-2);border-radius:8px}.solver-scenarios p,.solver-buffer p{font-size:10.5px;color:var(--ink-soft);margin:7px 0 0}.solver-premium{font-size:13px}.solver-annotations .ok{color:var(--moss)}.solver-annotations .under{color:var(--clay)}.solver-needs ul{margin:6px 0 0;padding-left:18px;font-size:12px}.solver-foot{margin-top:12px}"
if anchor not in s: raise SystemExit('solver CSS anchor missing')
s=s.replace(anchor,css,1)

# Mobile solver layout.
mobile="@media(max-width:540px){.switch-result{padding:12px}"
mobile_new="@media(max-width:540px){.solver-box{padding:12px;margin:16px 0}.solver-head{display:block}.solver-toggle{width:auto;margin-top:10px}.solver-grid{grid-template-columns:1fr;gap:8px}.solver-wide{grid-column:auto}.solver-result h3{font-size:18px}.solver-hero{padding:12px}.solver-hero strong{font-size:18px}.solver-row{display:grid;grid-template-columns:minmax(0,48%) minmax(0,52%);gap:8px}.solver-row .v{min-width:0}.solver-breakdown,.solver-scenarios,.solver-buffer,.solver-annotations,.solver-needs{padding:9px}.switch-result{padding:12px}"
if mobile not in s: raise SystemExit('mobile solver anchor missing')
s=s.replace(mobile,mobile_new,1)

# Add Layer 6 box outside the main results so it can solve even when template salary is blank.
anchor_html="""<div class="toolbar toolbar-bottom">
"""
layer_html="""<div class="solver-box" id="solverBox">
  <div class="solver-head">
    <div class="solver-copy">
      <p class="eyebrow">Lớp 6</p>
      <h2 class="sec">Offer tối thiểu để đáng chuyển</h2>
      <p class="hint">Giải ngược mức lương cần đạt. Tool dùng điều kiện của một offer làm template, còn mức lương là ẩn số. Baseline công việc hiện tại lấy từ phần “Nếu chuyển việc thì sao?”.</p>
    </div>
    <div class="solver-toggle"><label>Bật Layer 6</label><div class="seg" id="solverEnabledSeg"><button data-v="on">Tính</button><button data-v="off" class="on">Bỏ qua</button></div></div>
  </div>
  <div class="solver-fields" id="solverFields" style="display:none"></div>
  <div class="solver-layer" id="solverLayer" style="display:none"><div id="solverResult"></div></div>
</div>
<div class="toolbar toolbar-bottom">
"""
if anchor_html not in s: raise SystemExit('solver HTML insertion anchor missing')
s=s.replace(anchor_html,layer_html,1)

# Solver state helpers.
anchor_state="function blankSwitch(){return{enabled:true,enabledExplicit:false,targetOffer:\"0\",lastWorkingDate:\"\",currentBonusIfStay:null,currentBonusRule:\"lost\",currentBonusRuleExplicit:false,currentBonusPayDate:\"\",currentBonusIfLeave:null,onboardDate:\"\",newBonusRule:\"unknown\",newBonusCustom:null,currentNet:null}}"
solver_helpers=anchor_state+"\nfunction blankSolver(){return{enabled:false,templateOffer:\"0\",goalNoLoss:true,noLossBuffer:0,goalBreakEven:true,breakEvenMonths:6,goalMonthlyNet:false,targetMonthlyNet:null,goalAnnualFixed:false,targetAnnualFixed:null}}\nfunction ensureSolver(x){const raw=x||{},v=Object.assign(blankSolver(),raw);v.enabled=raw.enabled===true;v.templateOffer=raw.templateOffer===\"1\"?\"1\":\"0\";v.goalNoLoss=raw.goalNoLoss!==false;v.goalBreakEven=raw.goalBreakEven!==false;v.goalMonthlyNet=raw.goalMonthlyNet===true;v.goalAnnualFixed=raw.goalAnnualFixed===true;return v}"
if anchor_state not in s: raise SystemExit('blankSwitch anchor missing')
s=s.replace(anchor_state,solver_helpers,1)

old_state='let state={deps:null,region:"I",sickDays:null,mat:"hide",offers:[blank("Offer A"),blank("Offer B")],switching:blankSwitch()};'
new_state='let state={deps:null,region:"I",sickDays:null,mat:"hide",offers:[blank("Offer A"),blank("Offer B")],switching:blankSwitch(),solver:blankSolver()};'
if old_state not in s: raise SystemExit('initial state anchor missing')
s=s.replace(old_state,new_state,1)

# Normalize imported/saved state.
old_norm='return{deps:d.deps??null,region,sickDays:d.sickDays??null,mat,offers:[ensureOfferShape(d.offers[0],"Offer A"),ensureOfferShape(d.offers[1],"Offer B")],switching:ensureSwitching(d.switching)}}'
new_norm='return{deps:d.deps??null,region,sickDays:d.sickDays??null,mat,offers:[ensureOfferShape(d.offers[0],"Offer A"),ensureOfferShape(d.offers[1],"Offer B")],switching:ensureSwitching(d.switching),solver:ensureSolver(d.solver)}}'
if old_norm not in s: raise SystemExit('normalizeState anchor missing')
s=s.replace(old_norm,new_norm,1)

# Render Layer 6 controls. Reuse A/B assumptions rather than duplicating the entire offer form.
anchor_fn="function applyResult(data){"
solver_fn=r'''function renderSolverInputs(){
 const box=document.getElementById('solverFields'),sol=state.solver||blankSolver(),seg=document.getElementById('solverEnabledSeg');
 if(seg)[].forEach.call(seg.children,b=>b.classList.toggle('on',(sol.enabled?'on':'off')===b.getAttribute('data-v')));
 box.style.display=sol.enabled?'':'none';if(!sol.enabled){box.innerHTML='';return}
 const money=(v,ph)=>'<input type="text" data-sol-money inputmode="numeric" placeholder="'+ph+'" value="'+grp(v==null?'':v)+'">';
 const goal=(key,label,field)=>'<div class="solver-goal"><label class="solver-goal-head"><input type="checkbox" data-sol="'+key+'" '+(sol[key]?'checked':'')+'><span>'+label+'</span></label>'+field+'</div>';
 const disabled=k=>sol[k]?'':' aria-disabled="true"';
 box.innerHTML='<div class="solver-grid">'
  +'<div class="field solver-wide"><label>Dùng điều kiện của offer nào làm template?</label><select data-sol="templateOffer"><option value="0" '+(sol.templateOffer!=='1'?'selected':'')+'>'+esc(state.offers[0].name||'Offer A')+'</option><option value="1" '+(sol.templateOffer==='1'?'selected':'')+'>'+esc(state.offers[1].name||'Offer B')+'</option></select><p class="solver-note">Tool giữ BH, thử việc, thưởng, OT, phụ cấp... của offer này và chỉ giải ngược ô lương.</p></div>'
  +goal('goalNoLoss','Đến 31/12, chuyển việc không được thấp hơn ở lại','<div class="sub-input"'+disabled('goalNoLoss')+'><label>Muốn hơn phương án ở lại ít nhất</label><div class="suffix-row">'+money(sol.noLossBuffer,'0')+'<span class="suffix">đ</span></div></div>')
  +goal('goalBreakEven','Hòa vốn trong timeline mục tiêu','<div class="sub-input"'+disabled('goalBreakEven')+'><label>Hòa vốn trong</label><div class="suffix-row"><input type="text" data-sol="breakEvenMonths" inputmode="decimal" value="'+esc(sol.breakEvenMonths??6)+'"><span class="suffix">tháng</span></div></div>')
  +goal('goalMonthlyNet','Đạt target Net / tháng','<div class="sub-input"'+disabled('goalMonthlyNet')+'><label>Net tối thiểu</label><div class="suffix-row">'+money(sol.targetMonthlyNet,'35,000,000')+'<span class="suffix">đ</span></div></div>')
  +goal('goalAnnualFixed','Đạt target thu nhập cố định / năm','<div class="sub-input"'+disabled('goalAnnualFixed')+'><label>Thu nhập cố định tối thiểu</label><div class="suffix-row">'+money(sol.targetAnnualFixed,'500,000,000')+'<span class="suffix">đ</span></div></div>')
  +'<p class="solver-note solver-wide">Layer 6 dùng Net hiện tại, ngày nghỉ/onboard và rule thưởng ở phần chuyển việc. Nếu thiếu, kết quả sẽ chỉ rõ trường cần bổ sung. OT và thưởng hiệu suất chỉ làm kịch bản - mức sàn chính vẫn dựa trên phần cố định/đảm bảo.</p>'
  +'</div>';
 const m=box.querySelectorAll('[data-sol-money]');if(m[0])m[0].setAttribute('data-sol','noLossBuffer');if(m[1])m[1].setAttribute('data-sol','targetMonthlyNet');if(m[2])m[2].setAttribute('data-sol','targetAnnualFixed');
}

'''
if anchor_fn not in s: raise SystemExit('applyResult anchor missing')
s=s.replace(anchor_fn,solver_fn+anchor_fn,1)

# Apply solver response before the hasResults early return.
old_apply='function applyResult(data){\n const empty=document.getElementById("empty"),results=document.getElementById("results");\n if(!data||!data.hasResults){empty.style.display="";empty.textContent="Nhập lương cho ít nhất một offer để bắt đầu.";results.classList.add("hidden");return}'
new_apply='function applyResult(data){\n const empty=document.getElementById("empty"),results=document.getElementById("results"),solverLayer=document.getElementById("solverLayer");document.getElementById("solverResult").innerHTML=(data&&data.layer6Html)||"";solverLayer.style.display=data&&data.showLayer6?"":"none";\n if(!data||!data.hasResults){empty.style.display="";empty.textContent=state.solver&&state.solver.enabled?"Layer 6 có thể tính dù mức lương template đang để trống; xem kết quả bên dưới.":"Nhập lương cho ít nhất một offer để bắt đầu.";results.classList.add("hidden");return}'
if old_apply not in s: raise SystemExit('applyResult early anchor missing')
s=s.replace(old_apply,new_apply,1)

# API must run for solver even if both salary fields are blank.
s=s.replace('if(!hasAnySalary()){if(activeController)','if(!hasAnySalary()&&!(state.solver&&state.solver.enabled)){if(activeController)',1)

# Solver events before save controls.
events_anchor='document.getElementById("saveBtn").addEventListener("click",doSave);'
solver_events=r'''document.getElementById("solverEnabledSeg").addEventListener("click",function(e){const b=e.target.closest("button");if(!b)return;state.solver.enabled=b.getAttribute("data-v")==="on";if(state.solver.enabled){state.switching.enabled=true;state.switching.enabledExplicit=true;renderSwitchingInputs()}markDirty();renderSolverInputs();scheduleCalculation()});
const solverHost=document.getElementById("solverFields");
solverHost.addEventListener("change",function(e){const el=e.target,k=el.getAttribute("data-sol");if(!k)return;if(el.type==="checkbox")state.solver[k]=el.checked;else if(el.tagName==="SELECT")state.solver[k]=el.value;else return;markDirty();renderSolverInputs();scheduleCalculation()});
solverHost.addEventListener("input",function(e){const el=e.target,k=el.getAttribute("data-sol");if(!k||el.type==="checkbox"||el.tagName==="SELECT")return;if(el.hasAttribute("data-sol-money")){const f=grp(el.value);el.value=f;state.solver[k]=f.replace(/,/g,"")}else state.solver[k]=el.value;markDirty();scheduleCalculation()});

'''
if events_anchor not in s: raise SystemExit('solver events anchor missing')
s=s.replace(events_anchor,solver_events+events_anchor,1)

# Keep solver template names synced when offer names change.
s=s.replace('renderSwitchingInputs();}\n});','renderSwitchingInputs();renderSolverInputs();}\n});',1)

# Import / clear / initial render.
s=s.replace('syncCtx();renderInputs();renderSwitchingInputs();markDirty();scheduleCalculation()','syncCtx();renderInputs();renderSwitchingInputs();renderSolverInputs();markDirty();scheduleCalculation()',1)
old_clear='state={deps:null,region:"I",sickDays:null,mat:"hide",offers:[blank("Offer A"),blank("Offer B")],switching:blankSwitch()};'
new_clear='state={deps:null,region:"I",sickDays:null,mat:"hide",offers:[blank("Offer A"),blank("Offer B")],switching:blankSwitch(),solver:blankSolver()};'
if old_clear not in s: raise SystemExit('clear state anchor missing')
s=s.replace(old_clear,new_clear,1)
s=s.replace('syncCtx();renderInputs();renderSwitchingInputs();lastRequestBody=null;','syncCtx();renderInputs();renderSwitchingInputs();renderSolverInputs();lastRequestBody=null;',1)
s=s.replace('load();syncCtx();renderInputs();renderSwitchingInputs();dirty=false;','load();syncCtx();renderInputs();renderSwitchingInputs();renderSolverInputs();dirty=false;',1)

# Frontend smoke: state persists, solver sends API even with blank salary, and Layer 6 HTML renders.
end="console.log('All V2 Turn 6 frontend smoke cases passed.');"
extra=r'''

 // Layer 6 state + API contract, including salary-as-unknown mode.
 {
  const solverState={deps:0,region:'I',sickDays:null,mat:'hide',offers:[{name:'Offer A',gross:null,payType:'gross',bhMode:'salary',probationEnabled:'no'},{name:'Offer B',gross:null}],switching:{enabled:true,targetOffer:'0',lastWorkingDate:'2026-06-30',onboardDate:'2026-07-01',currentNet:'30000000',currentBonusIfStay:'60000000',currentBonusRule:'lost',newBonusRule:'time'},solver:{enabled:true,templateOffer:'0',goalNoLoss:true,noLossBuffer:'0',goalBreakEven:true,breakEvenMonths:'6',goalMonthlyNet:true,targetMonthlyNet:'35000000',goalAnnualFixed:false,targetAnnualFixed:null}};
  const api={...resultStub(),showLayer6:true,layer6Html:'<div data-test="layer6">LAYER6</div>',hasResults:false};
  const {w,d,requests}=boot({storage:{[KEY]:solverState},apiResult:api});await wait(80);
  if(!q(d,'#solverEnabledSeg [data-v="on"]').classList.contains('on'))fail('Layer 6 enabled state did not restore');
  if(!requests.length)fail('Layer 6 did not call API when salary is intentionally blank');
  const body=requests.at(-1);if(!body.solver||body.solver.templateOffer!=='0'||body.solver.goalBreakEven!==true)fail('Layer 6 solver state missing from API body');
  if(!q(d,'[data-test="layer6"]'))fail('Layer 6 response did not render independently from Layers 1-5');
  w.close();
 }
 console.log('PASS Layer 6 frontend: persisted solver state, salary-as-unknown request, independent result rendering');

'''
if end not in smoke: raise SystemExit('smoke end anchor missing')
smoke=smoke.replace(end,extra+end,1)

# Responsive QA: Layer 6 input/result shapes must fit all tested phone widths.
anchor_resp="""  const containment=await page.evaluate(()=>{
    const sels=['.switch-result','.verdict','.events','.offer-matrix','.bh-sim','.switch-scenarios'];
"""
new_resp="""  await page.evaluate(()=>{
    const box=document.querySelector('#solverBox');
    box.querySelector('#solverEnabledSeg [data-v="on"]').click();
    document.querySelector('#solverResult').innerHTML='<div class="solver-result"><h3>Layer 6 · Offer tối thiểu để đáng chuyển</h3><div class="solver-hero"><span>Mức sàn tài chính</span><strong>Gross 48,500,000đ/tháng</strong><small>≈ Gross 48,500,000đ · Net 41,200,000đ/tháng</small></div><div class="solver-breakdown"><b>Mỗi mục tiêu riêng cần tối thiểu</b><div class="solver-row"><span>Hòa vốn trong 6 tháng</span><span class="v">Gross 48,500,000đ</span></div></div><div class="solver-scenarios"><b>Kịch bản</b><div class="solver-row"><span>Nếu có thêm thưởng hiệu suất đã nhập</span><span class="v">Gross 43,200,000đ</span></div></div></div>';
    document.querySelector('#solverLayer').style.display='';
  });
  const containment=await page.evaluate(()=>{
    const sels=['.switch-result','.verdict','.events','.offer-matrix','.bh-sim','.switch-scenarios','.solver-box','.solver-result'];
"""
if anchor_resp not in resp: raise SystemExit('responsive solver anchor missing')
resp=resp.replace(anchor_resp,new_resp,1)

# CSP inline script hash changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
h=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')

HTML.write_text(s);SMOKE.write_text(smoke);RESP.write_text(resp)
print('PATCHED V2 Layer 6 frontend')
