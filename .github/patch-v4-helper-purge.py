from pathlib import Path
import re,hashlib,base64

HTML=Path('net-cao-hon-co-that-tot-hon-v4.html')
TEST=Path('tests/v4-clean-ui.mjs')
s=HTML.read_text();t=TEST.read_text()

# V4 rule: default UI should not explain ahead of need. Keep only validation/warnings,
# active assumptions, empty/error states and detail content opened by the user.
static_repls={
'<span class="ctx-label-main">Người phụ thuộc</span><span class="ctx-label-sub">(tính thuế)</span>':'<span class="ctx-label-main">Người phụ thuộc</span>',
'<span class="ctx-label-main">Vùng lương tối thiểu</span><span class="ctx-label-sub">(trần BHTN)</span>':'<span class="ctx-label-main">Vùng lương tối thiểu</span>',
'<p class="bh-shared-note">Chỉ dùng để mô phỏng quyền lợi BHXH; không ảnh hưởng lương/thu nhập so sánh. Tool không kiểm tra điều kiện hưởng.</p>':'',
}
for old,new in static_repls.items():
    if old not in s: raise SystemExit('static helper anchor missing: '+old[:80])
    s=s.replace(old,new,1)

# Remove explanatory note under custom OT base: the select label + field already explain the action.
for old in [
    "+'</div><p class=\"benefit-note\" style=\"margin-bottom:0\">Nhập mức lương tháng công ty thực tế dùng để tính OT.</p>':'')+'</div>');};",
    "+'</div><p class=\"benefit-note\" style=\"margin-bottom:0\">Nhập mức lương tháng công ty thực tế dùng để tính OT.</p>':'')+'</div>';",
]:
    if old in s:
        s=s.replace(old,old.replace('+\'<p class="benefit-note" style="margin-bottom:0">Nhập mức lương tháng công ty thực tế dùng để tính OT.</p>\'',''),1)
# The literal above is awkward in generated JS; use direct HTML-fragment removal as a final guard.
s=s.replace('<p class="benefit-note" style="margin-bottom:0">Nhập mức lương tháng công ty thực tế dùng để tính OT.</p>','')

# Offer matrix: all generic row notes go away. Inline OT/probation validation remains.
offer_lines={
"html+=row('Làm thêm giờ (OT) trung bình / tháng',otHoursCell(A,0),otHoursCell(B,1),(otActive(A)||(state.offerCount===2&&otActive(B)))?'Quy đổi theo 12 tháng để đối chiếu mốc 40 giờ/tháng và 200/300 giờ/năm.':'');":"html+=row('Làm thêm giờ (OT) trung bình / tháng',otHoursCell(A,0),otHoursCell(B,1));",
"html+=row('OT có được trả tiền không?',otPaidCell(A,0),otPaidCell(B,1),'OT không lương vẫn được cộng vào tổng thời gian bạn bỏ ra.','ot-paid-row');":"html+=row('OT có được trả tiền không?',otPaidCell(A,0),otPaidCell(B,1),'','ot-paid-row');",
"html+=row('OT chủ yếu rơi vào',otTypeCell(A,0),otTypeCell(B,1),'Ngày thường dùng mốc tối thiểu 150%; ngày nghỉ hằng tuần 200%. Chọn Nhiều loại nếu cần tách thêm ngày lễ/Tết.','ot-type-row');":"html+=row('OT chủ yếu rơi vào',otTypeCell(A,0),otTypeCell(B,1),'','ot-type-row');",
"html+=row('Hệ số OT',otFactorCell(A,0),otFactorCell(B,1),'Tool điền mốc tối thiểu theo loại ngày; bạn có thể sửa nếu chính sách công ty áp dụng hệ số khác.','ot-factor-row');":"html+=row('Hệ số OT',otFactorCell(A,0),otFactorCell(B,1),'','ot-factor-row');",
"html+=row('OT ngày thường',otMixedCell(A,0,'otBreakdownWeekday','otFactorWeekday',150,false),otMixedCell(B,1,'otBreakdownWeekday','otFactorWeekday',150,false),'Nhập giờ/tháng và hệ số tương ứng.','ot-mixed-weekday-row');":"html+=row('OT ngày thường',otMixedCell(A,0,'otBreakdownWeekday','otFactorWeekday',150,false),otMixedCell(B,1,'otBreakdownWeekday','otFactorWeekday',150,false),'','ot-mixed-weekday-row');",
"html+=row('OT ngày lễ/Tết',otMixedCell(A,0,'otBreakdownHoliday','otFactorHoliday',300,true),otMixedCell(B,1,'otBreakdownHoliday','otFactorHoliday',300,true),'Tổng giờ của 3 loại phải bằng OT trung bình/tháng đã nhập.','ot-mixed-holiday-row');":"html+=row('OT ngày lễ/Tết',otMixedCell(A,0,'otBreakdownHoliday','otFactorHoliday',300,true),otMixedCell(B,1,'otBreakdownHoliday','otFactorHoliday',300,true),'','ot-mixed-holiday-row');",
"html+=row('Mức lương dùng để tính OT',otBaseCell(A,0),otBaseCell(B,1),'Nếu không biết công ty dùng mức riêng nào, để “Ước tính theo lương offer”.','ot-base-row');":"html+=row('Mức lương dùng để tính OT',otBaseCell(A,0),otBaseCell(B,1),'','ot-base-row');",
"html+=row('Có giai đoạn thử việc cần tính riêng?',seg(0,'probationEnabled',A.probationEnabled,[['no','Không'],['yes','Có']]),seg(1,'probationEnabled',B.probationEnabled,[['no','Không'],['yes','Có']]),anyTrial?'Chỉ tách riêng khi lương hoặc BH thử việc khác giai đoạn chính thức.':'');":"html+=row('Có giai đoạn thử việc cần tính riêng?',seg(0,'probationEnabled',A.probationEnabled,[['no','Không'],['yes','Có']]),seg(1,'probationEnabled',B.probationEnabled,[['no','Không'],['yes','Có']]));",
"html+=row('Nhóm công việc của vị trí',jobCell(A,0),jobCell(B,1),'Chỉ dùng để cảnh báo giới hạn thời gian thử việc; không làm thay đổi cách tính lương.');":"html+=row('Nhóm công việc của vị trí',jobCell(A,0),jobCell(B,1));",
"html+=row('Thời gian thử việc',probDurationCell(A,0),probDurationCell(B,1),'Nhập theo đúng đơn vị offer hoặc hợp đồng ghi. Nếu chọn Ngày, tool dùng số ngày để kiểm tra giới hạn và chỉ quy đổi sang tháng ở bước mô phỏng thu nhập.');":"html+=row('Thời gian thử việc',probDurationCell(A,0),probDurationCell(B,1));",
"html+=row('Trong thời gian thử việc có đóng BH bắt buộc?',probOn(A)?seg(0,'probInsurance',A.probInsurance,[['no','Không'],['yes','Có']]):dash,probOn(B)?seg(1,'probInsurance',B.probInsurance,[['no','Không'],['yes','Có']]):dash,'Chọn theo hợp đồng hoặc chính sách thử việc thực tế.');":"html+=row('Trong thời gian thử việc có đóng BH bắt buộc?',probOn(A)?seg(0,'probInsurance',A.probInsurance,[['no','Không'],['yes','Có']]):dash,probOn(B)?seg(1,'probInsurance',B.probInsurance,[['no','Không'],['yes','Có']]):dash);",
"html+=row('Thưởng đảm bảo / năm (tháng lương)',textInput(0,'guaranteedBonusMonths',A,'VD: 1','decimal',false,'tháng'),textInput(1,'guaranteedBonusMonths',B,'VD: 1','decimal',false,'tháng'),'Tháng 13 chắc chắn nhận = 1.');":"html+=row('Thưởng đảm bảo / năm (tháng lương)',textInput(0,'guaranteedBonusMonths',A,'VD: 1','decimal',false,'tháng'),textInput(1,'guaranteedBonusMonths',B,'VD: 1','decimal',false,'tháng'));",
"html+=row('Thưởng hiệu suất / năm',perfCell(A,0),perfCell(B,1),'Không cộng vào “Thu nhập cố định”.');":"html+=row('Thưởng hiệu suất / năm',perfCell(A,0),perfCell(B,1));",
"html+=row('Phụ cấp này có tính vào căn cứ BH?',seg(0,'allowanceBh',A.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true),seg(1,'allowanceBh',B.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true),'Nếu để “Chưa rõ”, tool tạm tính <b>Có</b> để tránh làm tiền về tay trông cao hơn thực tế. Nếu bạn chọn “Tôi biết mức cụ thể” ở phần BH phía trên, mức bạn nhập được ưu tiên.');":"html+=row('Phụ cấp này có tính vào căn cứ BH?',seg(0,'allowanceBh',A.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true),seg(1,'allowanceBh',B.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true));",
"html+=row('Nghỉ phép hưởng lương / năm',textInput(0,'paidLeaveDays',A,'VD: 12','decimal',false,'ngày'),textInput(1,'paidLeaveDays',B,'VD: 12','decimal',false,'ngày'),'Ngày phép không được cộng thành “tiền thưởng”. Tool chỉ dùng phép để giảm số giờ bạn phải bỏ ra khi tính giá trị/giờ.');":"html+=row('Nghỉ phép hưởng lương / năm',textInput(0,'paidLeaveDays',A,'VD: 12','decimal',false,'ngày'),textInput(1,'paidLeaveDays',B,'VD: 12','decimal',false,'ngày'));",
}
for old,new in offer_lines.items():
    if old not in s: raise SystemExit('offer helper anchor missing: '+old[:85])
    s=s.replace(old,new,1)
# Remove duplicate gross/net probation helper fragments in both offer columns.
s=s.replace("+ '<p class=\"benefit-note\">Nếu offer là Gross, % này áp trên Gross; nếu là Net, áp trên Net. Hưởng đủ thì để 100%.</p>'",'')
s=s.replace("+'<p class=\"benefit-note\">Nếu offer là Gross, % này áp trên Gross; nếu là Net, áp trên Net. Hưởng đủ thì để 100%.</p>'",'')

# Current Job mirrors the same clean-input rule.
current_lines={
"html+=row('Làm thêm giờ (OT) trung bình / tháng',inp('otMonthly',o.otMonthly,'VD: 8','giờ')+'<p class=\"ot-current-help\" data-current-ot-guard>'+esc(otGuardrailText(o))+'</p>','Quy đổi OT trung bình theo tháng ra 12 tháng để đối chiếu mốc 40 giờ/tháng và 200/300 giờ/năm.');":"html+=row('Làm thêm giờ (OT) trung bình / tháng',inp('otMonthly',o.otMonthly,'VD: 8','giờ')+'<p class=\"ot-current-help\" data-current-ot-guard>'+esc(otGuardrailText(o))+'</p>');",
"html+=row('OT có được trả tiền không?',sg('otPaid',o.otPaid,[['no','Không'],['yes','Có']]),'OT không lương vẫn được cộng vào tổng thời gian bạn bỏ ra.','current-ot-row','data-current-ot-row=\"paid\"'+(active?'':' hidden'));":"html+=row('OT có được trả tiền không?',sg('otPaid',o.otPaid,[['no','Không'],['yes','Có']]),'','current-ot-row','data-current-ot-row=\"paid\"'+(active?'':' hidden'));",
"html+=row('OT chủ yếu rơi vào','<select data-current=\"otType\"><option value=\"weekday\" '+(o.otType==='weekday'?'selected':'')+'>Ngày thường</option><option value=\"rest\" '+(o.otType==='rest'?'selected':'')+'>Ngày nghỉ hằng tuần</option><option value=\"mixed\" '+(o.otType==='mixed'?'selected':'')+'>Nhiều loại</option></select>','Ngày thường dùng mốc tối thiểu 150%; ngày nghỉ hằng tuần 200%. Chọn Nhiều loại nếu cần tách thêm ngày lễ/Tết.','current-ot-row','data-current-ot-row=\"type\"'+(paid?'':' hidden'));":"html+=row('OT chủ yếu rơi vào','<select data-current=\"otType\"><option value=\"weekday\" '+(o.otType==='weekday'?'selected':'')+'>Ngày thường</option><option value=\"rest\" '+(o.otType==='rest'?'selected':'')+'>Ngày nghỉ hằng tuần</option><option value=\"mixed\" '+(o.otType==='mixed'?'selected':'')+'>Nhiều loại</option></select>','','current-ot-row','data-current-ot-row=\"type\"'+(paid?'':' hidden'));",
"html+=row('Hệ số OT',inp('otFactor',o.otFactor,'VD: '+factorMin,'%')+'<p class=\"ot-current-help\" data-current-ot-factor>'+esc(otFactorText(o,'otFactor',factorMin))+'</p>','Tool điền mốc tối thiểu theo loại ngày; bạn có thể sửa nếu chính sách công ty áp dụng hệ số khác.','current-ot-row','data-current-ot-row=\"factor\"'+(paid&&!mixed?'':' hidden'));":"html+=row('Hệ số OT',inp('otFactor',o.otFactor,'VD: '+factorMin,'%')+'<p class=\"ot-current-help\" data-current-ot-factor>'+esc(otFactorText(o,'otFactor',factorMin))+'</p>','','current-ot-row','data-current-ot-row=\"factor\"'+(paid&&!mixed?'':' hidden'));",
"html+=row('OT ngày thường','<div class=\"ot-mini-pair\">'+inp('otBreakdownWeekday',o.otBreakdownWeekday,'VD: 4','giờ')+inp('otFactorWeekday',o.otFactorWeekday,'VD: 150','%')+'</div>','Nhập giờ/tháng và hệ số tương ứng.','current-ot-row','data-current-ot-row=\"mixed-weekday\"'+(mixed?'':' hidden'));":"html+=row('OT ngày thường','<div class=\"ot-mini-pair\">'+inp('otBreakdownWeekday',o.otBreakdownWeekday,'VD: 4','giờ')+inp('otFactorWeekday',o.otFactorWeekday,'VD: 150','%')+'</div>','','current-ot-row','data-current-ot-row=\"mixed-weekday\"'+(mixed?'':' hidden'));",
"html+=row('OT ngày lễ/Tết','<div class=\"ot-mini-pair\">'+inp('otBreakdownHoliday',o.otBreakdownHoliday,'VD: 4','giờ')+inp('otFactorHoliday',o.otFactorHoliday,'VD: 300','%')+'</div><p class=\"ot-current-help\" data-current-ot-mixed>'+esc(otMixedText(o))+'</p>','Tổng giờ của 3 loại phải bằng OT trung bình/tháng đã nhập.','current-ot-row','data-current-ot-row=\"mixed-holiday\"'+(mixed?'':' hidden'));":"html+=row('OT ngày lễ/Tết','<div class=\"ot-mini-pair\">'+inp('otBreakdownHoliday',o.otBreakdownHoliday,'VD: 4','giờ')+inp('otFactorHoliday',o.otFactorHoliday,'VD: 300','%')+'</div><p class=\"ot-current-help\" data-current-ot-mixed>'+esc(otMixedText(o))+'</p>','','current-ot-row','data-current-ot-row=\"mixed-holiday\"'+(mixed?'':' hidden'));",
"html+=row('Mức lương dùng để tính OT',otBase,'Nếu không biết công ty dùng mức riêng nào, để “Ước tính theo lương hiện tại”.','current-ot-row','data-current-ot-row=\"base\"'+(paid?'':' hidden'));":"html+=row('Mức lương dùng để tính OT',otBase,'','current-ot-row','data-current-ot-row=\"base\"'+(paid?'':' hidden'));",
"html+=row('Thưởng đảm bảo / năm (tháng lương)',inp('guaranteedBonusMonths',o.guaranteedBonusMonths,'VD: 1','tháng'),'Ví dụ tháng 13 chắc chắn nhận = 1. Khoản này dùng cùng loại Gross/Net của công việc hiện tại.');":"html+=row('Thưởng đảm bảo / năm (tháng lương)',inp('guaranteedBonusMonths',o.guaranteedBonusMonths,'VD: 1','tháng'));",
"html+=row('Thưởng hiệu suất / năm','<div class=\"control-stack\">'+sg('performanceBonusType',o.performanceBonusType,[['months','Tháng lương'],['amount','Số tiền']])+'<div class=\"sub-input\">'+inp('performanceBonusValue',o.performanceBonusValue,perfAmount?'VD: 60,000,000':'VD: 2',perfAmount?'đ':'tháng',perfAmount)+'</div></div>','Nhập đúng cách công ty nêu khoản thưởng: ví dụ 2 tháng lương hoặc 60,000,000đ. Khoản này không được cộng vào “Thu nhập cố định”.');":"html+=row('Thưởng hiệu suất / năm','<div class=\"control-stack\">'+sg('performanceBonusType',o.performanceBonusType,[['months','Tháng lương'],['amount','Số tiền']])+'<div class=\"sub-input\">'+inp('performanceBonusValue',o.performanceBonusValue,perfAmount?'VD: 60,000,000':'VD: 2',perfAmount?'đ':'tháng',perfAmount)+'</div></div>');",
"html+=row('Phụ cấp này có tính vào căn cứ BH?',sg('allowanceBh',o.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true),'Nếu để “Chưa rõ”, tool tạm tính Có để tránh làm tiền về tay trông cao hơn thực tế. Nếu bạn chọn “Tôi biết mức cụ thể” ở phần BH phía trên, mức bạn nhập được ưu tiên.');":"html+=row('Phụ cấp này có tính vào căn cứ BH?',sg('allowanceBh',o.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true));",
"html+=row('Nghỉ phép hưởng lương / năm',inp('paidLeaveDays',o.paidLeaveDays,'VD: 12','ngày'),'Ngày phép không được cộng thành “tiền thưởng”. Tool chỉ dùng phép để giảm số giờ bạn phải bỏ ra khi tính giá trị/giờ.');":"html+=row('Nghỉ phép hưởng lương / năm',inp('paidLeaveDays',o.paidLeaveDays,'VD: 12','ngày'));",
}
for old,new in current_lines.items():
    if old not in s: raise SystemExit('current helper anchor missing: '+old[:85])
    s=s.replace(old,new,1)

# Pair selector should be self-explanatory; no helper sentence below it.
old_pair="hint.textContent=allMode?'Đang xem nhanh cả 3 ở Lớp 1-5. Chọn một cặp để xem chênh lệch và cách tính chi tiết.':'Lựa chọn này áp dụng đồng bộ cho Lớp 1-5.'"
if old_pair not in s: raise SystemExit('pair hint anchor missing')
s=s.replace(old_pair,"hint.textContent=''",1)

# Switching: only show a missing-baseline alert. Remove generic explanations from valid state.
old_switch_note="+'<p class=\"v3-baseline-note switch-wide\"><b>Mốc so sánh:</b> lương net và thưởng đảm bảo nếu ở lại được lấy trực tiếp từ “Công việc hiện tại”. '+(!state.currentJobEnabled?'Bạn chưa thêm Công việc hiện tại nên phần này sẽ báo thiếu mốc so sánh.':'')+'</p>'"
new_switch_note="+(!state.currentJobEnabled?'<p class=\"v3-baseline-note switch-wide\" style=\"color:var(--clay)\"><b>Thiếu mốc so sánh:</b> thêm Công việc hiện tại để tính phần chuyển việc.</p>':'')"
if old_switch_note not in s: raise SystemExit('switch baseline note anchor missing')
s=s.replace(old_switch_note,new_switch_note,1)
s=s.replace('<p class="benefit-note">Tổng thưởng đảm bảo nếu ở lại lấy từ thông tin Công việc hiện tại.</p>','')
s=s.replace("  +'<p class=\"benefit-note switch-wide\">Phần này chỉ hỏi dữ liệu phát sinh khi chuyển việc. Lương/BH/OT/thưởng của từng phương án đã lấy từ thông tin phía trên.</p>'\n",'')

# Solver: remove pre-emptive explanatory copy; preserve only a missing-current warning.
s=s.replace('<p class="solver-note">Tool giữ nguyên bảo hiểm, thử việc, thưởng, OT và phụ cấp của offer được chọn, rồi chỉ thay đổi mức lương để tìm mức tối thiểu đạt các mục tiêu bên dưới. Nếu chọn Cả hai, tool tính riêng cho từng offer.</p>','')
s=s.replace('<p class="solver-note">Tool ước tính phần hụt ban đầu từ khoảng nghỉ và thưởng bị mất, sau đó dùng chênh lệch Net hàng tháng để tính thời gian bù lại. OT và thưởng hiệu suất không được dùng để xác định mốc này.</p>','')
s=s.replace('<p class="solver-note">Gồm lương, phụ cấp cố định và thưởng đảm bảo sau bảo hiểm và thuế. Không gồm OT và thưởng hiệu suất.</p>','')
old_solver_tail="+'<p class=\"solver-note solver-wide\">Lớp 6 cần Công việc hiện tại làm mốc so sánh. OT và thưởng hiệu suất vẫn là kịch bản riêng; mức lương tối thiểu chính dựa trên phần cố định/đảm bảo.</p></div>';"
new_solver_tail="+(!state.currentJobEnabled?'<p class=\"solver-note solver-wide\" style=\"color:var(--clay)\"><b>Thiếu mốc so sánh:</b> thêm Công việc hiện tại để tính Lớp 6.</p>':'')+'</div>';"
if old_solver_tail not in s: raise SystemExit('solver tail anchor missing')
s=s.replace(old_solver_tail,new_solver_tail,1)

# Active-assumption banner: BH salary-base assumption and allowance-BH assumption are the only
# default input explanations allowed to appear, and only while actually applicable.
old_cond="""function syncV4ConditionalHelp(){
 const el=document.getElementById('v4ConditionalHelp');if(!el)return;
 const arr=state.offerCount===2?[state.offers[0],state.offers[1]]:[state.offers[0]];if(state.currentJobEnabled)arr.unshift(state.currentJob);
 const hasUnknownBh=arr.some(o=>{const n=Number(String(o.gross??'').replace(/,/g,''));return Number.isFinite(n)&&n>0&&o.bhMode==='unknown'});
 el.innerHTML=hasUnknownBh?'<b>BH chưa rõ:</b> tool dùng giả định tạm và ghi rõ trong kết quả.':'';el.style.display=hasUnknownBh?'':'none';
}"""
new_cond="""function syncV4ConditionalHelp(){
 const el=document.getElementById('v4ConditionalHelp');if(!el)return;
 const arr=state.offerCount===2?[state.offers[0],state.offers[1]]:[state.offers[0]];if(state.currentJobEnabled)arr.unshift(state.currentJob);
 const active=o=>{const n=Number(String(o.gross??'').replace(/,/g,''));return Number.isFinite(n)&&n>0};
 const hasUnknownBh=arr.some(o=>active(o)&&o.bhMode==='unknown');
 const hasUnknownAllowanceBh=arr.some(o=>active(o)&&hasPositiveValue(o.fixedAllowance)&&o.allowanceBh==='unknown'&&o.bhMode!=='custom');
 const parts=[];if(hasUnknownBh)parts.push('<b>BH chưa rõ:</b> tool dùng giả định tạm và ghi rõ trong kết quả.');if(hasUnknownAllowanceBh)parts.push('<b>Phụ cấp chưa rõ BH:</b> tool tạm tính Có vào căn cứ BH.');
 el.innerHTML=parts.join(' ');el.style.display=parts.length?'':'none';
}"""
if old_cond not in s: raise SystemExit('conditional help anchor missing')
s=s.replace(old_cond,new_cond,1)

# Source audit: these are deliberately banned from V4's input UI after this pass.
banned=[
 'OT không lương vẫn được cộng vào tổng thời gian bạn bỏ ra.',
 'Ngày thường dùng mốc tối thiểu 150%; ngày nghỉ hằng tuần 200%.',
 'Tool điền mốc tối thiểu theo loại ngày',
 'Nhập giờ/tháng và hệ số tương ứng.',
 'Tổng giờ của 3 loại phải bằng OT trung bình/tháng đã nhập.',
 'Chỉ tách riêng khi lương hoặc BH thử việc khác giai đoạn chính thức.',
 'Chỉ dùng để cảnh báo giới hạn thời gian thử việc',
 'Nếu offer là Gross, % này áp trên Gross',
 'Chọn theo hợp đồng hoặc chính sách thử việc thực tế.',
 'Tháng 13 chắc chắn nhận = 1.',
 'Ngày phép không được cộng thành “tiền thưởng”.',
 'Phần này chỉ hỏi dữ liệu phát sinh khi chuyển việc.',
 'Tool giữ nguyên bảo hiểm, thử việc, thưởng, OT và phụ cấp của offer được chọn',
 'OT và thưởng hiệu suất không được dùng để xác định mốc này.',
]
for phrase in banned:
    if phrase in s: raise SystemExit('banned helper still in V4 source: '+phrase)

# Recompute CSP after inline JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash update failed')
HTML.write_text(s)

# Extend browser regression around the exact new policy.
anchor="    const staticLayerAudit=await page.evaluate(()=>({layers:document.querySelectorAll('.v4-layer').length,details:document.querySelectorAll('.v4-layer-details').length,oldLayerHints:Array.from(document.querySelectorAll('.v4-layer>.hint')).length,currentHint:document.querySelector('#currentBox .hint')?.textContent||'',offerHint:document.querySelector('.v3-offer-intro .hint')?.textContent||''}));\n"
extra=anchor+"    const helperAudit=await page.evaluate(()=>({rowNotes:Array.from(document.querySelectorAll('.offer-mnote')).filter(x=>x.offsetParent!==null&&x.textContent.trim()).length,bhShared:document.querySelector('.bh-shared-note')?.textContent.trim()||'',pairHint:document.querySelector('#v3PairHint')?.textContent.trim()||''}));if(helperAudit.rowNotes||helperAudit.bhShared||helperAudit.pairHint)throw new Error(label+': default helper purge failed '+JSON.stringify(helperAudit));\n"
if anchor not in t: raise SystemExit('V4 test static audit anchor missing')
t=t.replace(anchor,extra,1)

salary_anchor="    const bhHelp=(await page.locator('#v4ConditionalHelp').innerText()).trim();if(!bhHelp.includes('BH chưa rõ:'))throw new Error(label+': conditional BH helper did not appear after salary input '+bhHelp);\n"
extra2=salary_anchor+"    await page.locator('#offersIn select[data-i=\"0\"][data-k=\"bhMode\"]').selectOption('salary');await page.waitForTimeout(50);if((await page.locator('#v4ConditionalHelp').innerText()).trim())throw new Error(label+': BH assumption helper stayed visible after assumption resolved');\n    await page.locator('#offersIn [data-i=\"0\"][data-k=\"otMonthly\"]').fill('8');await page.waitForTimeout(50);let otHelp=await page.locator('#offersIn [data-ot-guard=\"0\"]').innerText();if(otHelp.trim())throw new Error(label+': normal OT displayed pre-emptive helper '+otHelp);\n    await page.locator('#offersIn [data-i=\"0\"][data-k=\"otMonthly\"]').fill('41');await page.waitForTimeout(50);otHelp=await page.locator('#offersIn [data-ot-guard=\"0\"]').innerText();if(!otHelp.includes('40 giờ/tháng'))throw new Error(label+': OT warning disappeared after helper purge '+otHelp);\n"
if salary_anchor not in t: raise SystemExit('V4 test BH anchor missing')
t=t.replace(salary_anchor,extra2,1)

TEST.write_text(t)
print('PATCHED V4 helper purge; calculation/state logic unchanged')
