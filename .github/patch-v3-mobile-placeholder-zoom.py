from pathlib import Path
import re,base64,hashlib

HTML=Path('net-cao-hon-co-that-tot-hon-v3.html')
TEST=Path('tests/v3-current-offers-responsive.mjs')
s=HTML.read_text();t=TEST.read_text()

def must(old,new,label,count=1):
    global s
    if old not in s: raise SystemExit('missing HTML anchor: '+label)
    s=s.replace(old,new,count)

# 1) Mobile Safari: focused editable controls must remain at >=16px.
# Placeholder text may be visually smaller; Safari zoom is based on the input's computed font-size.
style_anchor="@media(max-width:540px){.v3-current-box{padding:11px;margin:12px 0 16px}.v3-current-matrix .offer-mrow{grid-template-columns:minmax(104px,39%) minmax(0,61%)}"
if style_anchor not in s: raise SystemExit('V3 mobile style anchor missing')
# Append a final override after all prior small-font media rules, so older V2-era matrix rules cannot win.
end_style='\n</style>'
mobile_fix="""

/* V3 mobile input hygiene: prevent iOS Safari focus zoom and keep example placeholders readable. */
.suffix-row:has(input:placeholder-shown) .suffix{opacity:0}
.suffix-row:has(input:placeholder-shown) input,.suffix-row.unit-wide:has(input:placeholder-shown) input{padding-right:9px}
input::placeholder{font-family:var(--mono);font-size:12px;letter-spacing:-.01em;color:#8E8A80;opacity:.72}
@media(max-width:540px){
 input[type=text],input[type=number],input[type=date],.offer-mcell input[type=text],.ctx input[type=number],.bh-control input{font-size:16px!important}
 .offer-mcell input::placeholder{font-size:11.5px}
 .ctx input::placeholder,.bh-control input::placeholder{font-size:11.5px}
}
"""
if end_style not in s: raise SystemExit('style closing anchor missing')
s=s.replace(end_style,mobile_fix+end_style,1)

# 2) Static context/BHXH examples include the unit in the placeholder.
must('placeholder="Ví dụ: 0"><span class="suffix">người</span>','placeholder="VD: 0 người"><span class="suffix">người</span>','dependents placeholder')
must('placeholder="Ví dụ: 5"><span class="suffix">ngày</span>','placeholder="VD: 5 ngày"><span class="suffix">ngày</span>','sick-days placeholder')

# 3) Offer placeholders: one coherent salary story and compact human-readable examples.
repls=[
("textInput(i,'customBase',o,'Ví dụ: 7,500,000','numeric',true,'đ')","textInput(i,'customBase',o,'VD: 10 triệu','numeric',true,'đ')",'offer custom BH'),
("ph=o.probDurationUnit==='days'?'Ví dụ: 60':'Ví dụ: 2'","ph=o.probDurationUnit==='days'?'VD: 60 ngày':'VD: 2 tháng'",'trial duration'),
("textInput(i,'otFactor',o,'Ví dụ: '+min,'decimal',false,'%')","textInput(i,'otFactor',o,'VD: '+min+'%','decimal',false,'%')",'offer OT factor'),
("textInput(i,hourKey,o,'Ví dụ: 4','decimal',false,'giờ')","textInput(i,hourKey,o,'VD: 4 giờ','decimal',false,'giờ')",'offer mixed OT hours'),
("textInput(i,factorKey,o,'Ví dụ: '+min,'decimal',false,'%')","textInput(i,factorKey,o,'VD: '+min+'%','decimal',false,'%')",'offer mixed OT factor'),
("textInput(i,'otBaseAmount',o,'Ví dụ: 20,000,000','numeric',true,'đ')","textInput(i,'otBaseAmount',o,i===0?'VD: 25 triệu':'VD: 30 triệu','numeric',true,'đ')",'offer OT base'),
("textInput(i,'otMonthly',o,'Ví dụ: 8','decimal',false,'giờ')","textInput(i,'otMonthly',o,'VD: 8 giờ','decimal',false,'giờ')",'offer OT monthly'),
("amount?'Ví dụ: 60,000,000':'Ví dụ: 3'","amount?'VD: 60 triệu':'VD: 3 tháng'",'offer performance bonus'),
("textInput(0,'gross',A,'Ví dụ: 20,000,000','numeric',true,'đ'),textInput(1,'gross',B,'Ví dụ: 20,000,000','numeric',true,'đ')","textInput(0,'gross',A,'VD: 25 triệu','numeric',true,'đ'),textInput(1,'gross',B,'VD: 30 triệu','numeric',true,'đ')",'offer salary narrative'),
("textInput(0,'days',A,'Ví dụ: 5','decimal',false,'buổi'),textInput(1,'days',B,'Ví dụ: 5','decimal',false,'buổi')","textInput(0,'days',A,'VD: 5 buổi','decimal',false,'buổi'),textInput(1,'days',B,'VD: 5 buổi','decimal',false,'buổi')",'offer office days'),
("textInput(0,'commute',A,'Ví dụ: 45','decimal',false,'phút'),textInput(1,'commute',B,'Ví dụ: 45','decimal',false,'phút')","textInput(0,'commute',A,'VD: 45 phút','decimal',false,'phút'),textInput(1,'commute',B,'VD: 45 phút','decimal',false,'phút')",'offer commute'),
("textInput(0,'probPct',A,'Ví dụ: 100','decimal',false,'%')","textInput(0,'probPct',A,'VD: 100%','decimal',false,'%')",'trial pct A'),
("textInput(1,'probPct',B,'Ví dụ: 100','decimal',false,'%')","textInput(1,'probPct',B,'VD: 100%','decimal',false,'%')",'trial pct B'),
("textInput(0,'guaranteedBonusMonths',A,'Ví dụ: 1','decimal',false,'tháng'),textInput(1,'guaranteedBonusMonths',B,'Ví dụ: 1','decimal',false,'tháng')","textInput(0,'guaranteedBonusMonths',A,'VD: 1 tháng','decimal',false,'tháng'),textInput(1,'guaranteedBonusMonths',B,'VD: 1 tháng','decimal',false,'tháng')",'guaranteed bonus'),
("textInput(0,'fixedAllowance',A,'Ví dụ: 1,000,000','numeric',true,'đ'),textInput(1,'fixedAllowance',B,'Ví dụ: 1,000,000','numeric',true,'đ')","textInput(0,'fixedAllowance',A,'VD: 1 triệu','numeric',true,'đ'),textInput(1,'fixedAllowance',B,'VD: 1 triệu','numeric',true,'đ')",'offer allowance'),
("textInput(0,'paidLeaveDays',A,'Ví dụ: 12','decimal',false,'ngày'),textInput(1,'paidLeaveDays',B,'Ví dụ: 12','decimal',false,'ngày')","textInput(0,'paidLeaveDays',A,'VD: 12 ngày','decimal',false,'ngày'),textInput(1,'paidLeaveDays',B,'VD: 12 ngày','decimal',false,'ngày')",'offer leave'),
]
for old,new,label in repls: must(old,new,label)

# 4) Current Job: baseline example is intentionally lower than Offer A/B, and every placeholder carries its unit.
current_repls=[
("inp('customBase',o.customBase,'Ví dụ: 7,500,000','đ',true)","inp('customBase',o.customBase,'VD: 10 triệu','đ',true)",'current custom BH'),
("inp('gross',o.gross,'Ví dụ: 30,000,000','đ',true)","inp('gross',o.gross,'VD: 20 triệu','đ',true)",'current salary'),
("inp('days',o.days,'Ví dụ: 5','buổi')","inp('days',o.days,'VD: 5 buổi','buổi')",'current office'),
("inp('commute',o.commute,'Ví dụ: 45','phút')","inp('commute',o.commute,'VD: 45 phút','phút')",'current commute'),
("inp('otMonthly',o.otMonthly,'Ví dụ: 8','giờ')","inp('otMonthly',o.otMonthly,'VD: 8 giờ','giờ')",'current OT'),
("inp('otFactor',o.otFactor,'Ví dụ: '+factorMin,'%')","inp('otFactor',o.otFactor,'VD: '+factorMin+'%','%')",'current OT factor'),
("inp('otBreakdownWeekday',o.otBreakdownWeekday,'Ví dụ: 4','giờ')","inp('otBreakdownWeekday',o.otBreakdownWeekday,'VD: 4 giờ','giờ')",'current weekday hours'),
("inp('otFactorWeekday',o.otFactorWeekday,'Ví dụ: 150','%')","inp('otFactorWeekday',o.otFactorWeekday,'VD: 150%','%')",'current weekday factor'),
("inp('otBreakdownRest',o.otBreakdownRest,'Ví dụ: 4','giờ')","inp('otBreakdownRest',o.otBreakdownRest,'VD: 4 giờ','giờ')",'current rest hours'),
("inp('otFactorRest',o.otFactorRest,'Ví dụ: 200','%')","inp('otFactorRest',o.otFactorRest,'VD: 200%','%')",'current rest factor'),
("inp('otBreakdownHoliday',o.otBreakdownHoliday,'Ví dụ: 4','giờ')","inp('otBreakdownHoliday',o.otBreakdownHoliday,'VD: 4 giờ','giờ')",'current holiday hours'),
("inp('otFactorHoliday',o.otFactorHoliday,'Ví dụ: 300','%')","inp('otFactorHoliday',o.otFactorHoliday,'VD: 300%','%')",'current holiday factor'),
("inp('otBaseAmount',o.otBaseAmount,'Ví dụ: 20,000,000','đ',true)","inp('otBaseAmount',o.otBaseAmount,'VD: 20 triệu','đ',true)",'current OT base'),
("inp('guaranteedBonusMonths',o.guaranteedBonusMonths,'Ví dụ: 1','tháng')","inp('guaranteedBonusMonths',o.guaranteedBonusMonths,'VD: 1 tháng','tháng')",'current guaranteed bonus'),
("perfAmount?'Ví dụ: 60,000,000':'Ví dụ: 2'","perfAmount?'VD: 60 triệu':'VD: 2 tháng'",'current performance bonus'),
("inp('fixedAllowance',o.fixedAllowance,'Ví dụ: 1,000,000','đ',true)","inp('fixedAllowance',o.fixedAllowance,'VD: 1 triệu','đ',true)",'current allowance'),
("inp('paidLeaveDays',o.paidLeaveDays,'Ví dụ: 12','ngày')","inp('paidLeaveDays',o.paidLeaveDays,'VD: 12 ngày','ngày')",'current leave'),
]
for old,new,label in current_repls: must(old,new,label)

# 5) Switching + Layer 6 use the same short human-readable convention.
must('placeholder="Ví dụ: 10,000,000"','placeholder="VD: 10 triệu"','old bonus custom')
must('placeholder="Ví dụ: 5,000,000"','placeholder="VD: 20 triệu"','new bonus custom')
must("money(sol.noLossBuffer,'Ví dụ: 0')","money(sol.noLossBuffer,'VD: 0đ')",'solver no-loss')
must("money(sol.targetMonthlyNet,'Ví dụ: 35,000,000')","money(sol.targetMonthlyNet,'VD: 40 triệu/tháng')",'solver monthly target')
must("money(sol.targetAnnualFixed,'Ví dụ: 500,000,000')","money(sol.targetAnnualFixed,'VD: 500 triệu/năm')",'solver annual target')

# No input placeholder in V3 should retain the old long-form marker or comma-grouped example numbers.
# Prose helpers may still say "Ví dụ" naturally; this audit only concerns placeholder= / runtime placeholder strings.
for m in re.finditer(r'placeholder=[^>\n]+',s):
    frag=m.group(0)
    if 'Ví dụ:' in frag: raise SystemExit('old long-form placeholder remains: '+frag[:120])

# Recompute CSP after inline JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
HTML.write_text(s)

# Browser QA: narrative examples, compact unit-bearing placeholders, and iOS zoom-risk font sizes.
old_ctx="if(ctxAudit.depsPlaceholder!=='Ví dụ: 0'||ctxAudit.depsUnit!=='người')throw new Error(label+': dependent example/unit missing');"
new_ctx="if(ctxAudit.depsPlaceholder!=='VD: 0 người'||ctxAudit.depsUnit!=='người')throw new Error(label+': dependent example/unit missing');"
if old_ctx not in t: raise SystemExit('dependent placeholder test anchor missing')
t=t.replace(old_ctx,new_ctx,1)
old_sick="if(sickAudit.placeholder!=='Ví dụ: 5'||sickAudit.unit!=='ngày')throw new Error(label+': sick-days example/unit missing');"
new_sick="if(sickAudit.placeholder!=='VD: 5 ngày'||sickAudit.unit!=='ngày')throw new Error(label+': sick-days example/unit missing');"
if old_sick not in t: raise SystemExit('sick placeholder test anchor missing')
t=t.replace(old_sick,new_sick,1)

# Insert before Current Job is populated so placeholders are still visible and test the intended Current < A < B story.
anchor="  await page.locator('#currentEnabledSeg [data-v=\"on\"]').click();await page.locator('[data-current=\"gross\"]').fill('30000000');await page.locator('#offersIn input[data-i=\"0\"][data-k=\"gross\"]').fill('35000000');await page.waitForTimeout(750);\n"
extra="""  await page.locator('#currentEnabledSeg [data-v=\"on\"]').click();
  const story=await page.evaluate(()=>({current:document.querySelector('[data-current=\"gross\"]')?.placeholder,a:document.querySelector('#offersIn [data-i=\"0\"][data-k=\"gross\"]')?.placeholder}));
  if(story.current!=='VD: 20 triệu'||story.a!=='VD: 25 triệu')throw new Error(label+': salary placeholder narrative mismatch '+JSON.stringify(story));
  await page.locator('#offerCountSeg [data-v=\"2\"]').click();await page.waitForTimeout(50);
  const bPlaceholder=await page.locator('#offersIn [data-i=\"1\"][data-k=\"gross\"]').getAttribute('placeholder');if(bPlaceholder!=='VD: 30 triệu')throw new Error(label+': Offer B salary placeholder narrative mismatch '+bPlaceholder);
  await page.locator('#offerCountSeg [data-v=\"1\"]').click();await page.waitForTimeout(40);
  await page.locator('[data-current=\"gross\"]').fill('30000000');await page.locator('#offersIn input[data-i=\"0\"][data-k=\"gross\"]').fill('35000000');await page.waitForTimeout(750);
"""
if anchor not in t: raise SystemExit('salary story insertion anchor missing')
t=t.replace(anchor,extra,1)

# Replace the old copy audit: `VD:` is now the required compact marker and each placeholder must include a unit/context.
old_audit="for(const ph of copyAudit.placeholders){if(/^vd\\b/i.test(ph))throw new Error(label+': abbreviated placeholder '+ph);if(/^\\d[\\d,]*(?:\\.\\d+)?$/.test(ph))throw new Error(label+': numeric example placeholder missing “Ví dụ:” '+ph);}"
new_audit="for(const ph of copyAudit.placeholders){if(!/^VD:\\s/.test(ph))throw new Error(label+': placeholder must use compact VD format: '+ph);if(/\\d{1,3}(?:,\\d{3})+/.test(ph))throw new Error(label+': placeholder uses visually long raw number: '+ph);if(!/(người|ngày|tháng|buổi|phút|giờ|%|triệu|đ|năm)/i.test(ph))throw new Error(label+': placeholder missing unit/context: '+ph);}"
if old_audit not in t: raise SystemExit('old placeholder audit missing')
t=t.replace(old_audit,new_audit,1)

# iOS focus zoom regression: all editable text/number/date inputs visible on mobile must compute to >=16px.
font_anchor="  const publicText=await page.locator('body').innerText();for(const bad of ['backend','threshold','baseline','template','timeline mục tiêu','target Net','target thu nhập'])if(publicText.toLowerCase().includes(bad.toLowerCase()))throw new Error(label+': developer wording remains visible: '+bad);\n"
font_extra=font_anchor+"""  if(label.startsWith('mobile')){
    const zoomRisk=await page.evaluate(()=>[...document.querySelectorAll('input[type=text],input[type=number],input[type=date]')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0}).map(el=>({field:el.getAttribute('data-k')||el.getAttribute('data-current')||el.getAttribute('data-sw')||el.getAttribute('data-sol')||el.id||el.className,font:parseFloat(getComputedStyle(el).fontSize),placeholder:el.placeholder})).filter(x=>x.font<15.99));
    if(zoomRisk.length)throw new Error(label+': iOS focus-zoom risk '+JSON.stringify(zoomRisk));
    const matrixPlaceholders=await page.evaluate(()=>[...document.querySelectorAll('#offersIn .offer-mcell input[placeholder],#currentFields .offer-mcell input[placeholder]')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&el.value===''}).map(el=>({ph:el.placeholder,w:el.clientWidth,font:getComputedStyle(el,'::placeholder').fontSize})));
    for(const x of matrixPlaceholders){if(x.ph.length>18)throw new Error(label+': matrix placeholder too verbose '+JSON.stringify(x));}
  }
"""
t=t.replace(font_anchor,font_extra,1)
TEST.write_text(t)
print('PATCHED V3 mobile zoom + compact unit-bearing examples')
