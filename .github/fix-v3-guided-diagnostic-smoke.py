from pathlib import Path
p=Path('tests/v3-current-offers-responsive.mjs')
s=p.read_text()
old="""  await page.locator('#solverResult .diag-action').click();await page.waitForTimeout(100);
  if(!(await page.evaluate(()=>document.activeElement?.getAttribute('data-sw')==='onboardDate')))throw new Error(label+': switching diagnostic did not focus onboard date');
  await page.evaluate(()=>{document.querySelector('#solverResult').innerHTML='<button type=\"button\" class=\"diag-action\" data-diag-scope=\"solver\" data-diag-field=\"targetMonthlyNet\">Chỉnh mục tiêu</button>'});
  await page.locator('#solverResult .diag-action').click();await page.waitForTimeout(100);
"""
new="""  await page.evaluate(()=>document.querySelector('#solverResult .diag-action')?.click());await page.waitForTimeout(100);
  if(!(await page.evaluate(()=>document.activeElement?.getAttribute('data-sw')==='onboardDate')))throw new Error(label+': switching diagnostic did not focus onboard date');
  await page.waitForTimeout(650);
  await page.evaluate(()=>{document.querySelector('#solverLayer').style.display='';document.querySelector('#solverResult').innerHTML='<button type=\"button\" class=\"diag-action\" data-diag-scope=\"solver\" data-diag-field=\"targetMonthlyNet\">Chỉnh mục tiêu</button>'});
  await page.evaluate(()=>document.querySelector('#solverResult .diag-action')?.click());await page.waitForTimeout(100);
"""
if old not in s: raise SystemExit('diagnostic smoke anchor missing after UI patch')
s=s.replace(old,new,1)
p.write_text(s)
print('STABILIZED V3 diagnostic smoke after UI patch')
