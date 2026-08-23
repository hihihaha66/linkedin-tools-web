from pathlib import Path
import hashlib,base64,re
p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()
old="""function renderInputs(){
 const A=state.offers[0],B=state.offers[1],dash='<span class=\"offer-mna\">-</span>';"""
new="""function renderInputs(){
 const previousBenefits=document.querySelector('#offersIn .compare-benefits'),benefitsWasOpen=!!(previousBenefits&&previousBenefits.open);
 const A=state.offers[0],B=state.offers[1],dash='<span class=\"offer-mna\">-</span>';"""
if old not in s: raise SystemExit('renderInputs start missing')
s=s.replace(old,new,1)
old=""" const head=function(){return '<div class=\"offer-mrow head\"><div class=\"offer-mlabel\">Chỉ tiêu</div><div class=\"offer-mcell\"><input class=\"name-in\" data-i=\"0\" data-k=\"name\" value=\"'+esc(A.name)+'\"></div><div class=\"offer-mcell\"><input class=\"name-in\" data-i=\"1\" data-k=\"name\" value=\"'+esc(B.name)+'\"></div></div>'};"""
new=""" const head=function(editable){return '<div class=\"offer-mrow head\"><div class=\"offer-mlabel\">Chỉ tiêu</div><div class=\"offer-mcell\">'+(editable?'<input class=\"name-in\" data-i=\"0\" data-k=\"name\" value=\"'+esc(A.name)+'\">':'<span class=\"offer-head-name\">'+esc(A.name)+'</span>')+'</div><div class=\"offer-mcell\">'+(editable?'<input class=\"name-in\" data-i=\"1\" data-k=\"name\" value=\"'+esc(B.name)+'\">':'<span class=\"offer-head-name\">'+esc(B.name)+'</span>')+'</div></div>'};"""
if old not in s: raise SystemExit('head helper missing')
s=s.replace(old,new,1)
s=s.replace("const anyTrial=probOn(A)||probOn(B),open=shouldOpenBenefits(A)||shouldOpenBenefits(B);","const anyTrial=probOn(A)||probOn(B),open=benefitsWasOpen||shouldOpenBenefits(A)||shouldOpenBenefits(B);",1)
s=s.replace("let html='<div class=\"offer-matrix\">'+head();","let html='<div class=\"offer-matrix\">'+head(true);",1)
s=s.replace("<div class=\"offer-matrix\">'+head();","<div class=\"offer-matrix\">'+head(false);",1)
# Static header names need the same visual weight as editable names.
needle='.offer-mcell .name-in:focus{outline:none;border-bottom-color:var(--moss)}'
if needle not in s: raise SystemExit('name style target missing')
s=s.replace(needle,needle+'.offer-head-name{display:block;font-family:var(--serif);font-size:16px;font-weight:600;color:var(--ink);padding:2px 0 5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',1)
needle2='.offer-mcell .name-in{font-size:13px}'
if needle2 not in s: raise SystemExit('mobile name style target missing')
s=s.replace(needle2,needle2+'.offer-head-name{font-size:13px}',1)
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
