from pathlib import Path


def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing patch target: {label}")
    return text.replace(old, new, 1)


p = Path("net-cao-hon-co-that-tot-hon-v2.html")
s = p.read_text()

s = rep(s,
'Chỉ dùng để mô phỏng khoản hưởng chế độ ốm đau ở mục “Nếu có biến cố”. Không ảnh hưởng lương net hay gói thu nhập.',
'Chỉ dùng để mô phỏng khoản hưởng chế độ ốm đau hưởng BHXH ở mục “Nếu có biến cố”. Không ảnh hưởng lương net hay gói thu nhập.',
'sick benefit wording')

s = rep(s,
'176h/tháng là giả định so sánh. Đi lại và OT được cộng vào time cost. Ngày phép hưởng lương chỉ làm giảm thời gian bạn bỏ ra - không cộng thành một khoản tiền mới.',
'176h/tháng là giả định so sánh. Đi lại và OT được cộng vào tổng thời gian bạn bỏ ra. Nếu OT có lương, tool ước tính thêm tiền OT từ số giờ và hệ số bạn nhập. Ngày phép hưởng lương chỉ làm giảm thời gian bạn bỏ ra - không cộng thành một khoản tiền mới.',
'Layer 3 helper')

s = rep(s,
'Ngày phép được dùng để điều chỉnh time cost, không cộng trực tiếp vào thu nhập năm. Phần thời điểm chuyển việc phụ thuộc chính sách thưởng thực tế của từng công ty.',
'Tiền OT là khoản ước tính từ lương gross, số giờ OT và hệ số bạn nhập; cách payroll thực tế có thể khác. Ngày phép được dùng để điều chỉnh time cost, không cộng trực tiếp vào thu nhập năm. Phần thời điểm chuyển việc phụ thuộc chính sách thưởng thực tế của từng công ty.',
'disclaimer OT')

s = rep(s,
'<b>Tham số đang dùng cho 2026:</b> PIT 5 bậc:',
'<b>Tham số đang dùng cho 2026:</b> Tiền lương làm thêm giờ được miễn PIT trong kỳ tính thuế 2026. PIT 5 bậc:',
'source OT tax')

s = rep(s,
'function blank(n){return{name:n,gross:null,payType:"gross",base:"full",customBase:null,days:null,commute:null,ot:null,probationEnabled:"no",probPct:null,probMon:null,probInsurance:"no",guaranteedBonusMonths:null,performanceBonusType:"months",performanceBonusValue:null,fixedAllowance:null,paidLeaveDays:null}}',
'function blank(n){return{name:n,gross:null,payType:"gross",base:"full",customBase:null,days:null,commute:null,ot:null,otPaid:"no",otFactor:null,probationEnabled:"no",probPct:null,probMon:null,probInsurance:"no",guaranteedBonusMonths:null,performanceBonusType:"months",performanceBonusValue:null,fixedAllowance:null,paidLeaveDays:null}}',
'blank OT')

s = rep(s,
' return{name:String(src.name||n),gross:src.gross??null,payType:src.payType==="net"?"net":"gross",base:src.base==="custom"?"custom":"full",customBase:src.customBase??null,days:src.days??null,commute:src.commute??null,ot:src.ot??null,\n  probationEnabled:',
' return{name:String(src.name||n),gross:src.gross??null,payType:src.payType==="net"?"net":"gross",base:src.base==="custom"?"custom":"full",customBase:src.customBase??null,days:src.days??null,commute:src.commute??null,ot:src.ot??null,otPaid:src.otPaid==="yes"?"yes":"no",otFactor:src.otFactor??null,\n  probationEnabled:',
'normalize OT')

s = rep(s,
'["probInsurance","probationEnabled","guaranteedBonusMonths","targetBonusMonths","performanceBonusValue","fixedAllowance","paidLeaveDays"]',
'["probInsurance","probationEnabled","guaranteedBonusMonths","targetBonusMonths","performanceBonusValue","fixedAllowance","paidLeaveDays","otPaid","otFactor"]',
'legacy OT keys')

s = rep(s,
'  const trialOn=o.probationEnabled==="yes";\n',
'''  const otPaid=o.otPaid==="yes";\n  const otPayBlock='<div style="margin:-2px 0 14px;padding:12px 11px 2px;background:var(--paper);border:1px solid var(--line);border-radius:8px"><label>OT có tính lương không?</label><div class="seg" data-seg="otPaid" data-i="'+i+'"><button data-v="no" class="'+(!otPaid?"on":"")+'">Không</button><button data-v="yes" class="'+(otPaid?"on":"")+'">Có</button></div>'+(otPaid?'<div class="field" style="margin-top:10px"><label>Hệ số OT</label><div class="suffix-row"><input type="text" data-i="'+i+'" data-k="otFactor" inputmode="decimal" placeholder="vd 150" value="'+(o.otFactor==null?"":esc(o.otFactor))+'"><span class="suffix">%</span></div></div>':'')+'<p class="benefit-note">OT luôn được cộng vào tổng thời gian bạn bỏ ra. Nếu công ty trả OT ngày thường 150% thì chọn Có và nhập 150 ở hệ số OT; tool dùng số giờ OT và hệ số này để ước tính tiền OT. Mốc tối thiểu theo luật: 150% ngày thường, 200% ngày nghỉ hằng tuần, 300% lễ/Tết.</p></div>';\n  const trialOn=o.probationEnabled==="yes";\n''',
'OT paid UI block')

s = rep(s,
'   +trial\n   +\'<details class="benefits"\'+open+\'><summary>Thưởng, phụ cấp & phúc lợi</summary><div class="benefits-body">\'',
'   +otPayBlock\n   +trial\n   +\'<details class="benefits"\'+open+\'><summary>Thưởng, phụ cấp & phúc lợi</summary><div class="benefits-body">\'',
'insert OT block')

s = rep(s,
' if(kind==="probationEnabled"){state.offers[i].probationEnabled=v;markDirty();renderInputs();scheduleCalculation();return}\n',
' if(kind==="otPaid"){state.offers[i].otPaid=v;markDirty();renderInputs();scheduleCalculation();return}\n if(kind==="probationEnabled"){state.offers[i].probationEnabled=v;markDirty();renderInputs();scheduleCalculation();return}\n',
'OT paid click')

p.write_text(s)
