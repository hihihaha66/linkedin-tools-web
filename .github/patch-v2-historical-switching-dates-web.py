from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

def rep(old,new,label):
    global s
    if old not in s: raise SystemExit('Missing target: '+label)
    s=s.replace(old,new,1)

rep('function blankSwitch(){return{enabled:false,targetOffer:"0",lastWorkingDate:"",currentBonusIfStay:null,currentBonusRule:"unknown",currentBonusPayDate:"",currentBonusIfLeave:null,onboardDate:"",newBonusRule:"unknown",newBonusCustom:null,currentNet:null}}',
    'function blankSwitch(){return{enabled:false,targetOffer:"0",asOfDate:"",lastWorkingDate:"",currentBonusIfStay:null,currentBonusRule:"unknown",currentBonusPayDate:"",currentBonusIfLeave:null,onboardDate:"",newBonusRule:"unknown",newBonusCustom:null,currentNet:null}}',
    'blank switching shape')

rep('So tổng quy đổi của hai phương án từ hôm nay đến 31/12: ở lại công ty hiện tại, hoặc nghỉ vào ngày bạn chọn rồi sang offer mới. Sau đó tool mới ước tính mất bao lâu để bù lại phần hụt khi chuyển việc.',
    'So tổng quy đổi của hai phương án từ ngày bạn chọn đến 31/12: ở lại công ty hiện tại, hoặc nghỉ rồi sang offer mới. Mặc định “Tính từ ngày” là hôm nay, nhưng bạn có thể chọn ngày trong quá khứ để xem lại một quyết định cũ.',
    'switch intro')

old="""  +'<div class="field"><label>Chuyển sang offer</label><select data-sw="targetOffer"><option value="0" '+(sw.targetOffer!=="1"?"selected":"")+'>'+esc(state.offers[0].name||"Offer A")+'</option><option value="1" '+(sw.targetOffer==="1"?"selected":"")+'>'+esc(state.offers[1].name||"Offer B")+'</option></select></div>'
  +'<div class="field suffix-row"><label>Net hiện tại / tháng <span style="font-size:11px">(để so đến 31/12 & hòa vốn)</span></label><input type="text" data-sw="currentNet" inputmode="numeric" placeholder="cần để so cuối năm" value="'+grp(sw.currentNet==null?"":sw.currentNet)+'"><span class="suffix">đ</span></div>'
"""
new="""  +'<div class="field"><label>Chuyển sang offer</label><select data-sw="targetOffer"><option value="0" '+(sw.targetOffer!=="1"?"selected":"")+'>'+esc(state.offers[0].name||"Offer A")+'</option><option value="1" '+(sw.targetOffer==="1"?"selected":"")+'>'+esc(state.offers[1].name||"Offer B")+'</option></select></div>'
  +'<div class="field"><label>Tính từ ngày</label><input type="date" data-sw="asOfDate" value="'+esc(sw.asOfDate||localToday())+'"><p class="benefit-note">Mặc định là hôm nay. Muốn xem lại một lần chuyển việc cũ thì chọn ngày bắt đầu trong quá khứ.</p></div>'
  +'<div class="field suffix-row"><label>Net hiện tại / tháng <span style="font-size:11px">(để so đến 31/12 & hòa vốn)</span></label><input type="text" data-sw="currentNet" inputmode="numeric" placeholder="cần để so cuối năm" value="'+grp(sw.currentNet==null?"":sw.currentNet)+'"><span class="suffix">đ</span></div>'
"""
rep(old,new,'switch as-of input')

rep("+'<p class=\"benefit-note switch-wide\"><b>Cách tính:</b> Tool lấy ngày hôm nay trên thiết bị của bạn làm mốc, quy đổi ngày lẻ theo net tháng ÷ 30, tính net thử việc trước rồi net chính thức sau đó. OT và thưởng hiệu suất không được tự cộng vào phép so đến 31/12 hay hòa vốn.</p>'",
    "+'<p class=\"benefit-note switch-wide\"><b>Cách tính:</b> Tool dùng “Tính từ ngày” làm mốc, quy đổi ngày lẻ theo net tháng ÷ 30, tính net thử việc trước rồi net chính thức sau đó. OT và thưởng hiệu suất không được tự cộng vào phép so đến 31/12 hay hòa vốn.</p>'",
    'switch calculation helper')

rep('document.getElementById("switchEnabledSeg").addEventListener("click",function(e){const b=e.target.closest("button");if(!b)return;state.switching.enabled=b.getAttribute("data-v")==="on";markDirty();renderSwitchingInputs();scheduleCalculation()});',
    'document.getElementById("switchEnabledSeg").addEventListener("click",function(e){const b=e.target.closest("button");if(!b)return;state.switching.enabled=b.getAttribute("data-v")==="on";if(state.switching.enabled&&!state.switching.asOfDate)state.switching.asOfDate=localToday();markDirty();renderSwitchingInputs();scheduleCalculation()});',
    'switch enable default date')

rep('if(k==="currentBonusRule"||k==="newBonusRule"||k==="lastWorkingDate"||k==="onboardDate")renderSwitchingInputs();',
    'if(k==="currentBonusRule"||k==="newBonusRule"||k==="asOfDate"||k==="lastWorkingDate"||k==="onboardDate")renderSwitchingInputs();',
    'switch date rerender')

rep('const payload=JSON.parse(JSON.stringify(state));if(payload.switching&&payload.switching.enabled)payload.switching.asOfDate=localToday();const body=JSON.stringify(payload);',
    'const payload=JSON.parse(JSON.stringify(state));if(payload.switching&&payload.switching.enabled&&!payload.switching.asOfDate)payload.switching.asOfDate=localToday();const body=JSON.stringify(payload);',
    'preserve selected as-of date')

# Re-pin CSP after editing inline JS.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
