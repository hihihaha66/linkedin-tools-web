from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

s=s.replace('function blank(n){return{name:n,gross:null,payType:"gross",base:"full",customBase:null,days:null,commute:null,otMonthly:null,otPaid:"no",otFactor:null,probationEnabled:"no",probPct:null,probDurationValue:null,probDurationUnit:"months",probInsurance:"no",probJobType:"unknown",guaranteedBonusMonths:null,performanceBonusType:"months",performanceBonusValue:null,fixedAllowance:null,allowanceBh:"unknown",paidLeaveDays:null}}',
'''function blank(n){return{name:n,gross:null,payType:"gross",base:"full",bhMode:"unknown",customBase:null,days:null,commute:null,otMonthly:null,otPaid:"no",otFactor:null,probationEnabled:"no",probPct:null,probDurationValue:null,probDurationUnit:"months",probInsurance:"no",probJobType:"unknown",guaranteedBonusMonths:null,performanceBonusType:"months",performanceBonusValue:null,fixedAllowance:null,allowanceBh:"unknown",paidLeaveDays:null}}''',1)

old=''' return{name:String(src.name||n),gross:src.gross??null,payType:src.payType==="net"?"net":"gross",base:src.base==="custom"?"custom":"full",customBase:src.customBase??null,days:src.days??null,commute:src.commute??null,otMonthly,otPaid:src.otPaid==="yes"?"yes":"no",otFactor:src.otFactor??null,
'''
new=''' const bhMode=["unknown","salary","custom"].includes(src.bhMode)?src.bhMode:(src.base==="custom"?"custom":"salary");
 return{name:String(src.name||n),gross:src.gross??null,payType:src.payType==="net"?"net":"gross",base:bhMode==="custom"?"custom":"full",bhMode,customBase:src.customBase??null,days:src.days??null,commute:src.commute??null,otMonthly,otPaid:src.otPaid==="yes"?"yes":"no",otFactor:src.otFactor??null,
'''
if old not in s: raise SystemExit('ensure offer target missing')
s=s.replace(old,new,1)

old=''' const baseCell=function(o,i){return '<div class="control-stack">'+seg(i,'base',o.base,[['full','Theo mặc định'],['custom','Tự nhập']])+(o.base==='custom'?'<div class="sub-input">'+textInput(i,'customBase',o,'vd 7,500,000','numeric',true,'đ')+'</div>':'')+'</div>'};
'''
new=''' const bhCell=function(o,i){return '<div class="control-stack"><select data-i="'+i+'" data-k="bhMode"><option value="unknown" '+(o.bhMode==='unknown'?'selected':'')+'>Chưa rõ</option><option value="salary" '+(o.bhMode==='salary'?'selected':'')+'>Theo mức lương offer</option><option value="custom" '+(o.bhMode==='custom'?'selected':'')+'>Tôi biết mức cụ thể</option></select>'+(o.bhMode==='custom'?'<div class="sub-input">'+textInput(i,'customBase',o,'vd 7,500,000','numeric',true,'đ')+'</div>':'')+'</div>'};
'''
if old not in s: raise SystemExit('base cell target missing')
s=s.replace(old,new,1)

s=s.replace("html+=row('Mức lương làm căn cứ đóng BH',baseCell(A,0),baseCell(B,1));", "html+=row('Công ty dùng mức nào để đóng BH?',bhCell(A,0),bhCell(B,1));",1)

s=s.replace('<p class="hint" style="max-width:none;margin:10px 0 14px"><b>Chưa biết mức đóng bảo hiểm?</b> Có thể hỏi HR: “Mức lương làm căn cứ đóng BHXH/BHYT/BHTN của vị trí này là bao nhiêu?”. “Theo mặc định” dùng gross và tạm cộng phụ cấp cố định vào căn cứ BH nếu bạn chưa xác nhận là “Không”; nếu HR đưa một mức BH riêng, chọn “Tự nhập”.</p>',
'<p class="hint" style="max-width:none;margin:10px 0 14px"><b>Chưa biết mức đóng bảo hiểm?</b> Chọn “Chưa rõ”. Tool tạm lấy mức lương offer làm mức dùng để tính BH; nếu có phụ cấp cố định, phần phụ cấp được xử lý theo lựa chọn bạn nhập. Nếu HR cho biết một mức riêng, chọn “Tôi biết mức cụ thể” và nhập số tiền.</p>',1)

s=s.replace('Căn cứ BH dùng theo lựa chọn ở từng offer; nếu để “Chưa rõ”, tool tạm tính Có để tránh làm tiền về tay trông cao hơn thực tế, còn mức “Tự nhập” luôn được ưu tiên.',
'Căn cứ BH dùng theo lựa chọn ở từng offer; nếu để “Chưa rõ”, tool tạm lấy mức lương offer làm mức dùng để tính BH, còn mức cụ thể bạn nhập luôn được ưu tiên.',1)

old=''' out.offers.forEach((o,i)=>{const src=state.offers[i],raw=src.otMonthly,n=hasInput(raw)?Number(String(raw).replace(/,/g,"")):0;o.ot=Number.isFinite(n)&&n>0?n/UI_WKS:0;delete o.otMonthly;o.probMon=probDurationMonthsForApi(src);delete o.probDurationValue;delete o.probDurationUnit});
'''
new=''' out.offers.forEach((o,i)=>{const src=state.offers[i],raw=src.otMonthly,n=hasInput(raw)?Number(String(raw).replace(/,/g,"")):0;o.ot=Number.isFinite(n)&&n>0?n/UI_WKS:0;delete o.otMonthly;o.probMon=probDurationMonthsForApi(src);delete o.probDurationValue;delete o.probDurationUnit;o.base=src.bhMode==='custom'?'custom':'full'});
'''
if old not in s: raise SystemExit('api adapter target missing')
s=s.replace(old,new,1)

s=s.replace('if(k==="probDurationUnit"||k==="probJobType")renderInputs();scheduleCalculation()','if(k==="probDurationUnit"||k==="probJobType"||k==="bhMode")renderInputs();scheduleCalculation()',1)

# Old base segment is no longer rendered. Keep handler harmless for compatibility but new UI uses select bhMode.

# Refresh CSP hash after inline JS update.
a=s.index('<script>')+len('<script>'); b=s.index('</script>',a)
digest=base64.b64encode(hashlib.sha256(s[a:b].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)

# bootstrap trigger 2
