from pathlib import Path
import re,base64,hashlib

p=Path('net-cao-hon-co-that-tot-hon-v3.html')
s=p.read_text()
old="""/* V3 mobile input hygiene: prevent iOS Safari focus zoom and keep example placeholders readable. */
.suffix-row:has(input:placeholder-shown) .suffix{opacity:0}
.suffix-row:has(input:placeholder-shown) input,.suffix-row.unit-wide:has(input:placeholder-shown) input{padding-right:9px}
input::placeholder{font-family:var(--mono);font-size:12px;letter-spacing:-.01em;color:#8E8A80;opacity:.72}
@media(max-width:540px){
 input[type=text],input[type=number],input[type=date],.offer-mcell input[type=text],.ctx input[type=number],.bh-control input{font-size:16px!important}
 .offer-mcell input::placeholder{font-size:11.5px}
 .ctx input::placeholder,.bh-control input::placeholder{font-size:11.5px}
}
"""
new="""/* V3 mobile input hygiene: the suffix is the canonical unit; examples stay compact. */
input::placeholder{font-family:var(--mono);font-size:12px;letter-spacing:-.01em;color:#8E8A80;opacity:.72}
@media(max-width:540px){
 input[type=text],input[type=number],input[type=date],.offer-mcell input[type=text],.ctx input[type=number],.bh-control input{font-size:16px!important}
 .offer-mcell input::placeholder{font-size:11px}
 .offers-in:not(.one-offer) .offer-mcell input::placeholder{font-size:9.5px}
 .ctx input::placeholder,.bh-control input::placeholder{font-size:11px}
 .offer-mcell .suffix-row input{padding-right:25px}
 .offer-mcell .suffix-row.unit-wide input{padding-right:38px}
 .offer-mcell .suffix-row .suffix{right:5px;font-size:9.5px}
 .ctx .suffix-row input{padding-right:44px}
 .ctx .suffix-row .suffix{font-size:10px;right:7px}
 .bh-control .suffix-row input{padding-right:42px}
 .bh-control .suffix-row .suffix{font-size:10px;right:7px}
}
@media(max-width:340px){
 .offers-in:not(.one-offer) .offer-mcell input::placeholder{font-size:8px;letter-spacing:-.03em}
 .offers-in:not(.one-offer) .offer-mcell .suffix-row input{padding-left:4px;padding-right:22px}
 .offers-in:not(.one-offer) .offer-mcell .suffix-row.unit-wide input{padding-right:34px}
 .offers-in:not(.one-offer) .offer-mcell .suffix-row .suffix{right:3px;font-size:8.5px}
}
"""
if old not in s: raise SystemExit('mobile hygiene block missing')
s=s.replace(old,new,1)

# The visible suffix is the canonical unit. Keep a unit/scale in the placeholder only when it adds
# information rather than repeating the suffix (e.g. “25 triệu” + “đ”).
repls={
 'placeholder="VD: 0 người"':'placeholder="VD: 0"',
 'placeholder="VD: 5 ngày"':'placeholder="VD: 5"',
 "?'VD: 60 ngày':'VD: 2 tháng'":"?'VD: 60':'VD: 2'",
 "'VD: '+min+'%'":"'VD: '+min",
 "'VD: 4 giờ'":"'VD: 4'",
 "'VD: 8 giờ'":"'VD: 8'",
 "amount?'VD: 60 triệu':'VD: 3 tháng'":"amount?'VD: 60 triệu':'VD: 3'",
 "'VD: 5 buổi'":"'VD: 5'",
 "'VD: 45 phút'":"'VD: 45'",
 "'VD: 100%'":"'VD: 100'",
 "'VD: 1 tháng'":"'VD: 1'",
 "'VD: 12 ngày'":"'VD: 12'",
 "perfAmount?'VD: 60 triệu':'VD: 2 tháng'":"perfAmount?'VD: 60 triệu':'VD: 2'",
 "'VD: '+factorMin+'%'":"'VD: '+factorMin",
 "'VD: 150%'":"'VD: 150'",
 "'VD: 200%'":"'VD: 200'",
 "'VD: 300%'":"'VD: 300'",
 "money(sol.noLossBuffer,'VD: 0đ')":"money(sol.noLossBuffer,'VD: 0')",
 "money(sol.targetMonthlyNet,'VD: 40 triệu/tháng')":"money(sol.targetMonthlyNet,'VD: 40 triệu')",
 "money(sol.targetAnnualFixed,'VD: 500 triệu/năm')":"money(sol.targetAnnualFixed,'VD: 500 triệu')",
}
for a,b in repls.items():
    if a not in s: raise SystemExit('placeholder anchor missing: '+a)
    s=s.replace(a,b)

# Inline JS strings changed, so keep CSP in sync.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
p.write_text(s)
print('PATCHED V3 suffix visibility + non-duplicated examples')
