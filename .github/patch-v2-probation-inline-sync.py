from pathlib import Path
import hashlib,base64,re
p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

old=""" const probOn=function(o){return o.probationEnabled==='yes'};
 const probMonthCell=function(o,i){if(!probOn(o))return dash;const raw=hasInput(o.probMon)?Number(String(o.probMon).replace(/,/g,'')):null,invalid=raw!=null&&(!Number.isFinite(raw)||raw<=0),help=invalid?'<p class=\"benefit-note\" style=\"color:var(--clay);font-weight:600\">Số tháng thử việc phải lớn hơn 0.</p>':(!hasInput(o.probMon)?'<p class=\"benefit-note\">Khi chọn Có, số tháng thử việc cần lớn hơn 0.</p>':'');return textInput(i,'probMon',o,'vd 2','decimal',false,'',invalid?'aria-invalid=\"true\"':'')+help};
"""
new=""" const probOn=function(o){return o.probationEnabled==='yes'};
 const probMonthState=function(v){if(!hasInput(v))return{kind:'empty',text:'Khi chọn Có, số tháng thử việc cần lớn hơn 0.'};const n=Number(String(v).replace(/,/g,''));if(!Number.isFinite(n)||n<=0)return{kind:'invalid',text:'Số tháng thử việc phải lớn hơn 0.'};return{kind:'valid',text:''}};
 const probMonthCell=function(o,i){if(!probOn(o))return dash;const st=probMonthState(o.probMon),invalid=st.kind==='invalid';return textInput(i,'probMon',o,'vd 2','decimal',false,'',invalid?'aria-invalid=\"true\"':'')+'<p class=\"benefit-note probmon-help\" data-probmon-help=\"'+i+'\" style=\"'+(invalid?'color:var(--clay);font-weight:600':(st.kind==='valid'?'display:none':''))+'\">'+st.text+'</p>'};
"""
if old not in s: raise SystemExit('probMonthCell target missing')
s=s.replace(old,new,1)

insert_after="""function renderInputs(){
"""
# helper must live outside renderInputs for the input event listener
helper="""function syncProbMonthInline(el,i){
 const help=document.querySelector('[data-probmon-help="'+i+'"]');if(!help)return;
 const raw=el.value,has=String(raw==null?'':raw).trim()!=='';const n=has?Number(String(raw).replace(/,/g,'')):null;
 const invalid=has&&(!Number.isFinite(n)||n<=0);
 if(invalid){el.setAttribute('aria-invalid','true');help.textContent='Số tháng thử việc phải lớn hơn 0.';help.style.display='';help.style.color='var(--clay)';help.style.fontWeight='600';return}
 el.removeAttribute('aria-invalid');help.style.color='';help.style.fontWeight='';
 if(!has){help.textContent='Khi chọn Có, số tháng thử việc cần lớn hơn 0.';help.style.display='';return}
 help.textContent='';help.style.display='none';
}

"""
if insert_after not in s: raise SystemExit('renderInputs marker missing')
s=s.replace(insert_after,helper+insert_after,1)

old_listener=""" if(moneyField){const f=grp(el.value);el.value=f;state.offers[i][k]=f.replace(/,/g,\"\")}else state.offers[i][k]=el.value;
 markDirty();scheduleCalculation();if(k===\"name\"){document.querySelectorAll('[data-offer-head=\"'+i+'\"]').forEach(x=>x.textContent=state.offers[i].name);renderSwitchingInputs();}
"""
new_listener=""" if(moneyField){const f=grp(el.value);el.value=f;state.offers[i][k]=f.replace(/,/g,\"\")}else state.offers[i][k]=el.value;
 if(k===\"probMon\")syncProbMonthInline(el,i);
 markDirty();scheduleCalculation();if(k===\"name\"){document.querySelectorAll('[data-offer-head=\"'+i+'\"]').forEach(x=>x.textContent=state.offers[i].name);renderSwitchingInputs();}
"""
if old_listener not in s: raise SystemExit('input listener target missing')
s=s.replace(old_listener,new_listener,1)

start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
