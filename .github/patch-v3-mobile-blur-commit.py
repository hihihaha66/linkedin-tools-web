from pathlib import Path
import re,base64,hashlib

HTML=Path('net-cao-hon-co-that-tot-hon-v3.html')
TEST=Path('tests/v3-current-offers-responsive.mjs')
s=HTML.read_text();t=TEST.read_text()

anchor='document.getElementById("solverResult").addEventListener("click",function(e){const b=e.target.closest(".diag-action");if(!b)return;e.preventDefault();focusDiagnosticTarget(b)});\n\ndocument.getElementById("saveBtn").addEventListener("click",doSave);'
insert='''document.getElementById("solverResult").addEventListener("click",function(e){const b=e.target.closest(".diag-action");if(!b)return;e.preventDefault();focusDiagnosticTarget(b)});

// Mobile browsers can keep the final edit in the focused control until it loses focus.
// Always re-read the DOM value on blur and calculate immediately; pressing Done/OK must not be required.
function commitV3ControlOnBlur(el){
 if(!el||el.tagName==="SELECT"||el.type==="checkbox"||el.tagName==="BUTTON")return false;
 const sw=el.getAttribute("data-sw");
 if(sw){if(["currentBonusIfLeave","newBonusCustom"].includes(sw)){const f=grp(el.value);el.value=f;state.switching[sw]=f.replace(/,/g,"")}else state.switching[sw]=el.value;return true}
 const sol=el.getAttribute("data-sol");
 if(sol){if(el.hasAttribute("data-sol-money")){const f=grp(el.value);el.value=f;state.solver[sol]=f.replace(/,/g,"")}else state.solver[sol]=el.value;return true}
 const cur=el.getAttribute("data-current");
 if(cur){const money=["gross","customBase","fixedAllowance","otBaseAmount"].includes(cur)||(cur==="performanceBonusValue"&&state.currentJob.performanceBonusType==="amount");if(money){const f=grp(el.value);el.value=f;state.currentJob[cur]=f.replace(/,/g,"")}else state.currentJob[cur]=el.value;return true}
 const iRaw=el.getAttribute("data-i"),k=el.getAttribute("data-k");
 if(iRaw!=null&&k){const i=parseInt(iRaw,10);if(Number.isInteger(i)&&state.offers[i]){const money=k==="gross"||k==="customBase"||k==="fixedAllowance"||k==="otBaseAmount"||(k==="performanceBonusValue"&&state.offers[i].performanceBonusType==="amount");if(money){const f=grp(el.value);el.value=f;state.offers[i][k]=f.replace(/,/g,"")}else state.offers[i][k]=el.value;if(k==="probDurationValue")syncProbDurationInline(i);return true}}
 if(el.id==="deps"){state.deps=el.value;return true}
 if(el.id==="sickDays"){state.sickDays=el.value;syncBhSummary();return true}
 return false
}
document.addEventListener("focusout",function(e){if(!commitV3ControlOnBlur(e.target))return;markDirty();clearTimeout(debounceTimer);calculateNow()});

document.getElementById("saveBtn").addEventListener("click",doSave);'''
if anchor not in s: raise SystemExit('blur commit insertion anchor missing')
s=s.replace(anchor,insert,1)

# Recompute CSP after inline JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
HTML.write_text(s)

# Add a browser regression that deliberately changes DOM values without dispatching input.
# Blurring must commit the visible value and send it to the API.
test_anchor="""  const diagOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(diagOverflow>2)throw new Error(label+': diagnostic UI caused horizontal overflow '+diagOverflow);

  await page.close();console.log('PASS V3 responsive '+label);
"""
test_new="""  const diagOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(diagOverflow>2)throw new Error(label+': diagnostic UI caused horizontal overflow '+diagOverflow);

  // Mobile blur commit regression: the visible DOM value must be accepted without pressing Done/OK.
  await page.locator('#switchEnabledSeg [data-v="on"]').click();await page.waitForTimeout(60);
  await page.locator('[data-sw="newBonusRule"]').selectOption('custom');await page.waitForTimeout(80);
  const beforeBlurRequests=bodies.length;
  await page.evaluate(()=>{const el=document.querySelector('[data-sw="newBonusCustom"]');el.focus();el.value='30000000';document.querySelector('[data-sw="currentBonusRule"]').focus()});
  await page.waitForTimeout(180);
  if(bodies.length<=beforeBlurRequests)throw new Error(label+': blur did not trigger an immediate calculation');
  if(String(bodies.at(-1)?.switching?.newBonusCustom)!=='30000000')throw new Error(label+': switching money value was not committed on blur');
  if((await page.locator('[data-sw="newBonusCustom"]').inputValue())!=='30,000,000')throw new Error(label+': switching money value was not normalized on blur');

  await page.evaluate(()=>{const el=document.querySelector('#offersIn input[data-i="0"][data-k="gross"]');el.focus();el.value='36000000';document.querySelector('#offerCountSeg button').focus()});await page.waitForTimeout(180);
  if(String(bodies.at(-1)?.offers?.[0]?.gross)!=='36000000')throw new Error(label+': offer salary was not committed on blur');
  await page.evaluate(()=>{const el=document.querySelector('[data-current="gross"]');el.focus();el.value='31000000';document.querySelector('#currentEnabledSeg button').focus()});await page.waitForTimeout(180);
  if(String(bodies.at(-1)?.currentJob?.gross)!=='31000000')throw new Error(label+': Current Job salary was not committed on blur');
  await page.evaluate(()=>{const el=document.querySelector('[data-sol="targetMonthlyNet"]');el.focus();el.value='37000000';document.querySelector('#solverEnabledSeg button').focus()});await page.waitForTimeout(180);
  if(String(bodies.at(-1)?.solver?.targetMonthlyNet)!=='37000000')throw new Error(label+': Layer 6 money target was not committed on blur');

  await page.close();console.log('PASS V3 responsive '+label);
"""
if test_anchor not in t: raise SystemExit('browser blur test anchor missing')
t=t.replace(test_anchor,test_new,1)
TEST.write_text(t)
print('PATCHED V3 mobile blur commit')
