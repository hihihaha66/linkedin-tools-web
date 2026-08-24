from pathlib import Path
import re,base64,hashlib

HTML=Path('net-cao-hon-co-that-tot-hon-v3.html')
TEST=Path('tests/v3-current-offers-responsive.mjs')
s=HTML.read_text(); t=TEST.read_text()

def rep(old,new,label):
    global s
    if old not in s: raise SystemExit('missing HTML anchor: '+label)
    s=s.replace(old,new,1)

# 1) Keep Bối cảnh chung compact in two columns, but make both columns visually balanced.
rep(".ctx{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.25fr);gap:10px;align-items:end;margin-bottom:12px}",
    ".ctx{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:stretch;margin-bottom:12px}",
    'context grid')
rep(".ctx .field>label{min-height:36px;display:flex;align-items:flex-end;margin-bottom:5px;line-height:1.35}",
    ".ctx .field>label{min-height:38px;display:block;margin-bottom:5px;line-height:1.3}.ctx-label-main,.ctx-label-sub{display:block}.ctx-label-sub{color:var(--ink-soft)}.ctx .suffix-row{width:100%}.ctx .suffix-row input{padding-right:58px}",
    'context labels')

# Add a late mobile override so any older compact-context rule cannot reintroduce unequal columns.
mobile_anchor="@media(max-width:540px){.v3-current-box{padding:11px;margin:12px 0 16px}.v3-current-grid{gap:9px}.v3-current-benefits-body{gap:8px}.v3-mode-title{font-size:18px}.v3-pair-btn{font-size:10.5px;padding:6px 8px}.v3-summary-card{padding:8px}.offers-in.one-offer .offer-mrow{grid-template-columns:minmax(104px,39%) minmax(0,61%)}}"
mobile_new="@media(max-width:540px){.v3-current-box{padding:11px;margin:12px 0 16px}.v3-current-grid{gap:9px}.v3-current-benefits-body{gap:8px}.v3-mode-title{font-size:18px}.v3-pair-btn{font-size:10.5px;padding:6px 8px}.v3-summary-card{padding:8px}.offers-in.one-offer .offer-mrow{grid-template-columns:minmax(104px,39%) minmax(0,61%)}.ctx{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ctx .field>label{min-height:38px;font-size:11.5px;line-height:1.3}.ctx input[type=number],.ctx select{font-size:14px;padding-left:9px;padding-right:9px}.ctx .suffix-row input{padding-right:48px}.ctx .suffix-row .suffix{font-size:10.5px;right:8px}}"
rep(mobile_anchor,mobile_new,'mobile context override')

# Explicit two-line labels make both fields share the same visual rhythm without increasing section height.
rep('<div class="field"><label for="deps">Người phụ thuộc (tính thuế)</label><input type="number" id="deps" min="0" step="1" inputmode="numeric" placeholder="0"></div>\n<div class="field"><label for="region">Vùng lương tối thiểu (trần BHTN)</label><select id="region"><option value="I">Vùng I</option><option value="II">Vùng II</option><option value="III">Vùng III</option><option value="IV">Vùng IV</option></select></div>',
    '<div class="field"><label for="deps"><span class="ctx-label-main">Người phụ thuộc</span><span class="ctx-label-sub">(tính thuế)</span></label><div class="suffix-row"><input type="number" id="deps" min="0" step="1" inputmode="numeric" placeholder="Ví dụ: 0"><span class="suffix">người</span></div></div>\n<div class="field"><label for="region"><span class="ctx-label-main">Vùng lương tối thiểu</span><span class="ctx-label-sub">(trần BHTN)</span></label><select id="region"><option value="I">Vùng I</option><option value="II">Vùng II</option><option value="III">Vùng III</option><option value="IV">Vùng IV</option></select></div>',
    'context HTML')

# 2) Complete example + unit pattern in the BHXH simulator.
rep('<div class="bh-compact-row"><label for="sickDays">Số ngày nghỉ ốm</label><div class="bh-control"><input type="number" id="sickDays" min="0" step="1" inputmode="numeric" placeholder="5"></div></div>',
    '<div class="bh-compact-row"><label for="sickDays">Số ngày nghỉ ốm</label><div class="bh-control"><div class="suffix-row"><input type="number" id="sickDays" min="0" step="1" inputmode="numeric" placeholder="Ví dụ: 5"><span class="suffix">ngày</span></div></div></div>',
    'sick-days example and unit')

# 3) Agreed Layer 6 explanation (Option A).
rep('<p class="hint">Giải ngược mức lương cần đạt theo cấu trúc Offer A, Offer B hoặc cả hai. Mốc so sánh lấy trực tiếp từ “Công việc hiện tại”.</p>',
    '<p class="hint">Chọn mục tiêu bạn muốn đạt, tool sẽ tính mức lương tối thiểu cần thương lượng. Các điều kiện khác của từng offer như bảo hiểm, thử việc, thưởng, OT và phụ cấp được giữ nguyên; Công việc hiện tại được dùng để so với phương án ở lại.</p>',
    'Layer 6 intro')

# 4) Ask the user directly which offer should be solved; remove “mức sàn/cấu trúc” jargon.
rep("const templates=[['0',state.offers[0].name||'Offer A']];if(state.offerCount===2){templates.push(['1',state.offers[1].name||'Offer B'],['both','Cả hai - tính riêng từng cấu trúc'])}if(!templates.some(x=>x[0]===sol.templateOffer))sol.templateOffer=templates[0][0];",
    "const templates=[['0',state.offers[0].name||'Offer A']];if(state.offerCount===2){templates.push(['1',state.offers[1].name||'Offer B'],['both','Cả hai'])}if(!templates.some(x=>x[0]===sol.templateOffer))sol.templateOffer=templates[0][0];",
    'Layer 6 template options')
rep("  +'<div class=\"field solver-wide\"><label>Tính mức sàn theo cấu trúc nào?</label><select data-sol=\"templateOffer\">'+templates.map(x=>'<option value=\"'+x[0]+'\" '+(sol.templateOffer===x[0]?'selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select><p class=\"solver-note\">Nếu chọn Cả hai, tool tính riêng mức sàn cho từng offer theo bảo hiểm, thử việc, thưởng, OT và phụ cấp đã nhập.</p></div>'",
    "  +'<div class=\"field solver-wide\"><label>Bạn cần tìm mức lương tối thiểu cho offer nào?</label><select data-sol=\"templateOffer\">'+templates.map(x=>'<option value=\"'+x[0]+'\" '+(sol.templateOffer===x[0]?'selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select><p class=\"solver-note\">Tool giữ nguyên bảo hiểm, thử việc, thưởng, OT và phụ cấp của offer được chọn, rồi chỉ thay đổi mức lương để tìm mức tối thiểu đạt các mục tiêu bên dưới. Nếu chọn Cả hai, tool tính riêng cho từng offer.</p></div>'",
    'Layer 6 offer question/helper')
s=s.replace('mức sàn chính dựa trên phần cố định/đảm bảo','mức lương tối thiểu chính dựa trên phần cố định/đảm bảo')

# Recompute CSP hash after inline-JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
HTML.write_text(s)

# Browser regression: two-column compact context must be truly balanced on phone widths.
anchor="  if(!(await page.locator('#offersIn').evaluate(e=>e.classList.contains('one-offer'))))throw new Error(label+': default should be one offer');\n"
extra=anchor+"""  const ctxAudit=await page.evaluate(()=>{
    const ctx=document.querySelector('.ctx'),fields=[...ctx.querySelectorAll(':scope > .field')];
    const fr=fields.map(f=>f.getBoundingClientRect()),lr=fields.map(f=>f.querySelector('label').getBoundingClientRect()),cr=fields.map(f=>f.querySelector('input,select').getBoundingClientRect());
    return{height:ctx.getBoundingClientRect().height,fieldWidths:fr.map(r=>r.width),labelY:lr.map(r=>r.y),labelH:lr.map(r=>r.height),controlY:cr.map(r=>r.y),controlH:cr.map(r=>r.height),depsPlaceholder:document.querySelector('#deps').placeholder,depsUnit:document.querySelector('#deps').parentElement.querySelector('.suffix')?.textContent||''};
  });
  if(Math.abs(ctxAudit.fieldWidths[0]-ctxAudit.fieldWidths[1])>2)throw new Error(label+': context columns not balanced '+ctxAudit.fieldWidths.join('/'));
  if(Math.abs(ctxAudit.controlY[0]-ctxAudit.controlY[1])>2||Math.abs(ctxAudit.controlH[0]-ctxAudit.controlH[1])>2)throw new Error(label+': context controls not aligned');
  if(Math.abs(ctxAudit.labelH[0]-ctxAudit.labelH[1])>2)throw new Error(label+': context labels not equal height');
  if(label.startsWith('mobile')&&ctxAudit.height>90)throw new Error(label+': compact context became too tall '+ctxAudit.height+'px');
  if(ctxAudit.depsPlaceholder!=='Ví dụ: 0'||ctxAudit.depsUnit!=='người')throw new Error(label+': dependent example/unit missing');
  await page.locator('#bhSim summary').click();
  const sickAudit=await page.evaluate(()=>({placeholder:document.querySelector('#sickDays').placeholder,unit:document.querySelector('#sickDays').parentElement.querySelector('.suffix')?.textContent||''}));
  if(sickAudit.placeholder!=='Ví dụ: 5'||sickAudit.unit!=='ngày')throw new Error(label+': sick-days example/unit missing');
  await page.locator('#bhSim summary').click();
"""
if anchor not in t: raise SystemExit('responsive context audit anchor missing')
t=t.replace(anchor,extra,1)

# Layer 6 wording regression.
anchor2="  await page.locator('#solverEnabledSeg [data-v=\"on\"]').click();\n"
extra2=anchor2+"""  const solverIntro=(await page.locator('#solverBox .solver-copy .hint').innerText()).trim();
  const expectedIntro='Chọn mục tiêu bạn muốn đạt, tool sẽ tính mức lương tối thiểu cần thương lượng. Các điều kiện khác của từng offer như bảo hiểm, thử việc, thưởng, OT và phụ cấp được giữ nguyên; Công việc hiện tại được dùng để so với phương án ở lại.';
  if(solverIntro!==expectedIntro)throw new Error(label+': Layer 6 intro mismatch: '+solverIntro);
  const solverQuestion=(await page.locator('#solverFields .solver-wide label').first().innerText()).trim();
  if(solverQuestion!=='Bạn cần tìm mức lương tối thiểu cho offer nào?')throw new Error(label+': Layer 6 offer question mismatch: '+solverQuestion);
  const solverHelper=(await page.locator('#solverFields .solver-wide .solver-note').first().innerText()).trim();
  const expectedHelper='Tool giữ nguyên bảo hiểm, thử việc, thưởng, OT và phụ cấp của offer được chọn, rồi chỉ thay đổi mức lương để tìm mức tối thiểu đạt các mục tiêu bên dưới. Nếu chọn Cả hai, tool tính riêng cho từng offer.';
  if(solverHelper!==expectedHelper)throw new Error(label+': Layer 6 offer helper mismatch: '+solverHelper);
  const solverOptions=await page.locator('#solverFields select[data-sol="templateOffer"] option').allTextContents();
  if(solverOptions.some(x=>x.includes('cấu trúc')||x.includes('mức sàn')))throw new Error(label+': Layer 6 option still uses jargon '+solverOptions.join(' | '));
"""
if anchor2 not in t: raise SystemExit('Layer 6 wording test anchor missing')
t=t.replace(anchor2,extra2,1)
TEST.write_text(t)
print('PATCHED V3 compact context + units + Layer 6 explanation/question')
