from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

# IA copy: the input is no longer two independent cards.
s=s.replace('<h2 class="sec">Nhập từng bên</h2>','<h2 class="sec">Nhập hai offer để so sánh</h2>',1)

# Add matrix styles without disturbing the existing result matrix styles.
css='''\n/* V2 Turn 1: one A/B comparison mental model for offer input */\n.offers-in{display:block}.offer-matrix{width:100%;background:#fff;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden}.offer-mrow{display:grid;grid-template-columns:minmax(160px,1.25fr) repeat(2,minmax(0,1fr));align-items:stretch;border-bottom:1px solid var(--line)}.offer-mrow:last-child{border-bottom:0}.offer-mrow.head{background:var(--paper-2);font-family:var(--mono);font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);align-items:center}.offer-mlabel,.offer-mcell{min-width:0;padding:11px 12px}.offer-mlabel{font-size:13px;color:var(--ink);display:flex;align-items:flex-start}.offer-mcell{border-left:1px solid var(--line)}.offer-mrow.head .offer-mlabel,.offer-mrow.head .offer-mcell{padding-top:9px;padding-bottom:9px}.offer-mcell .name-in{width:100%;font-family:var(--serif);font-size:16px;font-weight:600;color:var(--ink);border:0;border-bottom:1px solid var(--line);border-radius:0;background:transparent;padding:2px 0 5px}.offer-mcell .name-in:focus{outline:none;border-bottom-color:var(--moss)}.offer-mcell input[type=text],.offer-mcell select{font-size:14px;padding:9px 9px}.offer-mcell .suffix-row .suffix{right:9px;font-size:11px}.offer-mcell .suffix-row input{padding-right:34px}.offer-mcell .seg{width:100%}.offer-mcell .seg button{min-width:0;font-size:11.5px;padding:8px 4px;white-space:normal}.offer-mcell .seg.three button{font-size:10.5px;padding-left:2px;padding-right:2px}.offer-mcell .sub-input{margin-top:7px}.offer-mcell .benefit-note{font-size:10.5px;margin:5px 0 0}.offer-mnote{grid-column:1/-1;padding:8px 12px 10px;font-size:11.5px;line-height:1.5;color:var(--ink-soft);background:rgba(239,235,224,.36)}.offer-mnote.warn{color:var(--clay)}.offer-mna{color:var(--ink-soft);font-family:var(--mono);display:block;padding:8px 0}.compare-benefits{margin-top:10px;padding:0 12px;background:#fff;border:1px solid var(--line);border-radius:var(--radius)}.compare-benefits summary{padding:11px 0}.compare-benefits .benefits-body{padding:0 0 12px}.compare-benefits .offer-matrix{border-radius:8px}.offer-mcell .control-stack>*+*{margin-top:7px}\n@media(max-width:540px){.wrap{padding-left:10px;padding-right:10px}.offer-mrow{grid-template-columns:34% 33% 33%}.offer-mlabel,.offer-mcell{padding:9px 7px}.offer-mlabel{font-size:11.5px;line-height:1.4}.offer-mrow.head .offer-mlabel,.offer-mrow.head .offer-mcell{padding:8px 6px}.offer-mcell .name-in{font-size:13px}.offer-mcell input[type=text],.offer-mcell select{font-size:12.5px;padding:8px 6px}.offer-mcell .suffix-row input{padding-right:24px}.offer-mcell .suffix-row .suffix{right:5px;font-size:10px}.offer-mcell .seg button{font-size:10.5px;padding:8px 2px;line-height:1.15}.offer-mcell .seg.three button{font-size:9.5px}.offer-mnote{padding:7px 8px 9px;font-size:10.5px}.events .erow{grid-template-columns:38% 31% 31%;gap:4px;padding:10px 8px;font-size:12.5px}.events .erow.head{font-size:9.5px}.events .erow .lbl small{font-size:10.5px}.events .erow .va,.events .erow .vb{font-size:11.5px;min-width:0;overflow-wrap:anywhere}}\n'''
if '</style>' not in s: raise SystemExit('style end not found')
s=s.replace('</style>',css+'</style>',1)

new_render=r'''function renderInputs(){
 const A=state.offers[0],B=state.offers[1],dash='<span class="offer-mna">-</span>';
 const seg=function(i,kind,value,opts,three){return '<div class="seg'+(three?' three':'')+'" data-seg="'+kind+'" data-i="'+i+'">'+opts.map(function(x){return '<button data-v="'+x[0]+'" class="'+(value===x[0]?'on':'')+'">'+x[1]+'</button>'}).join('')+'</div>'};
 const textInput=function(i,k,o,placeholder,inputmode,money,suffix,extra){const raw=o[k],v=money?grp(raw==null?'':raw):esc(raw==null?'':raw);return '<div class="suffix-row"><input type="text" data-i="'+i+'" data-k="'+k+'" inputmode="'+(inputmode||'decimal')+'" placeholder="'+placeholder+'" value="'+v+'" '+(extra||'')+'>'+(suffix?'<span class="suffix">'+suffix+'</span>':'')+'</div>'};
 const row=function(label,a,b,note,cls){return '<div class="offer-mrow'+(cls?' '+cls:'')+'"><div class="offer-mlabel">'+label+'</div><div class="offer-mcell">'+a+'</div><div class="offer-mcell">'+b+'</div>'+(note?'<div class="offer-mnote">'+note+'</div>':'')+'</div>'};
 const head=function(){return '<div class="offer-mrow head"><div class="offer-mlabel">Chỉ tiêu</div><div class="offer-mcell"><input class="name-in" data-i="0" data-k="name" value="'+esc(A.name)+'"></div><div class="offer-mcell"><input class="name-in" data-i="1" data-k="name" value="'+esc(B.name)+'"></div></div>'};
 const baseCell=function(o,i){return '<div class="control-stack">'+seg(i,'base',o.base,[['full','Theo mặc định'],['custom','Tự nhập']])+(o.base==='custom'?'<div class="sub-input">'+textInput(i,'customBase',o,'vd 7,500,000','numeric',true,'đ')+'</div>':'')+'</div>'};
 const probOn=function(o){return o.probationEnabled==='yes'};
 const probMonthCell=function(o,i){if(!probOn(o))return dash;const raw=hasInput(o.probMon)?Number(String(o.probMon).replace(/,/g,'')):null,invalid=raw!=null&&(!Number.isFinite(raw)||raw<=0),help=invalid?'<p class="benefit-note" style="color:var(--clay);font-weight:600">Số tháng thử việc phải lớn hơn 0.</p>':(!hasInput(o.probMon)?'<p class="benefit-note">Khi chọn Có, số tháng thử việc cần lớn hơn 0.</p>':'');return textInput(i,'probMon',o,'vd 2','decimal',false,'',invalid?'aria-invalid="true"':'')+help};
 const jobCell=function(o,i){if(!probOn(o))return dash;return '<select data-i="'+i+'" data-k="probJobType"><option value="unknown" '+(o.probJobType==='unknown'?'selected':'')+'>Chưa rõ</option><option value="manager" '+(o.probJobType==='manager'?'selected':'')+'>Quản lý doanh nghiệp</option><option value="college" '+(o.probJobType==='college'?'selected':'')+'>Vị trí yêu cầu cao đẳng trở lên</option><option value="intermediate" '+(o.probJobType==='intermediate'?'selected':'')+'>Trung cấp / công nhân kỹ thuật / nhân viên nghiệp vụ</option><option value="other" '+(o.probJobType==='other'?'selected':'')+'>Công việc khác</option></select>'};
 const otPaidCell=function(o,i){const paid=o.otPaid==='yes';return '<div class="control-stack">'+seg(i,'otPaid',o.otPaid,[['no','Không'],['yes','Có']])+(paid?'<div class="sub-input">'+textInput(i,'otFactor',o,'vd 150','decimal',false,'%')+'</div>':'')+'</div>'};
 const perfCell=function(o,i){const amount=o.performanceBonusType==='amount';return '<div class="control-stack">'+seg(i,'performanceBonusType',o.performanceBonusType,[['months','Tháng lương'],['amount','Số tiền']])+'<div class="sub-input">'+textInput(i,'performanceBonusValue',o,amount?'vd 60,000,000':'vd 3',amount?'numeric':'decimal',amount,amount?'đ':'tháng')+'</div></div>'};
 const anyTrial=probOn(A)||probOn(B),open=shouldOpenBenefits(A)||shouldOpenBenefits(B);
 let html='<div class="offer-matrix">'+head();
 html+=row('Con số trong offer là',seg(0,'pay',A.payType,[['gross','Gross (trước trừ)'],['net','Net (về tay)']]),seg(1,'pay',B.payType,[['gross','Gross (trước trừ)'],['net','Net (về tay)']]));
 html+=row('Lương / tháng',textInput(0,'gross',A,'vd 20,000,000','numeric',true,'đ'),textInput(1,'gross',B,'vd 20,000,000','numeric',true,'đ'));
 html+=row('Mức lương làm căn cứ đóng BH',baseCell(A,0),baseCell(B,1));
 html+=row('Buổi lên VP / tuần',textInput(0,'days',A,'vd 5','decimal',false,''),textInput(1,'days',B,'vd 5','decimal',false,''));
 html+=row('Di chuyển 1 chiều (phút)',textInput(0,'commute',A,'vd 45','decimal',false,''),textInput(1,'commute',B,'vd 45','decimal',false,''));
 html+=row('OT (giờ / tuần)',textInput(0,'ot',A,'0','decimal',false,''),textInput(1,'ot',B,'0','decimal',false,''));
 html+=row('Có giai đoạn thử việc cần tính riêng?',seg(0,'probationEnabled',A.probationEnabled,[['no','Không'],['yes','Có']]),seg(1,'probationEnabled',B.probationEnabled,[['no','Không'],['yes','Có']]),'Chọn Không nếu không có thử việc, hoặc giai đoạn thử việc có lương và BH giống điều kiện chính thức nên không cần tách riêng. Nếu có khác biệt, chọn Có.');
 if(anyTrial){
  html+=row('Lương thử việc (% mức lương offer)',probOn(A)?textInput(0,'probPct',A,'100','decimal',false,'%')+ '<p class="benefit-note">Hưởng đủ mức lương offer thì để 100%.</p>':dash,probOn(B)?textInput(1,'probPct',B,'100','decimal',false,'%')+'<p class="benefit-note">Hưởng đủ mức lương offer thì để 100%.</p>':dash);
  html+=row('Số tháng thử việc',probMonthCell(A,0),probMonthCell(B,1));
  html+=row('Nhóm công việc (để kiểm tra thời gian thử việc)',jobCell(A,0),jobCell(B,1),'Giới hạn luật tương ứng: 180 ngày, 60 ngày, 30 ngày hoặc 06 ngày làm việc. Tool dùng số tháng bạn nhập để cảnh báo gần đúng; nếu hợp đồng ghi ngày, hãy ưu tiên số ngày thực tế.');
  html+=row('Trong thời gian thử việc có đóng BH bắt buộc?',probOn(A)?seg(0,'probInsurance',A.probInsurance,[['no','Không'],['yes','Có']]):dash,probOn(B)?seg(1,'probInsurance',B.probInsurance,[['no','Không'],['yes','Có']]):dash,'% thử việc được tính theo loại lương bạn đã chọn ở offer: Gross hoặc Net.');
 }
 html+=row('OT có tính lương không?',otPaidCell(A,0),otPaidCell(B,1),'OT luôn được cộng vào tổng thời gian bạn bỏ ra. Nếu công ty trả OT ngày thường 150% thì chọn Có và nhập 150 ở hệ số OT; tool dùng số giờ OT và hệ số này để ước tính tiền OT. Mốc OT ban ngày tối thiểu theo luật: 150% ngày thường, 200% ngày nghỉ hằng tuần, 300% lễ/Tết.');
 html+='</div>';
 html+='<details class="benefits compare-benefits"'+(open?' open':'')+'><summary>Thưởng, phụ cấp & phúc lợi</summary><div class="benefits-body"><div class="offer-matrix">'+head();
 html+=row('Thưởng đảm bảo / năm (tháng lương)',textInput(0,'guaranteedBonusMonths',A,'vd 1','decimal',false,''),textInput(1,'guaranteedBonusMonths',B,'vd 1','decimal',false,''),'Ví dụ tháng 13 chắc chắn nhận = 1. Khoản này dùng cùng loại Gross/Net đã chọn cho offer.');
 html+=row('Thưởng hiệu suất / năm',perfCell(A,0),perfCell(B,1),'Nhập đúng cách HR/offer nêu khoản thưởng: ví dụ 3 tháng lương hoặc 60,000,000đ. Khoản này dùng cùng loại Gross/Net của offer và không nằm trong phần “Chắc chắn”.');
 html+=row('Phụ cấp cố định ngoài mức lương trên / tháng',textInput(0,'fixedAllowance',A,'vd 1,000,000','numeric',true,'đ'),textInput(1,'fixedAllowance',B,'vd 1,000,000','numeric',true,'đ'));
 html+=row('Nghỉ phép hưởng lương / năm',textInput(0,'paidLeaveDays',A,'vd 12','decimal',false,''),textInput(1,'paidLeaveDays',B,'vd 12','decimal',false,''),'Ngày phép không được cộng thành “tiền thưởng”. Tool chỉ dùng phép để giảm số giờ bạn phải bỏ ra khi tính giá trị/giờ.');
 html+=row('Phụ cấp này có tính vào căn cứ BH?',seg(0,'allowanceBh',A.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true),seg(1,'allowanceBh',B.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true),'Nếu để “Chưa rõ”, tool tạm tính <b>Có</b> để tránh làm tiền về tay trông cao hơn thực tế. Nếu bạn chọn “Tự nhập” mức căn cứ BH ở phía trên, mức tự nhập luôn được ưu tiên.');
 html+='</div></div></details>';
 document.getElementById('offersIn').innerHTML=html;
}

'''
pat=r'function renderInputs\(\)\{.*?\n\}\n\nfunction renderSwitchingInputs\(\)\{'
m=re.search(pat,s,flags=re.S)
if not m: raise SystemExit('renderInputs block not found')
s=s[:m.start()]+new_render+'function renderSwitchingInputs(){'+s[m.end():]

# Re-pin CSP after inline JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
