from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

def rep(old,new,label):
    global s
    if old not in s: raise SystemExit('Missing target: '+label)
    s=s.replace(old,new,1)

# Migration/state shape: when separate probation is enabled but percentage was never entered,
# surface the intended default explicitly as 100 instead of leaving a hidden blank.
old=""" const src=o||{},oldTrial=src.probationEnabled==null&&(hasPositiveValue(src.probPct)||hasPositiveValue(src.probMon)||src.probInsurance==="yes");
 return{name:String(src.name||n),gross:src.gross??null,payType:src.payType==="net"?"net":"gross",base:src.base==="custom"?"custom":"full",customBase:src.customBase??null,days:src.days??null,commute:src.commute??null,ot:src.ot??null,otPaid:src.otPaid==="yes"?"yes":"no",otFactor:src.otFactor??null,
  probationEnabled:(src.probationEnabled==="yes"||oldTrial)?"yes":"no",probPct:src.probPct??null,probMon:src.probMon??null,probInsurance:src.probInsurance==="yes"?"yes":"no",probJobType:["manager","college","intermediate","other"].includes(src.probJobType)?src.probJobType:"unknown",
"""
new=""" const src=o||{},oldTrial=src.probationEnabled==null&&(hasPositiveValue(src.probPct)||hasPositiveValue(src.probMon)||src.probInsurance==="yes"),trialEnabled=(src.probationEnabled==="yes"||oldTrial),probPct=(trialEnabled&&!hasInput(src.probPct)?100:(src.probPct??null));
 return{name:String(src.name||n),gross:src.gross??null,payType:src.payType==="net"?"net":"gross",base:src.base==="custom"?"custom":"full",customBase:src.customBase??null,days:src.days??null,commute:src.commute??null,ot:src.ot??null,otPaid:src.otPaid==="yes"?"yes":"no",otFactor:src.otFactor??null,
  probationEnabled:trialEnabled?"yes":"no",probPct,probMon:src.probMon??null,probInsurance:src.probInsurance==="yes"?"yes":"no",probJobType:["manager","college","intermediate","other"].includes(src.probJobType)?src.probJobType:"unknown",
"""
rep(old,new,'offer shape probation default')

# Clarify that the toggle controls whether probation needs separate financial treatment.
rep('<label>Có thử việc?</label><div class="seg" data-seg="probationEnabled" data-i="'+"i"+'">',
    '<label>Có giai đoạn thử việc cần tính riêng?</label><div class="seg" data-seg="probationEnabled" data-i="'+"i"+'">',
    'probation toggle label')

# Add a short helper immediately after the toggle row and put probation details before the OT pay block.
old_layout="""   +'<div class=\"duo\"><div class=\"field\"><label>OT (giờ / tuần)</label><input type=\"text\" data-i=\"'+i+'\" data-k=\"ot\" inputmode=\"decimal\" placeholder=\"0\" value=\"'+(o.ot==null?\"\":esc(o.ot))+'\"></div><div class=\"field\"><label>Có giai đoạn thử việc cần tính riêng?</label><div class=\"seg\" data-seg=\"probationEnabled\" data-i=\"'+i+'\"><button data-v=\"no\" class=\"'+(!trialOn?\"on\":\"\")+'\">Không</button><button data-v=\"yes\" class=\"'+(trialOn?\"on\":\"\")+'\">Có</button></div></div></div>'
   +otPayBlock
   +trial
"""
new_layout="""   +'<div class=\"duo\"><div class=\"field\"><label>OT (giờ / tuần)</label><input type=\"text\" data-i=\"'+i+'\" data-k=\"ot\" inputmode=\"decimal\" placeholder=\"0\" value=\"'+(o.ot==null?\"\":esc(o.ot))+'\"></div><div class=\"field\"><label>Có giai đoạn thử việc cần tính riêng?</label><div class=\"seg\" data-seg=\"probationEnabled\" data-i=\"'+i+'\"><button data-v=\"no\" class=\"'+(!trialOn?\"on\":\"\")+'\">Không</button><button data-v=\"yes\" class=\"'+(trialOn?\"on\":\"\")+'\">Có</button></div></div></div>'
   +'<p class=\"benefit-note\" style=\"margin:-6px 0 12px\">Chọn Không nếu không có thử việc, hoặc giai đoạn thử việc có lương và BH giống điều kiện chính thức nên không cần tách riêng. Nếu có khác biệt, chọn Có.</p>'
   +trial
   +otPayBlock
"""
rep(old_layout,new_layout,'probation layout order')

# 100% is a first-class, visible case. Months remain required when a separate period is selected.
old_trial="""  const trial=trialOn?'<div class=\"prob-wrap\"><div class=\"duo\"><div class=\"field\"><label>Lương thử việc (% mức lương offer)</label><input type=\"text\" data-i=\"'+i+'\" data-k=\"probPct\" inputmode=\"decimal\" placeholder=\"vd 85\" value=\"'+(o.probPct==null?\"\":esc(o.probPct))+'\"></div><div class=\"field\"><label>Số tháng thử việc</label><input type=\"text\" data-i=\"'+i+'\" data-k=\"probMon\" inputmode=\"decimal\" placeholder=\"vd 2\" value=\"'+(o.probMon==null?\"\":esc(o.probMon))+'\"></div></div><div class=\"field\"><label>Nhóm công việc <span style=\"font-size:11px\">(để kiểm tra thời gian thử việc)</span></label><select data-i=\"'+i+'\" data-k=\"probJobType\"><option value=\"unknown\" '+(o.probJobType===\"unknown\"?\"selected\":\"\")+'>Chưa rõ</option><option value=\"manager\" '+(o.probJobType===\"manager\"?\"selected\":\"\")+'>Quản lý doanh nghiệp</option><option value=\"college\" '+(o.probJobType===\"college\"?\"selected\":\"\")+'>Vị trí yêu cầu cao đẳng trở lên</option><option value=\"intermediate\" '+(o.probJobType===\"intermediate\"?\"selected\":\"\")+'>Trung cấp / công nhân kỹ thuật / nhân viên nghiệp vụ</option><option value=\"other\" '+(o.probJobType===\"other\"?\"selected\":\"\")+'>Công việc khác</option></select><p class=\"benefit-note\">Giới hạn luật tương ứng: 180 ngày, 60 ngày, 30 ngày hoặc 06 ngày làm việc. Tool dùng số tháng bạn nhập để cảnh báo gần đúng; nếu hợp đồng ghi ngày, hãy ưu tiên số ngày thực tế.</p></div><label>Trong thời gian thử việc có đóng BH bắt buộc?</label><div class=\"seg\" data-seg=\"probInsurance\" data-i=\"'+i+'\"><button data-v=\"no\" class=\"'+(o.probInsurance!==\"yes\"?\"on\":\"\")+'\">Không</button><button data-v=\"yes\" class=\"'+(o.probInsurance===\"yes\"?\"on\":\"\")+'\">Có</button></div><p class=\"benefit-note\">% thử việc được tính theo loại lương bạn đã chọn ở offer: Gross hoặc Net.</p></div>':'';"""
new_trial="""  const trial=trialOn?'<div class=\"prob-wrap\"><div class=\"duo\"><div class=\"field\"><label>Lương thử việc (% mức lương offer)</label><input type=\"text\" data-i=\"'+i+'\" data-k=\"probPct\" inputmode=\"decimal\" placeholder=\"100\" value=\"'+(o.probPct==null?\"100\":esc(o.probPct))+'\"><p class=\"benefit-note\">Hưởng đủ mức lương offer thì để 100%. Chỉ đổi khi lương thử việc thấp hơn.</p></div><div class=\"field\"><label>Số tháng thử việc</label><input type=\"text\" data-i=\"'+i+'\" data-k=\"probMon\" inputmode=\"decimal\" placeholder=\"vd 2\" value=\"'+(o.probMon==null?\"\":esc(o.probMon))+'\"></div></div><div class=\"field\"><label>Nhóm công việc <span style=\"font-size:11px\">(để kiểm tra thời gian thử việc)</span></label><select data-i=\"'+i+'\" data-k=\"probJobType\"><option value=\"unknown\" '+(o.probJobType===\"unknown\"?\"selected\":\"\")+'>Chưa rõ</option><option value=\"manager\" '+(o.probJobType===\"manager\"?\"selected\":\"\")+'>Quản lý doanh nghiệp</option><option value=\"college\" '+(o.probJobType===\"college\"?\"selected\":\"\")+'>Vị trí yêu cầu cao đẳng trở lên</option><option value=\"intermediate\" '+(o.probJobType===\"intermediate\"?\"selected\":\"\")+'>Trung cấp / công nhân kỹ thuật / nhân viên nghiệp vụ</option><option value=\"other\" '+(o.probJobType===\"other\"?\"selected\":\"\")+'>Công việc khác</option></select><p class=\"benefit-note\">Giới hạn luật tương ứng: 180 ngày, 60 ngày, 30 ngày hoặc 06 ngày làm việc. Tool dùng số tháng bạn nhập để cảnh báo gần đúng; nếu hợp đồng ghi ngày, hãy ưu tiên số ngày thực tế.</p></div><label>Trong thời gian thử việc có đóng BH bắt buộc?</label><div class=\"seg\" data-seg=\"probInsurance\" data-i=\"'+i+'\"><button data-v=\"no\" class=\"'+(o.probInsurance!==\"yes\"?\"on\":\"\")+'\">Không</button><button data-v=\"yes\" class=\"'+(o.probInsurance===\"yes\"?\"on\":\"\")+'\">Có</button></div><p class=\"benefit-note\">% thử việc được tính theo loại lương bạn đã chọn ở offer: Gross hoặc Net.</p></div>':'';"""
rep(old_trial,new_trial,'probation 100 percent UI')

# Clicking Yes should visibly initialize 100%, rather than creating a hidden missing value.
rep('if(kind==="probationEnabled"){state.offers[i].probationEnabled=v;markDirty();renderInputs();scheduleCalculation();return}',
    'if(kind==="probationEnabled"){state.offers[i].probationEnabled=v;if(v==="yes"&&!hasInput(state.offers[i].probPct))state.offers[i].probPct=100;markDirty();renderInputs();scheduleCalculation();return}',
    'probation toggle initialization')

# Re-pin CSP after inline JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
