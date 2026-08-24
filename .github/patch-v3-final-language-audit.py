from pathlib import Path
import re,base64,hashlib
html=Path('net-cao-hon-co-that-tot-hon-v3.html')
s=html.read_text()
s=s.replace('Lớp 6 có thể tính dù mức lương template đang để trống; xem kết quả bên dưới.','Lớp 6 có thể tính dù mức lương của cấu trúc đã chọn đang để trống; xem kết quả bên dưới.')
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP anchor missing')
html.write_text(s)

t=Path('tests/v3-current-offers-responsive.mjs');x=t.read_text()
anchor="  for(const ph of copyAudit.placeholders){if(/^vd\\b/i.test(ph))throw new Error(label+': abbreviated placeholder '+ph);if(/^\\d[\\d,]*(?:\\.\\d+)?$/.test(ph))throw new Error(label+': numeric example placeholder missing “Ví dụ:” '+ph);}\n"
extra=anchor+"  const publicText=await page.locator('body').innerText();for(const bad of ['backend','threshold','baseline','template','timeline mục tiêu','target Net','target thu nhập'])if(publicText.toLowerCase().includes(bad.toLowerCase()))throw new Error(label+': developer wording remains visible: '+bad);\n"
if anchor not in x: raise SystemExit('copy audit anchor missing')
x=x.replace(anchor,extra,1);t.write_text(x)
print('REMOVED final V3 developer-language leak and expanded visible-copy audit')
