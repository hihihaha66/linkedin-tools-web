from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

switch_box='''<div class="switch-box">
  <div class="switch-head">
    <div class="switch-copy">
      <p class="eyebrow">Thời điểm chuyển việc</p>
      <h2 class="sec">Nếu chuyển việc thì sao?</h2>
      <p class="hint">So tổng quy đổi của hai phương án từ ngày bạn chọn đến 31/12: ở lại công ty hiện tại, hoặc nghỉ rồi sang offer mới. Mặc định “Tính từ ngày” là hôm nay, nhưng bạn có thể chọn ngày trong quá khứ để xem lại một quyết định cũ.</p>
    </div>
    <div class="switch-toggle">
      <label>Tính thêm tác động khi chuyển việc</label>
      <div class="seg" id="switchEnabledSeg"><button data-v="off" class="on">Bỏ qua</button><button data-v="on">Tính thêm</button></div>
    </div>
  </div>
  <div class="switch-fields" id="switchFields" style="display:none"></div>
</div>
'''
if switch_box not in s: raise SystemExit('switch input block missing')
s=s.replace(switch_box,'',1)

# Remove the global assumptions block from the top of results.
top_assumption='<div class="assumption-card-wrap" id="assumptionLayer" style="display:none"><div id="assumptionContent"></div></div>\n'
if top_assumption not in s: raise SystemExit('top assumption block missing')
s=s.replace(top_assumption,'',1)

old_tail='''<div class="layer"><p class="lnum">Lớp 5 · <b>Nếu có biến cố</b></p><p class="hint" style="margin-top:-2px">Các mô phỏng ở đây dùng mức lương làm căn cứ đóng BH đã nhập. Tool chỉ mô phỏng số tiền, không kiểm tra đủ điều kiện hưởng.</p><div class="events" id="l3events"></div></div>
<div class="verdict" id="verdict"></div>
<div class="layer" id="switchLayer" style="display:none;margin-top:20px"><p class="lnum">Thời điểm chuyển việc · <b>Nếu chuyển việc thì sao?</b></p><div id="switchingResult"></div></div>
'''
new_tail='''<div class="layer"><p class="lnum">Lớp 5 · <b>Nếu có biến cố</b></p><p class="hint" style="margin-top:-2px">Các mô phỏng ở đây dùng mức lương làm căn cứ đóng BH đã nhập. Tool chỉ mô phỏng số tiền, không kiểm tra đủ điều kiện hưởng.</p><div class="events" id="l3events"></div></div>
<div class="switch-box switch-box-results">
  <div class="switch-head">
    <div class="switch-copy">
      <p class="eyebrow">Thời điểm chuyển việc</p>
      <h2 class="sec">Nếu chuyển việc thì sao?</h2>
      <p class="hint">So tổng quy đổi của hai phương án từ ngày bạn chọn đến 31/12: ở lại công ty hiện tại, hoặc nghỉ rồi sang offer mới. Mặc định “Tính từ ngày” là hôm nay, nhưng bạn có thể chọn ngày trong quá khứ để xem lại một quyết định cũ.</p>
    </div>
    <div class="switch-toggle">
      <label>Tính thêm tác động khi chuyển việc</label>
      <div class="seg" id="switchEnabledSeg"><button data-v="off" class="on">Bỏ qua</button><button data-v="on">Tính thêm</button></div>
    </div>
  </div>
  <div class="switch-fields" id="switchFields" style="display:none"></div>
  <div id="switchLayer" style="display:none;margin-top:16px"><div id="switchingResult"></div></div>
</div>
<div class="assumption-card-wrap" id="assumptionLayer" style="display:none"><div id="assumptionContent"></div></div>
<div class="verdict" id="verdict"></div>
'''
if old_tail not in s: raise SystemExit('results tail missing')
s=s.replace(old_tail,new_tail,1)

# Styling: the switching module is one continuous section; switching-only assumptions stay visually inside it.
css_marker='.switch-detail-body{padding-top:7px}'
css_add=css_marker+'''.switch-box-results{margin:26px 0 20px}.switch-box-results #switchLayer{padding-top:16px;border-top:1px solid var(--line)}.switch-box-results .switch-result{border:0;border-radius:0;padding:0;background:transparent}.switch-assumptions{margin-top:14px;padding:11px 12px;background:var(--paper-2);border-left:3px solid var(--moss);border-radius:7px;font-size:12.5px}.switch-assumptions>b{color:var(--moss)}.switch-assumptions ul{margin:6px 0 0;padding-left:19px}.switch-assumptions li{margin:3px 0}.assumption-card-wrap{margin-top:22px}'''
if css_marker not in s: raise SystemExit('CSS marker missing')
s=s.replace(css_marker,css_add,1)

# Re-pin CSP because inline HTML/JS document content changed.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
