from pathlib import Path
import re,base64,hashlib
p=Path('net-cao-hon-co-that-tot-hon-v3.html')
s=p.read_text()
# Offer mixed OT rows.
s=s.replace("textInput(i,hourKey,o,'Giờ','decimal',false,'h')","textInput(i,hourKey,o,'Ví dụ: 4','decimal',false,'giờ')")
s=s.replace("textInput(i,factorKey,o,String(min),'decimal',false,'%')","textInput(i,factorKey,o,'Ví dụ: '+min,'decimal',false,'%')")
# Current Job OT rows.
s=s.replace("inp('otFactor',o.otFactor,o.otType==='rest'?'200':'150','%')","inp('otFactor',o.otFactor,'Ví dụ: '+(o.otType==='rest'?'200':'150'),'%')")
s=s.replace("'Ví dụ: giờ','giờ'","'Ví dụ: 4','giờ'")
# Layer 6 zero buffer is also an example placeholder even though the default value is 0.
s=s.replace("money(sol.noLossBuffer,'0')","money(sol.noLossBuffer,'Ví dụ: 0')")
# Any remaining literal abbreviated placeholders are expanded.
s=s.replace("'vd ","'Ví dụ: ").replace('"vd ','"Ví dụ: ')
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP anchor missing')
p.write_text(s)
print('NORMALIZED remaining V3 example placeholders')
