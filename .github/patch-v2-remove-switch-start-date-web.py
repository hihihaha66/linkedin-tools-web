from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

def rep(old,new,label):
    global s
    if old not in s: raise SystemExit('Missing target: '+label)
    s=s.replace(old,new,1)

# Remove the concept from state; old saved JSON is migrated by discarding the obsolete field.
rep('function blankSwitch(){return{enabled:false,targetOffer:"0",asOfDate:"",lastWorkingDate:"",currentBonusIfStay:null,currentBonusRule:"unknown",currentBonusPayDate:"",currentBonusIfLeave:null,onboardDate:"",newBonusRule:"unknown",newBonusCustom:null,currentNet:null}}',
    'function blankSwitch(){return{enabled:false,targetOffer:"0",lastWorkingDate:"",currentBonusIfStay:null,currentBonusRule:"unknown",currentBonusPayDate:"",currentBonusIfLeave:null,onboardDate:"",newBonusRule:"unknown",newBonusCustom:null,currentNet:null}}',
    'blank switching state')
rep('function ensureSwitching(x){const s=Object.assign(blankSwitch(),x||{});s.enabled=s.enabled===true;',
    'function ensureSwitching(x){const s=Object.assign(blankSwitch(),x||{});delete s.asOfDate;s.enabled=s.enabled===true;',
    'switching migration')

# Explain the comparison using the real decision point: after the current job ends.
s=s.replace(
    'So tổng quy đổi của hai phương án từ ngày bạn chọn đến 31/12: ở lại công ty hiện tại, hoặc nghỉ rồi sang offer mới. Mặc định “Tính từ ngày” là hôm nay, nhưng bạn có thể chọn ngày trong quá khứ để xem lại một quyết định cũ.',
    'So phần còn lại của năm từ ngày sau khi bạn nghỉ đến 31/12: nếu ở lại công ty hiện tại thì nhận bao nhiêu, còn nếu nghỉ rồi sang offer mới thì nhận bao nhiêu. Phần trước ngày nghỉ giống nhau ở hai phương án nên không cần tính lại.'
)

# Remove the visible start-date input completely.
old_field="""  +'<div class=\"field\"><label>Tính từ ngày</label><input type=\"date\" data-sw=\"asOfDate\" value=\"'+esc(sw.asOfDate||localToday())+'\"><p class=\"benefit-note\">Mặc định là hôm nay. Muốn xem lại một lần chuyển việc cũ thì chọn ngày bắt đầu trong quá khứ.</p></div>'
"""
if old_field not in s: raise SystemExit('visible start-date field missing')
s=s.replace(old_field,'',1)

rep("+'<p class=\"benefit-note switch-wide\"><b>Cách tính:</b> Tool dùng “Tính từ ngày” làm mốc, quy đổi ngày lẻ theo net tháng ÷ 30, tính net thử việc trước rồi net chính thức sau đó. OT và thưởng hiệu suất không được tự cộng vào phép so đến 31/12 hay hòa vốn.</p>'",
    "+'<p class=\"benefit-note switch-wide\"><b>Cách tính:</b> Phép so bắt đầu từ ngày sau Last working day - lúc hai phương án bắt đầu khác nhau. Ngày lẻ được quy đổi theo net tháng ÷ 30; bên mới tính net thử việc trước rồi net chính thức sau đó. OT và thưởng hiệu suất không được tự cộng vào phép so đến 31/12 hay hòa vốn.</p>'",
    'switch calculation helper')

# Stop generating/persisting/sending a technical start date.
rep('function localToday(){const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day}\n','', 'localToday helper')
rep(' const payload=JSON.parse(JSON.stringify(state));if(payload.switching&&payload.switching.enabled&&!payload.switching.asOfDate)payload.switching.asOfDate=localToday();const body=JSON.stringify(payload);',
    ' const body=JSON.stringify(state);',
    'calculation payload')
rep('document.getElementById("switchEnabledSeg").addEventListener("click",function(e){const b=e.target.closest("button");if(!b)return;state.switching.enabled=b.getAttribute("data-v")==="on";if(state.switching.enabled&&!state.switching.asOfDate)state.switching.asOfDate=localToday();markDirty();renderSwitchingInputs();scheduleCalculation()});',
    'document.getElementById("switchEnabledSeg").addEventListener("click",function(e){const b=e.target.closest("button");if(!b)return;state.switching.enabled=b.getAttribute("data-v")==="on";markDirty();renderSwitchingInputs();scheduleCalculation()});',
    'switch enable handler')
rep('if(k==="currentBonusRule"||k==="newBonusRule"||k==="asOfDate"||k==="lastWorkingDate"||k==="onboardDate")renderSwitchingInputs();',
    'if(k==="currentBonusRule"||k==="newBonusRule"||k==="lastWorkingDate"||k==="onboardDate")renderSwitchingInputs();',
    'switch date rerender')

# Safety check: this concept must be absent from the production HTML/JS.
for forbidden in ['data-sw="asOfDate"','<label>Tính từ ngày</label>','payload.switching.asOfDate','localToday()']:
    if forbidden in s: raise SystemExit('Obsolete start-date concept still present: '+forbidden)

# Re-pin CSP after inline JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
