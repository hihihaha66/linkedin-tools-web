from pathlib import Path
p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()
s=s.replace('Tiền OT không nằm trong gói này vì phụ thuộc số giờ OT thực tế; xem Lớp 3.','Tiền OT không nằm trong package năm này vì phụ thuộc số giờ OT thực tế; xem Lớp 3.',1)
s=s.replace('Lớp 3 · <b>Giờ bạn bỏ ra để có gói đó</b>','Lớp 3 · <b>Giờ bạn bỏ ra để có package đó</b>',1)
p.write_text(s)
