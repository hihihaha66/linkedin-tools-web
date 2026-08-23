from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

# Layer 3 wording requested by product owner.
s=s.replace('Lớp 3 · <b>Giờ bạn bỏ ra để có package đó</b>','Lớp 3 · <b>Thời gian bạn bỏ ra để có package đó</b>',1)

# Compact duration value + unit control inside each A/B cell.
needle='.offer-mcell .control-stack>*+*{margin-top:7px}'
if needle not in s: raise SystemExit('matrix style marker missing')
s=s.replace(needle,needle+'.prob-duration-input{display:grid;grid-template-columns:minmax(0,1fr) 88px;gap:6px;align-items:start}.prob-duration-input select{min-width:0;padding-left:7px;padding-right:5px}.prob-duration-help{margin-bottom:0!important}',1)
needle='@media(max-width:540px){.wrap{padding-left:10px;padding-right:10px}'
if needle not in s: raise SystemExit('mobile marker missing')
s=s.replace(needle,'@media(max-width:540px){.prob-duration-input{grid-template-columns:1fr}.prob-duration-input select{font-size:10.5px}.wrap{padding-left:10px;padding-right:10px}',1)

# Frontend state preserves the raw duration and unit. Legacy probMon migrates to months.
s=s.replace('probationEnabled:"no",probPct:null,probMon:null,probInsurance:"no"','probationEnabled:"no",probPct:null,probDurationValue:null,probDurationUnit:"months",probInsurance:"no"',1)
old='''function ensureOfferShape(o,n){
 const src=o||{},oldTrial=src.probationEnabled==null&&(hasPositiveValue(src.probPct)||hasPositiveValue(src.probMon)||src.probInsurance==="yes"),trialEnabled=(src.probationEnabled==="yes"||oldTrial),probPct=(trialEnabled&&!hasInput(src.probPct)?100:(src.probPct??null));
 const oldOt=hasInput(src.ot)?Number(String(src.ot).replace(/,/g,"")):NaN,otMonthly=hasInput(src.otMonthly)?src.otMonthly:(Number.isFinite(oldOt)&&oldOt>=0?Math.round(oldOt*UI_WKS*100)/100:null);
 return{name:String(src.name||n),gross:src.gross??null,payType:src.payType==="net"?"net":"gross",base:src.base==="custom"?"custom":"full",customBase:src.customBase??null,days:src.days??null,commute:src.commute??null,otMonthly,otPaid:src.otPaid==="yes"?"yes":"no",otFactor:src.otFactor??null,
  probationEnabled:trialEnabled?"yes":"no",probPct,probMon:src.probMon??null,probInsurance:src.probInsurance==="yes"?"yes":"no",probJobType:["manager","college","intermediate","other"].includes(src.probJobType)?src.probJobType:"unknown",
'''
new='''function ensureOfferShape(o,n){
 const src=o||{},oldTrial=src.probationEnabled==null&&(hasPositiveValue(src.probPct)||hasPositiveValue(src.probDurationValue)||hasPositiveValue(src.probMon)||src.probInsurance==="yes"),trialEnabled=(src.probationEnabled==="yes"||oldTrial),probPct=(trialEnabled&&!hasInput(src.probPct)?100:(src.probPct??null));
 const oldOt=hasInput(src.ot)?Number(String(src.ot).replace(/,/g,"")):NaN,otMonthly=hasInput(src.otMonthly)?src.otMonthly:(Number.isFinite(oldOt)&&oldOt>=0?Math.round(oldOt*UI_WKS*100)/100:null);
 const probDurationValue=hasInput(src.probDurationValue)?src.probDurationValue:(src.probMon??null),probDurationUnit=src.probDurationUnit==='days'?'days':'months';
 return{name:String(src.name||n),gross:src.gross??null,payType:src.payType==="net"?"net":"gross",base:src.base==="custom"?"custom":"full",customBase:src.customBase??null,days:src.days??null,commute:src.commute??null,otMonthly,otPaid:src.otPaid==="yes"?"yes":"no",otFactor:src.otFactor??null,
  probationEnabled:trialEnabled?"yes":"no",probPct,probDurationValue,probDurationUnit,probInsurance:src.probInsurance==="yes"?"yes":"no",probJobType:["manager","college","intermediate","other"].includes(src.probJobType)?src.probJobType:"unknown",
'''
if old not in s: raise SystemExit('ensureOfferShape target missing')
s=s.replace(old,new,1)

# Replace old months-only inline validation with raw value/unit validation and exact legal caps.
start=s.index('function syncProbMonthInline(')
end=s.index('\n\nfunction renderInputs(){',start)
new_helpers='''const PROB_LIMITS={manager:{days:180,months:6,label:'180 ngày'},college:{days:60,months:2,label:'60 ngày'},intermediate:{days:30,months:1,label:'30 ngày'},other:{days:6,months:6/22,label:'6 ngày làm việc'}};
function probDurationNumber(o){if(!hasInput(o.probDurationValue))return NaN;const n=Number(String(o.probDurationValue).replace(/,/g,''));return Number.isFinite(n)?n:NaN}
function probDurationMonthsForApi(o){const n=probDurationNumber(o);if(!(n>0))return 0;if(o.probDurationUnit==='days')return n/(o.probJobType==='other'?22:30);return n}
function probDurationStatus(o){
 if(!hasInput(o.probDurationValue))return{kind:'empty',text:'Khi chọn Có, thời gian thử việc cần lớn hơn 0.'};
 const n=probDurationNumber(o);if(!(n>0))return{kind:'invalid',text:'Thời gian thử việc phải lớn hơn 0.'};
 const limit=PROB_LIMITS[o.probJobType];if(!limit)return{kind:'valid',text:''};
 const tooLong=o.probDurationUnit==='days'?n>limit.days+1e-9:n>limit.months+1e-9;
 if(!tooLong)return{kind:'valid',text:''};
 const shown=Number.isInteger(n)?String(n):String(Number(n.toFixed(2)));
 return{kind:'warning',text:o.probDurationUnit==='days'?('Bạn nhập '+shown+' ngày; nhóm này tối đa '+limit.label+'.'):('Thời gian bạn nhập vượt giới hạn '+limit.label+' của nhóm đã chọn.')};
}
function syncProbDurationInline(i){
 const o=state.offers[i],el=document.querySelector('input[data-i="'+i+'"][data-k="probDurationValue"]'),help=document.querySelector('[data-probdur-help="'+i+'"]');if(!el||!help)return;
 const st=probDurationStatus(o),strong=st.kind==='invalid'||st.kind==='warning';
 if(st.kind==='invalid')el.setAttribute('aria-invalid','true');else el.removeAttribute('aria-invalid');
 help.textContent=st.text;help.style.display=st.kind==='valid'?'none':'';help.style.color=strong?'var(--clay)':'';help.style.fontWeight=strong?'600':'';
}
'''
s=s[:start]+new_helpers+s[end:]

# Replace duration cell helper and label.
old=""" const probMonthState=function(v){if(!hasInput(v))return{kind:'empty',text:'Khi chọn Có, số tháng thử việc cần lớn hơn 0.'};const n=Number(String(v).replace(/,/g,''));if(!Number.isFinite(n)||n<=0)return{kind:'invalid',text:'Số tháng thử việc phải lớn hơn 0.'};return{kind:'valid',text:''}};
 const probMonthCell=function(o,i){if(!probOn(o))return dash;const st=probMonthState(o.probMon),invalid=st.kind==='invalid';return textInput(i,'probMon',o,'vd 2','decimal',false,'tháng',invalid?'aria-invalid=\"true\"':'')+'<p class=\"benefit-note probmon-help\" data-probmon-help=\"'+i+'\" style=\"'+(invalid?'color:var(--clay);font-weight:600':(st.kind==='valid'?'display:none':''))+'\">'+st.text+'</p>'};
"""
new=""" const probDurationCell=function(o,i){if(!probOn(o))return dash;const st=probDurationStatus(o),strong=st.kind==='invalid'||st.kind==='warning',ph=o.probDurationUnit==='days'?'vd 60':'vd 2';return '<div class=\"prob-duration-input\">'+textInput(i,'probDurationValue',o,ph,'decimal',false,'',st.kind==='invalid'?'aria-invalid=\"true\"':'')+'<select data-i=\"'+i+'\" data-k=\"probDurationUnit\"><option value=\"months\" '+(o.probDurationUnit==='months'?'selected':'')+'>Tháng</option><option value=\"days\" '+(o.probDurationUnit==='days'?'selected':'')+'>Ngày</option></select></div><p class=\"benefit-note prob-duration-help\" data-probdur-help=\"'+i+'\" style=\"'+(st.kind==='valid'?'display:none':(strong?'color:var(--clay);font-weight:600':''))+'\">'+st.text+'</p>'};
"""
if old not in s: raise SystemExit('probMonthCell target missing')
s=s.replace(old,new,1)
s=s.replace("html+=row('Số tháng thử việc',probMonthCell(A,0),probMonthCell(B,1));", "html+=row('Thời gian thử việc',probDurationCell(A,0),probDurationCell(B,1),'Nhập theo đúng đơn vị offer hoặc hợp đồng ghi. Nếu chọn Ngày, tool dùng số ngày để kiểm tra giới hạn và chỉ quy đổi sang tháng ở bước mô phỏng thu nhập.');",1)

# API adapter keeps the backend contract unchanged: raw frontend fields are converted to probMon.
old="""function apiState(){
 const out=JSON.parse(JSON.stringify(state));
 out.offers.forEach((o,i)=>{const raw=state.offers[i].otMonthly,n=hasInput(raw)?Number(String(raw).replace(/,/g,"")):0;o.ot=Number.isFinite(n)&&n>0?n/UI_WKS:0;delete o.otMonthly});
 return out;
}
"""
new="""function apiState(){
 const out=JSON.parse(JSON.stringify(state));
 out.offers.forEach((o,i)=>{const src=state.offers[i],raw=src.otMonthly,n=hasInput(raw)?Number(String(raw).replace(/,/g,"")):0;o.ot=Number.isFinite(n)&&n>0?n/UI_WKS:0;delete o.otMonthly;o.probMon=probDurationMonthsForApi(src);delete o.probDurationValue;delete o.probDurationUnit});
 return out;
}
"""
if old not in s: raise SystemExit('apiState target missing')
s=s.replace(old,new,1)

# Event handling: duration value validates live; changing unit/job group refreshes helper + placeholder.
s=s.replace('if(k==="probMon")syncProbMonthInline(el,i);if(k==="otMonthly")syncOtPaidVisibility();','if(k==="probDurationValue")syncProbDurationInline(i);if(k==="otMonthly")syncOtPaidVisibility();',1)
old='host.addEventListener("change",function(e){const el=e.target;if(el.tagName!=="SELECT")return;const iRaw=el.getAttribute("data-i"),k=el.getAttribute("data-k");if(iRaw==null||!k)return;state.offers[parseInt(iRaw,10)][k]=el.value;markDirty();scheduleCalculation()});'
new='host.addEventListener("change",function(e){const el=e.target;if(el.tagName!=="SELECT")return;const iRaw=el.getAttribute("data-i"),k=el.getAttribute("data-k");if(iRaw==null||!k)return;const i=parseInt(iRaw,10);state.offers[i][k]=el.value;markDirty();if(k==="probDurationUnit"||k==="probJobType")renderInputs();scheduleCalculation()});'
if old not in s: raise SystemExit('select handler target missing')
s=s.replace(old,new,1)

# Re-pin CSP after inline JS changes.
script_start=s.index('<script>')+len('<script>');script_end=s.index('</script>',script_start)
digest=base64.b64encode(hashlib.sha256(s[script_start:script_end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
