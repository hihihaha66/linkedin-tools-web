from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

# Field-local helper for the exact 92đ defect class.
marker='''function renderSwitchingInputs(){
'''
helper='''function switchingCurrentNetStatus(v){
 const raw=String(v==null?'':v).replace(/,/g,'').trim();if(raw==='')return{kind:'empty',text:''};
 const n=Number(raw);if(!Number.isFinite(n)||n<=0)return{kind:'invalid',text:'Net hiện tại phải lớn hơn 0.'};
 if(n<1000000)return{kind:'warning',text:'Bạn đang nhập '+Math.round(n).toLocaleString('en-US')+'đ. Ô này nhập theo đồng. Ví dụ 22 triệu = 22,000,000đ.'};
 return{kind:'valid',text:''};
}
function syncSwitchCurrentNetInline(el){
 const help=document.querySelector('[data-current-net-help]');if(!el||!help)return;
 const st=switchingCurrentNetStatus(el.value),strong=st.kind==='invalid'||st.kind==='warning';
 if(st.kind==='invalid')el.setAttribute('aria-invalid','true');else el.removeAttribute('aria-invalid');
 help.textContent=st.text;help.style.display=st.text?'':'none';help.style.color=strong?'var(--clay)':'';help.style.fontWeight=strong?'600':'';
}

'''
if marker not in s: raise SystemExit('renderSwitchingInputs marker missing')
s=s.replace(marker,helper+marker,1)

old=""" const newMonth=sw.onboardDate?Number(String(sw.onboardDate).slice(5,7)):null;
 const oldHelp=sw.currentBonusRule==="time"?(oldMonth?'Nghỉ tháng '+oldMonth+' → tool tạm tính '+oldMonth+'/12 khoản thưởng. Chỉ chọn cách này nếu chính sách công ty tính theo thời gian làm việc.':'Tool sẽ tạm tính theo số tháng đã làm trong năm. Chỉ chọn cách này nếu chính sách công ty thực sự tính như vậy.'):(sw.currentBonusRule==="unknown"?'Nếu chưa biết chính sách khi nghỉ, cứ để “Chưa rõ”. Tool sẽ không tự đoán khoản thưởng này.':'');
"""
new=""" const newMonth=sw.onboardDate?Number(String(sw.onboardDate).slice(5,7)):null;
 const currentNetStatus=switchingCurrentNetStatus(sw.currentNet);
 const oldHelp=sw.currentBonusRule==="time"?(oldMonth?'Nghỉ tháng '+oldMonth+' → tool tạm tính '+oldMonth+'/12 khoản thưởng. Chỉ chọn cách này nếu chính sách công ty tính theo thời gian làm việc.':'Tool sẽ tạm tính theo số tháng đã làm trong năm. Chỉ chọn cách này nếu chính sách công ty thực sự tính như vậy.'):(sw.currentBonusRule==="unknown"?'Nếu chưa biết chính sách khi nghỉ, cứ để “Chưa rõ”. Tool sẽ không tự đoán khoản thưởng này.':'');
"""
if old not in s: raise SystemExit('switching helper anchor missing')
s=s.replace(old,new,1)

old='''  +'<div class="field suffix-row"><label>Net hiện tại / tháng <span style="font-size:11px">(để so đến 31/12 & hòa vốn)</span></label><input type="text" data-sw="currentNet" inputmode="numeric" placeholder="cần để so cuối năm" value="'+grp(sw.currentNet==null?"":sw.currentNet)+'"><span class="suffix">đ</span></div>'
'''
new='''  +'<div class="field suffix-row"><label>Net hiện tại / tháng <span style="font-size:11px">(để so đến 31/12 & hòa vốn)</span></label><input type="text" data-sw="currentNet" inputmode="numeric" placeholder="Ví dụ: 22,000,000" value="'+grp(sw.currentNet==null?"":sw.currentNet)+'" '+(currentNetStatus.kind==='invalid'?'aria-invalid="true"':'')+'><span class="suffix">đ</span><p class="benefit-note" data-current-net-help style="'+(currentNetStatus.text?((currentNetStatus.kind==='invalid'||currentNetStatus.kind==='warning')?'color:var(--clay);font-weight:600':''):'display:none')+'">'+esc(currentNetStatus.text)+'</p></div>'
'''
if old not in s: raise SystemExit('currentNet field target missing')
s=s.replace(old,new,1)

old='''swHost.addEventListener("input",function(e){const el=e.target,k=el.getAttribute("data-sw");if(!k||el.tagName==="SELECT")return;if(["currentBonusIfStay","currentBonusIfLeave","newBonusCustom","currentNet"].includes(k)){const f=grp(el.value);el.value=f;state.switching[k]=f.replace(/,/g,"")}else state.switching[k]=el.value;markDirty();scheduleCalculation()});
'''
new='''swHost.addEventListener("input",function(e){const el=e.target,k=el.getAttribute("data-sw");if(!k||el.tagName==="SELECT")return;if(["currentBonusIfStay","currentBonusIfLeave","newBonusCustom","currentNet"].includes(k)){const f=grp(el.value);el.value=f;state.switching[k]=f.replace(/,/g,"");if(k==="currentNet")syncSwitchCurrentNetInline(el)}else state.switching[k]=el.value;markDirty();scheduleCalculation()});
'''
if old not in s: raise SystemExit('switch input listener target missing')
s=s.replace(old,new,1)

# Refresh CSP hash after inline JS changes.
a=s.index('<script>')+len('<script>'); b=s.index('</script>',a)
digest=base64.b64encode(hashlib.sha256(s[a:b].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
