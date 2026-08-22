from pathlib import Path
p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

s=s.replace('So hai kịch bản: <b>Chắc chắn</b> không tính thưởng hiệu suất, và <b>Có thưởng hiệu suất</b> cộng đúng mức bạn đã nhập. Nếu không có khoản này, tool chỉ hiện phần chắc chắn. Tiền OT không nằm trong gói này vì phụ thuộc số giờ OT thực tế; xem Lớp 3.',
'''So hai kịch bản: <b>Chắc chắn</b> không tính thưởng hiệu suất, và <b>Có thưởng hiệu suất</b> cộng đúng mức bạn đã nhập. Nếu không có khoản này, tool chỉ hiện phần chắc chắn. Đây là phép so chuẩn hóa 12 tháng theo tham số hiện hành, không phải dòng tiền 12 tháng lịch kể từ ngày onboard. Tiền OT không nằm trong gói này vì phụ thuộc số giờ OT thực tế; xem Lớp 3.''')
s=s.replace('Số thưởng đảm bảo dự kiến nhận trong năm onboard','Số thưởng đảm bảo dự kiến về tay trong năm onboard')

old='markDirty();if(k==="currentBonusRule"||k==="newBonusRule")renderSwitchingInputs();scheduleCalculation()'
new='markDirty();if(k==="currentBonusRule"||k==="newBonusRule"||k==="lastWorkingDate"||k==="onboardDate")renderSwitchingInputs();scheduleCalculation()'
if old not in s: raise SystemExit('switch change handler target missing')
s=s.replace(old,new,1)
p.write_text(s)

# Nuance the landing-page privacy line to match the actual architecture.
i=Path('index.html')
z=i.read_text()
z=z.replace('Các công cụ mang tính mô phỏng và hỗ trợ so sánh. Dữ liệu nhập vào tool\n      không được lưu vào cơ sở dữ liệu của website.', 'Các công cụ mang tính mô phỏng và hỗ trợ so sánh. Dữ liệu dùng để tính\n      không được lưu vào cơ sở dữ liệu của website.')
i.write_text(z)
