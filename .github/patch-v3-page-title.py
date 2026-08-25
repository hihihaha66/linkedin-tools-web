from pathlib import Path
html=Path('net-cao-hon-co-that-tot-hon-v3.html')
test=Path('tests/v3-current-offers-responsive.mjs')
s=html.read_text();t=test.read_text()
old='<title>Net cao hơn có thật tốt hơn? - V2</title>'
new='<title>Net cao hơn có thật tốt hơn? - V3</title>'
if old not in s: raise SystemExit('V3 page title anchor missing')
s=s.replace(old,new,1)
anchor="    await page.goto('http://127.0.0.1:8000/net-cao-hon-co-that-tot-hon-v3.html',{waitUntil:'domcontentloaded'});\n"
insert=anchor+"    if((await page.title()).includes('V2')||!(await page.title()).includes('V3'))throw new Error(label+': V3 page title/version drift '+await page.title());\n"
if anchor not in t: raise SystemExit('browser title test anchor missing')
t=t.replace(anchor,insert,1)
html.write_text(s);test.write_text(t)
print('PATCHED V3 page title')
