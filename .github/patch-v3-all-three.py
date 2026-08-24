from pathlib import Path
import re,base64,hashlib

HTML=Path('net-cao-hon-co-that-tot-hon-v3.html')
TEST=Path('tests/v3-current-offers-responsive.mjs')
s=HTML.read_text(); t=TEST.read_text()

def one(old,new,label):
    global s
    if old not in s: raise SystemExit('missing HTML anchor: '+label)
    s=s.replace(old,new,1)

# Compact 3-option matrix and selector helper.
css_anchor='.v3-pair-btn.on{border-color:var(--moss);background:rgba(47,94,84,.08);color:var(--moss)}'
css_add=css_anchor+".v3-pair-btn.all{font-weight:700}.v3-pair-note{font-size:10.8px;line-height:1.45;color:var(--ink-soft);margin:5px 0 0}.v3-three-matrix .erow{grid-template-columns:minmax(100px,1.15fr) repeat(3,minmax(0,1fr));gap:6px;padding:10px}.v3-three-matrix .erow>*{min-width:0;overflow-wrap:anywhere}.v3-three-matrix .erow.head span:not(:first-child){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v3-three-value{display:block;font-family:var(--mono);font-size:11.5px;line-height:1.35;overflow-wrap:anywhere}.v3-three-value.strong{font-weight:600}.v3-three-value.best{color:var(--moss);font-weight:600}.v3-three-matrix .lbl small{font-size:10px;line-height:1.35}"
one(css_anchor,css_add,'selector/triple css')
mobile_anchor='@media(max-width:540px){.v3-current-box{padding:11px;margin:12px 0 16px}.v3-current-grid{gap:9px}.v3-current-benefits-body{gap:8px}.v3-mode-title{font-size:18px}.v3-pair-btn{font-size:10.5px;padding:6px 8px}.v3-summary-card{padding:8px}.offers-in.one-offer .offer-mrow{grid-template-columns:minmax(104px,39%) minmax(0,61%)}.ctx{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ctx .field>label{min-height:38px;font-size:11.5px;line-height:1.3}.ctx input[type=number],.ctx select{font-size:14px;padding-left:9px;padding-right:9px}.ctx .suffix-row input{padding-right:48px}.ctx .suffix-row .suffix{font-size:10.5px;right:8px}.diag-item,.diag-constraint{align-items:flex-start;gap:7px}.diag-action{font-size:10.5px;padding:6px 7px}.diag-copy>b{font-size:12px}.diag-path{font-size:10px}.diag-constraint .diag-action{min-width:72px}}'
mobile_new=mobile_anchor[:-1]+".v3-three-matrix .erow{grid-template-columns:minmax(82px,1.08fr) repeat(3,minmax(0,1fr));gap:4px;padding:8px 5px;font-size:10px}.v3-three-matrix .erow.head{font-size:8.5px}.v3-three-value{font-size:9.6px}.v3-three-matrix .lbl small{font-size:8.5px}.v3-pair-note{font-size:9.8px}}"
one(mobile_anchor,mobile_new,'mobile triple css')

# Hint lives directly under the view selector, above Layer 1.
old='<div class="v3-results-head"><div id="v3Summary"></div><h2 class="v3-mode-title" id="v3ModeTitle"></h2><div class="v3-pairs" id="v3Pairs"></div></div>'
new='<div class="v3-results-head"><div id="v3Summary"></div><h2 class="v3-mode-title" id="v3ModeTitle"></h2><div class="v3-pairs" id="v3Pairs"></div><p class="v3-pair-note" id="v3PairHint"></p></div>'
one(old,new,'pair hint container')

old='function ensureComparison(x){const raw=x||{},ok=v=>["current","0","1"].includes(v)?v:null;return{left:ok(raw.left),right:ok(raw.right)}}'
new='function ensureComparison(x){const raw=x||{},ok=v=>["current","0","1"].includes(v)?v:null;return{left:ok(raw.left),right:ok(raw.right),mode:raw.mode==="all"?"all":"pair"}}'
one(old,new,'comparison normalization')
old='comparison:{left:null,right:null},switching:blankSwitch(),solver:blankSolver()'
new='comparison:{left:null,right:null,mode:"pair"},switching:blankSwitch(),solver:blankSolver()'
one(old,new,'default comparison mode')

old="function renderV3ResultHead(data){document.getElementById('v3Summary').innerHTML=data&&data.summaryHtml||'';document.getElementById('v3ModeTitle').textContent=data&&data.modeTitle||'';const host=document.getElementById('v3Pairs');host.innerHTML='';const opts=(data&&data.availableOptions)||[],pair=data&&data.comparison||{};if(opts.length<3)return;for(let i=0;i<opts.length;i++)for(let j=i+1;j<opts.length;j++){const a=opts[i],b=opts[j],btn=document.createElement('button');btn.type='button';btn.className='v3-pair-btn'+(((pair.left===a.id&&pair.right===b.id)||(pair.left===b.id&&pair.right===a.id))?' on':'');btn.textContent=a.name+' ↔ '+b.name;btn.dataset.left=a.id;btn.dataset.right=b.id;host.appendChild(btn)}}"
new="function renderV3ResultHead(data){document.getElementById('v3Summary').innerHTML=data&&data.summaryHtml||'';document.getElementById('v3ModeTitle').textContent=data&&data.modeTitle||'';const host=document.getElementById('v3Pairs'),hint=document.getElementById('v3PairHint');host.innerHTML='';hint.textContent='';const opts=(data&&data.availableOptions)||[],pair=data&&data.comparison||{},allMode=data&&data.comparisonMode==='all';if(opts.length<3)return;const all=document.createElement('button');all.type='button';all.className='v3-pair-btn all'+(allMode?' on':'');all.textContent='Cả 3';all.dataset.view='all';host.appendChild(all);for(let i=0;i<opts.length;i++)for(let j=i+1;j<opts.length;j++){const a=opts[i],b=opts[j],btn=document.createElement('button');btn.type='button';btn.className='v3-pair-btn'+(!allMode&&((pair.left===a.id&&pair.right===b.id)||(pair.left===b.id&&pair.right===a.id))?' on':'');btn.textContent=a.name+' ↔ '+b.name;btn.dataset.view='pair';btn.dataset.left=a.id;btn.dataset.right=b.id;host.appendChild(btn)}hint.textContent=allMode?'Đang xem nhanh cả 3 ở Lớp 1-5. Chọn một cặp để xem chênh lệch và cách tính chi tiết.':'Lựa chọn này áp dụng đồng bộ cho Lớp 1-5.'}"
one(old,new,'render selector with all mode')

old="document.getElementById('v3Pairs').addEventListener('click',function(e){const b=e.target.closest('.v3-pair-btn');if(!b)return;state.comparison={left:b.dataset.left,right:b.dataset.right};markDirty();scheduleCalculation()});"
new="document.getElementById('v3Pairs').addEventListener('click',function(e){const b=e.target.closest('.v3-pair-btn');if(!b)return;if(b.dataset.view==='all')state.comparison={...state.comparison,mode:'all'};else state.comparison={left:b.dataset.left,right:b.dataset.right,mode:'pair'};markDirty();scheduleCalculation()});"
one(old,new,'selector click mode')

# CSP follows inline script edits.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
HTML.write_text(s)

# Mock API now exposes a distinct marker for every selected view so browser QA can prove all Layers 1-5 switch together.
route_old="""  await page.route('**/api/offer-value-v3',async route=>{let body={};try{body=route.request().postDataJSON()}catch{}bodies.push(body);const avail=[];if(body.currentJobEnabled&&Number(String(body.currentJob?.gross||'').replace(/,/g,''))>0)avail.push({id:'current',name:body.currentJob?.name||'Công việc hiện tại',kind:'current'});if(Number(String(body.offers?.[0]?.gross||'').replace(/,/g,''))>0)avail.push({id:'0',name:body.offers?.[0]?.name||'Offer A',kind:'offer'});if(body.offerCount===2&&Number(String(body.offers?.[1]?.gross||'').replace(/,/g,''))>0)avail.push({id:'1',name:body.offers?.[1]?.name||'Offer B',kind:'offer'});const pair=body.comparison?.left&&body.comparison?.right?body.comparison:{left:avail[0]?.id||null,right:avail[1]?.id||null};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({hasResults:avail.length>0,v3:true,modeTitle:avail.length===3?'Ở lại, chọn A hay B?':'So sánh phương án',summaryHtml:'<div class=\"v3-summary\"><div class=\"v3-summary-grid\">'+avail.map(x=>'<div class=\"v3-summary-card\">'+x.name+'</div>').join('')+'</div></div>',availableOptions:avail,comparison:pair,showPairSelector:avail.length>2,l1cols:'',l1delta:'',showL1Delta:false,annualcols:'',annualdelta:'',showAnnualDelta:false,tcols:'',tdelta:'',showTDelta:false,l2basis:'',l3events:'',verdictHtml:'<p>V3 verdict</p>',showAssumptions:false,assumptionsHtml:'',showSwitching:false,switchingHtml:'',showLayer6:false,layer6Html:'',exportText:'V3'})});});
"""
route_new="""  await page.route('**/api/offer-value-v3',async route=>{let body={};try{body=route.request().postDataJSON()}catch{}bodies.push(body);const avail=[];if(body.currentJobEnabled&&Number(String(body.currentJob?.gross||'').replace(/,/g,''))>0)avail.push({id:'current',name:body.currentJob?.name||'Công việc hiện tại',kind:'current'});if(Number(String(body.offers?.[0]?.gross||'').replace(/,/g,''))>0)avail.push({id:'0',name:body.offers?.[0]?.name||'Offer A',kind:'offer'});if(body.offerCount===2&&Number(String(body.offers?.[1]?.gross||'').replace(/,/g,''))>0)avail.push({id:'1',name:body.offers?.[1]?.name||'Offer B',kind:'offer'});const rawPair=body.comparison?.left&&body.comparison?.right?body.comparison:{left:avail[0]?.id||null,right:avail[1]?.id||null},pair={left:rawPair.left,right:rawPair.right},comparisonMode=body.comparison?.mode==='all'&&avail.length===3?'all':'pair',marker=comparisonMode==='all'?'ALL':String(pair.left)+'~'+String(pair.right),layer=n=>'<div class=\"'+(comparisonMode==='all'?'v3-three-matrix':'')+'\" data-view=\"'+marker+'\">L'+n+' '+marker+'</div>';await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({hasResults:avail.length>0,v3:true,modeTitle:avail.length===3?'Ở lại, chọn A hay B?':'So sánh phương án',summaryHtml:'<div class=\"v3-summary\"><div class=\"v3-summary-grid\">'+avail.map(x=>'<div class=\"v3-summary-card\">'+x.name+'</div>').join('')+'</div></div>',availableOptions:avail,comparison:pair,comparisonMode,showPairSelector:avail.length>2,l1cols:layer(1),l1delta:'L1 delta '+marker,showL1Delta:true,annualcols:layer(2),annualdelta:'L2 delta '+marker,showAnnualDelta:true,tcols:layer(3),tdelta:'L3 delta '+marker,showTDelta:true,l2basis:layer(4),l3events:layer(5),verdictHtml:'<p>V3 verdict '+marker+'</p>',showAssumptions:false,assumptionsHtml:'',showSwitching:false,switchingHtml:'',showLayer6:false,layer6Html:'',exportText:'V3'})});});
"""
if route_old not in t: raise SystemExit('mock route anchor missing')
t=t.replace(route_old,route_new,1)

# Insert synchronized view tests after the three-option input exists.
anchor_test="""  const body=bodies.at(-1);if(body.offerCount!==2)throw new Error(label+': offerCount=2 missing');if(!body.currentJob||!Array.isArray(body.offers))throw new Error(label+': V3 state shape invalid');
"""
extra_test=anchor_test+"""  const selectorLabels=await page.locator('#v3Pairs .v3-pair-btn').allTextContents();if(selectorLabels.length!==4||selectorLabels[0]!=='Cả 3')throw new Error(label+': expected Cả 3 + three pair buttons, got '+selectorLabels.join(' | '));
  await page.locator('#v3Pairs [data-view="all"]').click();await page.waitForTimeout(750);
  if(bodies.at(-1)?.comparison?.mode!=='all')throw new Error(label+': Cả 3 mode not sent to API');
  for(const id of ['l1cols','annualcols','tcols','l2basis','l3events']){const txt=(await page.locator('#'+id).innerText()).trim();if(!txt.includes('ALL'))throw new Error(label+': '+id+' did not switch to Cả 3');}
  const allHint=(await page.locator('#v3PairHint').innerText()).trim();if(!allHint.includes('Lớp 1-5'))throw new Error(label+': all-three helper missing synchronized-layer copy');
  const allOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(allOverflow>2)throw new Error(label+': all-three view caused horizontal overflow '+allOverflow);
  await page.locator('#v3Pairs [data-left="current"][data-right="1"]').click();await page.waitForTimeout(750);
  const pairBody=bodies.at(-1);if(pairBody?.comparison?.mode!=='pair'||pairBody?.comparison?.left!=='current'||pairBody?.comparison?.right!=='1')throw new Error(label+': pair selection state not synchronized');
  for(const id of ['l1cols','annualcols','tcols','l2basis','l3events']){const txt=(await page.locator('#'+id).innerText()).trim();if(!txt.includes('current~1'))throw new Error(label+': '+id+' did not synchronize to Current/B pair');}
  const pairHint=(await page.locator('#v3PairHint').innerText()).trim();if(pairHint!=='Lựa chọn này áp dụng đồng bộ cho Lớp 1-5.')throw new Error(label+': pair synchronization helper mismatch: '+pairHint);
"""
if anchor_test not in t: raise SystemExit('three-option browser test anchor missing')
t=t.replace(anchor_test,extra_test,1)
TEST.write_text(t)
print('PATCHED V3 all-three frontend')
