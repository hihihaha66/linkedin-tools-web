from pathlib import Path
import hashlib,base64,re
p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()
s=s.replace("'<span class=\"offer-head-name\">'+esc(A.name)+'</span>'","'<span class=\"offer-head-name\" data-offer-head=\"0\">'+esc(A.name)+'</span>'",1)
s=s.replace("'<span class=\"offer-head-name\">'+esc(B.name)+'</span>'","'<span class=\"offer-head-name\" data-offer-head=\"1\">'+esc(B.name)+'</span>'",1)
old='markDirty();scheduleCalculation();if(k==="name")renderSwitchingInputs();'
new='markDirty();scheduleCalculation();if(k==="name"){document.querySelectorAll(\'[data-offer-head="\'+i+\'"]\').forEach(x=>x.textContent=state.offers[i].name);renderSwitchingInputs();}'
if old not in s: raise SystemExit('name listener target missing')
s=s.replace(old,new,1)
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
