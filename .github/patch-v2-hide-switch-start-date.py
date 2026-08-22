from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

# Make the historical start date a progressive-disclosure option instead of a default field.
s=s.replace(
"So tổng quy đổi của hai phương án từ ngày bạn chọn đến 31/12: ở lại công ty hiện tại, hoặc nghỉ rồi sang offer mới. Mặc định “Tính từ ngày” là hôm nay, nhưng bạn có thể chọn ngày trong quá khứ để xem lại một quyết định cũ.",
"So tổng quy đổi của hai phương án đến 31/12: ở lại công ty hiện tại, hoặc nghỉ rồi sang offer mới. Mặc định tool tính từ hôm nay. Muốn xem lại một lần chuyển việc trước đây thì mở tùy chọn bên dưới."
)

needle=""" const oldMonth=sw.lastWorkingDate?Number(String(sw.lastWorkingDate).slice(5,7)):null;
 const newMonth=sw.onboardDate?Number(String(sw.onboardDate).slice(5,7)):null;
"""
insert=""" const oldMonth=sw.lastWorkingDate?Number(String(sw.lastWorkingDate).slice(5,7)):null;
 const newMonth=sw.onboardDate?Number(String(sw.onboardDate).slice(5,7)):null;
 const today=localToday(),historyOpen=!!(sw.asOfDate&&sw.asOfDate!==today);
 const historyLabel=historyOpen?'Đang xem từ '+String(sw.asOfDate).split('-').reverse().join('/')+' · đổi ngày':'Xem lại một lần chuyển việc trước đây?';
"""
if needle not in s: raise SystemExit('history variable target missing')
s=s.replace(needle,insert,1)

old="""  +'<div class=\"field\"><label>Tính từ ngày</label><input type=\"date\" data-sw=\"asOfDate\" value=\"'+esc(sw.asOfDate||localToday())+'\"><p class=\"benefit-note\">Mặc định là hôm nay. Muốn xem lại một lần chuyển việc cũ thì chọn ngày bắt đầu trong quá khứ.</p></div>'
"""
new="""  +'<details class=\"switch-history switch-wide\" '+(historyOpen?'open':'')+'><summary>'+esc(historyLabel)+'</summary><div class=\"field switch-history-field\"><label>Bắt đầu so từ ngày</label><input type=\"date\" data-sw=\"asOfDate\" value=\"'+esc(sw.asOfDate||today)+'\"><p class=\"benefit-note\">Chỉ cần đổi mốc này khi bạn muốn xem lại một lần chuyển việc đã xảy ra trước đây.</p></div></details>'
"""
if old not in s: raise SystemExit('visible asOfDate field target missing')
s=s.replace(old,new,1)

s=s.replace(
"<b>Cách tính:</b> Tool dùng “Tính từ ngày” làm mốc, quy đổi ngày lẻ theo net tháng ÷ 30, tính net thử việc trước rồi net chính thức sau đó.",
"<b>Cách tính:</b> Mặc định tool tính từ hôm nay; nếu xem lại case cũ thì dùng mốc “Bắt đầu so từ ngày”. Ngày lẻ được quy đổi theo net tháng ÷ 30, sau đó tính net thử việc trước rồi net chính thức."
)

# Add compact styling for the optional historical control.
css_marker='.switch-details summary{cursor:pointer;color:var(--moss);font-size:12.5px;font-weight:600;list-style:none}'
css_add=css_marker+""".switch-history{margin:2px 0 4px}.switch-history>summary{cursor:pointer;color:var(--moss);font-size:12.5px;font-weight:600;list-style:none;padding:2px 0}.switch-history>summary::-webkit-details-marker{display:none}.switch-history>summary:before{content:'＋ ';font-family:var(--mono)}.switch-history[open]>summary:before{content:'− '}.switch-history-field{margin-top:10px;padding:10px 12px;background:var(--paper-2);border-radius:8px}"""
if css_marker not in s: raise SystemExit('switch history CSS marker missing')
s=s.replace(css_marker,css_add,1)

# Re-pin CSP because inline script changed.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
