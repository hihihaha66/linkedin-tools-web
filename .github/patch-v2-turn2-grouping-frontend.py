from pathlib import Path
import base64,hashlib,re

HTML=Path('net-cao-hon-co-that-tot-hon-v2.html')
TEST=Path('tests/v2-turn6-final-smoke.js')
s=HTML.read_text(); t=TEST.read_text()

old=""" html+=row('Làm thêm giờ (OT) trung bình / tháng',otHoursCell(A,0),otHoursCell(B,1),'Tool cảnh báo theo mốc 40 giờ/tháng và quy đổi mức trung bình này ra 12 tháng để đối chiếu 200/300 giờ/năm. Không đủ dữ liệu để kiểm tra giới hạn theo từng ngày.');
 html+=row('Có giai đoạn thử việc cần tính riêng?',seg(0,'probationEnabled',A.probationEnabled,[['no','Không'],['yes','Có']]),seg(1,'probationEnabled',B.probationEnabled,[['no','Không'],['yes','Có']]),'Chọn Không nếu không có thử việc, hoặc giai đoạn thử việc có lương và BH giống điều kiện chính thức nên không cần tách riêng. Nếu có khác biệt, chọn Có.');
 if(anyTrial){
  html+=row('Lương thử việc (% mức lương offer)',probOn(A)?textInput(0,'probPct',A,'100','decimal',false,'%')+ '<p class="benefit-note">Hưởng đủ mức lương offer thì để 100%.</p>':dash,probOn(B)?textInput(1,'probPct',B,'100','decimal',false,'%')+'<p class="benefit-note">Hưởng đủ mức lương offer thì để 100%.</p>':dash);
  html+=row('Thời gian thử việc',probDurationCell(A,0),probDurationCell(B,1),'Nhập theo đúng đơn vị offer hoặc hợp đồng ghi. Nếu chọn Ngày, tool dùng số ngày để kiểm tra giới hạn và chỉ quy đổi sang tháng ở bước mô phỏng thu nhập.');
  html+=row('Vị trí này thuộc nhóm nào?',jobCell(A,0),jobCell(B,1),'Tool dùng nhóm này để cảnh báo nếu thời gian thử việc bạn nhập vượt giới hạn tương ứng.');
  html+=row('Trong thời gian thử việc có đóng BH bắt buộc?',probOn(A)?seg(0,'probInsurance',A.probInsurance,[['no','Không'],['yes','Có']]):dash,probOn(B)?seg(1,'probInsurance',B.probInsurance,[['no','Không'],['yes','Có']]):dash,'% thử việc được tính theo loại lương bạn đã chọn ở offer: Gross hoặc Net.');
 }
 html+=row('OT có được trả tiền không?',otPaidCell(A,0),otPaidCell(B,1),'OT không lương vẫn được cộng vào tổng thời gian bạn bỏ ra.','ot-paid-row');
 html+=row('OT chủ yếu rơi vào',otTypeCell(A,0),otTypeCell(B,1),'Ngày thường dùng mốc tối thiểu 150%; ngày nghỉ hằng tuần 200%. Chọn Nhiều loại nếu cần tách thêm ngày lễ/Tết.','ot-type-row');
 html+=row('Hệ số OT',otFactorCell(A,0),otFactorCell(B,1),'Tool điền mốc tối thiểu theo loại ngày; bạn có thể sửa nếu chính sách công ty áp dụng hệ số khác.','ot-factor-row');
 html+=row('OT ngày thường',otMixedCell(A,0,'otBreakdownWeekday','otFactorWeekday',150,false),otMixedCell(B,1,'otBreakdownWeekday','otFactorWeekday',150,false),'Nhập giờ/tháng và hệ số tương ứng.','ot-mixed-weekday-row');
 html+=row('OT ngày nghỉ hằng tuần',otMixedCell(A,0,'otBreakdownRest','otFactorRest',200,false),otMixedCell(B,1,'otBreakdownRest','otFactorRest',200,false),'','ot-mixed-rest-row');
 html+=row('OT ngày lễ/Tết',otMixedCell(A,0,'otBreakdownHoliday','otFactorHoliday',300,true),otMixedCell(B,1,'otBreakdownHoliday','otFactorHoliday',300,true),'Tổng giờ của 3 loại phải bằng OT trung bình/tháng đã nhập.','ot-mixed-holiday-row');
 html+=row('Mức lương dùng để tính OT',otBaseCell(A,0),otBaseCell(B,1),'Nếu không biết payroll dùng mức riêng nào, để “Ước tính theo lương offer”.','ot-base-row');
"""
new=""" html+=row('Làm thêm giờ (OT) trung bình / tháng',otHoursCell(A,0),otHoursCell(B,1),'Tool cảnh báo theo mốc 40 giờ/tháng và quy đổi mức trung bình này ra 12 tháng để đối chiếu 200/300 giờ/năm. Không đủ dữ liệu để kiểm tra giới hạn theo từng ngày.');
 html+=row('OT có được trả tiền không?',otPaidCell(A,0),otPaidCell(B,1),'OT không lương vẫn được cộng vào tổng thời gian bạn bỏ ra.','ot-paid-row');
 html+=row('OT chủ yếu rơi vào',otTypeCell(A,0),otTypeCell(B,1),'Ngày thường dùng mốc tối thiểu 150%; ngày nghỉ hằng tuần 200%. Chọn Nhiều loại nếu cần tách thêm ngày lễ/Tết.','ot-type-row');
 html+=row('Hệ số OT',otFactorCell(A,0),otFactorCell(B,1),'Tool điền mốc tối thiểu theo loại ngày; bạn có thể sửa nếu chính sách công ty áp dụng hệ số khác.','ot-factor-row');
 html+=row('OT ngày thường',otMixedCell(A,0,'otBreakdownWeekday','otFactorWeekday',150,false),otMixedCell(B,1,'otBreakdownWeekday','otFactorWeekday',150,false),'Nhập giờ/tháng và hệ số tương ứng.','ot-mixed-weekday-row');
 html+=row('OT ngày nghỉ hằng tuần',otMixedCell(A,0,'otBreakdownRest','otFactorRest',200,false),otMixedCell(B,1,'otBreakdownRest','otFactorRest',200,false),'','ot-mixed-rest-row');
 html+=row('OT ngày lễ/Tết',otMixedCell(A,0,'otBreakdownHoliday','otFactorHoliday',300,true),otMixedCell(B,1,'otBreakdownHoliday','otFactorHoliday',300,true),'Tổng giờ của 3 loại phải bằng OT trung bình/tháng đã nhập.','ot-mixed-holiday-row');
 html+=row('Mức lương dùng để tính OT',otBaseCell(A,0),otBaseCell(B,1),'Nếu không biết công ty dùng mức riêng nào, để “Ước tính theo lương offer”.','ot-base-row');
 html+=row('Có giai đoạn thử việc cần tính riêng?',seg(0,'probationEnabled',A.probationEnabled,[['no','Không'],['yes','Có']]),seg(1,'probationEnabled',B.probationEnabled,[['no','Không'],['yes','Có']]),'Chọn Không nếu không có thử việc, hoặc giai đoạn thử việc có lương và BH giống điều kiện chính thức nên không cần tách riêng. Nếu có khác biệt, chọn Có.');
 if(anyTrial){
  html+=row('Nhóm công việc của vị trí',jobCell(A,0),jobCell(B,1),'Chỉ dùng để cảnh báo giới hạn thời gian thử việc; không làm thay đổi cách tính lương.');
  html+=row('Thời gian thử việc',probDurationCell(A,0),probDurationCell(B,1),'Nhập theo đúng đơn vị offer hoặc hợp đồng ghi. Nếu chọn Ngày, tool dùng số ngày để kiểm tra giới hạn và chỉ quy đổi sang tháng ở bước mô phỏng thu nhập.');
  html+=row('Lương thử việc (% mức lương offer)',probOn(A)?textInput(0,'probPct',A,'100','decimal',false,'%')+ '<p class="benefit-note">Nếu offer là Gross, % này áp trên Gross; nếu là Net, áp trên Net. Hưởng đủ thì để 100%.</p>':dash,probOn(B)?textInput(1,'probPct',B,'100','decimal',false,'%')+'<p class="benefit-note">Nếu offer là Gross, % này áp trên Gross; nếu là Net, áp trên Net. Hưởng đủ thì để 100%.</p>':dash);
  html+=row('Trong thời gian thử việc có đóng BH bắt buộc?',probOn(A)?seg(0,'probInsurance',A.probInsurance,[['no','Không'],['yes','Có']]):dash,probOn(B)?seg(1,'probInsurance',B.probInsurance,[['no','Không'],['yes','Có']]):dash,'Chọn theo hợp đồng hoặc chính sách thử việc thực tế.');
 }
"""
if old not in s: raise SystemExit('input grouping anchor missing')
s=s.replace(old,new,1)

# Benefits: keep allowance and its BH treatment adjacent; fix stale wording.
old=""" html+=row('Thưởng hiệu suất / năm',perfCell(A,0),perfCell(B,1),'Nhập đúng cách HR/offer nêu khoản thưởng: ví dụ 3 tháng lương hoặc 60,000,000đ. Khoản này dùng cùng loại Gross/Net của offer và không nằm trong phần “Chắc chắn”.');
 html+=row('Phụ cấp cố định ngoài mức lương trên / tháng',textInput(0,'fixedAllowance',A,'vd 1,000,000','numeric',true,'đ'),textInput(1,'fixedAllowance',B,'vd 1,000,000','numeric',true,'đ'));
 html+=row('Nghỉ phép hưởng lương / năm',textInput(0,'paidLeaveDays',A,'vd 12','decimal',false,'ngày'),textInput(1,'paidLeaveDays',B,'vd 12','decimal',false,'ngày'),'Ngày phép không được cộng thành “tiền thưởng”. Tool chỉ dùng phép để giảm số giờ bạn phải bỏ ra khi tính giá trị/giờ.');
 html+=row('Phụ cấp này có tính vào căn cứ BH?',seg(0,'allowanceBh',A.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true),seg(1,'allowanceBh',B.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true),'Nếu để “Chưa rõ”, tool tạm tính <b>Có</b> để tránh làm tiền về tay trông cao hơn thực tế. Nếu bạn chọn “Tự nhập” mức căn cứ BH ở phía trên, mức tự nhập luôn được ưu tiên.');
"""
new=""" html+=row('Thưởng hiệu suất / năm',perfCell(A,0),perfCell(B,1),'Nhập đúng cách HR/offer nêu khoản thưởng: ví dụ 3 tháng lương hoặc 60,000,000đ. Khoản này dùng cùng loại Gross/Net của offer và không được cộng vào “Thu nhập cố định”.');
 html+=row('Phụ cấp cố định ngoài mức lương trên / tháng',textInput(0,'fixedAllowance',A,'vd 1,000,000','numeric',true,'đ'),textInput(1,'fixedAllowance',B,'vd 1,000,000','numeric',true,'đ'));
 html+=row('Phụ cấp này có tính vào căn cứ BH?',seg(0,'allowanceBh',A.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true),seg(1,'allowanceBh',B.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true),'Nếu để “Chưa rõ”, tool tạm tính <b>Có</b> để tránh làm tiền về tay trông cao hơn thực tế. Nếu bạn chọn “Tôi biết mức cụ thể” ở phần BH phía trên, mức bạn nhập được ưu tiên.');
 html+=row('Nghỉ phép hưởng lương / năm',textInput(0,'paidLeaveDays',A,'vd 12','decimal',false,'ngày'),textInput(1,'paidLeaveDays',B,'vd 12','decimal',false,'ngày'),'Ngày phép không được cộng thành “tiền thưởng”. Tool chỉ dùng phép để giảm số giờ bạn phải bỏ ra khi tính giá trị/giờ.');
"""
if old not in s: raise SystemExit('benefit grouping anchor missing')
s=s.replace(old,new,1)

# Clean one remaining OT custom-base helper.
s=s.replace('Nhập mức lương tháng payroll dùng để tính OT.','Nhập mức lương tháng công ty thực tế dùng để tính OT.',1)

# Layer 3 terminology follows current model.
s=s.replace('Lớp 3 · <b>Thời gian bạn bỏ ra để có package đó</b>','Lớp 3 · <b>Thời gian bạn bỏ ra để có mức thu nhập đó</b>',1)

# Add a DOM-order regression to make future turn inserts respect grouping.
anchor="console.log('PASS Turn 6: desktop/mobile 3-column contract');"
extra=r'''

 // Turn 2 grouping contract: OT stays contiguous, then trial asks job group before duration; allowance stays next to BH treatment.
 {
  const {w,d}=boot();
  input(w,field(d,'otMonthly'),'8');
  click(w,q(d,'[data-seg="probationEnabled"][data-i="0"] [data-v="yes"]'));
  const labels=[...d.querySelectorAll('#offersIn .offer-mlabel')].map(x=>x.textContent.trim());
  const pos=x=>labels.indexOf(x);
  const ordered=['Làm thêm giờ (OT) trung bình / tháng','OT có được trả tiền không?','OT chủ yếu rơi vào','Hệ số OT','Mức lương dùng để tính OT','Có giai đoạn thử việc cần tính riêng?','Nhóm công việc của vị trí','Thời gian thử việc','Lương thử việc (% mức lương offer)','Trong thời gian thử việc có đóng BH bắt buộc?'];
  for(let i=1;i<ordered.length;i++)if(!(pos(ordered[i-1])>=0&&pos(ordered[i])>pos(ordered[i-1])))fail('Turn 2 grouping order broken: '+ordered[i-1]+' -> '+ordered[i]);
  if(!(pos('Phụ cấp cố định ngoài mức lương trên / tháng')<pos('Phụ cấp này có tính vào căn cứ BH?')&&pos('Phụ cấp này có tính vào căn cứ BH?')<pos('Nghỉ phép hưởng lương / năm')))fail('benefit grouping order broken');
  if(!d.body.textContent.includes('Nếu offer là Gross, % này áp trên Gross; nếu là Net, áp trên Net.'))fail('trial salary helper not moved to salary row');
  if(d.body.textContent.includes('Nếu bạn chọn “Tự nhập” mức căn cứ BH'))fail('stale benefit wording still present');
  w.close();
 }
 console.log('PASS Turn 2: OT/trial/benefit grouping order and helper placement');
'''
if anchor not in t: raise SystemExit('frontend test anchor missing')
t=t.replace(anchor,anchor+extra,1)

# Recompute inline script CSP hash because renderInputs copy/order changed.
start=s.index('<script>')+len('<script>'); end=s.index('</script>',start)
h=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')

HTML.write_text(s); TEST.write_text(t)
print('PATCHED Turn 2 frontend grouping cleanup')
