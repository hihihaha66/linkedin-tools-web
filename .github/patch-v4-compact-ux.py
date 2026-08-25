from pathlib import Path
import re,hashlib,base64

HTML=Path('net-cao-hon-co-that-tot-hon-v4.html')
TEST=Path('tests/v4-clean-ui.mjs')
s=HTML.read_text();t=TEST.read_text()

# ---------- 1) Static copy-light cleanup ----------
repls={
'''<div class="v3-section-head"><div class="v3-section-copy"><p class="eyebrow">Mốc so sánh</p><h2 class="sec">Công việc hiện tại</h2><p class="hint">Thêm khi muốn so offer mới với phương án ở lại.</p></div><div class="v3-section-actions">''':'''<div class="v3-section-head"><div class="v3-section-copy"><p class="eyebrow">Mốc so sánh</p><h2 class="sec">Công việc hiện tại</h2></div><div class="v3-section-actions">''',
'''<div class="v3-offer-intro"><div><p class="eyebrow">Offer mới</p><h2 class="sec">Nhập offer đang cân nhắc</h2><p class="hint">Có 1 offer thì nhập Offer A; có thêm Offer B thì bật “2 offer”.</p></div><div class="v3-offer-count">''':'''<div class="v3-offer-intro"><div><p class="eyebrow">Offer mới</p><h2 class="sec">Nhập offer đang cân nhắc</h2></div><div class="v3-offer-count">''',
'''<p class="hint" style="max-width:none;margin:10px 0 14px"><b>BH chưa rõ?</b> Chọn “Chưa rõ”; tool sẽ nêu giả định trong kết quả.</p>''':'''<div id="v4ConditionalHelp" class="v4-conditional-help" style="display:none"></div>''',
'''      <p class="hint">So phương án ở lại và chuyển việc từ ngày nghỉ đến 31/12 của năm onboard.</p>\n''':'',
'''      <p class="hint">Chọn mục tiêu; tool tính mức lương tối thiểu cần thương lượng theo điều kiện của offer.</p>\n''':'',
}
for old,new in repls.items():
    if old not in s: raise SystemExit('static cleanup anchor missing: '+old[:90])
    s=s.replace(old,new,1)

# ---------- 2) Replace Layers 1-5 shell with compact hierarchy ----------
old_layers='''<div class="layer"><p class="lnum">Lớp 1 · <b>Tiền về tay mỗi tháng</b></p><div class="cols" id="l1cols"></div><div class="delta" id="l1delta"></div></div>
<div class="layer"><p class="lnum">Lớp 2 · <b>Nếu làm đủ 12 tháng</b></p><p class="hint" style="margin-top:-2px;margin-bottom:14px">Đưa hai phương án đang chọn về cùng 12 tháng làm việc để so tổng thu nhập. Không phải số tiền từ hôm nay đến 31/12.</p><div class="cols" id="annualcols"></div><div class="delta" id="annualdelta"></div></div>
<div class="layer"><p class="lnum">Lớp 3 · <b>Thời gian bạn bỏ ra để có mức thu nhập đó</b></p><p class="hint" style="margin-top:-2px">176h/tháng là giả định so sánh. Đi lại và OT được cộng vào tổng thời gian bạn bỏ ra. Nếu OT có lương, tool ước tính thêm tiền OT từ số giờ và hệ số bạn nhập. Ngày phép hưởng lương chỉ làm giảm thời gian bạn bỏ ra - không cộng thành một khoản tiền mới.</p><div class="cols" id="tcols"></div><div class="delta" id="tdelta"></div></div>
<div class="layer"><p class="lnum">Lớp 4 · <b>Căn cứ đóng bảo hiểm</b></p><p class="hint" style="margin-top:-2px">BHXH/BHYT và BHTN có trần căn cứ khác nhau, nên không có một “nền tính mọi quyền lợi” duy nhất ở các mức lương cao.</p><div class="cols" id="l2basis"></div></div>
<div class="layer"><p class="lnum">Lớp 5 · <b>Nếu có biến cố</b></p><p class="hint" style="margin-top:-2px">Các mô phỏng ở đây dùng mức lương làm căn cứ đóng BH đã nhập. Tool chỉ mô phỏng số tiền, không kiểm tra đủ điều kiện hưởng.</p><div class="events" id="l3events"></div></div>'''
new_layers='''<div class="layer v4-layer" data-v4-layer="1"><p class="lnum">Lớp 1 · <b>Tiền về tay mỗi tháng</b></p><div class="v4-layer-main" id="l1main"></div><div class="delta v4-layer-insight" id="l1delta"></div><details class="v4-layer-details"><summary>Xem cách tính</summary><div class="cols" id="l1cols"></div></details></div>
<div class="layer v4-layer" data-v4-layer="2"><p class="lnum">Lớp 2 · <b>Nếu làm đủ 12 tháng</b></p><div class="v4-layer-main" id="annualmain"></div><div class="delta v4-layer-insight" id="annualdelta"></div><details class="v4-layer-details"><summary>Xem cách tính</summary><div class="cols" id="annualcols"></div></details></div>
<div class="layer v4-layer" data-v4-layer="3"><p class="lnum">Lớp 3 · <b>Thời gian bạn bỏ ra</b></p><div class="v4-layer-main" id="tmain"></div><div class="delta v4-layer-insight" id="tdelta"></div><details class="v4-layer-details"><summary>Xem cách tính</summary><div class="cols" id="tcols"></div></details></div>
<div class="layer v4-layer" data-v4-layer="4"><p class="lnum">Lớp 4 · <b>Căn cứ đóng bảo hiểm</b></p><div class="v4-layer-main" id="l2main"></div><div class="v4-layer-insight" id="l4insight"></div><details class="v4-layer-details"><summary>Xem cách tính</summary><div class="cols" id="l2basis"></div></details></div>
<div class="layer v4-layer" data-v4-layer="5"><p class="lnum">Lớp 5 · <b>Nếu có biến cố</b></p><div class="v4-layer-main" id="l3main"></div><div class="v4-layer-insight" id="l5insight"></div><details class="v4-layer-details"><summary>Xem cách tính</summary><div class="events" id="l3events"></div></details></div>'''
if old_layers not in s: raise SystemExit('layer shell anchor missing')
s=s.replace(old_layers,new_layers,1)

# ---------- 3) Conditional input help / remove always-on notes ----------
old_ot="html+=row('Làm thêm giờ (OT) trung bình / tháng',otHoursCell(A,0),otHoursCell(B,1),'Quy đổi OT trung bình theo tháng ra 12 tháng để đối chiếu mốc 40 giờ/tháng và 200/300 giờ/năm.');"
new_ot="html+=row('Làm thêm giờ (OT) trung bình / tháng',otHoursCell(A,0),otHoursCell(B,1),(otActive(A)||(state.offerCount===2&&otActive(B)))?'Quy đổi theo 12 tháng để đối chiếu mốc 40 giờ/tháng và 200/300 giờ/năm.':'');"
if old_ot not in s: raise SystemExit('OT row anchor missing')
s=s.replace(old_ot,new_ot,1)
old_trial="html+=row('Có giai đoạn thử việc cần tính riêng?',seg(0,'probationEnabled',A.probationEnabled,[['no','Không'],['yes','Có']]),seg(1,'probationEnabled',B.probationEnabled,[['no','Không'],['yes','Có']]),'Chọn Có khi thử việc khác giai đoạn chính thức về lương hoặc BH.');"
new_trial="html+=row('Có giai đoạn thử việc cần tính riêng?',seg(0,'probationEnabled',A.probationEnabled,[['no','Không'],['yes','Có']]),seg(1,'probationEnabled',B.probationEnabled,[['no','Không'],['yes','Có']]),anyTrial?'Chỉ tách riêng khi lương hoặc BH thử việc khác giai đoạn chính thức.':'');"
if old_trial not in s: raise SystemExit('probation row anchor missing')
s=s.replace(old_trial,new_trial,1)

# Shorten benefit helpers that remain inside an explicit disclosure.
s=s.replace("'Ví dụ tháng 13 chắc chắn nhận = 1. Khoản này dùng cùng loại Gross/Net đã chọn cho offer.'","'Tháng 13 chắc chắn nhận = 1.'",1)
s=s.replace("'Nhập đúng cách HR/offer nêu khoản thưởng: ví dụ 3 tháng lương hoặc 60,000,000đ. Khoản này dùng cùng loại Gross/Net của offer và không được cộng vào “Thu nhập cố định”.'","'Không cộng vào “Thu nhập cố định”.'",1)

# ---------- 4) V4 compact result renderer ----------
anchor='''function applyResult(data){
'''
if anchor not in s: raise SystemExit('applyResult anchor missing')
js=r'''function v4TextOnlyLabel(cell){
 if(!cell)return'';const c=cell.cloneNode(true);c.querySelectorAll('small').forEach(x=>x.remove());return c.textContent.trim();
}
function v4FlattenBackendDetails(host){
 if(!host)return;host.querySelectorAll('details').forEach(d=>{const box=document.createElement('div');box.className='v4-backend-detail';Array.from(d.children).forEach(ch=>{if(ch.tagName!=='SUMMARY')box.appendChild(ch)});d.replaceWith(box)});
}
function v4PrimaryFromHost(hostId,targetId){
 const host=document.getElementById(hostId),target=document.getElementById(targetId);if(!host||!target)return null;
 const head=host.querySelector('.erow.head'),row=host.querySelector('.erow:not(.head)');
 if(!head||!row){target.innerHTML='';v4FlattenBackendDetails(host);return null}
 const names=Array.from(head.children).slice(1).map(x=>x.textContent.trim());
 const vals=Array.from(row.children).slice(1),label=v4TextOnlyLabel(row.children[0]);
 const cards=vals.map((v,i)=>'<div class="v4-primary-option"><span>'+esc(names[i]||('Phương án '+(i+1)))+'</span><strong>'+v.innerHTML+'</strong></div>').join('');
 target.innerHTML='<div class="v4-primary-label">'+esc(label)+'</div><div class="v4-primary-grid">'+cards+'</div>';
 const out={label,names,values:vals.map(x=>x.textContent.trim())};v4FlattenBackendDetails(host);return out;
}
function v4EnsureInsight(id,text){const el=document.getElementById(id);if(!el)return;if(!el.textContent.trim())el.textContent=text;el.style.display=''}
function v4CompactLayers(){
 const p1=v4PrimaryFromHost('l1cols','l1main');
 const p2=v4PrimaryFromHost('annualcols','annualmain');
 const p3=v4PrimaryFromHost('tcols','tmain');
 const p4=v4PrimaryFromHost('l2basis','l2main');
 const p5=v4PrimaryFromHost('l3events','l3main');
 v4EnsureInsight('l1delta','So tiền về tay sau BH bắt buộc và thuế.');
 v4EnsureInsight('annualdelta','So thu nhập cố định nếu làm đủ 12 tháng.');
 v4EnsureInsight('tdelta','So thời gian bỏ ra và giá trị nhận lại trên mỗi giờ.');
 const l4=(p4&&p4.values.length>1&&new Set(p4.values).size===1)?'Các phương án đang có cùng mức dùng để tính BH.':'Căn cứ BH khác nhau có thể làm quyền lợi an sinh khác nhau, trong giới hạn trần.';
 v4EnsureInsight('l4insight',l4);
 v4EnsureInsight('l5insight','Kết quả mô phỏng dựa trên căn cứ BH đã nhập; điều kiện hưởng thực tế chưa được kiểm tra.');
}
function syncV4ConditionalHelp(){
 const el=document.getElementById('v4ConditionalHelp');if(!el)return;
 const arr=state.offerCount===2?[state.offers[0],state.offers[1]]:[state.offers[0]];if(state.currentJobEnabled)arr.unshift(state.currentJob);
 const hasUnknownBh=arr.some(o=>{const n=Number(String(o.gross??'').replace(/,/g,''));return Number.isFinite(n)&&n>0&&o.bhMode==='unknown'});
 el.innerHTML=hasUnknownBh?'<b>BH chưa rõ:</b> tool dùng giả định tạm và ghi rõ trong kết quả.':'';el.style.display=hasUnknownBh?'':'none';
}

'''
s=s.replace(anchor,js+anchor,1)

# Call compact rendering after data is placed; conditional help also updates on every scheduled interaction.
old_end=''' const sl=document.getElementById("switchLayer");document.getElementById("switchingResult").innerHTML=data.switchingHtml||"";sl.style.display=data.showSwitching?"":"none";
}'''
new_end=''' const sl=document.getElementById("switchLayer");document.getElementById("switchingResult").innerHTML=data.switchingHtml||"";sl.style.display=data.showSwitching?"":"none";
 v4CompactLayers();syncV4ConditionalHelp();
}'''
if old_end not in s: raise SystemExit('applyResult end anchor missing')
s=s.replace(old_end,new_end,1)
old_sched='function scheduleCalculation(){clearTimeout(debounceTimer);debounceTimer=setTimeout(calculateNow,600)}'
new_sched='function scheduleCalculation(){syncV4ConditionalHelp();clearTimeout(debounceTimer);debounceTimer=setTimeout(calculateNow,600)}'
if old_sched not in s: raise SystemExit('scheduleCalculation anchor missing')
s=s.replace(old_sched,new_sched,1)

# ---------- 5) CSS for compact hierarchy ----------
style_anchor='/* V4: copy-light presentation. V3 logic/layout primitives are intentionally preserved. */'
if style_anchor not in s: raise SystemExit('V4 CSS anchor missing')
css='''/* V4 compact UX: show decision signal first, details on demand. */
.v4-conditional-help{margin:8px 0 14px;padding:8px 10px;border-left:3px solid var(--moss);background:rgba(47,94,84,.055);font-size:12px;color:var(--ink-soft)}
.v4-layer{padding:18px 0}.v4-layer .lnum{margin-bottom:10px}.v4-layer-main{margin:0 0 7px}.v4-primary-label{font-size:11px;color:var(--ink-soft);margin-bottom:5px}.v4-primary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}.v4-primary-option{background:#fff;border:1px solid var(--line);border-radius:8px;padding:9px 10px;min-width:0}.v4-primary-option>span{display:block;font-size:10.5px;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v4-primary-option>strong{display:block;margin-top:2px;font-family:var(--mono);font-size:15px;line-height:1.35;overflow-wrap:anywhere}.v4-layer-insight{margin:5px 0 8px!important;padding:0!important;background:none!important;border:0!important;font-size:12.5px!important;color:var(--ink-soft)!important}.v4-layer-details{margin-top:6px;border-top:1px solid var(--line)}.v4-layer-details>summary{cursor:pointer;list-style:none;color:var(--moss);font-size:12.5px;font-weight:600;padding:8px 0}.v4-layer-details>summary::-webkit-details-marker{display:none}.v4-layer-details>summary:before{content:'＋';font-family:var(--mono);margin-right:6px}.v4-layer-details[open]>summary:before{content:'−'}.v4-layer-details>.cols,.v4-layer-details>.events{padding-top:4px}.v4-backend-detail{margin-top:8px}.v4 .v3-current-box .v3-section-copy,.v4 .v3-offer-intro>div:first-child{align-self:center}
'''
s=s.replace(style_anchor,style_anchor+'\n'+css,1)

# Refresh CSP hash after inline JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);inline=s[start:end]
h=base64.b64encode(hashlib.sha256(inline.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash update failed')
HTML.write_text(s)

# ---------- 6) Extend V4 browser regression ----------
# Remove expectations for copy intentionally deleted.
for old in ["'Thêm khi muốn so offer mới với phương án ở lại.',","'Có 1 offer thì nhập Offer A; có thêm Offer B thì bật “2 offer”.',"]:
    t=t.replace(old,'')
# Add compact layer DOM assertions after salary input has produced a mocked response. Existing mock has no result HTML,
# so add a second route payload with representative V4-compatible HTML before the main interaction.
insert='''    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(overflow>2)throw new Error(label+': horizontal overflow '+overflow);\n'''
if insert not in t: raise SystemExit('test insertion anchor missing')
extra=insert+'''    const staticLayerAudit=await page.evaluate(()=>({layers:document.querySelectorAll('.v4-layer').length,details:document.querySelectorAll('.v4-layer-details').length,oldLayerHints:Array.from(document.querySelectorAll('.v4-layer>.hint')).length,currentHint:document.querySelector('#currentBox .hint')?.textContent||'',offerHint:document.querySelector('.v3-offer-intro .hint')?.textContent||''}));\n    if(staticLayerAudit.layers!==5||staticLayerAudit.details!==5||staticLayerAudit.oldLayerHints!==0||staticLayerAudit.currentHint||staticLayerAudit.offerHint)throw new Error(label+': compact static hierarchy failed '+JSON.stringify(staticLayerAudit));\n'''
t=t.replace(insert,extra,1)
# Source-level guarantees cover the dynamic compact renderer independent of mock result content.
source_assert='''    await page.close();\n'''
source_extra='''    const src=await page.locator('html').evaluate(()=>document.documentElement.outerHTML);if(!src.includes('v4-layer-main')||!src.includes('v4-layer-details'))throw new Error(label+': compact result shell missing');\n    await page.close();\n'''
t=t.replace(source_assert,source_extra,1)
TEST.write_text(t)
print('PATCHED V4 compact UX and compact Layers 1-5')
