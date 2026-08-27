from pathlib import Path
import re

P=Path('net-cao-hon-co-that-tot-hon-v4.html')
s=P.read_text()

# Capture immutable areas before edits.
legal_start=s.index('<details class="v4-legal">')
legal_before=s[legal_start:s.index('</details>',legal_start)+len('</details>')]
script_start=s.index('<script>')
script_before=s[script_start:]

# 1. Header subtitle + privacy note.
old='''<p class="sub">So công việc hiện tại với 1-2 offer theo tiền, thời gian, bảo hiểm và tác động khi chuyển việc.</p>'''
new='''<p class="sub">So sánh công việc hiện tại với 1-2 offer theo tiền, thời gian, bảo hiểm và tác động khi chuyển việc - để bạn thấy mình đang đổi gì lấy gì.</p>
<p class="v4-micro-note v4-header-note">Dữ liệu bạn nhập được gửi tới máy chủ để tính, không lưu vào cơ sở dữ liệu. Chỉ khi bấm "Lưu" mới giữ trên trình duyệt của bạn.</p>'''
if old not in s: raise SystemExit('header subtitle anchor missing')
s=s.replace(old,new,1)

# 2. Insurance warning above empty state.
old='''<div id="v4ConditionalHelp" class="v4-conditional-help" style="display:none"></div>
<div id="empty" class="empty">Nhập lương cho ít nhất một phương án để bắt đầu.</div>'''
new='''<div id="v4ConditionalHelp" class="v4-conditional-help" style="display:none"></div>
<p class="v4-micro-note v4-insurance-note">Chưa biết mức đóng bảo hiểm? Chọn "Chưa rõ" - tool tạm lấy lương offer làm căn cứ BH, nên kết quả Lớp 4 và Lớp 5 có thể cao hơn thực tế. Nếu HR cho biết mức riêng, chọn "Tôi biết mức cụ thể".</p>
<div id="empty" class="empty">Nhập lương cho ít nhất một phương án để bắt đầu.</div>'''
if old not in s: raise SystemExit('insurance note anchor missing')
s=s.replace(old,new,1)

# 3-5. Layer notes and Layer 3 title.
old='''<div class="layer v4-layer" data-v4-layer="2"><p class="lnum">Lớp 2 · <b>Nếu làm đủ 12 tháng</b></p><div class="v4-layer-main" id="annualmain"></div><div class="delta v4-layer-insight" id="annualdelta"></div><details class="v4-layer-details"><summary>Xem cách tính</summary><div class="cols" id="annualcols"></div></details></div>'''
new='''<div class="layer v4-layer" data-v4-layer="2"><p class="lnum">Lớp 2 · <b>Nếu làm đủ 12 tháng</b></p><p class="v4-micro-note v4-layer-note">Quy cả hai phương án về cùng 12 tháng làm việc. Không phải số tiền từ hôm nay đến 31/12.</p><div class="v4-layer-main" id="annualmain"></div><div class="delta v4-layer-insight" id="annualdelta"></div><details class="v4-layer-details"><summary>Xem cách tính</summary><div class="cols" id="annualcols"></div></details></div>'''
if old not in s: raise SystemExit('layer 2 anchor missing')
s=s.replace(old,new,1)

old='''<div class="layer v4-layer" data-v4-layer="3"><p class="lnum">Lớp 3 · <b>Thời gian bạn bỏ ra</b></p><div class="v4-layer-main" id="tmain"></div><div class="delta v4-layer-insight" id="tdelta"></div><details class="v4-layer-details"><summary>Xem cách tính</summary><div class="cols" id="tcols"></div></details></div>'''
new='''<div class="layer v4-layer" data-v4-layer="3"><p class="lnum">Lớp 3 · <b>Thời gian bạn bỏ ra để có mức thu nhập đó</b></p><p class="v4-micro-note v4-layer-note">Giả định 176h/tháng; đi lại và OT được cộng vào thời gian. Ngày phép chỉ giảm thời gian bỏ ra, không cộng thành tiền.</p><div class="v4-layer-main" id="tmain"></div><div class="delta v4-layer-insight" id="tdelta"></div><details class="v4-layer-details"><summary>Xem cách tính</summary><div class="cols" id="tcols"></div></details></div>'''
if old not in s: raise SystemExit('layer 3 anchor missing')
s=s.replace(old,new,1)

old='''<div class="layer v4-layer" data-v4-layer="5"><p class="lnum">Lớp 5 · <b>Nếu có biến cố</b></p><div class="v4-layer-main" id="l3main"></div><div class="v4-layer-insight" id="l5insight"></div><details class="v4-layer-details"><summary>Xem cách tính</summary><div class="events" id="l3events"></div></details></div>'''
new='''<div class="layer v4-layer" data-v4-layer="5"><p class="lnum">Lớp 5 · <b>Nếu có biến cố</b></p><p class="v4-micro-note v4-layer-note">Dùng mức lương làm căn cứ đóng BH đã nhập ở trên. Tool chỉ mô phỏng số tiền, không kiểm tra điều kiện hưởng.</p><div class="v4-layer-main" id="l3main"></div><div class="v4-layer-insight" id="l5insight"></div><details class="v4-layer-details"><summary>Xem cách tính</summary><div class="events" id="l3events"></div></details></div>'''
if old not in s: raise SystemExit('layer 5 anchor missing')
s=s.replace(old,new,1)

# 6. Switching scope note under title.
old='''      <p class="eyebrow">Thời điểm chuyển việc</p>
      <h2 class="sec">Nếu chuyển việc thì sao?</h2>
    </div>'''
new='''      <p class="eyebrow">Thời điểm chuyển việc</p>
      <h2 class="sec">Nếu chuyển việc thì sao?</h2>
      <p class="v4-micro-note v4-switch-note">So sánh phần còn lại của năm từ ngày sau khi nghỉ đến 31/12: ở lại nhận bao nhiêu, sang offer mới nhận bao nhiêu. Chưa mô phỏng quyết toán thuế khi đổi nơi làm việc.</p>
    </div>'''
if old not in s: raise SystemExit('switch note anchor missing')
s=s.replace(old,new,1)

# Shared visual style for all six added notes.
css_anchor='''.v4-legal-body{border-top:1px solid var(--line);padding:10px 0 2px}.v4-legal-body .disclaim{margin-top:0}

</style>'''
css_new='''.v4-legal-body{border-top:1px solid var(--line);padding:10px 0 2px}.v4-legal-body .disclaim{margin-top:0}
.v4-micro-note{margin:4px 0 9px;color:#777267;font-size:11px;line-height:1.38;font-weight:400;letter-spacing:-.01em}
.v4-header-note{margin-top:5px;max-width:92ch}
.v4-insurance-note{margin:8px 0 10px}
.v4-layer-note{margin:0 0 8px}
.v4-switch-note{margin:3px 0 0}
@media(max-width:540px){
 .v4-micro-note{font-size:clamp(7px,2.05vw,9px);line-height:1.28;letter-spacing:-.035em;margin-bottom:7px}
 .v4-header-note{margin-top:4px}
 .v4-insurance-note{margin-top:7px}
 .v4-layer-note{margin-bottom:6px}
 .v4-switch-note{margin-top:3px}
}

</style>'''
if css_anchor not in s: raise SystemExit('CSS anchor missing')
s=s.replace(css_anchor,css_new,1)

# Guardrails: exact copy must exist once, and immutable areas stay byte-identical.
required=[
'So sánh công việc hiện tại với 1-2 offer theo tiền, thời gian, bảo hiểm và tác động khi chuyển việc - để bạn thấy mình đang đổi gì lấy gì.',
'Dữ liệu bạn nhập được gửi tới máy chủ để tính, không lưu vào cơ sở dữ liệu. Chỉ khi bấm "Lưu" mới giữ trên trình duyệt của bạn.',
'Chưa biết mức đóng bảo hiểm? Chọn "Chưa rõ" - tool tạm lấy lương offer làm căn cứ BH, nên kết quả Lớp 4 và Lớp 5 có thể cao hơn thực tế. Nếu HR cho biết mức riêng, chọn "Tôi biết mức cụ thể".',
'Quy cả hai phương án về cùng 12 tháng làm việc. Không phải số tiền từ hôm nay đến 31/12.',
'Thời gian bạn bỏ ra để có mức thu nhập đó',
'Giả định 176h/tháng; đi lại và OT được cộng vào thời gian. Ngày phép chỉ giảm thời gian bỏ ra, không cộng thành tiền.',
'Dùng mức lương làm căn cứ đóng BH đã nhập ở trên. Tool chỉ mô phỏng số tiền, không kiểm tra điều kiện hưởng.',
'So sánh phần còn lại của năm từ ngày sau khi nghỉ đến 31/12: ở lại nhận bao nhiêu, sang offer mới nhận bao nhiêu. Chưa mô phỏng quyết toán thuế khi đổi nơi làm việc.'
]
for x in required:
    if s.count(x)!=1: raise SystemExit('required copy count !=1: '+x[:60])

legal_start2=s.index('<details class="v4-legal">')
legal_after=s[legal_start2:s.index('</details>',legal_start2)+len('</details>')]
if legal_after != legal_before: raise SystemExit('legal disclosure changed unexpectedly')
script_after=s[s.index('<script>'):]
if script_after != script_before: raise SystemExit('inline JS changed unexpectedly')

P.write_text(s)
print('PATCHED six V4 microcopy changes only')