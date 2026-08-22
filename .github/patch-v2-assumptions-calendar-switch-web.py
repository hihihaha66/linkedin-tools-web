from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

def rep(old,new,label):
    global s
    if old not in s: raise SystemExit(f'Missing target: {label}')
    s=s.replace(old,new,1)

# Compact visual treatment for assumptions and year-end switching details.
css_marker='.switch-result .tot .v{font-family:var(--mono);white-space:nowrap}'
css_add=css_marker+""".assumption-card-wrap{margin:0 0 20px}.assumption-card{background:#fff;border:1px solid var(--line);border-left:4px solid var(--clay);border-radius:var(--radius);padding:15px 16px}.assumption-title{font-family:var(--serif);font-size:17px;font-weight:600;margin-bottom:2px}.assumption-sub{font-size:12.5px;color:var(--ink-soft);margin:0 0 10px}.assumption-group{font-size:13px;margin-top:8px}.assumption-group b{font-size:12.5px}.assumption-group ul{margin:5px 0 0;padding-left:20px}.assumption-group li{margin:3px 0}.assumption-group.assumed b{color:var(--clay)}.assumption-group.confirm b{color:var(--moss)}.switch-callout{font-size:13.5px;font-weight:600;background:var(--paper-2);border-radius:7px;padding:9px 10px;margin:10px 0}.switch-details{margin-top:10px;border-top:1px solid var(--line);padding-top:8px}.switch-details summary{cursor:pointer;color:var(--moss);font-size:12.5px;font-weight:600;list-style:none}.switch-detail-body{padding-top:7px}"""
rep(css_marker,css_add,'CSS marker')

# Explain the strengthened switching question in normal language.
rep('Dùng khi bạn muốn biết nghỉ lúc này có thể bỏ lại bao nhiêu tiền, sang chỗ mới nhận được gì trong năm onboard và mất bao lâu để bù lại phần hụt ban đầu.',
    'So hai phương án từ hôm nay đến 31/12: ở lại công ty hiện tại, hoặc nghỉ vào ngày bạn chọn rồi sang offer mới. Sau đó tool mới ước tính mất bao lâu để bù lại phần hụt khi chuyển việc.',
    'switch intro')

# Assumption visibility sits before the numeric layers so the user sees uncertainty first.
rep('<div class="results hidden" id="results">\n<div class="layer"><p class="lnum">Lớp 1 · <b>Tiền về tay mỗi tháng</b></p>',
    '<div class="results hidden" id="results">\n<div class="assumption-card-wrap" id="assumptionLayer" style="display:none"><div id="assumptionContent"></div></div>\n<div class="layer"><p class="lnum">Lớp 1 · <b>Tiền về tay mỗi tháng</b></p>',
    'assumption layer')

# Improve switching input labels for the calendar-year decision.
rep('Net hiện tại / tháng <span style="font-size:11px">(để tính khoảng nghỉ & hòa vốn)</span>',
    'Net hiện tại / tháng <span style="font-size:11px">(để so đến 31/12 & hòa vốn)</span>',
    'current net label')
rep('placeholder="có thể để trống" value="\'+grp(sw.currentNet==null?"":sw.currentNet)+\'"',
    'placeholder="cần để so cuối năm" value="\'+grp(sw.currentNet==null?"":sw.currentNet)+\'"',
    'current net placeholder')
rep('Nếu ở lại, khoản thưởng gần nhất bạn dự kiến nhận về tay',
    'Nếu ở lại đến 31/12, khoản thưởng bạn dự kiến được hưởng (về tay)',
    'stay bonus label')
rep("+'<p class=\"benefit-note switch-wide\">Hòa vốn dùng net hiện tại, net thử việc nếu có và net chính thức sau thử việc. Tool không mặc định cộng OT hay thưởng hiệu suất vào hòa vốn.</p>'",
    "+'<p class=\"benefit-note switch-wide\"><b>Cách tính:</b> Tool lấy ngày hôm nay trên thiết bị của bạn làm mốc, quy đổi ngày lẻ theo net tháng ÷ 30, tính net thử việc trước rồi net chính thức sau đó. OT và thưởng hiệu suất không được tự cộng vào phép so đến 31/12 hay hòa vốn.</p>'",
    'switch helper')

# Apply assumption output.
old_apply=''' document.getElementById("l2basis").innerHTML=data.l2basis||"";document.getElementById("l3events").innerHTML=data.l3events||"";document.getElementById("verdict").innerHTML=data.verdictHtml||"";\n const sl=document.getElementById("switchLayer");document.getElementById("switchingResult").innerHTML=data.switchingHtml||"";sl.style.display=data.showSwitching?"":"none";'''
new_apply=''' document.getElementById("l2basis").innerHTML=data.l2basis||"";document.getElementById("l3events").innerHTML=data.l3events||"";document.getElementById("verdict").innerHTML=data.verdictHtml||"";\n const al=document.getElementById("assumptionLayer");document.getElementById("assumptionContent").innerHTML=data.assumptionsHtml||"";al.style.display=data.showAssumptions?"":"none";\n const sl=document.getElementById("switchLayer");document.getElementById("switchingResult").innerHTML=data.switchingHtml||"";sl.style.display=data.showSwitching?"":"none";'''
rep(old_apply,new_apply,'apply assumptions')

# Send local browser date only for calculation; do not persist it in saved JSON.
rep('function hasAnySalary(){return state.offers.some(o=>{const n=Number(String(o.gross??"").replace(/,/g,""));return Number.isFinite(n)&&n>0})}',
    'function hasAnySalary(){return state.offers.some(o=>{const n=Number(String(o.gross??"").replace(/,/g,""));return Number.isFinite(n)&&n>0})}\nfunction localToday(){const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day}',
    'local date helper')
rep(' const body=JSON.stringify(state);',
    ' const payload=JSON.parse(JSON.stringify(state));if(payload.switching&&payload.switching.enabled)payload.switching.asOfDate=localToday();const body=JSON.stringify(payload);',
    'request local date')

# Make privacy / switching disclaimer reflect the new year-end cash-flow view.
s=s.replace('Phần thời điểm chuyển việc phụ thuộc chính sách thưởng thực tế của từng công ty.', 'Phần thời điểm chuyển việc dùng net/30 cho ngày lẻ, không mô phỏng quyết toán thuế khi đổi nơi làm việc và vẫn phụ thuộc chính sách thưởng thực tế của từng công ty.')

# Re-pin CSP after changing inline JS.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
