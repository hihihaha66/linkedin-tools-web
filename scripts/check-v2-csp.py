from pathlib import Path
import base64, hashlib, re, sys

path=Path('net-cao-hon-co-that-tot-hon-v2.html')
html=path.read_text()
meta=re.search(r'<meta http-equiv="Content-Security-Policy" content="([^"]+)"',html)
if not meta:
    sys.exit('Missing Content-Security-Policy meta tag')
policy=meta.group(1)
h=re.search(r"script-src 'sha256-([^']+)'",policy)
if not h:
    sys.exit('Missing hashed script-src in CSP')
start=html.index('<script>')+len('<script>')
end=html.index('</script>',start)
script=html[start:end]
actual=base64.b64encode(hashlib.sha256(script.encode('utf-8')).digest()).decode('ascii')
if h.group(1)!=actual:
    sys.exit('CSP script hash does not match the inline script')
for required in ["script-src-attr 'none'","object-src 'none'","base-uri 'none'","form-action 'none'","connect-src https://linkedin-tools-api-test.vercel.app"]:
    if required not in policy:
        sys.exit(f'Missing CSP directive: {required}')
print('PASS: V2 CSP matches inline script and required directives are present')
