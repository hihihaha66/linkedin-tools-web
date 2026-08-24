from pathlib import Path
import re,base64,hashlib

HTML=Path('net-cao-hon-co-that-tot-hon-v3.html')
TEST=Path('tests/v3-current-offers-responsive.mjs')
s=HTML.read_text();t=TEST.read_text()

# Diagnostic cards: compact, actionable, readable in one- and two-offer Layer 6 layouts.
css_anchor=".solver-needs ul{margin:6px 0 0;padding-left:18px;font-size:12px}.solver-foot{margin-top:12px}"
css_new=css_anchor+".diag-card{padding:12px}.diag-card>p{font-size:11.5px;line-height:1.55;color:var(--ink-soft);margin:6px 0 10px}.diag-item,.diag-constraint{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px dotted var(--line)}.diag-item:last-of-type,.diag-constraint:last-of-type{border-bottom:0}.diag-copy{min-width:0;flex:1}.diag-copy>b{display:block;font-size:12.5px;line-height:1.4;color:var(--ink)}.diag-path{display:block;font-family:var(--mono);font-size:10.5px;line-height:1.45;color:var(--moss);margin-top:2px}.diag-copy>small{display:block;font-size:10.8px;line-height:1.5;color:var(--ink-soft);margin-top:3px}.diag-action{flex:0 0 auto;border:1px solid var(--moss);border-radius:7px;background:#fff;color:var(--moss);font:600 11px var(--sans);padding:6px 9px;cursor:pointer;white-space:nowrap}.diag-action:active{transform:translateY(1px)}.diag-start{padding-top:9px}.diag-start .diag-action{width:100%}.diag-symbol{font-family:var(--mono);font-size:15px;font-weight:700;flex:0 0 18px;text-align:center}.diag-constraint.ok .diag-symbol{color:var(--moss)}.diag-constraint.block .diag-symbol{color:var(--clay)}.diag-constraint .diag-action{min-width:82px}.diag-focus{outline:3px solid var(--moss)!important;outline-offset:3px!important;background:#fff!important;transition:outline-color .2s ease}.no-solution{border-left:3px solid var(--clay)}"
if css_anchor not in s:raise SystemExit('diagnostic CSS anchor missing')
s=s.replace(css_anchor,css_new,1)
mobile_anchor="@media(max-width:540px){.v3-current-box{padding:11px;margin:12px 0 16px}.v3-current-grid{gap:9px}.v3-current-benefits-body{gap:8px}.v3-mode-title{font-size:18px}.v3-pair-btn{font-size:10.5px;padding:6px 8px}.v3-summary-card{padding:8px}.offers-in.one-offer .offer-mrow{grid-template-columns:minmax(104px,39%) minmax(0,61%)}.ctx{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ctx .field>label{min-height:38px;font-size:11.5px;line-height:1.3}.ctx input[type=number],.ctx select{font-size:14px;padding-left:9px;padding-right:9px}.ctx .suffix-row input{padding-right:48px}.ctx .suffix-row .suffix{font-size:10.5px;right:8px}}"
mobile_new=mobile_anchor[:-1]+".diag-item,.diag-constraint{align-items:flex-start;gap:7px}.diag-action{font-size:10.5px;padding:6px 7px}.diag-copy>b{font-size:12px}.diag-path{font-size:10px}.diag-constraint .diag-action{min-width:72px}}"
if mobile_anchor not in s:raise SystemExit('mobile diagnostic CSS anchor missing')
s=s.replace(mobile_anchor,mobile_new,1)

# Guided navigation helpers. Every backend diagnostic button uses the same action contract.
insert_anchor="function applyResult(data){"
helpers=r'''function diagnosticSelector(scope,field,idx){
 if(scope==='current')return field==='root'?'#currentBox':'[data-current="'+field+'"]';
 if(scope==='offer')return field==='root'?'#offersIn':'[data-i="'+idx+'"][data-k="'+field+'"]';
 if(scope==='switching')return field==='root'?'.switch-box-results':'[data-sw="'+field+'"]';
 if(scope==='solver')return field==='goals'?'#solverFields .solver-goal':'[data-sol="'+field+'"]';
 return null;
}
function revealDiagnosticTarget(scope,field,idx,activate){
 if(scope==='current'){
  if(activate||!state.currentJobEnabled){state.currentJobEnabled=true;markDirty();renderCurrentInputs();renderSwitchingInputs();}
  else renderCurrentInputs();
 }else if(scope==='offer'){
  if(Number(idx)===1&&state.offerCount!==2){state.offerCount=2;markDirty();}
  renderInputs();renderSwitchingInputs();renderSolverInputs();
 }else if(scope==='switching'){
  if(!state.switching.enabled){state.switching.enabled=true;state.switching.enabledExplicit=true;markDirty();}
  renderSwitchingInputs();
 }else if(scope==='solver'){
  if(!state.solver.enabled){state.solver.enabled=true;state.switching.enabled=true;state.switching.enabledExplicit=true;markDirty();renderSwitchingInputs();}
  renderSolverInputs();
 }
}
function focusDiagnosticTarget(btn){
 const scope=btn.getAttribute('data-diag-scope')||'',field=btn.getAttribute('data-diag-field')||'root',idx=btn.getAttribute('data-diag-idx'),activate=btn.getAttribute('data-diag-activate')==='1';
 revealDiagnosticTarget(scope,field,idx,activate);
 const selector=diagnosticSelector(scope,field,idx);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  let target=selector?document.querySelector(selector):null;
  if(!target&&scope==='offer')target=document.getElementById('offersIn');
  if(!target&&scope==='current')target=document.getElementById('currentBox');
  if(!target&&scope==='switching')target=document.querySelector('.switch-box-results');
  if(!target&&scope==='solver')target=document.getElementById('solverFields');
  if(!target)return;
  const details=target.closest('details');if(details&&!details.open)details.open=true;
  target.scrollIntoView({behavior:'smooth',block:'center'});
  target.classList.add('diag-focus');
  if(typeof target.focus==='function'){try{target.focus({preventScroll:true})}catch{target.focus()}}
  setTimeout(()=>target.classList.remove('diag-focus'),1600);
 }));
}

'''
if insert_anchor not in s:raise SystemExit('applyResult anchor missing')
s=s.replace(insert_anchor,helpers+insert_anchor,1)

# Delegate all diagnostic CTA clicks from Layer 6 results.
event_anchor='document.getElementById("saveBtn").addEventListener("click",doSave);'
event_code='''document.getElementById("solverResult").addEventListener("click",function(e){const b=e.target.closest(".diag-action");if(!b)return;e.preventDefault();focusDiagnosticTarget(b)});\n\n'''
if event_anchor not in s:raise SystemExit('save event anchor missing')
s=s.replace(event_anchor,event_code+event_anchor,1)

# CSP hash follows inline-JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1:raise SystemExit('CSP hash anchor missing')
HTML.write_text(s)

# Browser regression: diagnostic CTA activates hidden Current Job and focuses exact field; switching/solver paths focus correctly; no overflow.
close_anchor="  const publicText=await page.locator('body').innerText();for(const bad of ['backend','threshold','baseline','template','timeline mục tiêu','target Net','target thu nhập'])if(publicText.toLowerCase().includes(bad.toLowerCase()))throw new Error(label+': developer wording remains visible: '+bad);\n\n  await page.close();console.log('PASS V3 responsive '+label);"
extra="""  const publicText=await page.locator('body').innerText();for(const bad of ['backend','threshold','baseline','template','timeline mục tiêu','target Net','target thu nhập'])if(publicText.toLowerCase().includes(bad.toLowerCase()))throw new Error(label+': developer wording remains visible: '+bad);

  // Guided diagnostic navigation - Current Job can be activated from the error card.
  await page.locator('#currentEnabledSeg [data-v="off"]').click();
  await page.evaluate(()=>{document.querySelector('#solverLayer').style.display='';document.querySelector('#solverResult').innerHTML='<div class="solver-needs diag-card"><div class="diag-item"><div class="diag-copy"><b>Thiếu lương hiện tại</b><span class="diag-path">Công việc hiện tại → Lương / tháng</span></div><button type="button" class="diag-action" data-diag-scope="current" data-diag-field="gross" data-diag-activate="1">Đi tới</button></div></div>'});
  await page.locator('#solverResult .diag-action').click();await page.waitForTimeout(120);
  if(!(await page.locator('#currentEnabledSeg [data-v="on"]').evaluate(e=>e.classList.contains('on'))))throw new Error(label+': diagnostic CTA did not activate Current Job');
  const currentFocused=await page.evaluate(()=>document.activeElement?.getAttribute('data-current')==='gross'&&document.querySelector('[data-current="gross"]')?.classList.contains('diag-focus'));
  if(!currentFocused)throw new Error(label+': diagnostic CTA did not focus/highlight Current salary');

  // Transition and Layer 6 actions also land on the exact requested field.
  await page.evaluate(()=>{document.querySelector('#solverResult').innerHTML='<button type="button" class="diag-action" data-diag-scope="switching" data-diag-field="onboardDate">Đi tới</button>'});
  await page.locator('#solverResult .diag-action').click();await page.waitForTimeout(100);
  if(!(await page.evaluate(()=>document.activeElement?.getAttribute('data-sw')==='onboardDate')))throw new Error(label+': switching diagnostic did not focus onboard date');
  await page.evaluate(()=>{document.querySelector('#solverResult').innerHTML='<button type="button" class="diag-action" data-diag-scope="solver" data-diag-field="targetMonthlyNet">Chỉnh mục tiêu</button>'});
  await page.locator('#solverResult .diag-action').click();await page.waitForTimeout(100);
  if(!(await page.evaluate(()=>document.activeElement?.getAttribute('data-sol')==='targetMonthlyNet')))throw new Error(label+': solver diagnostic did not focus monthly Net target');
  const diagOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(diagOverflow>2)throw new Error(label+': diagnostic UI caused horizontal overflow '+diagOverflow);

  await page.close();console.log('PASS V3 responsive '+label);"""
if close_anchor not in t:raise SystemExit('responsive close anchor missing')
t=t.replace(close_anchor,extra,1)
TEST.write_text(t)
print('PATCHED V3 guided diagnostic navigation UI')
