from pathlib import Path
p=Path('tests/v4-clean-ui.mjs')
t=p.read_text()
old="for(const must of ['So công việc hiện tại với 1-2 offer','BH chưa rõ?','Chọn mục tiêu; tool tính mức lương tối thiểu cần thương lượng theo điều kiện của offer.'])"
new="for(const must of ['So công việc hiện tại với 1-2 offer'])"
if old not in t: raise SystemExit('old compact-copy expectation anchor missing')
t=t.replace(old,new,1)
anchor="await page.locator('#offersIn [data-i=\"0\"][data-k=\"gross\"]').fill('25000000');await page.waitForTimeout(700);"
extra=anchor+"\n    const bhHelp=(await page.locator('#v4ConditionalHelp').innerText()).trim();if(!bhHelp.includes('BH chưa rõ:'))throw new Error(label+': conditional BH helper did not appear after salary input '+bhHelp);"
if anchor not in t: raise SystemExit('salary interaction anchor missing')
t=t.replace(anchor,extra,1)
p.write_text(t)
print('FIXED V4 compact UX regression expectations')
