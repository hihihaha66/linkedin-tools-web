from pathlib import Path
import re


def sub_once(text, pattern, repl, label, flags=0):
    new, n = re.subn(pattern, repl, text, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {n}')
    return new

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

s=s.replace('Gói 12 tháng đầu','Gói 12 tháng chuẩn hóa')
s=s.replace('gói 12 tháng đầu','gói 12 tháng chuẩn hóa')
s=s.replace('gói đó','gói đó')
s=s.replace('Mốc tối thiểu theo luật: 150% ngày thường, 200% ngày nghỉ hằng tuần, 300% lễ/Tết.','Mốc OT ban ngày tối thiểu theo luật: 150% ngày thường, 200% ngày nghỉ hằng tuần, 300% lễ/Tết.')
s=s.replace('<b>Tham số đang dùng cho 2026:</b> Tiền lương làm thêm giờ được miễn PIT trong kỳ tính thuế 2026.','<b>Tham số đang dùng:</b> Tool dùng các tham số hiện hành từ 01/07/2026. Tiền lương làm thêm giờ được miễn PIT trong kỳ tính thuế 2026.')
s=s.replace('căn cứ BHXH/BHYT tối đa 50,6 triệu/tháng;','căn cứ BHXH/BHYT tối đa 50,6 triệu/tháng từ 01/07/2026;')
s=s.replace('download("net-cao-hon-v2-sao-luu.json"','download("net-cao-hon-v2-du-lieu.json"')

# Privacy wording: explain server calculation vs browser save.
s=s.replace('Đây là công cụ mô phỏng để so sánh, không thay thế tư vấn payroll/pháp lý.', 'Đây là công cụ mô phỏng để so sánh, không thay thế tư vấn payroll/pháp lý. Dữ liệu được gửi tới máy chủ để tính toán nhưng website không chủ động lưu vào cơ sở dữ liệu; nếu bấm Lưu, dữ liệu được giữ trên trình duyệt của bạn.')

# Make switching defaults non-assumptive and migrate the old active-at-payout choice.
s=s.replace('function blankSwitch(){return{enabled:false,targetOffer:"0",lastWorkingDate:"",currentBonusIfStay:null,currentBonusRule:"time",currentBonusPayDate:"",currentBonusIfLeave:null,onboardDate:"",newBonusRule:"time",newBonusCustom:null,currentNet:null}}',
'''function blankSwitch(){return{enabled:false,targetOffer:"0",lastWorkingDate:"",currentBonusIfStay:null,currentBonusRule:"unknown",currentBonusPayDate:"",currentBonusIfLeave:null,onboardDate:"",newBonusRule:"unknown",newBonusCustom:null,currentNet:null}}''')

s=sub_once(s,
 r'function ensureSwitching\(x\)\{.*?return s\}',
 '''function ensureSwitching(x){const s=Object.assign(blankSwitch(),x||{});s.enabled=s.enabled===true;s.targetOffer=s.targetOffer==="1"?"1":"0";if(s.currentBonusRule==="active"){const l=String(s.lastWorkingDate||"").slice(0,10),p=String(s.currentBonusPayDate||"").slice(0,10);s.currentBonusRule=l&&p?(l>=p?"full":"lost"):"unknown"}if(!["unknown","lost","time","full","custom"].includes(s.currentBonusRule))s.currentBonusRule="unknown";if(!["unknown","time","full","none","custom"].includes(s.newBonusRule))s.newBonusRule="unknown";return s}''',
 'ensureSwitching')

new_render=r'''function renderSwitchingInputs(){
 const sw=state.switching=ensureSwitching(state.switching);
 const seg=document.getElementById("switchEnabledSeg");[].forEach.call(seg.children,b=>b.classList.toggle("on",b.getAttribute("data-v")===(sw.enabled?"on":"off")));
 const box=document.getElementById("switchFields");
 if(!sw.enabled){box.style.display="none";box.innerHTML="";return}
 box.style.display="block";
 const oldExtra=sw.currentBonusRule==="custom"?'<div class="field suffix-row"><label>Số thưởng bạn dự kiến vẫn nhận được khi nghỉ</label><input type="text" data-sw="currentBonusIfLeave" inputmode="numeric" placeholder="vd 10,000,000" value="'+grp(sw.currentBonusIfLeave==null?"":sw.currentBonusIfLeave)+'"><span class="suffix">đ</span></div>':'';
 const newExtra=sw.newBonusRule==="custom"?'<div class="field suffix-row"><label>Số thưởng đảm bảo dự kiến nhận trong năm onboard</label><input type="text" data-sw="newBonusCustom" inputmode="numeric" placeholder="vd 5,000,000" value="'+grp(sw.newBonusCustom==null?"":sw.newBonusCustom)+'"><span class="suffix">đ</span></div>':'';
 const oldMonth=sw.lastWorkingDate?Number(String(sw.lastWorkingDate).slice(5,7)):null;
 const newMonth=sw.onboardDate?Number(String(sw.onboardDate).slice(5,7)):null;
 const oldHelp=sw.currentBonusRule==="time"?(oldMonth?'Nghỉ tháng '+oldMonth+' → tool tạm tính '+oldMonth+'/12 khoản thưởng. Chỉ chọn cách này nếu chính sách công ty tính theo thời gian làm việc.':'Tool sẽ tạm tính theo số tháng đã làm trong năm. Chỉ chọn cách này nếu chính sách công ty thực sự tính như vậy.'):(sw.currentBonusRule==="unknown"?'Nếu chưa biết chính sách khi nghỉ, cứ để “Chưa rõ”. Tool sẽ không tự đoán khoản thưởng này.':'');
 const newHelp=sw.newBonusRule==="time"?(newMonth?'Onboard tháng '+newMonth+' → tool tạm tính '+(13-newMonth)+'/12 khoản thưởng đảm bảo. Chỉ chọn cách này nếu HR/chính sách công ty tính thưởng năm đầu theo thời gian làm việc.':'Tool sẽ tạm tính theo số tháng từ tháng onboard đến hết năm. Chỉ chọn nếu chính sách công ty thực sự tính như vậy.'):(sw.newBonusRule==="unknown"?'Nếu HR chưa nói rõ thưởng năm đầu, cứ để “Chưa rõ”.':'');
 box.innerHTML='<div class="switch-grid">'
  +'<div class="field"><label>Chuyển sang offer</label><select data-sw="targetOffer"><option value="0" '+(sw.targetOffer!=="1"?"selected":"")+'>'+esc(state.offers[0].name||"Offer A")+'</option><option value="1" '+(sw.targetOffer==="1"?"selected":"")+'>'+esc(state.offers[1].name||"Offer B")+'</option></select></div>'
  +'<div class="field suffix-row"><label>Net hiện tại / tháng <span style="font-size:11px">(để tính khoảng nghỉ & hòa vốn)</span></label><input type="text" data-sw="currentNet" inputmode="numeric" placeholder="có thể để trống" value="'+grp(sw.currentNet==null?"":sw.currentNet)+'"><span class="suffix">đ</span></div>'
  +'<div class="field"><label>Ngày làm việc cuối cùng ở công ty hiện tại</label><input type="date" data-sw="lastWorkingDate" value="'+esc(sw.lastWorkingDate||"")+'"></div>'
  +'<div class="field"><label>Ngày onboard công ty mới</label><input type="date" data-sw="onboardDate" value="'+esc(sw.onboardDate||"")+'"></div>'
  +'<div class="field suffix-row"><label>Nếu ở lại, khoản thưởng gần nhất bạn dự kiến nhận về tay</label><input type="text" data-sw="currentBonusIfStay" inputmode="numeric" placeholder="có thể để trống" value="'+grp(sw.currentBonusIfStay==null?"":sw.currentBonusIfStay)+'"><span class="suffix">đ</span></div>'
  +'<div class="field"><label>Nếu nghỉ vào ngày trên, khoản thưởng này sẽ thế nào?</label><select data-sw="currentBonusRule"><option value="unknown" '+(sw.currentBonusRule==="unknown"?"selected":"")+'>Chưa rõ</option><option value="lost" '+(sw.currentBonusRule==="lost"?"selected":"")+'>Mất toàn bộ</option><option value="time" '+(sw.currentBonusRule==="time"?"selected":"")+'>Nhận theo thời gian đã làm</option><option value="full" '+(sw.currentBonusRule==="full"?"selected":"")+'>Vẫn nhận đủ</option><option value="custom" '+(sw.currentBonusRule==="custom"?"selected":"")+'>Tôi biết số sẽ nhận</option></select>'+(oldHelp?'<p class="benefit-note">'+esc(oldHelp)+'</p>':'')+'</div>'
  +oldExtra
  +'<div class="field"><label>Trong năm onboard, thưởng đảm bảo ở công ty mới sẽ thế nào?</label><select data-sw="newBonusRule"><option value="unknown" '+(sw.newBonusRule==="unknown"?"selected":"")+'>Chưa rõ</option><option value="time" '+(sw.newBonusRule==="time"?"selected":"")+'>Theo số tháng làm</option><option value="full" '+(sw.newBonusRule==="full"?"selected":"")+'>Nhận đủ</option><option value="none" '+(sw.newBonusRule==="none"?"selected":"")+'>Không nhận</option><option value="custom" '+(sw.newBonusRule==="custom"?"selected":"")+'>Tôi biết số sẽ nhận</option></select>'+(newHelp?'<p class="benefit-note">'+esc(newHelp)+'</p>':'')+'</div>'
  +newExtra
  +'<p class="benefit-note switch-wide">Hòa vốn dùng net hiện tại, net thử việc nếu có và net chính thức sau thử việc. Tool không mặc định cộng OT hay thưởng hiệu suất vào hòa vốn.</p>'
  +'</div>';
}
'''
s=sub_once(s,r'function renderSwitchingInputs\(\)\{.*?\n\}\n\nfunction applyResult',new_render+'\nfunction applyResult','renderSwitchingInputs',re.S)

# Make the copy around the switching module say what it is for, in normal language.
s=s.replace('Dùng khi bạn đang có việc và muốn tính thêm khoản thưởng có thể bỏ lại, thưởng ở công ty mới trong năm onboard và khoảng trống giữa hai công việc.', 'Dùng khi bạn muốn biết nghỉ lúc này có thể bỏ lại bao nhiêu tiền, sang chỗ mới nhận được gì trong năm onboard và mất bao lâu để bù lại phần hụt ban đầu.')

p.write_text(s)

# Landing page should open V2, not V1.
i=Path('index.html')
z=i.read_text()
z=z.replace('href="net-cao-hon-co-that-tot-hon.html"','href="net-cao-hon-co-that-tot-hon-v2.html"',1)
i.write_text(z)
