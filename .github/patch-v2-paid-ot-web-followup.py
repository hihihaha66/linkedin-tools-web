from pathlib import Path

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

def rep(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'Missing patch target: {label}')
    s=s.replace(old,new,1)

rep('So hai kịch bản: <b>Chắc chắn</b> không tính thưởng hiệu suất, và <b>Có thưởng hiệu suất</b> cộng đúng mức bạn đã nhập. Nếu không có khoản này, tool chỉ hiện phần chắc chắn.',
    'So hai kịch bản: <b>Chắc chắn</b> không tính thưởng hiệu suất, và <b>Có thưởng hiệu suất</b> cộng đúng mức bạn đã nhập. Nếu không có khoản này, tool chỉ hiện phần chắc chắn. Tiền OT không nằm trong gói này vì phụ thuộc số giờ OT thực tế; xem Lớp 3.',
    'Layer 2 OT note')

rep('Nguồn pháp lý chính: Luật Thuế TNCN 109/2025/QH15; Luật BHXH 41/2024/QH15; NĐ 158/2025/NĐ-CP; Luật Việc làm 74/2025/QH15; NĐ 293/2025/NĐ-CP.',
    'Nguồn pháp lý chính: Bộ luật Lao động 45/2019/QH14; NĐ 145/2020/NĐ-CP; Luật Thuế TNCN 109/2025/QH15; Luật BHXH 41/2024/QH15; NĐ 158/2025/NĐ-CP; Luật Việc làm 74/2025/QH15; NĐ 293/2025/NĐ-CP.',
    'OT legal sources')

p.write_text(s)
