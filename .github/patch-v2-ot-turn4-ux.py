from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

# Compact controls used only when paid OT details are opened.
css='''\n/* V2 Turn 4: OT progressive disclosure inside the persistent A/B matrix */\n.ot-mini-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px}.ot-inline-help{font-size:10.5px;line-height:1.45;margin:5px 0 0;color:var(--clay)}.ot-inline-help:empty{display:none}.ot-config-cell .offer-mna{padding:7px 0}.ot-config-cell select{font-size:12px}.ot-config-cell .control-stack>*+*{margin-top:6px}\n@media(max-width:540px){.ot-mini-pair{grid-template-columns:1fr;gap:4px}.ot-config-cell select{font-size:10px;padding-left:4px;padding-right:3px}.ot-inline-help{font-size:9.5px}.ot-config-cell .suffix-row input{padding-right:22px}}\n'''
s=s.replace('</style>',css+'</style>',1)

# State: new model defaults are visible, explicit and JSON-round-trippable.
old='''function blank(n){return{name:n,gross:null,payType:"gross",base:"full",bhMode:"unknown",customBase:null,days:null,commute:null,otMonthly:null,otPaid:"no",otFactor:null,probationEnabled:"no",probPct:null,probDurationValue:null,probDurationUnit:"months",probInsurance:"no",probJobType:"unknown",guaranteedBonusMonths:null,performanceBonusType:"months",performanceBonusValue:null,fixedAllowance:null,allowanceBh:"unknown",paidLeaveDays:null}}'''
new='''function blank(n){return{name:n,gross:null,payType:"gross",base:"full",bhMode:"unknown",customBase:null,days:null,commute:null,otMonthly:null,otPaid:"no",otType:"weekday",otFactor:150,otBreakdownWeekday:null,otBreakdownRest:null,otBreakdownHoliday:null,otFactorWeekday:150,otFactorRest:200,otFactorHoliday:300,otBaseMode:"offer",otBaseAmount:null,probationEnabled:"no",probPct:null,probDurationValue:null,probDurationUnit:"months",probInsurance:"no",probJobType:"unknown",guaranteedBonusMonths:null,performanceBonusType:"months",performanceBonusValue:null,fixedAllowance:null,allowanceBh:"unknown",paidLeaveDays:null}}'''
if old not in s: raise SystemExit('blank offer target missing')
s=s.replace(old,new,1)

old=''' const bhMode=["unknown","salary","custom"].includes(src.bhMode)?src.bhMode:(src.base==="custom"?"custom":"salary");
 return{name:String(src.name||n),gross:src.gross??null,payType:src.payType==="net"?"net":"gross",base:bhMode==="custom"?"custom":"full",bhMode,customBase:src.customBase??null,days:src.days??null,commute:src.commute??null,otMonthly,otPaid:src.otPaid==="yes"?"yes":"no",otFactor:src.otFactor??null,
'''
new=''' const bhMode=["unknown","salary","custom"].includes(src.bhMode)?src.bhMode:(src.base==="custom"?"custom":"salary");
 const otType=["weekday","rest","mixed"].includes(src.otType)?src.otType:"weekday",otDefaultFactor=otType==="rest"?200:150;
 const otFactor=hasInput(src.otFactor)?src.otFactor:otDefaultFactor;
 return{name:String(src.name||n),gross:src.gross??null,payType:src.payType==="net"?"net":"gross",base:bhMode==="custom"?"custom":"full",bhMode,customBase:src.customBase??null,days:src.days??null,commute:src.commute??null,otMonthly,otPaid:src.otPaid==="yes"?"yes":"no",otType,otFactor,
  otBreakdownWeekday:src.otBreakdownWeekday??null,otBreakdownRest:src.otBreakdownRest??null,otBreakdownHoliday:src.otBreakdownHoliday??null,
  otFactorWeekday:hasInput(src.otFactorWeekday)?src.otFactorWeekday:150,otFactorRest:hasInput(src.otFactorRest)?src.otFactorRest:200,otFactorHoliday:hasInput(src.otFactorHoliday)?src.otFactorHoliday:300,
  otBaseMode:src.otBaseMode==="custom"?"custom":"offer",otBaseAmount:src.otBaseAmount??null,
'''
if old not in s: raise SystemExit('ensureOfferShape OT target missing')
s=s.replace(old,new,1)

# Replace simple paid-row visibility with all OT progressive-disclosure + live warning helpers.
start=s.index('function syncOtPaidVisibility(){')
end=s.index('\n\nconst PROB_LIMITS=',start)
helpers='''function otNumber(v){if(!hasInput(v))return 0;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?Math.max(0,n):0}
function otActive(o){return otNumber(o.otMonthly)>0}
function otPaidActive(o){return otActive(o)&&o.otPaid==='yes'}
function otGuardrailText(o){
 const h=otNumber(o.otMonthly);if(!(h>0))return'';const annual=h*12,parts=[];
 if(h>40)parts.push('Vượt mốc 40 giờ/tháng');
 if(annual>300)parts.push('nếu duy trì 12 tháng ≈ '+Math.round(annual)+' giờ/năm, vượt 300 giờ/năm');
 else if(annual>200)parts.push('nếu duy trì 12 tháng ≈ '+Math.round(annual)+' giờ/năm, vượt 200 giờ/năm; một số trường hợp có thể đến 300 giờ/năm');
 return parts.join('; ')+(parts.length?'.':'');
}
function otMixedText(o){
 if(!(otPaidActive(o)&&o.otType==='mixed'))return'';const total=otNumber(o.otBreakdownWeekday)+otNumber(o.otBreakdownRest)+otNumber(o.otBreakdownHoliday),target=otNumber(o.otMonthly);
 return Math.abs(total-target)<=0.05?'':'Đã phân bổ '+Number(total.toFixed(2))+'/'+Number(target.toFixed(2))+' giờ. Tổng 3 loại cần bằng OT/tháng.';
}
function otFactorText(o,key,min){const v=otNumber(o[key]);return v>0&&v<min?'Mức tối thiểu của loại ngày này là '+min+'%.':''}
function syncOtInline(i){
 const o=state.offers[i],g=document.querySelector('[data-ot-guard="'+i+'"]');if(g){g.textContent=otGuardrailText(o);g.style.display=g.textContent?'':'none'}
 const m=document.querySelector('[data-ot-mixed-help="'+i+'"]');if(m){m.textContent=otMixedText(o);m.style.display=m.textContent?'':'none'}
 [['otFactor',o.otType==='rest'?200:150],['otFactorWeekday',150],['otFactorRest',200],['otFactorHoliday',300]].forEach(([key,min])=>{const h=document.querySelector('[data-ot-factor-help="'+i+'-'+key+'"]');if(h){h.textContent=otFactorText(o,key,min);h.style.display=h.textContent?'':'none'}})
}
function syncOtPaidVisibility(){
 const anyOt=state.offers.some(otActive),anyPaid=state.offers.some(otPaidActive),anySingle=state.offers.some(o=>otPaidActive(o)&&o.otType!=='mixed'),anyMixed=state.offers.some(o=>otPaidActive(o)&&o.otType==='mixed');
 const toggle=(sel,on)=>{const el=document.querySelector(sel);if(el)el.style.display=on?'grid':'none'};
 toggle('#offersIn .ot-paid-row',anyOt);toggle('#offersIn .ot-type-row',anyPaid);toggle('#offersIn .ot-factor-row',anySingle);toggle('#offersIn .ot-mixed-weekday-row',anyMixed);toggle('#offersIn .ot-mixed-rest-row',anyMixed);toggle('#offersIn .ot-mixed-holiday-row',anyMixed);toggle('#offersIn .ot-base-row',anyPaid);
 state.offers.forEach((o,i)=>{
  const modes={paid:otActive(o),type:otPaidActive(o),factor:otPaidActive(o)&&o.otType!=='mixed',mixed:otPaidActive(o)&&o.otType==='mixed',base:otPaidActive(o)};
  Object.entries(modes).forEach(([kind,on])=>{document.querySelectorAll('[data-ot-cell="'+kind+'-'+i+'"]').forEach(cell=>{const dash=cell.querySelector('.ot-cell-dash'),controls=cell.querySelector('.ot-cell-controls');if(dash)dash.style.display=on?'none':'';if(controls)controls.style.display=on?'':'none'})});
  syncOtInline(i);
 });
}
'''
s=s[:start]+helpers+s[end:]

# Input renderer: replace the old paid-OT cell with the complete model.
old=''' const otPaidCell=function(o,i){const hasOt=hasPositiveValue(o.otMonthly),paid=o.otPaid==='yes';return '<div class="ot-paid-cell" data-ot-paid-cell="'+i+'"><span class="offer-mna ot-paid-dash" style="'+(hasOt?'display:none':'')+'">-</span><div class="control-stack ot-paid-controls" style="'+(hasOt?'':'display:none')+'">'+seg(i,'otPaid',o.otPaid,[['no','Không'],['yes','Có']])+(paid?'<div class="sub-input">'+textInput(i,'otFactor',o,'vd 150','decimal',false,'%')+'</div>':'')+'</div></div>'};
'''
new=''' const otWrap=function(kind,i,controls){return '<div class="ot-config-cell" data-ot-cell="'+kind+'-'+i+'"><span class="offer-mna ot-cell-dash">-</span><div class="ot-cell-controls" style="display:none">'+controls+'</div></div>'};
 const otPaidCell=function(o,i){return otWrap('paid',i,seg(i,'otPaid',o.otPaid,[['no','Không'],['yes','Có']]));};
 const otTypeCell=function(o,i){return otWrap('type',i,'<select data-i="'+i+'" data-k="otType"><option value="weekday" '+(o.otType==='weekday'?'selected':'')+'>Ngày thường</option><option value="rest" '+(o.otType==='rest'?'selected':'')+'>Ngày nghỉ hằng tuần</option><option value="mixed" '+(o.otType==='mixed'?'selected':'')+'>Nhiều loại</option></select>');};
 const otFactorCell=function(o,i){const min=o.otType==='rest'?200:150;return otWrap('factor',i,textInput(i,'otFactor',o,'Ví dụ: '+min,'decimal',false,'%')+'<p class="ot-inline-help" data-ot-factor-help="'+i+'-otFactor">'+esc(otFactorText(o,'otFactor',min))+'</p>');};
 const otMixedCell=function(o,i,hourKey,factorKey,min,showHelp){return otWrap('mixed',i,'<div class="ot-mini-pair">'+textInput(i,hourKey,o,'Giờ','decimal',false,'h')+textInput(i,factorKey,o,String(min),'decimal',false,'%')+'</div><p class="ot-inline-help" data-ot-factor-help="'+i+'-'+factorKey+'">'+esc(otFactorText(o,factorKey,min))+'</p>'+(showHelp?'<p class="ot-inline-help" data-ot-mixed-help="'+i+'">'+esc(otMixedText(o))+'</p>':''));};
 const otBaseCell=function(o,i){return otWrap('base',i,'<div class="control-stack"><select data-i="'+i+'" data-k="otBaseMode"><option value="offer" '+(o.otBaseMode==='offer'?'selected':'')+'>Ước tính theo lương offer</option><option value="custom" '+(o.otBaseMode==='custom'?'selected':'')+'>Tôi biết mức cụ thể</option></select>'+(o.otBaseMode==='custom'?'<div class="sub-input">'+textInput(i,'otBaseAmount',o,'Ví dụ: 20,000,000','numeric',true,'đ')+'</div><p class="benefit-note" style="margin-bottom:0">Nhập mức lương tháng payroll dùng để tính OT.</p>':'')+'</div>');};
 const otHoursCell=function(o,i){return textInput(i,'otMonthly',o,'Ví dụ: 8','decimal',false,'giờ')+'<p class="ot-inline-help" data-ot-guard="'+i+'">'+esc(otGuardrailText(o))+'</p>';};
'''
if old not in s: raise SystemExit('old otPaidCell target missing')
s=s.replace(old,new,1)

old=""" html+=row('Làm thêm giờ (OT) trung bình / tháng',textInput(0,'otMonthly',A,'vd 8','decimal',false,'giờ'),textInput(1,'otMonthly',B,'vd 8','decimal',false,'giờ'));
"""
new=""" html+=row('Làm thêm giờ (OT) trung bình / tháng',otHoursCell(A,0),otHoursCell(B,1),'Tool cảnh báo theo mốc 40 giờ/tháng và quy đổi mức trung bình này ra 12 tháng để đối chiếu 200/300 giờ/năm. Không đủ dữ liệu để kiểm tra giới hạn theo từng ngày.');
"""
if old not in s: raise SystemExit('OT hours row target missing')
s=s.replace(old,new,1)

old=""" html+=row('OT có được trả tiền không?',otPaidCell(A,0),otPaidCell(B,1),'OT vẫn được cộng vào tổng thời gian bạn bỏ ra dù có được trả thêm hay không. Nếu chọn Có, nhập hệ số công ty áp dụng để tool ước tính tiền OT.','ot-paid-row');
 html+='</div>';
"""
new=""" html+=row('OT có được trả tiền không?',otPaidCell(A,0),otPaidCell(B,1),'OT không lương vẫn được cộng vào tổng thời gian bạn bỏ ra.','ot-paid-row');
 html+=row('OT chủ yếu rơi vào',otTypeCell(A,0),otTypeCell(B,1),'Ngày thường dùng mốc tối thiểu 150%; ngày nghỉ hằng tuần 200%. Chọn Nhiều loại nếu cần tách thêm ngày lễ/Tết.','ot-type-row');
 html+=row('Hệ số OT',otFactorCell(A,0),otFactorCell(B,1),'Tool điền mốc tối thiểu theo loại ngày; bạn có thể sửa nếu chính sách công ty áp dụng hệ số khác.','ot-factor-row');
 html+=row('OT ngày thường',otMixedCell(A,0,'otBreakdownWeekday','otFactorWeekday',150,false),otMixedCell(B,1,'otBreakdownWeekday','otFactorWeekday',150,false),'Nhập giờ/tháng và hệ số tương ứng.','ot-mixed-weekday-row');
 html+=row('OT ngày nghỉ hằng tuần',otMixedCell(A,0,'otBreakdownRest','otFactorRest',200,false),otMixedCell(B,1,'otBreakdownRest','otFactorRest',200,false),'','ot-mixed-rest-row');
 html+=row('OT ngày lễ/Tết',otMixedCell(A,0,'otBreakdownHoliday','otFactorHoliday',300,true),otMixedCell(B,1,'otBreakdownHoliday','otFactorHoliday',300,true),'Tổng giờ của 3 loại phải bằng OT trung bình/tháng đã nhập.','ot-mixed-holiday-row');
 html+=row('Mức lương dùng để tính OT',otBaseCell(A,0),otBaseCell(B,1),'Nếu không biết payroll dùng mức riêng nào, để “Ước tính theo lương offer”.','ot-base-row');
 html+='</div>';
"""
if old not in s: raise SystemExit('paid OT row target missing')
s=s.replace(old,new,1)

# API now sends the monthly model directly; legacy weekly value is retained only as compatibility fallback.
old=''' out.offers.forEach((o,i)=>{const src=state.offers[i],raw=src.otMonthly,n=hasInput(raw)?Number(String(raw).replace(/,/g,"")):0;o.ot=Number.isFinite(n)&&n>0?n/UI_WKS:0;delete o.otMonthly;o.probMon=probDurationMonthsForApi(src);delete o.probDurationValue;delete o.probDurationUnit;o.base=src.bhMode==='custom'?'custom':'full'});
'''
new=''' out.offers.forEach((o,i)=>{const src=state.offers[i],raw=src.otMonthly,n=hasInput(raw)?Number(String(raw).replace(/,/g,"")):0;o.otMonthly=Number.isFinite(n)&&n>=0?n:0;o.ot=Number.isFinite(n)&&n>0?n/UI_WKS:0;o.probMon=probDurationMonthsForApi(src);delete o.probDurationValue;delete o.probDurationUnit;o.base=src.bhMode==='custom'?'custom':'full'});
'''
if old not in s: raise SystemExit('apiState OT adapter target missing')
s=s.replace(old,new,1)

# Inputs: money formatting, live OT warnings, and select-driven progressive disclosure/default-factor migration.
old=''' const moneyField=k==="gross"||k==="customBase"||k==="fixedAllowance"||(k==="performanceBonusValue"&&state.offers[i].performanceBonusType==="amount");
'''
new=''' const moneyField=k==="gross"||k==="customBase"||k==="fixedAllowance"||k==="otBaseAmount"||(k==="performanceBonusValue"&&state.offers[i].performanceBonusType==="amount");
'''
if old not in s: raise SystemExit('moneyField target missing')
s=s.replace(old,new,1)
old=''' if(k==="probDurationValue")syncProbDurationInline(i);if(k==="otMonthly")syncOtPaidVisibility();
'''
new=''' if(k==="probDurationValue")syncProbDurationInline(i);if(k==="otMonthly"||k.startsWith("otBreakdown")||k.startsWith("otFactor"))syncOtPaidVisibility();
'''
if old not in s: raise SystemExit('input sync target missing')
s=s.replace(old,new,1)

old='''host.addEventListener("change",function(e){const el=e.target;if(el.tagName!=="SELECT")return;const iRaw=el.getAttribute("data-i"),k=el.getAttribute("data-k");if(iRaw==null||!k)return;const i=parseInt(iRaw,10);state.offers[i][k]=el.value;markDirty();if(k==="probDurationUnit"||k==="probJobType"||k==="bhMode")renderInputs();scheduleCalculation()});
'''
new='''host.addEventListener("change",function(e){const el=e.target;if(el.tagName!=="SELECT")return;const iRaw=el.getAttribute("data-i"),k=el.getAttribute("data-k");if(iRaw==null||!k)return;const i=parseInt(iRaw,10),o=state.offers[i],old=o[k];o[k]=el.value;if(k==="otType"&&el.value!=="mixed"){const oldDefault=old==="rest"?200:150,newDefault=el.value==="rest"?200:150,current=otNumber(o.otFactor);if(!hasInput(o.otFactor)||Math.abs(current-oldDefault)<1e-9)o.otFactor=newDefault}markDirty();if(k==="probDurationUnit"||k==="probJobType"||k==="bhMode"||k==="otType"||k==="otBaseMode")renderInputs();scheduleCalculation()});
'''
if old not in s: raise SystemExit('select change handler target missing')
s=s.replace(old,new,1)

# Footer/disclaimer must describe the new calculation basis rather than the old gross-only model.
s=s.replace('Tiền OT là khoản ước tính từ lương gross, số giờ OT và hệ số bạn nhập; cách payroll thực tế có thể khác.','Tiền OT là khoản ước tính từ mức lương dùng để tính OT, số giờ và hệ số theo loại ngày bạn nhập; cách payroll thực tế có thể khác.',1)

# Re-pin CSP after inline JS changes.
a=s.index('<script>')+len('<script>');b=s.index('</script>',a)
digest=base64.b64encode(hashlib.sha256(s[a:b].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
