from pathlib import Path
import shutil,re,base64,hashlib

SRC=Path('net-cao-hon-co-that-tot-hon-v2.html')
DST=Path('net-cao-hon-co-that-tot-hon-v3.html')
shutil.copyfile(SRC,DST)
s=DST.read_text()

# V3 identity and independent state/API.
s=s.replace('<title>Net cao hơn có thật tốt hơn? - Offer Comparison V2</title>','<title>Net cao hơn có thật tốt hơn? - Career Options V3</title>')
s=s.replace('const KEY="net-cao-hon-v2-state";','const KEY="net-cao-hon-v3-state";')
s=s.replace('const LEGACY_KEY="net-cao-hon-v2";','const LEGACY_KEY="net-cao-hon-v3";')
s=s.replace('const API_URL="https://linkedin-tools-api-test.vercel.app/api/offer-value-v2";','const API_URL="https://linkedin-tools-api-test.vercel.app/api/offer-value-v3";')
s=s.replace('const t="__v2_state"','const t="__v3_state"')
s=s.replace('so-2-offer-v2.txt','career-options-v3.txt').replace('net-cao-hon-v2-du-lieu.json','career-options-v3-du-lieu.json')

# V3 CSS appended so V2 styling remains the stable base.
css=r'''
/* V3: Current Job + up to 2 offers, while detailed matrices remain pairwise. */
.v3-current-box{margin:14px 0 22px;background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:14px}.v3-section-head{display:flex;gap:16px;align-items:flex-start;justify-content:space-between}.v3-section-copy{min-width:0;flex:1}.v3-section-actions{flex:0 0 190px}.v3-current-fields{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}.v3-current-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px 14px}.v3-current-grid .wide{grid-column:1/-1}.v3-current-grid .field{margin:0}.v3-current-benefits{grid-column:1/-1;border:1px solid var(--line);border-radius:8px;padding:0 10px}.v3-current-benefits summary{cursor:pointer;color:var(--moss);font-weight:600;padding:9px 0}.v3-current-benefits-body{padding:2px 0 10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px}.v3-mini-pair{display:grid;grid-template-columns:minmax(0,1fr) 82px;gap:6px}.v3-offer-intro{display:flex;gap:16px;justify-content:space-between;align-items:flex-start}.v3-offer-count{flex:0 0 210px}.offers-in.one-offer .offer-mrow{grid-template-columns:minmax(118px,42%) minmax(0,58%)}.offers-in.one-offer .offer-mrow>.offer-mcell:nth-child(3){display:none}.v3-results-head{margin-bottom:14px}.v3-mode-title{font-family:var(--serif);font-size:21px;margin:0 0 9px}.v3-pairs{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 2px}.v3-pair-btn{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 10px;font:600 11.5px var(--sans);color:var(--ink);cursor:pointer}.v3-pair-btn.on{border-color:var(--moss);background:rgba(47,94,84,.08);color:var(--moss)}.v3-summary{margin:0 0 14px}.v3-summary-title{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft);margin-bottom:7px}.v3-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.v3-summary-card{border:1px solid var(--line);border-radius:9px;padding:10px;background:#fff;min-width:0}.v3-summary-name{font-weight:600;font-size:12px;display:flex;gap:6px;align-items:center;min-width:0}.v3-badge{font:600 9px var(--mono);padding:2px 5px;border-radius:999px;background:var(--paper-2);color:var(--moss)}.v3-summary-card strong{display:block;font:600 14px var(--mono);margin:5px 0}.v3-summary-card span:not(.v3-badge){display:block;font-size:10.5px;line-height:1.45;color:var(--ink-soft);overflow-wrap:anywhere}.v3-baseline-note{padding:8px 10px;border-radius:7px;background:var(--paper-2);font-size:11px;line-height:1.5;color:var(--ink-soft)}.v3-solver-wrap{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.v3-solver-wrap>.solver-foot{grid-column:1/-1}.v3-solver-card{min-width:0}.solver-actual{font-size:12px;line-height:1.5}.v3-hidden{display:none!important}
@media(max-width:700px){.v3-section-head,.v3-offer-intro{display:block}.v3-section-actions,.v3-offer-count{width:auto;margin-top:10px}.v3-current-grid{grid-template-columns:1fr}.v3-current-grid .wide,.v3-current-benefits{grid-column:auto}.v3-current-benefits-body{grid-template-columns:1fr}.v3-summary-grid{grid-template-columns:1fr}.v3-summary-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 8px;align-items:start}.v3-summary-card strong{margin:0;text-align:right}.v3-summary-card span:not(.v3-badge){grid-column:1/-1}.v3-solver-wrap{grid-template-columns:1fr}.v3-solver-wrap>.solver-foot{grid-column:auto}}
@media(max-width:540px){.v3-current-box{padding:11px;margin:12px 0 16px}.v3-current-grid{gap:9px}.v3-current-benefits-body{gap:8px}.v3-mode-title{font-size:18px}.v3-pair-btn{font-size:10.5px;padding:6px 8px}.v3-summary-card{padding:8px}.offers-in.one-offer .offer-mrow{grid-template-columns:minmax(104px,39%) minmax(0,61%)}}
'''
s=s.replace('</style>',css+'\n</style>',1)

# Header copy reflects new mental model.
s=s.replace('<p class="sub">Chênh vài triệu net mỗi tháng chưa nói hết một offer. Đi lại thêm bao nhiêu giờ, lên văn phòng mấy ngày, OT thế nào, thử việc bao lâu, BH tính trên mức nào - mấy phần này mới hay bị bỏ quên lúc so.</p>','<p class="sub">So công việc hiện tại với một hoặc hai offer mới - hoặc chỉ so hai offer với nhau. Tool đưa tiền, thời gian, bảo hiểm và tác động khi chuyển việc về cùng một khung để bạn thấy mình đang đổi gì lấy gì.</p>',1)

# Insert Current Job first-class profile and optional Offer B control.
old='<p class="eyebrow">Hai offer</p>\n<h2 class="sec">Nhập hai offer để so sánh</h2>\n<p class="hint">Gross hay net đều được - chọn đúng loại ở mỗi offer. Nếu nhập net, tool sẽ tự quy đổi theo thuế TNCN áp dụng cho kỳ tính thuế 2026. Các mục thưởng, phụ cấp và phúc lợi được thu gọn bên dưới để bạn chỉ mở khi cần.</p>\n<div class="offers-in" id="offersIn"></div>'
new='''<div class="v3-current-box" id="currentBox">
  <div class="v3-section-head"><div class="v3-section-copy"><p class="eyebrow">Baseline</p><h2 class="sec">Công việc hiện tại</h2><p class="hint">Thêm khi bạn muốn biết offer mới có thực sự đáng để rời công việc hiện tại hay không. Không cần nhập lại lương hiện tại ở phần chuyển việc.</p></div><div class="v3-section-actions"><label>Dùng Công việc hiện tại</label><div class="seg" id="currentEnabledSeg"><button data-v="on">Thêm</button><button data-v="off" class="on">Bỏ qua</button></div></div></div>
  <div class="v3-current-fields" id="currentFields" style="display:none"></div>
</div>
<div class="v3-offer-intro"><div><p class="eyebrow">Offer mới</p><h2 class="sec">Nhập offer đang cân nhắc</h2><p class="hint">Có một offer thì chỉ nhập Offer A. Khi có Offer B, bật “2 offer” để so A/B hoặc so từng offer với công việc hiện tại.</p></div><div class="v3-offer-count"><label>Bạn đang có</label><div class="seg" id="offerCountSeg"><button data-v="1" class="on">1 offer</button><button data-v="2">2 offer</button></div></div></div>
<div class="offers-in one-offer" id="offersIn"></div>'''
if old not in s: raise SystemExit('offer intro anchor missing')
s=s.replace(old,new,1)

# Results get a global option summary and pair selector before Layers 1-5.
old='<div class="results hidden" id="results">\n<div class="layer"><p class="lnum">Lớp 1 · <b>Tiền về tay mỗi tháng</b></p>'
new='<div class="results hidden" id="results">\n<div class="v3-results-head"><div id="v3Summary"></div><h2 class="v3-mode-title" id="v3ModeTitle"></h2><div class="v3-pairs" id="v3Pairs"></div></div>\n<div class="layer"><p class="lnum">Lớp 1 · <b>Tiền về tay mỗi tháng</b></p>'
if old not in s: raise SystemExit('results head anchor missing')
s=s.replace(old,new,1)

s=s.replace('<h2 class="sec">Offer tối thiểu để đáng chuyển</h2>','<h2 class="sec">Mức lương tối thiểu để đạt target tài chính</h2>',1)
s=s.replace('Giải ngược mức lương cần đạt. Tool dùng điều kiện của một offer làm template, còn mức lương là ẩn số. Baseline công việc hiện tại lấy từ phần “Nếu chuyển việc thì sao?”.','Giải ngược mức lương cần đạt theo cấu trúc Offer A, Offer B hoặc cả hai. Baseline lấy trực tiếp từ “Công việc hiện tại”.',1)

# V3 state model.
s=s.replace('function blankSwitch(){return{enabled:true,enabledExplicit:false,targetOffer:"0",lastWorkingDate:"",currentBonusIfStay:null,currentBonusRule:"lost",currentBonusRuleExplicit:false,currentBonusPayDate:"",currentBonusIfLeave:null,onboardDate:"",newBonusRule:"unknown",newBonusCustom:null,currentNet:null}}','function blankSwitch(){return{enabled:true,enabledExplicit:false,targetOffer:"0",lastWorkingDate:"",currentBonusRule:"unknown",currentBonusRuleExplicit:false,currentBonusIfLeave:null,onboardDate:"",newBonusRule:"unknown",newBonusCustom:null}}',1)
s=s.replace('function blankSolver(){return{enabled:false,templateOffer:"0",goalNoLoss:true,noLossBuffer:0,goalBreakEven:true,breakEvenMonths:6,goalMonthlyNet:false,targetMonthlyNet:null,goalAnnualFixed:false,targetAnnualFixed:null}}','function blankSolver(){return{enabled:false,templateOffer:"0",goalNoLoss:true,noLossBuffer:0,goalBreakEven:true,breakEvenMonths:6,goalMonthlyNet:false,targetMonthlyNet:null,goalAnnualFixed:false,targetAnnualFixed:null}}\nfunction blankCurrent(){const o=blank("Công việc hiện tại");o.probationEnabled="no";o.probInsurance="yes";return o}',1)
s=s.replace('function ensureSolver(x){const raw=x||{},v=Object.assign(blankSolver(),raw);v.enabled=raw.enabled===true;v.templateOffer=raw.templateOffer==="1"?"1":"0";','function ensureSolver(x){const raw=x||{},v=Object.assign(blankSolver(),raw);v.enabled=raw.enabled===true;v.templateOffer=["0","1","both"].includes(raw.templateOffer)?raw.templateOffer:"0";',1)
# Replace legacy V2 switching coercion with neutral V3 rules.
start=s.index('function ensureSwitching(x){')
end=s.index('\nlet state=',start)
s=s[:start]+'''function ensureSwitching(x){const raw=x||{},v=Object.assign(blankSwitch(),raw);v.enabled=raw.enabled!==false;v.enabledExplicit=raw.enabledExplicit===true;v.targetOffer=raw.targetOffer==="1"?"1":"0";v.currentBonusRule=["unknown","lost","time","full","custom"].includes(raw.currentBonusRule)?raw.currentBonusRule:"unknown";v.newBonusRule=["unknown","time","full","none","custom"].includes(raw.newBonusRule)?raw.newBonusRule:"unknown";return v}
function ensureCurrent(o){const v=ensureOfferShape(o,"Công việc hiện tại");v.probationEnabled="no";v.probPct=null;v.probDurationValue=null;v.probDurationUnit="months";v.probInsurance="yes";v.probJobType="unknown";return v}
function ensureComparison(x){const raw=x||{},ok=v=>["current","0","1"].includes(v)?v:null;return{left:ok(raw.left),right:ok(raw.right)}}
let state={deps:null,region:"I",sickDays:null,mat:"hide",currentJobEnabled:false,currentJob:blankCurrent(),offerCount:1,offers:[blank("Offer A"),blank("Offer B")],comparison:{left:null,right:null},switching:blankSwitch(),solver:blankSolver()};'''+s[end+len('\nlet state={deps:null,region:"I",sickDays:null,mat:"hide",offers:[blank("Offer A"),blank("Offer B")],switching:blankSwitch(),solver:blankSolver()};'):]

# Current Job renderer inserted before switching helpers.
insert=s.index('\nfunction switchingCurrentNetStatus')
current_js=r'''

function renderCurrentInputs(){
 const host=document.getElementById('currentFields'),seg=document.getElementById('currentEnabledSeg'),o=state.currentJob=ensureCurrent(state.currentJob);[].forEach.call(seg.children,b=>b.classList.toggle('on',b.getAttribute('data-v')===(state.currentJobEnabled?'on':'off')));host.style.display=state.currentJobEnabled?'':'none';if(!state.currentJobEnabled){host.innerHTML='';return}
 const sg=(k,val,opts)=>'<div class="seg" data-current-seg="'+k+'">'+opts.map(x=>'<button data-v="'+x[0]+'" class="'+(val===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div>';
 const inp=(k,v,ph,suf='',money=false)=>'<div class="suffix-row"><input type="text" data-current="'+k+'" inputmode="'+(money?'numeric':'decimal')+'" placeholder="'+ph+'" value="'+(money?grp(v==null?'':v):esc(v==null?'':v))+'">'+(suf?'<span class="suffix">'+suf+'</span>':'')+'</div>';
 const bh='<div class="control-stack"><select data-current="bhMode"><option value="unknown" '+(o.bhMode==='unknown'?'selected':'')+'>Chưa rõ</option><option value="salary" '+(o.bhMode==='salary'?'selected':'')+'>Theo mức lương hiện tại</option><option value="custom" '+(o.bhMode==='custom'?'selected':'')+'>Tôi biết mức cụ thể</option></select>'+(o.bhMode==='custom'?'<div class="sub-input">'+inp('customBase',o.customBase,'7,500,000','đ',true)+'</div>':'')+'</div>';
 const otActive=otNumber(o.otMonthly)>0,paid=otActive&&o.otPaid==='yes',mixed=paid&&o.otType==='mixed';
 const perfAmount=o.performanceBonusType==='amount';
 host.innerHTML='<div class="v3-current-grid">'
  +'<div class="field"><label>Tên / nhãn</label><input type="text" data-current="name" value="'+esc(o.name||'Công việc hiện tại')+'"></div>'
  +'<div class="field"><label>Lương ghi theo</label>'+sg('payType',o.payType,[['gross','Gross'],['net','Net']])+'</div>'
  +'<div class="field"><label>Lương / tháng</label>'+inp('gross',o.gross,'30,000,000','đ',true)+'</div>'
  +'<div class="field"><label>Mức dùng để đóng BH</label>'+bh+'</div>'
  +'<div class="field"><label>Lên văn phòng / tuần</label>'+inp('days',o.days,'5','buổi')+'</div>'
  +'<div class="field"><label>Di chuyển 1 chiều</label>'+inp('commute',o.commute,'45','phút')+'</div>'
  +'<div class="field"><label>OT trung bình / tháng</label>'+inp('otMonthly',o.otMonthly,'8','giờ')+'</div>'
  +(otActive?'<div class="field"><label>OT có được trả tiền?</label>'+sg('otPaid',o.otPaid,[['no','Không'],['yes','Có']])+'</div>':'')
  +(paid?'<div class="field"><label>OT chủ yếu rơi vào</label><select data-current="otType"><option value="weekday" '+(o.otType==='weekday'?'selected':'')+'>Ngày thường</option><option value="rest" '+(o.otType==='rest'?'selected':'')+'>Ngày nghỉ hằng tuần</option><option value="mixed" '+(o.otType==='mixed'?'selected':'')+'>Nhiều loại</option></select></div>':'')
  +(paid&&!mixed?'<div class="field"><label>Hệ số OT</label>'+inp('otFactor',o.otFactor,o.otType==='rest'?'200':'150','%')+'</div>':'')
  +(mixed?'<div class="field wide"><label>Phân bổ OT nhiều loại - giờ / hệ số</label><div class="v3-mini-pair">'+inp('otBreakdownWeekday',o.otBreakdownWeekday,'Giờ','h')+inp('otFactorWeekday',o.otFactorWeekday,'150','%')+'</div><div class="v3-mini-pair" style="margin-top:5px">'+inp('otBreakdownRest',o.otBreakdownRest,'Giờ','h')+inp('otFactorRest',o.otFactorRest,'200','%')+'</div><div class="v3-mini-pair" style="margin-top:5px">'+inp('otBreakdownHoliday',o.otBreakdownHoliday,'Giờ','h')+inp('otFactorHoliday',o.otFactorHoliday,'300','%')+'</div></div>':'')
  +(paid?'<div class="field"><label>Mức lương dùng để tính OT</label><select data-current="otBaseMode"><option value="offer" '+(o.otBaseMode==='offer'?'selected':'')+'>Ước tính theo lương hiện tại</option><option value="custom" '+(o.otBaseMode==='custom'?'selected':'')+'>Tôi biết mức cụ thể</option></select>'+(o.otBaseMode==='custom'?'<div class="sub-input">'+inp('otBaseAmount',o.otBaseAmount,'20,000,000','đ',true)+'</div>':'')+'</div>':'')
  +'<details class="v3-current-benefits"><summary>Thưởng, phụ cấp & ngày phép</summary><div class="v3-current-benefits-body">'
    +'<div class="field"><label>Thưởng đảm bảo / năm</label>'+inp('guaranteedBonusMonths',o.guaranteedBonusMonths,'1','tháng')+'</div>'
    +'<div class="field"><label>Thưởng hiệu suất / năm</label>'+sg('performanceBonusType',o.performanceBonusType,[['months','Tháng lương'],['amount','Số tiền']])+'<div class="sub-input">'+inp('performanceBonusValue',o.performanceBonusValue,perfAmount?'60,000,000':'2',perfAmount?'đ':'tháng',perfAmount)+'</div></div>'
    +'<div class="field"><label>Phụ cấp cố định ngoài lương / tháng</label>'+inp('fixedAllowance',o.fixedAllowance,'1,000,000','đ',true)+'</div>'
    +'<div class="field"><label>Phụ cấp có tính vào căn cứ BH?</label>'+sg('allowanceBh',o.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']])+'</div>'
    +'<div class="field"><label>Nghỉ phép hưởng lương / năm</label>'+inp('paidLeaveDays',o.paidLeaveDays,'12','ngày')+'</div>'
  +'</div></details>'
  +'</div>';
}
function syncOfferCount(){const seg=document.getElementById('offerCountSeg');[].forEach.call(seg.children,b=>b.classList.toggle('on',b.getAttribute('data-v')===String(state.offerCount)));document.getElementById('offersIn').classList.toggle('one-offer',state.offerCount!==2)}
function renderV3ResultHead(data){document.getElementById('v3Summary').innerHTML=data&&data.summaryHtml||'';document.getElementById('v3ModeTitle').textContent=data&&data.modeTitle||'';const host=document.getElementById('v3Pairs');host.innerHTML='';const opts=(data&&data.availableOptions)||[],pair=data&&data.comparison||{};if(opts.length<3)return;for(let i=0;i<opts.length;i++)for(let j=i+1;j<opts.length;j++){const a=opts[i],b=opts[j],btn=document.createElement('button');btn.type='button';btn.className='v3-pair-btn'+(((pair.left===a.id&&pair.right===b.id)||(pair.left===b.id&&pair.right===a.id))?' on':'');btn.textContent=a.name+' ↔ '+b.name;btn.dataset.left=a.id;btn.dataset.right=b.id;host.appendChild(btn)}}
'''
s=s[:insert]+current_js+s[insert:]

# renderInputs should switch the physical A/B matrix between one-offer and two-offer states.
s=s.replace("document.getElementById('offersIn').innerHTML=html;\n syncOtPaidVisibility();","document.getElementById('offersIn').innerHTML=html;\n syncOfferCount();\n syncOtPaidVisibility();",1)

# Replace Switching UI: baseline comes from Current Job, only transition-specific inputs remain.
start=s.index('function renderSwitchingInputs(){')
end=s.index('\nfunction renderSolverInputs(){',start)
switch_fn=r'''function renderSwitchingInputs(){
 const sw=state.switching=ensureSwitching(state.switching),seg=document.getElementById('switchEnabledSeg');[].forEach.call(seg.children,b=>b.classList.toggle('on',b.getAttribute('data-v')===(sw.enabled?'on':'off')));const box=document.getElementById('switchFields');if(!sw.enabled){box.style.display='none';box.innerHTML='';return}box.style.display='block';
 const candidates=[['0',state.offers[0].name||'Offer A']];if(state.offerCount===2)candidates.push(['1',state.offers[1].name||'Offer B']);if(!candidates.some(x=>x[0]===sw.targetOffer))sw.targetOffer=candidates[0][0];
 const oldExtra=sw.currentBonusRule==='custom'?'<div class="field suffix-row"><label>Số thưởng bên hiện tại dự kiến vẫn nhận khi nghỉ</label><input type="text" data-sw="currentBonusIfLeave" inputmode="numeric" placeholder="10,000,000" value="'+grp(sw.currentBonusIfLeave==null?'':sw.currentBonusIfLeave)+'"><span class="suffix">đ</span></div>':'';
 const newExtra=sw.newBonusRule==='custom'?'<div class="field suffix-row"><label>Số thưởng đảm bảo dự kiến về tay trong năm onboard</label><input type="text" data-sw="newBonusCustom" inputmode="numeric" placeholder="5,000,000" value="'+grp(sw.newBonusCustom==null?'':sw.newBonusCustom)+'"><span class="suffix">đ</span></div>':'';
 box.innerHTML='<div class="switch-grid">'
  +'<p class="v3-baseline-note switch-wide"><b>Baseline:</b> lương net và thưởng đảm bảo nếu ở lại được lấy trực tiếp từ “Công việc hiện tại”. '+(!state.currentJobEnabled?'Bạn chưa thêm Công việc hiện tại nên phần này sẽ báo thiếu baseline.':'')+'</p>'
  +'<div class="field"><label>Bạn muốn so ở lại với offer nào?</label><select data-sw="targetOffer">'+candidates.map(x=>'<option value="'+x[0]+'" '+(sw.targetOffer===x[0]?'selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select></div>'
  +'<div class="field"><label>Ngày làm việc cuối cùng ở công ty hiện tại</label><input type="date" data-sw="lastWorkingDate" value="'+esc(sw.lastWorkingDate||'')+'"></div>'
  +'<div class="field"><label>Ngày onboard công ty mới</label><input type="date" data-sw="onboardDate" value="'+esc(sw.onboardDate||'')+'"></div>'
  +'<div class="field"><label>Nếu nghỉ vào ngày trên, thưởng đảm bảo bên hiện tại sẽ thế nào?</label><select data-sw="currentBonusRule"><option value="unknown" '+(sw.currentBonusRule==='unknown'?'selected':'')+'>Chưa rõ</option><option value="lost" '+(sw.currentBonusRule==='lost'?'selected':'')+'>Mất toàn bộ</option><option value="time" '+(sw.currentBonusRule==='time'?'selected':'')+'>Nhận theo thời gian đã làm</option><option value="full" '+(sw.currentBonusRule==='full'?'selected':'')+'>Vẫn nhận đủ</option><option value="custom" '+(sw.currentBonusRule==='custom'?'selected':'')+'>Tôi biết số sẽ nhận</option></select><p class="benefit-note">Tổng thưởng đảm bảo nếu ở lại lấy từ profile Công việc hiện tại.</p></div>'
  +oldExtra
  +'<div class="field"><label>Trong năm onboard, thưởng đảm bảo ở công ty mới sẽ thế nào?</label><select data-sw="newBonusRule"><option value="unknown" '+(sw.newBonusRule==='unknown'?'selected':'')+'>Chưa rõ</option><option value="time" '+(sw.newBonusRule==='time'?'selected':'')+'>Theo số tháng làm</option><option value="full" '+(sw.newBonusRule==='full'?'selected':'')+'>Nhận đủ</option><option value="none" '+(sw.newBonusRule==='none'?'selected':'')+'>Không nhận</option><option value="custom" '+(sw.newBonusRule==='custom'?'selected':'')+'>Tôi biết số sẽ nhận</option></select></div>'
  +newExtra
  +'<p class="benefit-note switch-wide">Phần này chỉ hỏi dữ liệu phát sinh khi chuyển việc. Lương/BH/OT/thưởng của từng phương án đã lấy từ profile phía trên.</p>'
  +'</div>';
}
'''
s=s[:start]+switch_fn+s[end:]

# Replace Layer 6 controls with A/B/Both template modes.
start=s.index('function renderSolverInputs(){')
end=s.index('\nfunction applyResult(data){',start)
solver_fn=r'''function renderSolverInputs(){
 const box=document.getElementById('solverFields'),sol=state.solver||blankSolver(),seg=document.getElementById('solverEnabledSeg');[].forEach.call(seg.children,b=>b.classList.toggle('on',(sol.enabled?'on':'off')===b.getAttribute('data-v')));box.style.display=sol.enabled?'':'none';if(!sol.enabled){box.innerHTML='';return}
 const money=(v,ph)=>'<input type="text" data-sol-money inputmode="numeric" placeholder="'+ph+'" value="'+grp(v==null?'':v)+'">',goal=(key,label,field)=>'<div class="solver-goal"><label class="solver-goal-head"><input type="checkbox" data-sol="'+key+'" '+(sol[key]?'checked':'')+'><span>'+label+'</span></label>'+field+'</div>',disabled=k=>sol[k]?'':' aria-disabled="true"';
 const templates=[['0',state.offers[0].name||'Offer A']];if(state.offerCount===2){templates.push(['1',state.offers[1].name||'Offer B'],['both','Cả hai - solve riêng từng cấu trúc'])}if(!templates.some(x=>x[0]===sol.templateOffer))sol.templateOffer=templates[0][0];
 box.innerHTML='<div class="solver-grid">'
  +'<div class="field solver-wide"><label>Tính mức sàn theo cấu trúc nào?</label><select data-sol="templateOffer">'+templates.map(x=>'<option value="'+x[0]+'" '+(sol.templateOffer===x[0]?'selected':'')+'>'+esc(x[1])+'</option>').join('')+'</select><p class="solver-note">Nếu chọn Cả hai, backend giải hai threshold độc lập. Mỗi threshold giữ đúng BH, thử việc, thưởng, OT và phụ cấp của offer tương ứng.</p></div>'
  +goal('goalNoLoss','Đến 31/12, chuyển việc không được thấp hơn ở lại','<div class="sub-input"'+disabled('goalNoLoss')+'><label>Muốn hơn phương án ở lại ít nhất</label><div class="suffix-row">'+money(sol.noLossBuffer,'0')+'<span class="suffix">đ</span></div></div>')
  +goal('goalBreakEven','Hòa vốn trong timeline mục tiêu','<div class="sub-input"'+disabled('goalBreakEven')+'><label>Hòa vốn trong</label><div class="suffix-row"><input type="text" data-sol="breakEvenMonths" inputmode="decimal" value="'+esc(sol.breakEvenMonths??6)+'"><span class="suffix">tháng</span></div></div>')
  +goal('goalMonthlyNet','Đạt target Net / tháng','<div class="sub-input"'+disabled('goalMonthlyNet')+'><label>Net tối thiểu</label><div class="suffix-row">'+money(sol.targetMonthlyNet,'35,000,000')+'<span class="suffix">đ</span></div></div>')
  +goal('goalAnnualFixed','Đạt target thu nhập cố định / năm','<div class="sub-input"'+disabled('goalAnnualFixed')+'><label>Thu nhập cố định tối thiểu</label><div class="suffix-row">'+money(sol.targetAnnualFixed,'500,000,000')+'<span class="suffix">đ</span></div></div>')
  +'<p class="solver-note solver-wide">Layer 6 cần Công việc hiện tại làm baseline. OT và thưởng hiệu suất vẫn là kịch bản riêng; mức sàn chính dựa trên phần cố định/đảm bảo.</p></div>';
 const m=box.querySelectorAll('[data-sol-money]');if(m[0])m[0].setAttribute('data-sol','noLossBuffer');if(m[1])m[1].setAttribute('data-sol','targetMonthlyNet');if(m[2])m[2].setAttribute('data-sol','targetAnnualFixed');
}
'''
s=s[:start]+solver_fn+s[end:]

# Apply V3 summary/pair before normal layer rendering; clear stale V3 solver on errors via normal response lifecycle.
s=s.replace('function applyResult(data){\n const empty=document.getElementById("empty"),results=document.getElementById("results"),solverLayer=document.getElementById("solverLayer");document.getElementById("solverResult").innerHTML=(data&&data.layer6Html)||"";solverLayer.style.display=data&&data.showLayer6?"":"none";','function applyResult(data){\n const empty=document.getElementById("empty"),results=document.getElementById("results"),solverLayer=document.getElementById("solverLayer");renderV3ResultHead(data||{});document.getElementById("solverResult").innerHTML=(data&&data.layer6Html)||"";solverLayer.style.display=data&&data.showLayer6?"":"none";',1)

# API state transforms Current Job through the same adapter as offers.
old='''function apiState(){
 const out=JSON.parse(JSON.stringify(state));
 out.offers.forEach((o,i)=>{const src=state.offers[i],raw=src.otMonthly,n=hasInput(raw)?Number(String(raw).replace(/,/g,"")):0;o.otMonthly=Number.isFinite(n)&&n>=0?n:0;o.ot=Number.isFinite(n)&&n>0?n/UI_WKS:0;o.probMon=probDurationMonthsForApi(src);delete o.probDurationValue;delete o.probDurationUnit;o.base=src.bhMode==='custom'?'custom':'full'});
 return out;
}'''
new='''function apiState(){
 const out=JSON.parse(JSON.stringify(state));
 const adapt=(o,src,isCurrent)=>{const raw=src.otMonthly,n=hasInput(raw)?Number(String(raw).replace(/,/g,"")):0;o.otMonthly=Number.isFinite(n)&&n>=0?n:0;o.ot=Number.isFinite(n)&&n>0?n/UI_WKS:0;o.probMon=isCurrent?0:probDurationMonthsForApi(src);delete o.probDurationValue;delete o.probDurationUnit;o.base=src.bhMode==='custom'?'custom':'full';if(isCurrent){o.probationEnabled='no';o.probInsurance='yes'}};
 out.offers.forEach((o,i)=>adapt(o,state.offers[i],false));adapt(out.currentJob,state.currentJob,true);return out;
}'''
if old not in s: raise SystemExit('apiState anchor missing')
s=s.replace(old,new,1)

# Any first-class option can make the page useful.
s=s.replace('function hasAnySalary(){return state.offers.some(o=>{const n=Number(String(o.gross??"").replace(/,/g,""));return Number.isFinite(n)&&n>0})}','function hasAnySalary(){const arr=[...state.offers];if(state.currentJobEnabled)arr.push(state.currentJob);return arr.some(o=>{const n=Number(String(o.gross??"").replace(/,/g,""));return Number.isFinite(n)&&n>0})}',1)

# V3 normalization and no implicit V2 localStorage migration.
start=s.index('function normalizeState(d){')
end=s.index('\nfunction load(){',start)
norm='''function normalizeState(d){if(!d||!Array.isArray(d.offers)||d.offers.length!==2)return null;const region=["I","II","III","IV"].includes(d.region)?d.region:"I",mat=d.mat==="show"?"show":"hide";return{deps:d.deps??null,region,sickDays:d.sickDays??null,mat,currentJobEnabled:d.currentJobEnabled===true,currentJob:ensureCurrent(d.currentJob),offerCount:Number(d.offerCount)===2?2:1,offers:[ensureOfferShape(d.offers[0],"Offer A"),ensureOfferShape(d.offers[1],"Offer B")],comparison:ensureComparison(d.comparison),switching:ensureSwitching(d.switching),solver:ensureSolver(d.solver)}}'''
s=s[:start]+norm+s[end:]
start=s.index('function load(){')
end=s.index('\nfunction syncBhSummary',start)
s=s[:start]+'''function load(){if(!canStore)return;try{const raw=localStorage.getItem(KEY);if(raw){const d=normalizeState(JSON.parse(raw));if(d)state=d}}catch(e){}}'''+s[end:]

# Event wiring for Current Job, optional Offer B and pair selector.
event_anchor='document.getElementById("deps").addEventListener("input",e=>{state.deps=e.target.value;markDirty();scheduleCalculation()});'
events=r'''document.getElementById('currentEnabledSeg').addEventListener('click',function(e){const b=e.target.closest('button');if(!b)return;state.currentJobEnabled=b.getAttribute('data-v')==='on';markDirty();renderCurrentInputs();renderSwitchingInputs();scheduleCalculation()});
document.getElementById('offerCountSeg').addEventListener('click',function(e){const b=e.target.closest('button');if(!b)return;state.offerCount=b.getAttribute('data-v')==='2'?2:1;if(state.offerCount===1&&state.switching.targetOffer==='1')state.switching.targetOffer='0';markDirty();syncOfferCount();renderSwitchingInputs();renderSolverInputs();scheduleCalculation()});
const currentHost=document.getElementById('currentFields');
currentHost.addEventListener('input',function(e){const el=e.target,k=el.getAttribute('data-current');if(!k||el.tagName==='SELECT')return;const money=['gross','customBase','fixedAllowance','otBaseAmount'].includes(k)||(k==='performanceBonusValue'&&state.currentJob.performanceBonusType==='amount');if(money){const f=grp(el.value);el.value=f;state.currentJob[k]=f.replace(/,/g,'')}else state.currentJob[k]=el.value;markDirty();scheduleCalculation()});
currentHost.addEventListener('change',function(e){const el=e.target,k=el.getAttribute('data-current');if(!k||el.tagName!=='SELECT')return;state.currentJob[k]=el.value;markDirty();if(['bhMode','otType','otBaseMode'].includes(k))renderCurrentInputs();scheduleCalculation()});
currentHost.addEventListener('click',function(e){const b=e.target.closest('[data-current-seg] button');if(!b)return;const wrap=b.closest('[data-current-seg]'),k=wrap.getAttribute('data-current-seg'),v=b.getAttribute('data-v');if(k==='payType')state.currentJob.payType=v;else if(k==='otPaid')state.currentJob.otPaid=v;else if(k==='allowanceBh')state.currentJob.allowanceBh=v;else if(k==='performanceBonusType'){if(state.currentJob.performanceBonusType!==v)state.currentJob.performanceBonusValue=null;state.currentJob.performanceBonusType=v}markDirty();renderCurrentInputs();scheduleCalculation()});
document.getElementById('v3Pairs').addEventListener('click',function(e){const b=e.target.closest('.v3-pair-btn');if(!b)return;state.comparison={left:b.dataset.left,right:b.dataset.right};markDirty();scheduleCalculation()});
'''
if event_anchor not in s: raise SystemExit('event anchor missing')
s=s.replace(event_anchor,events+event_anchor,1)

# Current name changes should refresh transition/solver labels as offer names do.
s=s.replace('if(k==="name"){document.querySelectorAll(\'[data-offer-head="\'+i+\'"]\').forEach(x=>x.textContent=state.offers[i].name);renderSwitchingInputs();renderSolverInputs();}','if(k==="name"){document.querySelectorAll(\'[data-offer-head="\'+i+\'"]\').forEach(x=>x.textContent=state.offers[i].name);renderSwitchingInputs();renderSolverInputs();}',1)

# Clear and initial render include V3 state/components.
old_clear='state={deps:null,region:"I",sickDays:null,mat:"hide",offers:[blank("Offer A"),blank("Offer B")],switching:blankSwitch(),solver:blankSolver()};'
new_clear='state={deps:null,region:"I",sickDays:null,mat:"hide",currentJobEnabled:false,currentJob:blankCurrent(),offerCount:1,offers:[blank("Offer A"),blank("Offer B")],comparison:{left:null,right:null},switching:blankSwitch(),solver:blankSolver()};'
if old_clear not in s: raise SystemExit('clear state anchor missing')
s=s.replace(old_clear,new_clear,1)
s=s.replace('syncCtx();renderInputs();renderSwitchingInputs();renderSolverInputs();lastRequestBody=null;','syncCtx();renderCurrentInputs();renderInputs();syncOfferCount();renderSwitchingInputs();renderSolverInputs();lastRequestBody=null;',1)
s=s.replace('load();syncCtx();renderInputs();renderSwitchingInputs();renderSolverInputs();dirty=false;','load();syncCtx();renderCurrentInputs();renderInputs();syncOfferCount();renderSwitchingInputs();renderSolverInputs();dirty=false;',1)

# Imported V3 data redraws all first-class profiles.
s=s.replace('state=d;syncCtx();renderInputs();renderSwitchingInputs();renderSolverInputs();markDirty();scheduleCalculation()','state=d;syncCtx();renderCurrentInputs();renderInputs();syncOfferCount();renderSwitchingInputs();renderSolverInputs();markDirty();scheduleCalculation()',1)

# Error state must clear stale Layer 6 and V3 summary too.
s=s.replace('function showApiError(msg){const e=document.getElementById("empty");e.style.display="";e.textContent=msg||"Không kết nối được máy chủ tính toán. Thử tải lại trang sau ít phút.";document.getElementById("results").classList.add("hidden")}', 'function showApiError(msg){const e=document.getElementById("empty");e.style.display="";e.textContent=msg||"Không kết nối được máy chủ tính toán. Thử tải lại trang sau ít phút.";document.getElementById("results").classList.add("hidden");document.getElementById("solverLayer").style.display="none";document.getElementById("solverResult").innerHTML="";renderV3ResultHead({})}',1)

# Current switching money inputs no longer include currentNet/currentBonusIfStay.
s=s.replace('if(["currentBonusIfStay","currentBonusIfLeave","newBonusCustom","currentNet"].includes(k))','if(["currentBonusIfLeave","newBonusCustom"].includes(k))',1)
s=s.replace(';if(k==="currentNet")syncSwitchCurrentNetInline(el)','',1)

# V3 footer terminology.
s=s.replace('Dữ liệu offer được gửi tới máy chủ để tính toán.','Dữ liệu các phương án được gửi tới máy chủ để tính toán.',1)
s=s.replace('Ứng dụng không ghi nội dung offer vào cơ sở dữ liệu','Ứng dụng không ghi nội dung phương án vào cơ sở dữ liệu',1)

# Recompute CSP hash after V3 JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
h=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
DST.write_text(s)

# Targeted V3 browser smoke test.
Path('tests/v3-current-offers-responsive.mjs').write_text(r'''import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 for(const [label,width,height] of [['desktop',1280,900],['mobile-320',320,740],['mobile-375',375,812],['mobile-430',430,932]]){
  const page=await browser.newPage({viewport:{width,height}});let bodies=[];
  await page.route('**/api/offer-value-v3',async route=>{let body={};try{body=route.request().postDataJSON()}catch{}bodies.push(body);const avail=[];if(body.currentJobEnabled&&Number(String(body.currentJob?.gross||'').replace(/,/g,''))>0)avail.push({id:'current',name:body.currentJob?.name||'Công việc hiện tại',kind:'current'});if(Number(String(body.offers?.[0]?.gross||'').replace(/,/g,''))>0)avail.push({id:'0',name:body.offers?.[0]?.name||'Offer A',kind:'offer'});if(body.offerCount===2&&Number(String(body.offers?.[1]?.gross||'').replace(/,/g,''))>0)avail.push({id:'1',name:body.offers?.[1]?.name||'Offer B',kind:'offer'});const pair=body.comparison?.left&&body.comparison?.right?body.comparison:{left:avail[0]?.id||null,right:avail[1]?.id||null};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({hasResults:avail.length>0,v3:true,modeTitle:avail.length===3?'Ở lại, chọn A hay B?':'So sánh phương án',summaryHtml:'<div class="v3-summary"><div class="v3-summary-grid">'+avail.map(x=>'<div class="v3-summary-card">'+x.name+'</div>').join('')+'</div></div>',availableOptions:avail,comparison:pair,showPairSelector:avail.length>2,l1cols:'',l1delta:'',showL1Delta:false,annualcols:'',annualdelta:'',showAnnualDelta:false,tcols:'',tdelta:'',showTDelta:false,l2basis:'',l3events:'',verdictHtml:'<p>V3 verdict</p>',showAssumptions:false,assumptionsHtml:'',showSwitching:false,switchingHtml:'',showLayer6:false,layer6Html:'',exportText:'V3'})});});
  await page.goto('http://127.0.0.1:8000/net-cao-hon-co-that-tot-hon-v3.html',{waitUntil:'domcontentloaded'});
  if(!(await page.locator('#offersIn').evaluate(e=>e.classList.contains('one-offer'))))throw new Error(label+': default should be one offer');
  await page.locator('#currentEnabledSeg [data-v="on"]').click();await page.locator('[data-current="gross"]').fill('30000000');await page.locator('#offersIn input[data-i="0"][data-k="gross"]').fill('35000000');await page.waitForTimeout(750);
  if(!bodies.length||!bodies.at(-1).currentJobEnabled)throw new Error(label+': Current Job missing from V3 API body');
  await page.locator('#offerCountSeg [data-v="2"]').click();await page.locator('#offersIn input[data-i="1"][data-k="gross"]').fill('40000000');await page.waitForTimeout(750);
  const body=bodies.at(-1);if(body.offerCount!==2)throw new Error(label+': offerCount=2 missing');if(!body.currentJob||!Array.isArray(body.offers))throw new Error(label+': V3 state shape invalid');
  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,current:document.querySelector('#currentBox').scrollWidth,solver:document.querySelector('#solverBox').scrollWidth}));if(overflow.scroll>overflow.inner+2)throw new Error(label+': horizontal overflow '+overflow.scroll+'>'+overflow.inner);
  await page.close();console.log('PASS V3 responsive '+label);
 }
}finally{await browser.close()}
''')
print('CREATED V3 frontend + responsive smoke')
