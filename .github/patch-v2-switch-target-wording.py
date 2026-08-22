from pathlib import Path
import hashlib,base64,re
p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()
old='<div class="field"><label>Chuyển sang offer</label><select data-sw="targetOffer">'
new='<div class="field"><label>Bạn muốn so phương án ở lại với offer nào?</label><select data-sw="targetOffer">'
if old not in s: raise SystemExit('switch target wording not found')
s=s.replace(old,new,1)
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
