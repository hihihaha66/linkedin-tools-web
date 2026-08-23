from pathlib import Path
import base64,hashlib,re

HTML=Path('net-cao-hon-co-that-tot-hon-v2.html')
RESP=Path('tests/v2-turn6-responsive.mjs')
s=HTML.read_text(); t=RESP.read_text()

# Compact setup CSS: keep context in two columns on mobile, compress spacing, turn BHXH body into rows.
old_css=""".ctx{display:grid;grid-template-columns:.9fr 1.3fr;gap:14px;align-items:end;margin-bottom:18px}.ctx .field{min-width:0;margin:0;display:flex;flex-direction:column}.ctx .field>label{min-height:42px;display:flex;align-items:flex-end;margin-bottom:6px}.ctx input[type=number],.ctx select,.ctx .seg{height:40px;min-height:40px}.ctx .seg button{height:38px;padding:0 8px;display:flex;align-items:center;justify-content:center}"""
new_css=""".ctx{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.25fr);gap:10px;align-items:end;margin-bottom:12px}.ctx .field{min-width:0;margin:0;display:flex;flex-direction:column}.ctx .field>label{min-height:36px;display:flex;align-items:flex-end;margin-bottom:5px;line-height:1.35}.ctx input[type=number],.ctx select,.ctx .seg{height:40px;min-height:40px}.ctx .seg button{height:38px;padding:0 8px;display:flex;align-items:center;justify-content:center}"""
if old_css not in s: raise SystemExit('ctx CSS anchor missing')
s=s.replace(old_css,new_css,1)

old_bh_css=""".bh-sim-wrap{margin:2px 0 20px}.bh-sim{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:0 16px}.bh-sim summary{list-style:none;cursor:pointer;color:var(--moss);font-family:var(--sans);font-size:14px;font-weight:600;padding:12px 0;display:flex;align-items:center;gap:7px}.bh-sim summary::-webkit-details-marker{display:none}.bh-sim summary:before{content:'＋';font-family:var(--mono);font-size:16px}.bh-sim[open] summary:before{content:'−'}.bh-sim-body{border-top:1px solid var(--line);padding:14px 0 2px}.bh-sim-body .duo{align-items:flex-start}.bh-sim-body .field{flex:1}"""
new_bh_css=""".bh-sim-wrap{margin:2px 0 14px}.bh-sim{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:0 12px}.bh-sim summary{list-style:none;cursor:pointer;color:var(--moss);font-family:var(--sans);font-size:14px;font-weight:600;padding:10px 0;display:flex;align-items:center;gap:7px}.bh-sim summary::-webkit-details-marker{display:none}.bh-sim summary:before{content:'＋';font-family:var(--mono);font-size:16px;flex:0 0 auto}.bh-sim[open] summary:before{content:'−'}.bh-summary-title{white-space:nowrap}.bh-summary-state{margin-left:auto;min-width:0;text-align:right;color:var(--ink-soft);font-family:var(--mono);font-size:10.5px;font-weight:500;line-height:1.3}.bh-sim-body{border-top:1px solid var(--line);padding:7px 0 9px}.bh-compact-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(130px,.72fr);gap:12px;align-items:center;padding:7px 0}.bh-compact-row+.bh-compact-row{border-top:1px dotted var(--line)}.bh-compact-row label{margin:0;font-size:12.5px;color:var(--ink);line-height:1.4}.bh-control{min-width:0}.bh-control input,.bh-control .seg{height:38px;min-height:38px}.bh-control .seg button{padding:7px 6px}.bh-shared-note{margin:7px 0 0;padding-top:7px;border-top:1px solid var(--line);font-size:10.8px;line-height:1.45;color:var(--ink-soft)}"""
if old_bh_css not in s: raise SystemExit('BH CSS anchor missing')
s=s.replace(old_bh_css,new_bh_css,1)

# Replace mobile stacking with a compact two-column context and tighter BH controls.
s=s.replace("@media(max-width:540px){.ctx{grid-template-columns:1fr}.duo{flex-direction:column;gap:0}","@media(max-width:540px){.ctx{grid-template-columns:minmax(0,.72fr) minmax(0,1.28fr);gap:8px;margin-bottom:10px}.ctx .field>label{min-height:34px;font-size:11.5px}.ctx input[type=number],.ctx select{font-size:14px;padding:8px 9px}.bh-sim-wrap{margin-bottom:11px}.bh-sim{padding:0 10px}.bh-sim summary{padding:9px 0}.bh-summary-state{font-size:9px}.bh-compact-row{grid-template-columns:minmax(0,1fr) minmax(112px,.82fr);gap:8px;padding:6px 0}.bh-compact-row label{font-size:11.5px}.bh-control input{font-size:14px;padding:8px 9px}.bh-control .seg button{font-size:11.5px;padding:7px 4px}.bh-shared-note{font-size:9.8px;margin-top:6px;padding-top:6px}.duo{flex-direction:column;gap:0}",1)

# Compact markup; preserve all functionality while merging helper copy into one section note.
old_markup="""<div class="bh-sim-wrap">
<p class="eyebrow">Mô phỏng quyền lợi BHXH</p>
<details class="bh-sim" id="bhSim">
<summary>Ốm đau, thai sản</summary>
<div class="bh-sim-body">
<div class="duo">
<div class="field"><label for="sickDays">Số ngày nghỉ ốm để ước tính chế độ BHXH</label><input type="number" id="sickDays" min="0" step="1" inputmode="numeric" placeholder="vd 5"><p class="benefit-note">Chỉ dùng để mô phỏng khoản hưởng chế độ ốm đau hưởng BHXH ở mục “Nếu có biến cố”. Không ảnh hưởng lương net hay gói thu nhập.</p></div>
<div class="field"><label>Xét chế độ thai sản (LĐ nữ)</label><div class="seg" id="matSeg"><button data-v="show">Có</button><button data-v="hide" class="on">Không</button></div><p class="benefit-note">Bật khi muốn so khoản thai sản theo mức lương làm căn cứ đóng BHXH của hai offer. Tool không kiểm tra điều kiện hưởng.</p></div>
</div>
</div>
</details>
</div>"""
new_markup="""<div class="bh-sim-wrap">
<p class="eyebrow">Mô phỏng quyền lợi BHXH</p>
<details class="bh-sim" id="bhSim">
<summary><span class="bh-summary-title">Ốm đau, thai sản</span><span class="bh-summary-state" id="bhSummaryState">Chưa bật mô phỏng</span></summary>
<div class="bh-sim-body">
<div class="bh-compact-row"><label for="sickDays">Số ngày nghỉ ốm</label><div class="bh-control"><input type="number" id="sickDays" min="0" step="1" inputmode="numeric" placeholder="5"></div></div>
<div class="bh-compact-row"><label>Xét chế độ thai sản (LĐ nữ)</label><div class="bh-control"><div class="seg" id="matSeg"><button data-v="show">Có</button><button data-v="hide" class="on">Không</button></div></div></div>
<p class="bh-shared-note">Chỉ dùng để mô phỏng quyền lợi BHXH ở mục “Nếu có biến cố”, không ảnh hưởng lương net hay thu nhập so sánh. Thai sản được so theo mức lương làm căn cứ đóng BHXH; tool không kiểm tra điều kiện hưởng.</p>
</div>
</details>
</div>"""
if old_markup not in s: raise SystemExit('BH markup anchor missing')
s=s.replace(old_markup,new_markup,1)

# Live compact summary so users can collapse the card without losing current settings.
old_sync="function syncCtx(){document.getElementById(\"deps\").value=state.deps==null?\"\":state.deps;document.getElementById(\"region\").value=state.region||\"I\";document.getElementById(\"sickDays\").value=state.sickDays==null?\"\":state.sickDays;[].forEach.call(document.getElementById(\"matSeg\").children,x=>x.classList.toggle(\"on\",x.getAttribute(\"data-v\")===state.mat));const bh=document.getElementById(\"bhSim\");if(bh)bh.open=hasPositiveValue(state.sickDays)||state.mat===\"show\"}"
new_sync="function syncBhSummary(){const el=document.getElementById(\"bhSummaryState\");if(!el)return;const n=Number(state.sickDays),parts=[];if(Number.isFinite(n)&&n>0)parts.push(Math.round(n)+\" ngày ốm\");if(state.mat===\"show\")parts.push(\"Thai sản: Có\");else if(parts.length)parts.push(\"Thai sản: Không\");el.textContent=parts.length?parts.join(\" · \"): \"Chưa bật mô phỏng\"}\nfunction syncCtx(){document.getElementById(\"deps\").value=state.deps==null?\"\":state.deps;document.getElementById(\"region\").value=state.region||\"I\";document.getElementById(\"sickDays\").value=state.sickDays==null?\"\":state.sickDays;[].forEach.call(document.getElementById(\"matSeg\").children,x=>x.classList.toggle(\"on\",x.getAttribute(\"data-v\")===state.mat));syncBhSummary();const bh=document.getElementById(\"bhSim\");if(bh)bh.open=hasPositiveValue(state.sickDays)||state.mat===\"show\"}"
if old_sync not in s: raise SystemExit('syncCtx anchor missing')
s=s.replace(old_sync,new_sync,1)

s=s.replace('document.getElementById("sickDays").addEventListener("input",e=>{state.sickDays=e.target.value;markDirty();scheduleCalculation()});','document.getElementById("sickDays").addEventListener("input",e=>{state.sickDays=e.target.value;syncBhSummary();markDirty();scheduleCalculation()});',1)
s=s.replace('document.getElementById("matSeg").addEventListener("click",function(e){const b=e.target.closest("button");if(!b)return;state.mat=b.getAttribute("data-v");[].forEach.call(this.children,x=>x.classList.toggle("on",x===b));markDirty();scheduleCalculation()});','document.getElementById("matSeg").addEventListener("click",function(e){const b=e.target.closest("button");if(!b)return;state.mat=b.getAttribute("data-v");[].forEach.call(this.children,x=>x.classList.toggle("on",x===b));syncBhSummary();markDirty();scheduleCalculation()});',1)

# Browser regression: compact context remains two columns; BHXH card is row-based and summary mirrors state.
anchor="  await check('blank');\n"
extra="""  await check('blank');
  const setupLayout=await page.evaluate(()=>{
    const ctx=document.querySelector('.ctx');
    const cells=[...ctx.children].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}});
    const bh=document.querySelector('#bhSim');
    const rows=[...document.querySelectorAll('.bh-compact-row')];
    return{ctxDisplay:getComputedStyle(ctx).display,ctxCols:getComputedStyle(ctx).gridTemplateColumns,cells,bhHeight:bh.getBoundingClientRect().height,rowCount:rows.length,sharedNote:!!document.querySelector('.bh-shared-note')};
  });
  if(setupLayout.ctxDisplay!=='grid'||setupLayout.ctxCols.split(' ').filter(Boolean).length<2)throw new Error(`${label}: common context is not a compact two-column grid`);
  if(label==='mobile'&&Math.abs(setupLayout.cells[0].y-setupLayout.cells[1].y)>2)throw new Error('mobile: common-context fields stacked instead of sharing a row');
  if(setupLayout.rowCount!==2||!setupLayout.sharedNote)throw new Error(`${label}: BHXH simulator is not 2 compact rows + shared note`);
  await page.locator('#bhSim summary').click();
  await page.locator('#sickDays').fill('5');
  await page.locator('#matSeg [data-v="show"]').click();
  const bhState=await page.locator('#bhSummaryState').textContent();
  if(!bhState.includes('5 ngày ốm')||!bhState.includes('Thai sản: Có'))throw new Error(`${label}: collapsed BHXH summary did not mirror current settings (${bhState})`);
  if(label==='mobile'){
    const openHeight=await page.locator('#bhSim').evaluate(e=>e.getBoundingClientRect().height);
    if(openHeight>300)throw new Error(`mobile: compact BHXH simulator still too tall (${openHeight}px)`);
  }
"""
if anchor not in t: raise SystemExit('responsive test anchor missing')
t=t.replace(anchor,extra,1)

# Recompute CSP script hash after JS changes.
start=s.index('<script>')+len('<script>'); end=s.index('</script>',start)
h=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')

HTML.write_text(s); RESP.write_text(t)
print('PATCHED compact context/BHXH layout')
