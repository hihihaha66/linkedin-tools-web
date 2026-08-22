from pathlib import Path
p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()
s=s.replace('Lớp 2 · <b>Gói 12 tháng chuẩn hóa</b>','Lớp 2 · <b>Package năm</b>',1)
s=s.replace('So hai kịch bản: <b>Chắc chắn</b> không tính thưởng hiệu suất, và <b>Có thưởng hiệu suất</b> cộng đúng mức bạn đã nhập. Nếu không có khoản này, tool chỉ hiện phần chắc chắn. Đây là phép so chuẩn hóa 12 tháng theo tham số hiện hành, không phải dòng tiền 12 tháng lịch kể từ ngày onboard.', 'So package năm theo 12 tháng chuẩn hóa: <b>Chắc chắn</b> không tính thưởng hiệu suất, và <b>Có thưởng hiệu suất</b> cộng đúng mức bạn đã nhập. Nếu không có khoản này, tool chỉ hiện phần chắc chắn. Đây không phải dòng tiền 12 tháng lịch kể từ ngày onboard.',1)
p.write_text(s)
