from pathlib import Path

HTML=Path('net-cao-hon-co-that-tot-hon-v2.html')
RESP=Path('tests/v2-turn6-responsive.mjs')
s=HTML.read_text(); t=RESP.read_text()

# Add responsive styles for switching/result rows and scenario cards. Long values must wrap instead of crushing labels.
anchor=".switch-result .tot .v{font-family:var(--mono);white-space:nowrap}"
insert=anchor+".switch-result .row>*{min-width:0}.switch-result .row.row-wrap .v{white-space:normal;overflow-wrap:anywhere;text-align:right;max-width:68%}.switch-scenarios{margin:10px 0 12px;padding:10px;background:var(--paper-2);border-radius:8px}.switch-scenario-title{font-size:12px;font-weight:600;color:var(--moss);margin-bottom:5px}.switch-scenario-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(145px,.9fr);gap:10px;padding:7px 0;border-bottom:1px dotted var(--line);font-size:12.5px;align-items:start}.switch-scenario-row:last-of-type{border-bottom:0}.switch-scenario-row small{display:block;color:var(--ink-soft);font-size:10.5px;line-height:1.45;margin-top:2px}.switch-scenario-row .v{font-family:var(--mono);text-align:right;white-space:normal;overflow-wrap:anywhere;min-width:0}.switch-scenario-row.combined{font-weight:600}.switch-scenario-note{font-size:10.5px;color:var(--ink-soft);line-height:1.45;margin:7px 0 0;padding-top:6px;border-top:1px solid var(--line)}"
if anchor not in s: raise SystemExit('switch result CSS anchor missing')
s=s.replace(anchor,insert,1)

mobile_anchor="@media(max-width:540px){.ctx{grid-template-columns:minmax(0,.72fr) minmax(0,1.28fr);gap:8px;margin-bottom:10px}"
mobile_insert="@media(max-width:540px){.switch-result{padding:12px}.switch-result h4{font-size:16px;line-height:1.35}.switch-result .subt{font-size:11.5px;line-height:1.5}.switch-result .row{display:grid;grid-template-columns:minmax(0,43%) minmax(0,57%);gap:8px;font-size:12px;align-items:start}.switch-result .row .v{min-width:0;white-space:normal;text-align:right;overflow-wrap:anywhere}.switch-result .row.row-wrap{grid-template-columns:minmax(0,34%) minmax(0,66%)}.switch-result .row.row-wrap .v{max-width:none}.switch-result .tot{font-size:12.5px;gap:8px}.switch-result .tot .v{white-space:normal;text-align:right;overflow-wrap:anywhere}.switch-callout{font-size:12.5px;line-height:1.45}.switch-scenarios{padding:8px;margin:8px 0 10px}.switch-scenario-row{grid-template-columns:1fr;gap:3px;padding:6px 0}.switch-scenario-row .v{text-align:left;font-size:11.5px}.switch-scenario-title{font-size:11.5px}.switch-scenario-note{font-size:9.8px}.switch-detail-body{min-width:0}.switch-detail-body [style*=\"display:flex\"]{min-width:0}.verdict{padding:15px}.verdict h3{font-size:18px;line-height:1.35}.verdict p{font-size:13px;line-height:1.55}.verdict [style*=\"padding:12px 13px\"]{padding:10px!important}.verdict ul{padding-left:17px!important}.verdict li{overflow-wrap:anywhere}.events{min-width:0}.events .erow>*{min-width:0;overflow-wrap:anywhere}.basis .row .v,.scenario .v{white-space:normal;overflow-wrap:anywhere;text-align:right}.ctx{grid-template-columns:minmax(0,.72fr) minmax(0,1.28fr);gap:8px;margin-bottom:10px}"
if mobile_anchor not in s: raise SystemExit('mobile media anchor missing')
s=s.replace(mobile_anchor,mobile_insert,1)

# Strengthen browser QA across real phone widths and every major result container, not just the offer input matrix.
t=t.replace("const cases=[['desktop',1280,900],['mobile',375,812]];","const cases=[['desktop',1280,900],['mobile-320',320,740],['mobile-360',360,800],['mobile-375',375,812],['mobile-390',390,844],['mobile-430',430,932]];",1)
t=t.replace("if(label==='mobile'&&Math.abs(setupLayout.cells[0].y-setupLayout.cells[1].y)>2)","if(label.startsWith('mobile')&&Math.abs(setupLayout.cells[0].y-setupLayout.cells[1].y)>2)",1)
t=t.replace("if(label==='mobile'){\n    const openHeight=await page.locator('#bhSim').evaluate(e=>e.getBoundingClientRect().height);","if(label.startsWith('mobile')){\n    const openHeight=await page.locator('#bhSim').evaluate(e=>e.getBoundingClientRect().height);",1)

# Append generic viewport containment check after expanded state.
anchor2="""  await check('expanded-trial-ot');
  await page.close();
"""
extra="""  await check('expanded-trial-ot');
  const containment=await page.evaluate(()=>{
    const sels=['.switch-result','.verdict','.events','.offer-matrix','.bh-sim','.switch-scenarios'];
    const bad=[];
    for(const sel of sels)for(const el of document.querySelectorAll(sel)){
      const r=el.getBoundingClientRect();
      if(el.scrollWidth>el.clientWidth+2)bad.push(sel+':scroll '+el.scrollWidth+'>'+el.clientWidth);
      if(r.left<-2||r.right>innerWidth+2)bad.push(sel+':viewport '+Math.round(r.left)+'..'+Math.round(r.right)+' / '+innerWidth);
    }
    return bad;
  });
  if(containment.length)throw new Error(`${label}: result containment failed: ${containment.join(' | ')}`);
  await page.close();
"""
if anchor2 not in t: raise SystemExit('responsive containment anchor missing')
t=t.replace(anchor2,extra,1)

HTML.write_text(s);RESP.write_text(t)
print('PATCHED mobile result responsiveness + multi-width browser QA')
