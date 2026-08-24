from pathlib import Path
p=Path('.github/patch-v3-current-matrix.py')
s=p.read_text()
old="anchor=\"  if(!(await page.locator('#currentEnabledSeg [data-v=\\\"on\\\"]').evaluate(e=>e.classList.contains('on'))))throw new Error(label+': Current Job toggle did not persist');\\n\""
new="anchor=\"  await page.locator('#currentEnabledSeg [data-v=\\\"on\\\"]').click();await page.locator('[data-current=\\\"gross\\\"]').fill('30000000');await page.locator('#offersIn input[data-i=\\\"0\\\"][data-k=\\\"gross\\\"]').fill('35000000');await page.waitForTimeout(750);\\n\""
if old not in s: raise SystemExit('old browser QA anchor declaration missing')
s=s.replace(old,new,1)
p.write_text(s)
print('FIXED V3 Current Job QA insertion anchor')
