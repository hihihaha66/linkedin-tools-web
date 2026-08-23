from pathlib import Path
import base64,hashlib,re

HTML=Path('net-cao-hon-co-that-tot-hon-v2.html')
TEST=Path('tests/v2-turn6-responsive.mjs')
s=HTML.read_text(); t=TEST.read_text()

anchor=".switch-details summary{cursor:pointer;color:var(--moss);font-size:12.5px;font-weight:600;list-style:none}"
insert=anchor+".calc-summary::-webkit-details-marker{display:none}.calc-summary::before{content:'＋';font-family:var(--mono);display:inline-block;margin-right:6px}.calc-summary[aria-disabled='true']::before{content:''}details[open]>.calc-summary::before{content:'−'}"
if anchor not in s: raise SystemExit('missing calc summary CSS anchor')
s=s.replace(anchor,insert,1)

# Browser-level probe: pseudo-element must reflect native <details> open state.
probe="""  await check('blank');
"""
replacement="""  await check('blank');
  const toggleIcons=await page.evaluate(()=>{
    const d=document.createElement('details');
    d.innerHTML='<summary class="calc-summary">Xem cách tính</summary><div>detail</div>';
    document.body.appendChild(d);
    const summary=d.querySelector('summary');
    const closed=getComputedStyle(summary,'::before').content;
    d.open=true;
    const opened=getComputedStyle(summary,'::before').content;
    d.remove();
    return{closed,opened};
  });
  if(!toggleIcons.closed.includes('＋')||!toggleIcons.opened.includes('−'))throw new Error(`${label}: calculation disclosure icon did not switch + -> - (${toggleIcons.closed} / ${toggleIcons.opened})`);
"""
if probe not in t: raise SystemExit('missing responsive probe anchor')
t=t.replace(probe,replacement,1)

# JS body did not change, so existing CSP script hash remains valid. CSS is allowed by style-src 'unsafe-inline'.
HTML.write_text(s);TEST.write_text(t)
print('PATCHED V2 calculation disclosure +/- CSS and browser smoke')
