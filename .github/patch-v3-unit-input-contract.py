from pathlib import Path
import re,base64,hashlib

HTML=Path('net-cao-hon-co-that-tot-hon-v3.html')
TEST=Path('tests/v3-unit-suffix-regression.mjs')
s=HTML.read_text();t=TEST.read_text()

# Shared renderer contract: placeholder is only the example value; suffix is the canonical unit.
anchor='function renderInputs(){'
helper=r'''function unitInputHtml(attrs,value,placeholder,suffix,inputmode='decimal',money=false,extra=''){
 const v=money?grp(value==null?'':value):esc(value==null?'':value),unit=String(suffix||''),wide=unit.length>2?' unit-wide':'';
 return '<div class="suffix-row'+wide+'" data-unit-field="1"><input type="text" '+attrs+' inputmode="'+inputmode+'" placeholder="'+esc(placeholder||'')+'" value="'+v+'" '+(extra||'')+'>'+(unit?'<span class="suffix" aria-hidden="true">'+esc(unit)+'</span>':'')+'</div>';
}

'''
if anchor not in s: raise SystemExit('renderInputs anchor missing')
s=s.replace(anchor,helper+anchor,1)

old="const textInput=function(i,k,o,placeholder,inputmode,money,suffix,extra){const raw=o[k],v=money?grp(raw==null?'':raw):esc(raw==null?'':raw),wide=suffix&&String(suffix).length>2?' unit-wide':'';return '<div class=\"suffix-row'+wide+'\"><input type=\"text\" data-i=\"'+i+'\" data-k=\"'+k+'\" inputmode=\"'+(inputmode||'decimal')+'\" placeholder=\"'+placeholder+'\" value=\"'+v+'\" '+(extra||'')+'>'+(suffix?'<span class=\"suffix\">'+suffix+'</span>':'')+'</div>'};"
new="const textInput=function(i,k,o,placeholder,inputmode,money,suffix,extra){return unitInputHtml('data-i=\"'+i+'\" data-k=\"'+k+'\"',o[k],placeholder,suffix,inputmode||'decimal',money,extra||'')};"
if old not in s: raise SystemExit('Offer textInput helper anchor missing')
s=s.replace(old,new,1)

old="const inp=(k,v,ph,suf='',money=false)=>{const wide=suf&&String(suf).length>2?' unit-wide':'';return '<div class=\"suffix-row'+wide+'\"><input type=\"text\" data-current=\"'+k+'\" inputmode=\"'+(money?'numeric':'decimal')+'\" placeholder=\"'+ph+'\" value=\"'+(money?grp(v==null?'':v):esc(v==null?'':v))+'\">'+(suf?'<span class=\"suffix\">'+suf+'</span>':'')+'</div>'};"
new="const inp=(k,v,ph,suf='',money=false)=>unitInputHtml('data-current=\"'+k+'\"',v,ph,suf,money?'numeric':'decimal',money);"
if old not in s: raise SystemExit('Current Job inp helper anchor missing')
s=s.replace(old,new,1)

# Mark the two static suffix fields with the same contract so regression tests cover them uniformly.
s=s.replace('<div class="suffix-row"><input type="number" id="deps"','<div class="suffix-row" data-unit-field="1"><input type="number" id="deps"',1)
s=s.replace('<div class="suffix-row"><input type="number" id="sickDays"','<div class="suffix-row" data-unit-field="1"><input type="number" id="sickDays"',1)

# Switching/Solver fields are hand-rendered; mark every suffix row after rendering by CSS/DOM convention, no state-dependent unit behavior.
# Explicitly forbid any future placeholder-shown rule from altering unit visibility or spacing.
style_anchor='/* V3 mobile input hygiene: the suffix is the canonical unit; examples stay compact. */'
if style_anchor not in s: raise SystemExit('mobile hygiene marker missing')
contract_css="""/* Unit-field contract: suffix is stable in empty, filled and cleared states. */
.suffix-row .suffix{opacity:1;visibility:visible}
.suffix-row[data-unit-field="1"] .suffix{color:var(--ink-soft)}
"""
s=s.replace(style_anchor,contract_css+'\n'+style_anchor,1)
if ':has(input:placeholder-shown)' in s or 'placeholder-shown) .suffix' in s:
    raise SystemExit('state-dependent suffix CSS still exists')

# CSP hash follows inline JS refactor.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
HTML.write_text(s)

# Extend regression with exact contract and state transitions.
insert='''
    // Contract examples requested for the compact matrix: example value + stable suffix.
    const exact=await page.evaluate(()=>{
      const pick=(sel)=>{const el=document.querySelector(sel),suffix=el?.parentElement?.querySelector('.suffix');return el?{ph:el.placeholder,unit:suffix?.textContent.trim(),suffixOpacity:suffix?Number(getComputedStyle(suffix).opacity):null}:null};
      return{
        aOffice:pick('#offersIn [data-i="0"][data-k="days"]'),
        aCommute:pick('#offersIn [data-i="0"][data-k="commute"]'),
        aOt:pick('#offersIn [data-i="0"][data-k="otMonthly"]'),
        currentOffice:pick('#currentFields [data-current="days"]'),
        currentCommute:pick('#currentFields [data-current="commute"]')
      };
    });
    for(const [name,x,ph,unit] of [['aOffice',exact.aOffice,'VD: 5','buổi'],['aCommute',exact.aCommute,'VD: 45','phút'],['aOt',exact.aOt,'VD: 8','giờ'],['currentOffice',exact.currentOffice,'VD: 5','buổi'],['currentCommute',exact.currentCommute,'VD: 45','phút']]){
      if(!x||x.ph!==ph||x.unit!==unit||x.suffixOpacity!==1)throw new Error(label+': exact unit-field contract failed '+name+' '+JSON.stringify(x));
    }

    // Empty -> typed -> cleared must never hide or move semantic ownership of the unit.
    const transition=page.locator('#offersIn [data-i="0"][data-k="days"]');
    const readTransition=()=>transition.evaluate(el=>{const s=el.parentElement.querySelector('.suffix'),r=s.getBoundingClientRect();return{value:el.value,ph:el.placeholder,unit:s.textContent.trim(),opacity:Number(getComputedStyle(s).opacity),display:getComputedStyle(s).display,visibility:getComputedStyle(s).visibility,suffixX:r.x}});
    const emptyState=await readTransition();
    await transition.fill('3');const filledState=await readTransition();
    await transition.fill('');const clearedState=await readTransition();
    for(const [stateName,x] of [['empty',emptyState],['filled',filledState],['cleared',clearedState]]){
      if(x.unit!=='buổi'||x.opacity!==1||x.display==='none'||x.visibility==='hidden')throw new Error(label+': suffix changed in '+stateName+' state '+JSON.stringify(x));
    }
    if(emptyState.ph!=='VD: 5'||clearedState.ph!=='VD: 5'||filledState.value!=='3')throw new Error(label+': example/value transition failed');
    if(Math.abs(emptyState.suffixX-filledState.suffixX)>1||Math.abs(emptyState.suffixX-clearedState.suffixX)>1)throw new Error(label+': suffix shifted between input states');
'''
anchor_test="    // Specific regression from the screenshot: empty salary fields must show both the example and the real currency unit.\n"
if anchor_test not in t: raise SystemExit('unit suffix test insertion anchor missing')
t=t.replace(anchor_test,insert+'\n'+anchor_test,1)

# Stronger structural audit: unit-bearing offer/current inputs must be rendered through shared contract wrapper.
anchor2="    if(!audit.suffixes.length)throw new Error(label+': no visible unit-suffix rows audited');\n"
extra2=anchor2+"    const uncontracted=await page.evaluate(()=>[...document.querySelectorAll('#offersIn .suffix-row,#currentFields .suffix-row')].filter(row=>row.querySelector('.suffix')&&!row.hasAttribute('data-unit-field')).length);if(uncontracted)throw new Error(label+': offer/current unit fields bypass shared renderer: '+uncontracted);\n"
if anchor2 not in t: raise SystemExit('structural audit anchor missing')
t=t.replace(anchor2,extra2,1)
TEST.write_text(t)
print('PATCHED V3 stable unit-input contract')
