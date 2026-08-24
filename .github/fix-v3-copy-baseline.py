from pathlib import Path
import re,base64,hashlib
p=Path('net-cao-hon-co-that-tot-hon-v3.html')
s=p.read_text()
s=s.replace('làm baseline','làm mốc so sánh').replace('lấy baseline','lấy mốc so sánh')
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP anchor missing')
p.write_text(s)
print('REMOVED remaining baseline wording')
