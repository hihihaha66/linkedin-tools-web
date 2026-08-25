from pathlib import Path
import re,base64,hashlib

HTML=Path('net-cao-hon-co-that-tot-hon-v3.html')
TEST=Path('tests/v3-ui-component-labels.mjs')
s=HTML.read_text()

# 1) CSS: annotation mode is overlay-only, so it never changes normal layout.
css_anchor=".save-state{font-family:var(--mono);font-size:12px;color:var(--ink-soft)}"
if css_anchor not in s: raise SystemExit('CSS anchor missing')
css_add=css_anchor+"""
#uiLabelsOverlay{position:absolute;inset:0 0 auto 0;width:100%;height:0;pointer-events:none;z-index:9998}.ui-tag-target{outline:1px dashed rgba(47,94,84,.72)!important;outline-offset:2px!important}.ui-dev-tag{position:absolute;z-index:9999;pointer-events:none;background:#23211C;color:#fff;border-radius:4px;padding:2px 5px;font:500 9px/1.25 var(--mono);white-space:nowrap;max-width:calc(100vw - 8px);overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 3px rgba(0,0,0,.18)}body.ui-label-mode #uiLabelBtn{background:var(--moss);color:#fff}
"""
s=s.replace(css_anchor,css_add,1)

# 2) Toggle button in bottom toolbar. Default UI stays clean until user explicitly enables it.
html_anchor='<button class="btn ghost tiny" id="backupBtn">↓ Tải dữ liệu (.json)</button>\n<span class="save-state" id="saveState"></span>'
if html_anchor not in s: raise SystemExit('Bottom toolbar anchor missing')
html_new='<button class="btn ghost tiny" id="backupBtn">↓ Tải dữ liệu (.json)</button>\n<button class="btn ghost tiny" id="uiLabelBtn" aria-pressed="false" title="Hiện tên component và action thường dùng khi mô tả cho PO/Dev">Nhãn PO/Dev</button>\n<span class="save-state" id="saveState"></span>\n<div id="uiLabelsOverlay" aria-hidden="true"></div>'
s=s.replace(html_anchor,html_new,1)

# 3) Component dictionary + overlay renderer.
js_anchor='document.getElementById("saveBtn").addEventListener("click",doSave);'
if js_anchor not in s: raise SystemExit('JS event anchor missing')
js_block=r'''let uiLabelMode=false,uiLabelRaf=0;
const UI_COMPONENT_RULES=[
  ['#importBtn','Button | import/upload'],
  ['#clearBtn','Button | clear/delete'],
  ['#saveBtn','Button | save'],
  ['#exportBtn','Button | export/download'],
  ['#backupBtn','Button | export/download JSON'],
  ['#uiLabelBtn','Button | toggle labels'],
  ['.seg','Segmented control | select/toggle'],
  ['input[type="checkbox"]','Checkbox | check/uncheck'],
  ['input[type="date"]','Date picker | select date'],
  ['input[type="number"]','Number input | enter/edit'],
  ['input[type="text"].name-in','Text input | enter/edit name'],
  ['input[type="text"]:not(.name-in)','Text input | enter/edit'],
  ['select','Select / Dropdown | select option'],
  ['details > summary','Accordion / Disclosure | expand/collapse'],
  ['.offer-matrix,.v3-current-matrix','Matrix / Table | input/compare'],
  ['#l1cols .events,#annualcols .events,#tcols .events,#l2basis .events,#l3events .events','Comparison table | read/compare'],
  ['.switch-result,.solver-result,.v3-summary-card','Result card | read result'],
  ['.solver-goal','Goal card | enable/set target'],
  ['.empty','Empty state | read next action']
];
function clearUiLabels(){
  document.querySelectorAll('.ui-tag-target').forEach(el=>el.classList.remove('ui-tag-target'));
  const overlay=document.getElementById('uiLabelsOverlay');if(overlay)overlay.replaceChildren();
}
function uiVisible(el){const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden'}
function renderUiLabels(){
  uiLabelRaf=0;if(!uiLabelMode)return;
  clearUiLabels();const overlay=document.getElementById('uiLabelsOverlay');if(!overlay)return;
  const seen=new Set();
  UI_COMPONENT_RULES.forEach(([selector,label])=>document.querySelectorAll(selector).forEach(el=>{
    if(seen.has(el)||el===overlay||el.closest('#uiLabelsOverlay')||!uiVisible(el))return;seen.add(el);el.classList.add('ui-tag-target');
    const r=el.getBoundingClientRect(),tag=document.createElement('span');tag.className='ui-dev-tag';tag.textContent=label;tag.dataset.for=selector;overlay.appendChild(tag);
    const y=Math.max(window.scrollY+2,r.top+window.scrollY-15);let x=r.left+window.scrollX+2;tag.style.top=y+'px';tag.style.left=x+'px';
    const maxX=window.scrollX+document.documentElement.clientWidth-tag.offsetWidth-4;x=Math.max(window.scrollX+4,Math.min(x,maxX));tag.style.left=x+'px';
  }));
}
function scheduleUiLabels(){if(!uiLabelMode||uiLabelRaf)return;uiLabelRaf=requestAnimationFrame(renderUiLabels)}
function setUiLabelMode(on){
  uiLabelMode=!!on;document.body.classList.toggle('ui-label-mode',uiLabelMode);const btn=document.getElementById('uiLabelBtn');btn.setAttribute('aria-pressed',uiLabelMode?'true':'false');btn.textContent=uiLabelMode?'Ẩn nhãn':'Nhãn PO/Dev';
  if(uiLabelMode)renderUiLabels();else clearUiLabels();
}
document.getElementById('uiLabelBtn').addEventListener('click',()=>setUiLabelMode(!uiLabelMode));
window.addEventListener('scroll',scheduleUiLabels,{passive:true});window.addEventListener('resize',scheduleUiLabels,{passive:true});
document.addEventListener('toggle',scheduleUiLabels,true);
new MutationObserver(scheduleUiLabels).observe(document.querySelector('.wrap'),{childList:true,subtree:true});

'''
s=s.replace(js_anchor,js_block+js_anchor,1)

# CSP hash must match changed inline script.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
HTML.write_text(s)

# 4) Dedicated regression for terminology mode, mobile overflow and dynamic components.
TEST.write_text(r'''import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  for(const [label,width,height] of [['desktop',1280,900],['mobile',375,812]]){
    const page=await browser.newPage({viewport:{width,height}});
    await page.route('**/api/offer-value-v3',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({hasResults:false,v3:true,availableOptions:[],comparison:{left:null,right:null},showPairSelector:false,showSwitching:false,showLayer6:false})}));
    await page.goto('http://127.0.0.1:8000/net-cao-hon-co-that-tot-hon-v3.html',{waitUntil:'domcontentloaded'});
    const btn=page.locator('#uiLabelBtn');if(await btn.count()!==1)throw new Error(label+': missing PO/Dev label toggle');
    if(await btn.getAttribute('aria-pressed')!=='false')throw new Error(label+': labels must default off');
    if(await page.locator('.ui-dev-tag').count())throw new Error(label+': labels visible before opt-in');
    await btn.click();await page.waitForTimeout(80);
    if(await btn.getAttribute('aria-pressed')!=='true'||(await btn.innerText()).trim()!=='Ẩn nhãn')throw new Error(label+': toggle did not activate');
    const tags=await page.locator('.ui-dev-tag').allTextContents();
    for(const must of ['Button | import/upload','Number input | enter/edit','Select / Dropdown | select option','Accordion / Disclosure | expand/collapse','Segmented control | select/toggle','Matrix / Table | input/compare'])if(!tags.includes(must))throw new Error(label+': missing terminology tag '+must+'; got '+tags.join(' || '));
    const outlined=await page.locator('.ui-tag-target').count();if(outlined<6)throw new Error(label+': too few components annotated '+outlined);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(overflow>2)throw new Error(label+': annotation overlay caused horizontal overflow '+overflow);
    await page.locator('#bhSim summary').click();await page.waitForTimeout(80);
    const afterOpen=await page.locator('.ui-dev-tag').allTextContents();if(!afterOpen.includes('Number input | enter/edit'))throw new Error(label+': newly visible accordion control not annotated');
    await btn.click();await page.waitForTimeout(30);if(await page.locator('.ui-dev-tag').count())throw new Error(label+': labels not cleared after toggle off');if(await page.locator('.ui-tag-target').count())throw new Error(label+': outlines not cleared after toggle off');
    await page.close();
  }
  console.log('PASS V3 PO/Dev component label mode');
}finally{await browser.close()}
''')
print('PATCHED V3 PO/Dev component label mode')
