from pathlib import Path
import hashlib,base64,re
p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()
old='const src=o||{},oldTrial=src.probationEnabled==null&&(hasInput(src.probPct)||hasInput(src.probMon)||src.probInsurance==="yes");'
new='const src=o||{},oldTrial=src.probationEnabled==null&&(hasPositiveValue(src.probPct)||hasPositiveValue(src.probMon)||src.probInsurance==="yes");'
if old not in s: raise SystemExit('legacy trial target missing')
s=s.replace(old,new,1)
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
