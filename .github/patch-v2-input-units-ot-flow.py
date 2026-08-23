from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

# 1) Frontend keeps OT in hours/month for the user, while the existing backend API still receives hours/week.
s=s.replace('const API_URL="https://linkedin-tools-api-test.vercel.app/api/offer-value-v2";','const API_URL="https://linkedin-tools-api-test.vercel.app/api/offer-value-v2";\nconst UI_WKS=4.33;',1)
s=s.replace('commute:null,ot:null,otPaid:"no"','commute:null,otMonthly:null,otPaid:"no"',1)

old='''function ensureOfferShape(o,n){
 const src=o||{},oldTrial=src.probationEnabled==null&&(hasPositiveValue(src.probPct)||hasPositiveValue(src.probMon)||src.probInsurance==="yes"),trialEnabled=(src.probationEnabled==="yes"||oldTrial),probPct=(trialEnabled&&!hasInput(src.probPct)?100:(src.probPct??null));
 return{name:String(src.name||n),gross:src.gross??null,payType:src.payType==="net"?"net":"gross",base:src.base==="custom"?"custom":"full",customBase:src.customBase??null,days:src.days??null,commute:src.commute??null,ot:src.ot??null,otPaid:src.otPaid==="yes"?"yes":"no",otFactor:src.otFactor??null,
'''
new='''function ensureOfferShape(o,n){
 const src=o||{},oldTrial=src.probationEnabled==null&&(hasPositiveValue(src.probPct)||hasPositiveValue(src.probMon)||src.probInsurance==="yes"),trialEnabled=(src.probationEnabled==="yes"||oldTrial),probPct=(trialEnabled&&!hasInput(src.probPct)?100:(src.probPct??null));
 const oldOt=hasInput(src.ot)?Number(String(src.ot).replace(/,/g,"")):NaN,otMonthly=hasInput(src.otMonthly)?src.otMonthly:(Number.isFinite(oldOt)&&oldOt>=0?Math.round(oldOt*UI_WKS*100)/100:null);
 return{name:String(src.name||n),gross:src.gross??null,payType:src.payType==="net"?"net":"gross",base:src.base==="custom"?"custom":"full",customBase:src.customBase??null,days:src.days??null,commute:src.commute??null,otMonthly,otPaid:src.otPaid==="yes"?"yes":"no",otFactor:src.otFactor??null,
'''
if old not in s: raise SystemExit('ensureOfferShape target missing')
s=s.replace(old,new,1)

# 2) Numeric suffixes need enough room in the narrow A/B columns.
s=s.replace('.offer-mcell .suffix-row input{padding-right:34px}', '.offer-mcell .suffix-row input{padding-right:34px}.offer-mcell .suffix-row.unit-wide input{padding-right:64px}',1)
s=s.replace('.offer-mcell .suffix-row input{padding-right:24px}', '.offer-mcell .suffix-row input{padding-right:24px}.offer-mcell .suffix-row.unit-wide input{padding-right:53px}',1)

# 3) Shared UI helpers: units, OT conditional row, clearer probation classification.
old=""" const textInput=function(i,k,o,placeholder,inputmode,money,suffix,extra){const raw=o[k],v=money?grp(raw==null?'':raw):esc(raw==null?'':raw);return '<div class=\"suffix-row\"><input type=\"text\" data-i=\"'+i+'\" data-k=\"'+k+'\" inputmode=\"'+(inputmode||'decimal')+'\" placeholder=\"'+placeholder+'\" value=\"'+v+'\" '+(extra||'')+'>'+(suffix?'<span class=\"suffix\">'+suffix+'</span>':'')+'</div>'};
"""
new=""" const textInput=function(i,k,o,placeholder,inputmode,money,suffix,extra){const raw=o[k],v=money?grp(raw==null?'':raw):esc(raw==null?'':raw),wide=suffix&&String(suffix).length>2?' unit-wide':'';return '<div class=\"suffix-row'+wide+'\"><input type=\"text\" data-i=\"'+i+'\" data-k=\"'+k+'\" inputmode=\"'+(inputmode||'decimal')+'\" placeholder=\"'+placeholder+'\" value=\"'+v+'\" '+(extra||'')+'>'+(suffix?'<span class=\"suffix\">'+suffix+'</span>':'')+'</div>'};
"""
if old not in s: raise SystemExit('textInput helper target missing')
s=s.replace(old,new,1)

old=""" const jobCell=function(o,i){if(!probOn(o))return dash;return '<select data-i=\"'+i+'\" data-k=\"probJobType\"><option value=\"unknown\" '+(o.probJobType==='unknown'?'selected':'')+'>Chưa rõ</option><option value=\"manager\" '+(o.probJobType==='manager'?'selected':'')+'>Quản lý doanh nghiệp</option><option value=\"college\" '+(o.probJobType==='college'?'selected':'')+'>Vị trí yêu cầu cao đẳng trở lên</option><option value=\"intermediate\" '+(o.probJobType==='intermediate'?'selected':'')+'>Trung cấp / công nhân kỹ thuật / nhân viên nghiệp vụ</option><option value=\"other\" '+(o.probJobType==='other'?'selected':'')+'>Công việc khác</option></select>'};
 const otPaidCell=function(o,i){const paid=o.otPaid==='yes';return '<div class=\"control-stack\">'+seg(i,'otPaid',o.otPaid,[['no','Không'],['yes','Có']])+(paid?'<div class=\"sub-input\">'+textInput(i,'otFactor',o,'vd 150','decimal',false,'%')+'</div>':'')+'</div>'};
"""
new=""" const jobCell=function(o,i){if(!probOn(o))return dash;return '<select data-i=\"'+i+'\" data-k=\"probJobType\"><option value=\"unknown\" '+(o.probJobType==='unknown'?'selected':'')+'>Chưa rõ</option><option value=\"manager\" '+(o.probJobType==='manager'?'selected':'')+'>Quản lý doanh nghiệp · tối đa 180 ngày</option><option value=\"college\" '+(o.probJobType==='college'?'selected':'')+'>Cao đẳng trở lên · tối đa 60 ngày</option><option value=\"intermediate\" '+(o.probJobType==='intermediate'?'selected':'')+'>Trung cấp / kỹ thuật / nghiệp vụ · tối đa 30 ngày</option><option value=\"other\" '+(o.probJobType==='other'?'selected':'')+'>Công việc khác · tối đa 6 ngày làm việc</option></select>'};
 const otPaidCell=function(o,i){const hasOt=hasPositiveValue(o.otMonthly),paid=o.otPaid==='yes';return '<div class=\"ot-paid-cell\" data-ot-paid-cell=\"'+i+'\"><span class=\"offer-mna ot-paid-dash\" style=\"'+(hasOt?'display:none':'')+'\">-</span><div class=\"control-stack ot-paid-controls\" style=\"'+(hasOt?'':'display:none')+'\">'+seg(i,'otPaid',o.otPaid,[['no','Không'],['yes','Có']])+(paid?'<div class=\"sub-input\">'+textInput(i,'otFactor',o,'vd 150','decimal',false,'%')+'</div>':'')+'</div></div>'};
"""
if old not in s: raise SystemExit('job/OT helper target missing')
s=s.replace(old,new,1)

# 4) Actual matrix rows: clear units, OT hours first, paid question only when relevant.
s=s.replace("html+=row('Buổi lên VP / tuần',textInput(0,'days',A,'vd 5','decimal',false,''),textInput(1,'days',B,'vd 5','decimal',false,''));", "html+=row('Lên văn phòng / tuần',textInput(0,'days',A,'vd 5','decimal',false,'buổi'),textInput(1,'days',B,'vd 5','decimal',false,'buổi'));",1)
s=s.replace("html+=row('Di chuyển 1 chiều (phút)',textInput(0,'commute',A,'vd 45','decimal',false,''),textInput(1,'commute',B,'vd 45','decimal',false,''));", "html+=row('Di chuyển 1 chiều',textInput(0,'commute',A,'vd 45','decimal',false,'phút'),textInput(1,'commute',B,'vd 45','decimal',false,'phút'));",1)
s=s.replace("html+=row('OT (giờ / tuần)',textInput(0,'ot',A,'0','decimal',false,''),textInput(1,'ot',B,'0','decimal',false,''));", "html+=row('Làm thêm giờ (OT) trung bình / tháng',textInput(0,'otMonthly',A,'vd 8','decimal',false,'giờ'),textInput(1,'otMonthly',B,'vd 8','decimal',false,'giờ'));",1)
s=s.replace("return textInput(i,'probMon',o,'vd 2','decimal',false,'',invalid?'aria-invalid=\"true\"':'')+", "return textInput(i,'probMon',o,'vd 2','decimal',false,'tháng',invalid?'aria-invalid=\"true\"':'')+",1)
s=s.replace("html+=row('Nhóm công việc (để kiểm tra thời gian thử việc)',jobCell(A,0),jobCell(B,1),'Giới hạn luật tương ứng: 180 ngày, 60 ngày, 30 ngày hoặc 06 ngày làm việc. Tool dùng số tháng bạn nhập để cảnh báo gần đúng; nếu hợp đồng ghi ngày, hãy ưu tiên số ngày thực tế.');", "html+=row('Vị trí này thuộc nhóm nào?',jobCell(A,0),jobCell(B,1),'Tool dùng nhóm này để cảnh báo nếu thời gian thử việc bạn nhập vượt giới hạn tương ứng.');",1)
s=s.replace("html+=row('OT có tính lương không?',otPaidCell(A,0),otPaidCell(B,1),'OT luôn được cộng vào tổng thời gian bạn bỏ ra. Nếu công ty trả OT ngày thường 150% thì chọn Có và nhập 150 ở hệ số OT; tool dùng số giờ OT và hệ số này để ước tính tiền OT. Mốc OT ban ngày tối thiểu theo luật: 150% ngày thường, 200% ngày nghỉ hằng tuần, 300% lễ/Tết.');", "html+=row('OT có được trả tiền không?',otPaidCell(A,0),otPaidCell(B,1),'OT vẫn được cộng vào tổng thời gian bạn bỏ ra dù có được trả thêm hay không. Nếu chọn Có, nhập hệ số công ty áp dụng để tool ước tính tiền OT.','ot-paid-row');",1)
s=s.replace("html+=row('Thưởng đảm bảo / năm (tháng lương)',textInput(0,'guaranteedBonusMonths',A,'vd 1','decimal',false,''),textInput(1,'guaranteedBonusMonths',B,'vd 1','decimal',false,''),'Ví dụ tháng 13 chắc chắn nhận = 1. Khoản này dùng cùng loại Gross/Net đã chọn cho offer.');", "html+=row('Thưởng đảm bảo / năm (tháng lương)',textInput(0,'guaranteedBonusMonths',A,'vd 1','decimal',false,'tháng'),textInput(1,'guaranteedBonusMonths',B,'vd 1','decimal',false,'tháng'),'Ví dụ tháng 13 chắc chắn nhận = 1. Khoản này dùng cùng loại Gross/Net đã chọn cho offer.');",1)
s=s.replace("html+=row('Nghỉ phép hưởng lương / năm',textInput(0,'paidLeaveDays',A,'vd 12','decimal',false,''),textInput(1,'paidLeaveDays',B,'vd 12','decimal',false,''),'Ngày phép không được cộng thành “tiền thưởng”. Tool chỉ dùng phép để giảm số giờ bạn phải bỏ ra khi tính giá trị/giờ.');", "html+=row('Nghỉ phép hưởng lương / năm',textInput(0,'paidLeaveDays',A,'vd 12','decimal',false,'ngày'),textInput(1,'paidLeaveDays',B,'vd 12','decimal',false,'ngày'),'Ngày phép không được cộng thành “tiền thưởng”. Tool chỉ dùng phép để giảm số giờ bạn phải bỏ ra khi tính giá trị/giờ.');",1)

# 5) Keep the paid-OT row and each A/B cell synchronized while typing without rerendering the whole matrix.
marker='''function syncProbMonthInline(el,i){
'''
if marker not in s: raise SystemExit('syncProbMonthInline marker missing')
ot_sync='''function syncOtPaidVisibility(){
 const row=document.querySelector('#offersIn .ot-paid-row');if(!row)return;
 const active=state.offers.map(o=>hasPositiveValue(o.otMonthly));
 row.style.display=active.some(Boolean)?'grid':'none';
 active.forEach((on,i)=>{const cell=row.querySelector('[data-ot-paid-cell="'+i+'"]');if(!cell)return;const dash=cell.querySelector('.ot-paid-dash'),controls=cell.querySelector('.ot-paid-controls');if(dash)dash.style.display=on?'none':'';if(controls)controls.style.display=on?'':'none'});
}

'''
s=s.replace(marker,ot_sync+marker,1)
s=s.replace("document.getElementById('offersIn').innerHTML=html;\n}", "document.getElementById('offersIn').innerHTML=html;\n syncOtPaidVisibility();\n}",1)
s=s.replace('if(k==="probMon")syncProbMonthInline(el,i);', 'if(k==="probMon")syncProbMonthInline(el,i);if(k==="otMonthly")syncOtPaidVisibility();',1)

# 6) Adapter: API still receives legacy weekly OT, so backend math/regressions stay untouched.
marker='''function hasAnySalary(){return state.offers.some(o=>{const n=Number(String(o.gross??"").replace(/,/g,""));return Number.isFinite(n)&&n>0})}
'''
if marker not in s: raise SystemExit('hasAnySalary marker missing')
adapter='''function apiState(){
 const out=JSON.parse(JSON.stringify(state));
 out.offers.forEach((o,i)=>{const raw=state.offers[i].otMonthly,n=hasInput(raw)?Number(String(raw).replace(/,/g,"")):0;o.ot=Number.isFinite(n)&&n>0?n/UI_WKS:0;delete o.otMonthly});
 return out;
}
'''
s=s.replace(marker,marker+adapter,1)
s=s.replace('const body=JSON.stringify(state);','const body=JSON.stringify(apiState());',1)

# Re-pin CSP after inline JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
