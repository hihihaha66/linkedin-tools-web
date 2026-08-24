from pathlib import Path
import re,base64,hashlib
p=Path('net-cao-hon-co-that-tot-hon-v3.html')
s=p.read_text()

# Hidden Offer B may retain data, but in one-offer mode it must not control A's progressive disclosure.
old="const anyOt=state.offers.some(otActive),anyPaid=state.offers.some(otPaidActive),anySingle=state.offers.some(o=>otPaidActive(o)&&o.otType!=='mixed'),anyMixed=state.offers.some(o=>otPaidActive(o)&&o.otType==='mixed');"
new="const activeOffers=state.offerCount===2?state.offers:[state.offers[0]],anyOt=activeOffers.some(otActive),anyPaid=activeOffers.some(otPaidActive),anySingle=activeOffers.some(o=>otPaidActive(o)&&o.otType!=='mixed'),anyMixed=activeOffers.some(o=>otPaidActive(o)&&o.otType==='mixed');"
if old not in s: raise SystemExit('OT active-offer anchor missing')
s=s.replace(old,new,1)
old="const anyTrial=probOn(A)||probOn(B),open=benefitsWasOpen||shouldOpenBenefits(A)||shouldOpenBenefits(B);"
new="const anyTrial=probOn(A)||(state.offerCount===2&&probOn(B)),open=benefitsWasOpen||shouldOpenBenefits(A)||(state.offerCount===2&&shouldOpenBenefits(B));"
if old not in s: raise SystemExit('trial active-offer anchor missing')
s=s.replace(old,new,1)

# Changing 1↔2 offers must rebuild the matrix immediately so hidden B rows disappear/return without losing B data.
old="document.getElementById('offerCountSeg').addEventListener('click',function(e){const b=e.target.closest('button');if(!b)return;state.offerCount=b.getAttribute('data-v')==='2'?2:1;if(state.offerCount===1&&state.switching.targetOffer==='1')state.switching.targetOffer='0';markDirty();syncOfferCount();renderSwitchingInputs();renderSolverInputs();scheduleCalculation()});"
new="document.getElementById('offerCountSeg').addEventListener('click',function(e){const b=e.target.closest('button');if(!b)return;state.offerCount=b.getAttribute('data-v')==='2'?2:1;if(state.offerCount===1&&state.switching.targetOffer==='1')state.switching.targetOffer='0';markDirty();renderInputs();renderSwitchingInputs();renderSolverInputs();scheduleCalculation()});"
if old not in s: raise SystemExit('offer-count rerender anchor missing')
s=s.replace(old,new,1)

# A hidden retained B salary must not be the only reason an otherwise empty one-offer page calls the API.
old='function hasAnySalary(){const arr=[...state.offers];if(state.currentJobEnabled)arr.push(state.currentJob);return arr.some(o=>{const n=Number(String(o.gross??"").replace(/,/g,""));return Number.isFinite(n)&&n>0})}'
new='function hasAnySalary(){const arr=state.offerCount===2?[...state.offers]:[state.offers[0]];if(state.currentJobEnabled)arr.push(state.currentJob);return arr.some(o=>{const n=Number(String(o.gross??"").replace(/,/g,""));return Number.isFinite(n)&&n>0})}'
if old not in s: raise SystemExit('hasAnySalary active-offer anchor missing')
s=s.replace(old,new,1)

# Three-option segmented controls in Current Job should use the same compact style as the offer matrix.
s=s.replace("const sg=(k,val,opts)=>'<div class=\"seg\" data-current-seg=\"'+k+'\">'","const sg=(k,val,opts)=>'<div class=\"seg'+(opts.length===3?' three':'')+'\" data-current-seg=\"'+k+'\">'",1)

# Current label changes feed transition and solver selectors immediately.
old="if(money){const f=grp(el.value);el.value=f;state.currentJob[k]=f.replace(/,/g,'')}else state.currentJob[k]=el.value;markDirty();scheduleCalculation()"
new="if(money){const f=grp(el.value);el.value=f;state.currentJob[k]=f.replace(/,/g,'')}else state.currentJob[k]=el.value;if(k==='name'){renderSwitchingInputs();renderSolverInputs()}markDirty();scheduleCalculation()"
if old not in s: raise SystemExit('current name refresh anchor missing')
s=s.replace(old,new,1)

# V3 copy should describe selected options, not assume two offers.
s=s.replace('Đưa hai offer về cùng 12 tháng làm việc để so tổng thu nhập. Không phải số tiền từ hôm nay đến 31/12.','Đưa hai phương án đang chọn về cùng 12 tháng làm việc để so tổng thu nhập. Không phải số tiền từ hôm nay đến 31/12.',1)
s=s.replace('Nhập lương cho ít nhất một offer để bắt đầu.','Nhập lương cho ít nhất một phương án để bắt đầu.')

# Preserve Current Job benefits accordion when a nested toggle forces a re-render.
old="function renderCurrentInputs(){\n const host=document.getElementById('currentFields'),seg=document.getElementById('currentEnabledSeg'),o=state.currentJob=ensureCurrent(state.currentJob);"
new="function renderCurrentInputs(){\n const host=document.getElementById('currentFields'),benefitsOpen=!!host.querySelector('.v3-current-benefits')?.open,seg=document.getElementById('currentEnabledSeg'),o=state.currentJob=ensureCurrent(state.currentJob);"
if old not in s: raise SystemExit('current renderer anchor missing')
s=s.replace(old,new,1)
old="+'<details class=\"v3-current-benefits\"><summary>Thưởng, phụ cấp & ngày phép</summary><div class=\"v3-current-benefits-body\">'"
new="+'<details class=\"v3-current-benefits\"'+(benefitsOpen?' open':'')+'><summary>Thưởng, phụ cấp & ngày phép</summary><div class=\"v3-current-benefits-body\">'"
if old not in s: raise SystemExit('current benefits details anchor missing')
s=s.replace(old,new,1)

# CSP hash follows JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP anchor missing')
p.write_text(s)

# Extend browser smoke: stale B config must not surface OT/trial rows in one-offer mode.
t=Path('tests/v3-current-offers-responsive.mjs');x=t.read_text()
anchor="  await page.locator('#offerCountSeg [data-v=\"2\"]').click();await page.locator('#offersIn input[data-i=\"1\"][data-k=\"gross\"]').fill('40000000');await page.waitForTimeout(750);"
insert=anchor+"\n  await page.locator('#offersIn input[data-i=\"1\"][data-k=\"otMonthly\"]').fill('12');await page.locator('[data-seg=\"probationEnabled\"][data-i=\"1\"] [data-v=\"yes\"]').click();await page.locator('#offerCountSeg [data-v=\"1\"]').click();await page.waitForTimeout(80);const hiddenInfluence=await page.evaluate(()=>({trial:!!document.querySelector('#offersIn [data-k=\"probDurationValue\"]'),otPaid:getComputedStyle(document.querySelector('#offersIn .ot-paid-row')).display}));if(hiddenInfluence.trial||hiddenInfluence.otPaid!=='none')throw new Error(label+': retained hidden Offer B influenced one-offer disclosure');await page.locator('#offerCountSeg [data-v=\"2\"]').click();await page.waitForTimeout(80);"
if anchor not in x: raise SystemExit('browser stale-B anchor missing')
x=x.replace(anchor,insert,1);t.write_text(x)
print('POLISHED V3 active-option behavior and copy')
