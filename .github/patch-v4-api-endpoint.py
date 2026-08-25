from pathlib import Path
import re,hashlib,base64

HTML=Path('net-cao-hon-co-that-tot-hon-v4.html')
TEST=Path('tests/v4-clean-ui.mjs')
s=HTML.read_text();t=TEST.read_text()
old='const API_URL="https://linkedin-tools-api-test.vercel.app/api/offer-value-v3";'
new='const API_URL="https://linkedin-tools-api-test.vercel.app/api/offer-value-v4";'
if old not in s: raise SystemExit('V4 API_URL anchor missing')
s=s.replace(old,new,1)
if '/api/offer-value-v3' in s: raise SystemExit('V4 HTML still references V3 endpoint after switch')

# CSP script hash follows the one-line inline JS change.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode()
s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
HTML.write_text(s)

old_route="await page.route('**/api/offer-value-v3',async route=>"
new_route="await page.route('**/api/offer-value-v4',async route=>"
if old_route not in t: raise SystemExit('V4 browser mock route anchor missing')
t=t.replace(old_route,new_route,1)
# Make endpoint isolation explicit in browser regression.
anchor="    await page.goto('http://127.0.0.1:8000/net-cao-hon-co-that-tot-hon-v4.html',{waitUntil:'domcontentloaded'});\n"
extra=anchor+"    const apiUrl=await page.evaluate(()=>typeof API_URL==='string'?API_URL:'');if(!apiUrl.endsWith('/api/offer-value-v4')||apiUrl.includes('/api/offer-value-v3'))throw new Error(label+': V4 endpoint isolation failed '+apiUrl);\n"
if anchor not in t: raise SystemExit('V4 endpoint assertion anchor missing')
t=t.replace(anchor,extra,1)
TEST.write_text(t)
print('PATCHED V4 frontend to /api/offer-value-v4')
