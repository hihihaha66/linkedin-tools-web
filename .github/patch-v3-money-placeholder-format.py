from pathlib import Path
import re,base64,hashlib

HTML=Path('net-cao-hon-co-that-tot-hon-v3.html')
RESP=Path('tests/v3-current-offers-responsive.mjs')
SUFFIX=Path('tests/v3-unit-suffix-regression.mjs')
s=HTML.read_text(); r=RESP.read_text(); t=SUFFIX.read_text()

# Currency contract: when the canonical suffix is đồng (đ), examples are also written as full đồng amounts.
# Convert every shorthand `VD: N triệu` example to comma-grouped VND.
def expand_million(m):
    n=int(m.group(1))*1_000_000
    return 'VD: '+format(n,',')
s,count=re.subn(r'VD:\s*(\d+)\s*triệu',expand_million,s)
if count<5: raise SystemExit(f'Expected multiple money placeholders to convert, got {count}')

# No shorthand monetary scale is allowed in any VD placeholder after this pass.
if re.search(r'VD:[^\"\'\n<]*(?:triệu|tỷ|nghìn|k\b)',s,re.I):
    raise SystemExit('Shorthand monetary unit remains in a VD placeholder')

# Keep full comma-formatted VND examples legible in the narrow two-offer matrix.
s=s.replace('.offers-in:not(.one-offer) .offer-mcell input::placeholder{font-size:9.5px}',
            '.offers-in:not(.one-offer) .offer-mcell input::placeholder{font-size:clamp(7px,2.1vw,9px);letter-spacing:-.035em}',1)
s=s.replace('.offers-in:not(.one-offer) .offer-mcell input::placeholder{font-size:8px;letter-spacing:-.03em}',
            '.offers-in:not(.one-offer) .offer-mcell input::placeholder{font-size:7px;letter-spacing:-.045em}',1)

# Update exact salary-story assertions in the existing responsive suite.
for old,new in [
    ("story.current!=='VD: 20 triệu'","story.current!=='VD: 20,000,000'"),
    ("story.a!=='VD: 25 triệu'","story.a!=='VD: 25,000,000'"),
    ("bPlaceholder!=='VD: 30 triệu'","bPlaceholder!=='VD: 30,000,000'"),
]:
    if old not in r: raise SystemExit('responsive expectation missing: '+old)
    r=r.replace(old,new,1)

old_copy_audit="for(const ph of copyAudit.placeholders){if(!/^VD:\\s/.test(ph))throw new Error(label+': placeholder must use compact VD format: '+ph);if(/\\d{1,3}(?:,\\d{3})+/.test(ph))throw new Error(label+': placeholder uses visually long raw number: '+ph);}"
new_copy_audit="for(const ph of copyAudit.placeholders){if(!/^VD:\\s/.test(ph))throw new Error(label+': placeholder must use compact VD format: '+ph);const m=ph.match(/^VD:\\s*(\\d[\\d,]*)$/);if(m&&m[1].includes(',')&&!/^\\d{1,3}(?:,\\d{3})+$/.test(m[1]))throw new Error(label+': malformed comma grouping in placeholder: '+ph);}"
if old_copy_audit not in r: raise SystemExit('responsive placeholder audit anchor missing')
r=r.replace(old_copy_audit,new_copy_audit,1)

# Update dedicated suffix regression expectations.
for old,new in [
    ("x.ph==='VD: 20 triệu'","x.ph==='VD: 20,000,000'"),
    ("x.ph==='VD: 25 triệu'","x.ph==='VD: 25,000,000'"),
    ("x.ph==='VD: 30 triệu'","x.ph==='VD: 30,000,000'"),
]:
    if old not in t: raise SystemExit('suffix expectation missing: '+old)
    t=t.replace(old,new,1)

# Add a semantic unit audit: every visible field whose suffix is đồng must use a full comma-formatted number example.
anchor="""      if(x.placeholder&&!x.placeholder.startsWith('VD: '))throw new Error(label+': placeholder convention drift '+JSON.stringify(x));
      if(label.startsWith('mobile')&&x.placeholder&&x.phWidth>x.available+3)throw new Error(label+': placeholder collides with visible suffix '+JSON.stringify(x));
"""
extra="""      if(x.placeholder&&!x.placeholder.startsWith('VD: '))throw new Error(label+': placeholder convention drift '+JSON.stringify(x));
      if(x.unit==='đ'&&x.placeholder&&!/^VD: (?:0|[1-9]\\d{0,2}(?:,\\d{3})+)$/.test(x.placeholder))throw new Error(label+': currency example must be full comma-formatted VND '+JSON.stringify(x));
      if(x.unit!=='đ'&&x.placeholder&&/(triệu|tỷ|nghìn)/i.test(x.placeholder))throw new Error(label+': non-currency field contains a money scale '+JSON.stringify(x));
      if(label.startsWith('mobile')&&x.placeholder&&x.phWidth>x.available+3)throw new Error(label+': placeholder collides with visible suffix '+JSON.stringify(x));
"""
if anchor not in t: raise SystemExit('suffix semantic audit anchor missing')
t=t.replace(anchor,extra,1)

# Static source-level audit catches hidden conditional fields that a single browser state might not render.
# All VD placeholders with comma groups must be valid 3-digit groupings; no shorthand words remain.
for ph in re.findall(r'VD:[^\"\'<>\n]+',s):
    if any(word in ph.lower() for word in ('triệu','tỷ','nghìn')):
        raise SystemExit('shorthand placeholder remains: '+ph)
    nums=re.findall(r'\d[\d,]*',ph)
    for num in nums:
        if ',' in num and not re.fullmatch(r'\d{1,3}(?:,\d{3})+',num):
            raise SystemExit('invalid comma grouping in placeholder: '+ph)

# Inline JS strings changed, so refresh CSP.
start=s.index('<script>')+len('<script>'); end=s.index('</script>',start); js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode()
s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')

HTML.write_text(s); RESP.write_text(r); SUFFIX.write_text(t)
print(f'PATCHED V3 money placeholders: {count} shorthand examples converted')
