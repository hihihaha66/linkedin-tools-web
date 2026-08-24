from pathlib import Path
import re,base64,hashlib

HTML=Path('net-cao-hon-co-that-tot-hon-v3.html')
TEST=Path('tests/v3-current-offers-responsive.mjs')
s=HTML.read_text(); t=TEST.read_text()

def rep(old,new,label,count=1):
    global s
    if old not in s: raise SystemExit('missing HTML anchor: '+label)
    s=s.replace(old,new,count)

# Placeholder audit: keep examples, but spell them out consistently.
s=s.replace("'vd ","'Ví dụ: ").replace('"vd ','"Ví dụ: ')
# Current Job examples.
for old,new in [
    ("'7,500,000'","'Ví dụ: 7,500,000'"),("'30,000,000'","'Ví dụ: 30,000,000'"),
    ("'5','buổi'","'Ví dụ: 5','buổi'"),("'45','phút'","'Ví dụ: 45','phút'"),("'8','giờ'","'Ví dụ: 8','giờ'"),
    ("'20,000,000'","'Ví dụ: 20,000,000'"),("'1','tháng'","'Ví dụ: 1','tháng'"),
    ("perfAmount?'60,000,000':'2'","perfAmount?'Ví dụ: 60,000,000':'Ví dụ: 2'"),
    ("'1,000,000'","'Ví dụ: 1,000,000'"),("'12','ngày'","'Ví dụ: 12','ngày'"),
    ("'Giờ','h'","'Ví dụ: giờ','giờ'"),("'150','%'","'Ví dụ: 150','%'"),("'200','%'","'Ví dụ: 200','%'"),("'300','%'","'Ví dụ: 300','%'"),
]:
    s=s.replace(old,new)
# Switching custom amounts and solver target placeholders.
s=s.replace('placeholder="10,000,000"','placeholder="Ví dụ: 10,000,000"').replace('placeholder="5,000,000"','placeholder="Ví dụ: 5,000,000"')
s=s.replace("money(sol.targetMonthlyNet,'35,000,000')","money(sol.targetMonthlyNet,'Ví dụ: 35,000,000')")
s=s.replace("money(sol.targetAnnualFixed,'500,000,000')","money(sol.targetAnnualFixed,'Ví dụ: 500,000,000')")

# Product-language pass: remove developer wording from V3 UI.
s=s.replace('<p class="eyebrow">Baseline</p>','<p class="eyebrow">Mốc so sánh</p>')
s=s.replace('<b>Baseline:</b>','<b>Mốc so sánh:</b>').replace('thiếu baseline','thiếu mốc so sánh')
s=s.replace('từ profile Công việc hiện tại','từ thông tin Công việc hiện tại').replace('từ profile phía trên','từ thông tin phía trên')
s=s.replace('Bật Layer 6','Bật Lớp 6').replace('Layer 6 cần','Lớp 6 cần').replace('Layer 6','Lớp 6')
s=s.replace('target tài chính','mục tiêu tài chính').replace('target Net','mục tiêu Net').replace('target thu nhập','mục tiêu thu nhập')
s=s.replace('Cả hai - solve riêng từng cấu trúc','Cả hai - tính riêng từng cấu trúc')
s=s.replace('Nếu chọn Cả hai, backend giải hai threshold độc lập. Mỗi threshold giữ đúng BH, thử việc, thưởng, OT và phụ cấp của offer tương ứng.','Nếu chọn Cả hai, tool tính riêng mức sàn cho từng offer theo bảo hiểm, thử việc, thưởng, OT và phụ cấp đã nhập.')
s=s.replace('Nếu chọn Cả hai, backend giải hai threshold độc lập. Mỗi threshold giữ đúng BH, thử việc, thưởng, OT và phụ cấp của offer tương ứng.','Nếu chọn Cả hai, tool tính riêng mức sàn cho từng offer theo bảo hiểm, thử việc, thưởng, OT và phụ cấp đã nhập.')
s=s.replace('backend','tool').replace('threshold','mức sàn').replace('timeline mục tiêu','mốc thời gian mục tiêu')
s=s.replace('Input / rule','Dữ liệu / quy tắc').replace('input / rule','dữ liệu / quy tắc')
s=s.replace('driver','yếu tố').replace('decomposition','phân tích các yếu tố')

# Layer 6 title and intro use user-facing terminology only.
s=s.replace('Mức lương tối thiểu để đạt target tài chính','Mức lương tối thiểu để đạt mục tiêu tài chính')
s=s.replace('Baseline lấy trực tiếp từ “Công việc hiện tại”.','Mốc so sánh lấy trực tiếp từ “Công việc hiện tại”.')

# Dynamic onboarding-year label for the no-loss goal.
anchor='function renderSolverInputs(){'
helper="""function solverYearEndLabelV3(){
 const raw=String(state.switching&&state.switching.onboardDate||'');
 const m=/^(\\d{4})-\\d{2}-\\d{2}$/.exec(raw);
 return m?'31/12/'+m[1]:'31/12 của năm onboard';
}

"""
if anchor not in s: raise SystemExit('solver function anchor missing')
s=s.replace(anchor,helper+anchor,1)

# Exact Layer 6 wording agreed with the user.
old="""  +goal('goalNoLoss','Đến 31/12, chuyển việc không được thấp hơn ở lại','<div class=\"sub-input\"'+disabled('goalNoLoss')+'><label>Muốn hơn phương án ở lại ít nhất</label><div class=\"suffix-row\">'+money(sol.noLossBuffer,'0')+'<span class=\"suffix\">đ</span></div></div>')
  +goal('goalBreakEven','Hòa vốn trong mốc thời gian mục tiêu','<div class=\"sub-input\"'+disabled('goalBreakEven')+'><label>Hòa vốn trong</label><div class=\"suffix-row\"><input type=\"text\" data-sol=\"breakEvenMonths\" inputmode=\"decimal\" value=\"'+esc(sol.breakEvenMonths??6)+'\"><span class=\"suffix\">tháng</span></div></div>')
  +goal('goalMonthlyNet','Đạt mục tiêu Net / tháng','<div class=\"sub-input\"'+disabled('goalMonthlyNet')+'><label>Net tối thiểu</label><div class=\"suffix-row\">'+money(sol.targetMonthlyNet,'Ví dụ: 35,000,000')+'<span class=\"suffix\">đ</span></div></div>')
  +goal('goalAnnualFixed','Đạt mục tiêu thu nhập cố định / năm','<div class=\"sub-input\"'+disabled('goalAnnualFixed')+'><label>Thu nhập cố định tối thiểu</label><div class=\"suffix-row\">'+money(sol.targetAnnualFixed,'Ví dụ: 500,000,000')+'<span class=\"suffix\">đ</span></div></div>')
"""
new="""  +goal('goalNoLoss','Đến '+solverYearEndLabelV3()+', tổng thu nhập khi chuyển việc không thấp hơn ở lại','<div class=\"sub-input\"'+disabled('goalNoLoss')+'><label>Muốn cao hơn phương án ở lại ít nhất</label><div class=\"suffix-row\">'+money(sol.noLossBuffer,'0')+'<span class=\"suffix\">đ</span></div></div>')
  +goal('goalBreakEven','Bù hết phần hụt do chuyển việc trong','<div class=\"sub-input\"'+disabled('goalBreakEven')+'><label>Thời gian tối đa</label><div class=\"suffix-row\"><input type=\"text\" data-sol=\"breakEvenMonths\" inputmode=\"decimal\" value=\"'+esc(sol.breakEvenMonths??6)+'\"><span class=\"suffix\">tháng</span></div><p class=\"solver-note\">Tool ước tính phần hụt ban đầu từ khoảng nghỉ và thưởng bị mất, sau đó dùng chênh lệch Net hàng tháng để tính thời gian bù lại. OT và thưởng hiệu suất không được dùng để xác định mốc này.</p></div>')
  +goal('goalMonthlyNet','Đạt mục tiêu Net/tháng','<div class=\"sub-input\"'+disabled('goalMonthlyNet')+'><label>Net tối thiểu/tháng</label><div class=\"suffix-row\">'+money(sol.targetMonthlyNet,'Ví dụ: 35,000,000')+'<span class=\"suffix\">đ</span></div></div>')
  +goal('goalAnnualFixed','Đạt mục tiêu Net/năm','<div class=\"sub-input\"'+disabled('goalAnnualFixed')+'><label>Net tối thiểu/năm</label><div class=\"suffix-row\">'+money(sol.targetAnnualFixed,'Ví dụ: 500,000,000')+'<span class=\"suffix\">đ</span></div><p class=\"solver-note\">Gồm lương, phụ cấp cố định và thưởng đảm bảo sau bảo hiểm và thuế. Không gồm OT và thưởng hiệu suất.</p></div>')
"""
if old not in s:
    # Current source may still contain the original developer wording before the earlier replacements above; construct after-replacement variant explicitly.
    raise SystemExit('Layer 6 goal block anchor missing')
s=s.replace(old,new,1)

# The displayed year must refresh immediately when onboard date changes.
old="if(k===\"currentBonusRule\"||k===\"newBonusRule\"||k===\"lastWorkingDate\"||k===\"onboardDate\")renderSwitchingInputs();scheduleCalculation()"
new="if(k===\"currentBonusRule\"||k===\"newBonusRule\"||k===\"lastWorkingDate\"||k===\"onboardDate\"){renderSwitchingInputs();if(k===\"onboardDate\")renderSolverInputs()}scheduleCalculation()"
if old not in s: raise SystemExit('switch date rerender anchor missing')
s=s.replace(old,new,1)

# Static copy audit: no abbreviated example placeholders in V3 source after this pass.
if re.search(r"placeholder=\\?[\"']vd\\s",s,re.I) or "'vd " in s or '"vd ' in s:
    raise SystemExit('abbreviated vd placeholder remains')

# CSP hash follows JS changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start);js=s[start:end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
HTML.write_text(s)

# Browser QA: visible Layer 6 copy, dynamic year, placeholders, and no developer wording.
anchor="  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,current:document.querySelector('#currentBox').scrollWidth,solver:document.querySelector('#solverBox').scrollWidth}));if(overflow.scroll>overflow.inner+2)throw new Error(label+': horizontal overflow '+overflow.scroll+'>'+overflow.inner);"
extra=anchor+"""
  await page.locator('#solverEnabledSeg [data-v=\"on\"]').click();
  await page.locator('[data-sw=\"onboardDate\"]').fill('2027-01-05');await page.waitForTimeout(60);
  const copyAudit=await page.evaluate(()=>{
    const box=document.querySelector('#solverBox'),txt=box.innerText;
    const placeholders=[...document.querySelectorAll('#offersIn input[placeholder],#currentFields input[placeholder],#switchFields input[placeholder],#solverFields input[placeholder]')].map(x=>x.placeholder).filter(Boolean);
    return{txt,placeholders};
  });
  for(const must of ['31/12/2027','Bù hết phần hụt do chuyển việc trong','Đạt mục tiêu Net/tháng','Net tối thiểu/tháng','Đạt mục tiêu Net/năm','Net tối thiểu/năm','Tool ước tính phần hụt ban đầu từ khoảng nghỉ và thưởng bị mất','Gồm lương, phụ cấp cố định và thưởng đảm bảo sau bảo hiểm và thuế'])if(!copyAudit.txt.includes(must))throw new Error(label+': missing Layer 6 copy '+must);
  for(const bad of ['backend','threshold','baseline','timeline mục tiêu','target Net','target thu nhập'])if(copyAudit.txt.includes(bad))throw new Error(label+': developer wording leaked '+bad);
  for(const ph of copyAudit.placeholders){if(/^vd\\b/i.test(ph))throw new Error(label+': abbreviated placeholder '+ph);if(/^\\d[\\d,]*(?:\\.\\d+)?$/.test(ph))throw new Error(label+': numeric example placeholder missing “Ví dụ:” '+ph);}
"""
if anchor not in t: raise SystemExit('browser audit anchor missing')
t=t.replace(anchor,extra,1)
TEST.write_text(t)
print('PATCHED V3 placeholders + product copy + dynamic Layer 6 year')
