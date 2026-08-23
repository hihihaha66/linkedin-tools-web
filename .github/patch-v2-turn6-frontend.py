from pathlib import Path
import base64,hashlib,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()
old='function normalizeState(d){if(!d||!Array.isArray(d.offers)||d.offers.length!==2)return null;return{deps:d.deps??null,region:d.region||"I",sickDays:d.sickDays??null,mat:d.mat||"hide",offers:[ensureOfferShape(d.offers[0],"Offer A"),ensureOfferShape(d.offers[1],"Offer B")],switching:ensureSwitching(d.switching)}}'
new='function normalizeState(d){if(!d||!Array.isArray(d.offers)||d.offers.length!==2)return null;const region=["I","II","III","IV"].includes(d.region)?d.region:"I",mat=d.mat==="show"?"show":"hide";return{deps:d.deps??null,region,sickDays:d.sickDays??null,mat,offers:[ensureOfferShape(d.offers[0],"Offer A"),ensureOfferShape(d.offers[1],"Offer B")],switching:ensureSwitching(d.switching)}}'
if old not in s: raise SystemExit('missing normalizeState anchor')
s=s.replace(old,new,1)
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
h=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor not found')
p.write_text(s)
print('PATCHED Turn 6 frontend validation + CSP')
