from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

def rep(old,new,label):
    global s
    if old not in s: raise SystemExit('Missing target: '+label)
    s=s.replace(old,new,1)

rep('<h2 class="sec">Nếu chuyển việc lúc này?</h2>','<h2 class="sec">Nếu chuyển việc thì sao?</h2>','switch title')
rep('<div class="layer"><p class="lnum">Lớp 2 · <b>Package năm</b></p><p class="hint" style="margin-top:-2px;margin-bottom:6px">So package năm theo 12 tháng chuẩn hóa: <b>Chắc chắn</b> không tính thưởng hiệu suất, và <b>Có thưởng hiệu suất</b> cộng đúng mức bạn đã nhập. Tiền OT không nằm trong package năm này vì phụ thuộc số giờ OT thực tế; xem Lớp 3.</p><p class="benefit-note" style="font-size:12.5px;margin:0 0 14px"><b>Lưu ý:</b> Đây không phải dòng tiền 12 tháng lịch kể từ ngày onboard.</p><div class="cols" id="annualcols"></div><div class="delta" id="annualdelta"></div></div>',
    '<div class="layer"><p class="lnum">Lớp 2 · <b>Nếu làm đủ 12 tháng</b></p><p class="hint" style="margin-top:-2px;margin-bottom:14px">Đưa hai offer về cùng 12 tháng làm việc để so tổng thu nhập. Không phải số tiền từ hôm nay đến 31/12.</p><div class="cols" id="annualcols"></div><div class="delta" id="annualdelta"></div></div>',
    'layer 2 wording')
rep('<div class="layer" id="switchLayer" style="display:none;margin-top:20px"><p class="lnum">Thời điểm chuyển việc · <b>Nếu chuyển việc lúc này?</b></p><div id="switchingResult"></div></div>',
    '<div class="layer" id="switchLayer" style="display:none;margin-top:20px"><p class="lnum">Thời điểm chuyển việc · <b>Nếu chuyển việc thì sao?</b></p><div id="switchingResult"></div></div>',
    'switch result title')
s=s.replace('Thưởng hiệu suất chỉ được cộng ở kịch bản “Có thưởng hiệu suất” và phụ thuộc kết quả thực tế.','Thưởng hiệu suất chỉ được cộng ở dòng “Nếu có thêm thưởng hiệu suất” và phụ thuộc kết quả thực tế.')
# Keep CSP valid after editing inline HTML/JS text.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
