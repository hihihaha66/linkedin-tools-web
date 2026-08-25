from pathlib import Path

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
new="""/* V3 mobile input hygiene: keep the real field unit visible while examples stay compact. */
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
"""
if old not in s: raise SystemExit('mobile hygiene block missing')
s=s.replace(old,new,1)
p.write_text(s)
print('PATCHED V3 suffix visibility regression')
