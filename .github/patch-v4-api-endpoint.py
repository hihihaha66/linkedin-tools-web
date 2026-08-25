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

old_decl="const page=await browser.newPage({viewport:{width,height}});const bodies=[];"
new_decl="const page=await browser.newPage({viewport:{width,height}});const bodies=[],apiUrls=[];"
if old_decl not in t: raise SystemExit('V4 browser declarations anchor missing')
t=t.replace(old_decl,new_decl,1)
old_route="await page.route('**/api/offer-value-v3',async route=>{try{bodies.push(JSON.parse(route.request().postData()||'{}'))}catch{};"
new_route="await page.route('**/api/offer-value-v4',async route=>{apiUrls.push(route.request().url());try{bodies.push(JSON.parse(route.request().postData()||'{}'))}catch{};"
if old_route not in t: raise SystemExit('V4 browser mock route anchor missing')
t=t.replace(old_route,new_route,1)
anchor="    if(!bodies.length||String(bodies.at(-1)?.offers?.[0]?.gross)!=='25000000')throw new Error(label+': V4 no longer sends the V3-compatible offer payload');\n"
extra=anchor+"    if(!apiUrls.length||apiUrls.some(u=>!u.endsWith('/api/offer-value-v4')||u.includes('/api/offer-value-v3')))throw new Error(label+': V4 endpoint isolation failed '+JSON.stringify(apiUrls));\n"
if anchor not in t: raise SystemExit('V4 endpoint assertion anchor missing')
t=t.replace(anchor,extra,1)
TEST.write_text(t)
print('PATCHED V4 frontend to /api/offer-value-v4')
