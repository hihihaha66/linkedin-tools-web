from pathlib import Path
import re,base64,hashlib

HTML=Path('net-cao-hon-co-that-tot-hon-v3.html')
TEST=Path('tests/v3-current-offers-responsive.mjs')
s=HTML.read_text();t=TEST.read_text()

# Native date pickers (especially iOS Safari) may emit input events while the picker is still active.
# Do not commit/calculate date values on interim input, and never rebuild the Switching form on date change.
old_input='''swHost.addEventListener("input",function(e){const el=e.target,k=el.getAttribute("data-sw");if(!k||el.tagName==="SELECT")return;if(["currentBonusIfLeave","newBonusCustom"].includes(k)){const f=grp(el.value);el.value=f;state.switching[k]=f.replace(/,/g,"")}else state.switching[k]=el.value;markDirty();scheduleCalculation()});'''
new_input='''swHost.addEventListener("input",function(e){const el=e.target,k=el.getAttribute("data-sw");if(!k||el.tagName==="SELECT"||el.type==="date")return;if(["currentBonusIfLeave","newBonusCustom"].includes(k)){const f=grp(el.value);el.value=f;state.switching[k]=f.replace(/,/g,"")}else state.switching[k]=el.value;markDirty();scheduleCalculation()});'''
if old_input not in s: raise SystemExit('Switching input handler anchor missing')
s=s.replace(old_input,new_input,1)

old_change='''swHost.addEventListener("change",function(e){const el=e.target,k=el.getAttribute("data-sw");if(!k)return;if(el.tagName==="SELECT"){state.switching[k]=el.value;if(k==="currentBonusRule")state.switching.currentBonusRuleExplicit=true}else if(el.type==="date")state.switching[k]=el.value;else return;markDirty();if(k==="currentBonusRule"||k==="newBonusRule"||k==="lastWorkingDate"||k==="onboardDate"){renderSwitchingInputs();if(k==="onboardDate")renderSolverInputs()}scheduleCalculation()});'''
new_change='''swHost.addEventListener("change",function(e){const el=e.target,k=el.getAttribute("data-sw");if(!k)return;if(el.tagName==="SELECT"){state.switching[k]=el.value;if(k==="currentBonusRule")state.switching.currentBonusRuleExplicit=true}else if(el.type==="date")state.switching[k]=el.value;else return;markDirty();if(k==="currentBonusRule"||k==="newBonusRule")renderSwitchingInputs();if(k==="onboardDate")renderSolverInputs();scheduleCalculation()});'''
if old_change not in s: raise SystemExit('Switching change handler anchor missing')
s=s.replace(old_change,new_change,1)

# CSP hash follows inline JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
HTML.write_text(s)

# Browser regression: interim date input must not commit; committed change must keep the same DOM node.
old_test='''  await page.locator('[data-sw="onboardDate"]').fill('2027-01-05');await page.waitForTimeout(60);
'''
new_test='''  const dateBodyCount=bodies.length;
  await page.evaluate(()=>{const el=document.querySelector('[data-sw="lastWorkingDate"]');window.__v3LastDateNode=el;el.value='2026-12-20';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForTimeout(700);
  if(bodies.length!==dateBodyCount&&bodies.at(-1)?.switching?.lastWorkingDate==='2026-12-20')throw new Error(label+': interim date input committed before selection finished');
  await page.locator('[data-sw="lastWorkingDate"]').dispatchEvent('change');await page.waitForTimeout(750);
  const lastDateAudit=await page.evaluate(()=>({same:document.querySelector('[data-sw="lastWorkingDate"]')===window.__v3LastDateNode,value:document.querySelector('[data-sw="lastWorkingDate"]')?.value}));
  if(!lastDateAudit.same||lastDateAudit.value!=='2026-12-20')throw new Error(label+': last-working-date field was rebuilt during selection '+JSON.stringify(lastDateAudit));
  if(bodies.at(-1)?.switching?.lastWorkingDate!=='2026-12-20')throw new Error(label+': committed last-working-date missing from API body');

  await page.evaluate(()=>{const el=document.querySelector('[data-sw="onboardDate"]');window.__v3OnboardDateNode=el;el.value='2027-01-05';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForTimeout(80);
  await page.locator('[data-sw="onboardDate"]').dispatchEvent('change');await page.waitForTimeout(750);
  const onboardDateAudit=await page.evaluate(()=>({same:document.querySelector('[data-sw="onboardDate"]')===window.__v3OnboardDateNode,value:document.querySelector('[data-sw="onboardDate"]')?.value}));
  if(!onboardDateAudit.same||onboardDateAudit.value!=='2027-01-05')throw new Error(label+': onboard-date field was rebuilt during selection '+JSON.stringify(onboardDateAudit));
  if(bodies.at(-1)?.switching?.onboardDate!=='2027-01-05')throw new Error(label+': committed onboard-date missing from API body');
'''
if old_test not in t: raise SystemExit('Date regression insertion anchor missing')
t=t.replace(old_test,new_test,1)
TEST.write_text(t)
print('PATCHED V3 native date picker lifecycle')
