from pathlib import Path
import re,base64,hashlib

HTML=Path('net-cao-hon-co-that-tot-hon-v3.html')
TEST=Path('tests/v3-current-offers-responsive.mjs')
s=HTML.read_text(); t=TEST.read_text()

# Replace the separate Current Job form-grid styling with the same matrix grammar used by Offer input.
old_css=".v3-current-fields{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}.v3-current-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px 14px}.v3-current-grid .wide{grid-column:1/-1}.v3-current-grid .field{margin:0}.v3-current-benefits{grid-column:1/-1;border:1px solid var(--line);border-radius:8px;padding:0 10px}.v3-current-benefits summary{cursor:pointer;color:var(--moss);font-weight:600;padding:9px 0}.v3-current-benefits-body{padding:2px 0 10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px}.v3-mini-pair{display:grid;grid-template-columns:minmax(0,1fr) 82px;gap:6px}"
new_css=".v3-current-fields{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}.v3-current-matrix .offer-mrow{grid-template-columns:minmax(160px,1.25fr) minmax(0,1fr)}.v3-current-matrix .offer-mcell{min-width:0}.v3-current-matrix .offer-mrow.head .offer-mcell{background:var(--paper-2)}.v3-current-matrix .offer-mnote{grid-column:1/-1}.v3-current-benefits{margin-top:10px}.v3-current-benefits .offer-matrix{border-radius:8px}.v3-current-benefits .benefits-body{padding:0 0 12px}.v3-current-matrix .current-ot-row[hidden]{display:none}.v3-current-matrix .ot-current-help{font-size:10.5px;line-height:1.45;margin:5px 0 0;color:var(--clay)}.v3-current-matrix .ot-current-help:empty{display:none}"
if old_css not in s: raise SystemExit('old Current Job grid CSS anchor missing')
s=s.replace(old_css,new_css,1)

old_media="@media(max-width:700px){.v3-section-head,.v3-offer-intro{display:block}.v3-section-actions,.v3-offer-count{width:auto;margin-top:10px}.v3-current-grid{grid-template-columns:1fr}.v3-current-grid .wide,.v3-current-benefits{grid-column:auto}.v3-current-benefits-body{grid-template-columns:1fr}.v3-summary-grid{grid-template-columns:1fr}"
new_media="@media(max-width:700px){.v3-section-head,.v3-offer-intro{display:block}.v3-section-actions,.v3-offer-count{width:auto;margin-top:10px}.v3-summary-grid{grid-template-columns:1fr}"
if old_media not in s: raise SystemExit('old Current Job responsive grid anchor missing')
s=s.replace(old_media,new_media,1)

old_mobile="@media(max-width:540px){.v3-current-box{padding:11px;margin:12px 0 16px}.v3-current-grid{gap:9px}.v3-current-benefits-body{gap:8px}.v3-mode-title"
new_mobile="@media(max-width:540px){.v3-current-box{padding:11px;margin:12px 0 16px}.v3-current-matrix .offer-mrow{grid-template-columns:minmax(104px,39%) minmax(0,61%)}.v3-current-matrix .offer-mlabel,.v3-current-matrix .offer-mcell{padding:9px 7px}.v3-current-matrix .offer-mrow.head .offer-mlabel,.v3-current-matrix .offer-mrow.head .offer-mcell{padding:8px 6px}.v3-current-matrix .ot-current-help{font-size:9.5px}.v3-mode-title"
if old_mobile not in s: raise SystemExit('old Current Job mobile CSS anchor missing')
s=s.replace(old_mobile,new_mobile,1)

# Replace renderCurrentInputs wholesale. Keep data-current/data-current-seg contracts so existing state/event logic continues to work.
start=s.index('function renderCurrentInputs(){')
end=s.index('function syncOfferCount()',start)
new_renderer=r'''function syncCurrentOtVisibility(){
 const o=state.currentJob,active=otNumber(o.otMonthly)>0,paid=active&&o.otPaid==='yes',mixed=paid&&o.otType==='mixed';
 const show=(kind,on)=>document.querySelectorAll('#currentFields [data-current-ot-row="'+kind+'"]').forEach(x=>x.hidden=!on);
 show('paid',active);show('type',paid);show('factor',paid&&!mixed);show('mixed-weekday',mixed);show('mixed-rest',mixed);show('mixed-holiday',mixed);show('base',paid);
 const guard=document.querySelector('#currentFields [data-current-ot-guard]');if(guard)guard.textContent=otGuardrailText(o);
 const factor=document.querySelector('#currentFields [data-current-ot-factor]');if(factor){const min=o.otType==='rest'?200:150;factor.textContent=otFactorText(o,'otFactor',min)}
 const mixedHelp=document.querySelector('#currentFields [data-current-ot-mixed]');if(mixedHelp)mixedHelp.textContent=otMixedText(o);
}

function renderCurrentInputs(){
 const host=document.getElementById('currentFields'),benefitsOpen=!!host.querySelector('.v3-current-benefits')?.open,seg=document.getElementById('currentEnabledSeg'),o=state.currentJob=ensureCurrent(state.currentJob);
 [].forEach.call(seg.children,b=>b.classList.toggle('on',b.getAttribute('data-v')===(state.currentJobEnabled?'on':'off')));
 host.style.display=state.currentJobEnabled?'':'none';if(!state.currentJobEnabled){host.innerHTML='';return}
 const sg=(k,val,opts,three=false)=>'<div class="seg'+(three?' three':'')+'" data-current-seg="'+k+'">'+opts.map(x=>'<button data-v="'+x[0]+'" class="'+(val===x[0]?'on':'')+'">'+x[1]+'</button>').join('')+'</div>';
 const inp=(k,v,ph,suf='',money=false)=>{const wide=suf&&String(suf).length>2?' unit-wide':'';return '<div class="suffix-row'+wide+'"><input type="text" data-current="'+k+'" inputmode="'+(money?'numeric':'decimal')+'" placeholder="'+ph+'" value="'+(money?grp(v==null?'':v):esc(v==null?'':v))+'">'+(suf?'<span class="suffix">'+suf+'</span>':'')+'</div>'};
 const row=(label,cell,note='',cls='',attrs='')=>'<div class="offer-mrow'+(cls?' '+cls:'')+'" '+attrs+'><div class="offer-mlabel">'+label+'</div><div class="offer-mcell">'+cell+'</div>'+(note?'<div class="offer-mnote">'+note+'</div>':'')+'</div>';
 const head=()=>'<div class="offer-mrow head"><div class="offer-mlabel">Chỉ tiêu</div><div class="offer-mcell"><input class="name-in" data-current="name" value="'+esc(o.name||'Công việc hiện tại')+'" aria-label="Tên công việc hiện tại"></div></div>';
 const bh='<div class="control-stack"><select data-current="bhMode"><option value="unknown" '+(o.bhMode==='unknown'?'selected':'')+'>Chưa rõ</option><option value="salary" '+(o.bhMode==='salary'?'selected':'')+'>Theo mức lương hiện tại</option><option value="custom" '+(o.bhMode==='custom'?'selected':'')+'>Tôi biết mức cụ thể</option></select>'+(o.bhMode==='custom'?'<div class="sub-input">'+inp('customBase',o.customBase,'Ví dụ: 7,500,000','đ',true)+'</div>':'')+'</div>';
 const perfAmount=o.performanceBonusType==='amount',active=otNumber(o.otMonthly)>0,paid=active&&o.otPaid==='yes',mixed=paid&&o.otType==='mixed',factorMin=o.otType==='rest'?200:150;
 let html='<div class="offer-matrix v3-current-matrix">'+head();
 html+=row('Lương hiện tại ghi theo',sg('payType',o.payType,[['gross','Gross (trước trừ)'],['net','Net (về tay)']]));
 html+=row('Lương / tháng',inp('gross',o.gross,'Ví dụ: 30,000,000','đ',true));
 html+=row('Công ty dùng mức nào để đóng BH?',bh);
 html+=row('Lên văn phòng / tuần',inp('days',o.days,'Ví dụ: 5','buổi'));
 html+=row('Di chuyển 1 chiều',inp('commute',o.commute,'Ví dụ: 45','phút'));
 html+=row('Làm thêm giờ (OT) trung bình / tháng',inp('otMonthly',o.otMonthly,'Ví dụ: 8','giờ')+'<p class="ot-current-help" data-current-ot-guard>'+esc(otGuardrailText(o))+'</p>','Tool cảnh báo theo mốc 40 giờ/tháng và quy đổi mức trung bình này ra 12 tháng để đối chiếu 200/300 giờ/năm. Không đủ dữ liệu để kiểm tra giới hạn theo từng ngày.');
 html+=row('OT có được trả tiền không?',sg('otPaid',o.otPaid,[['no','Không'],['yes','Có']]),'OT không lương vẫn được cộng vào tổng thời gian bạn bỏ ra.','current-ot-row','data-current-ot-row="paid"'+(active?'':' hidden'));
 html+=row('OT chủ yếu rơi vào','<select data-current="otType"><option value="weekday" '+(o.otType==='weekday'?'selected':'')+'>Ngày thường</option><option value="rest" '+(o.otType==='rest'?'selected':'')+'>Ngày nghỉ hằng tuần</option><option value="mixed" '+(o.otType==='mixed'?'selected':'')+'>Nhiều loại</option></select>','Ngày thường dùng mốc tối thiểu 150%; ngày nghỉ hằng tuần 200%. Chọn Nhiều loại nếu cần tách thêm ngày lễ/Tết.','current-ot-row','data-current-ot-row="type"'+(paid?'':' hidden'));
 html+=row('Hệ số OT',inp('otFactor',o.otFactor,'Ví dụ: '+factorMin,'%')+'<p class="ot-current-help" data-current-ot-factor>'+esc(otFactorText(o,'otFactor',factorMin))+'</p>','Tool điền mốc tối thiểu theo loại ngày; bạn có thể sửa nếu chính sách công ty áp dụng hệ số khác.','current-ot-row','data-current-ot-row="factor"'+(paid&&!mixed?'':' hidden'));
 html+=row('OT ngày thường','<div class="ot-mini-pair">'+inp('otBreakdownWeekday',o.otBreakdownWeekday,'Ví dụ: 4','giờ')+inp('otFactorWeekday',o.otFactorWeekday,'Ví dụ: 150','%')+'</div>','Nhập giờ/tháng và hệ số tương ứng.','current-ot-row','data-current-ot-row="mixed-weekday"'+(mixed?'':' hidden'));
 html+=row('OT ngày nghỉ hằng tuần','<div class="ot-mini-pair">'+inp('otBreakdownRest',o.otBreakdownRest,'Ví dụ: 4','giờ')+inp('otFactorRest',o.otFactorRest,'Ví dụ: 200','%')+'</div>','','current-ot-row','data-current-ot-row="mixed-rest"'+(mixed?'':' hidden'));
 html+=row('OT ngày lễ/Tết','<div class="ot-mini-pair">'+inp('otBreakdownHoliday',o.otBreakdownHoliday,'Ví dụ: 4','giờ')+inp('otFactorHoliday',o.otFactorHoliday,'Ví dụ: 300','%')+'</div><p class="ot-current-help" data-current-ot-mixed>'+esc(otMixedText(o))+'</p>','Tổng giờ của 3 loại phải bằng OT trung bình/tháng đã nhập.','current-ot-row','data-current-ot-row="mixed-holiday"'+(mixed?'':' hidden'));
 const otBase='<div class="control-stack"><select data-current="otBaseMode"><option value="offer" '+(o.otBaseMode==='offer'?'selected':'')+'>Ước tính theo lương hiện tại</option><option value="custom" '+(o.otBaseMode==='custom'?'selected':'')+'>Tôi biết mức cụ thể</option></select>'+(o.otBaseMode==='custom'?'<div class="sub-input">'+inp('otBaseAmount',o.otBaseAmount,'Ví dụ: 20,000,000','đ',true)+'</div><p class="benefit-note" style="margin-bottom:0">Nhập mức lương tháng công ty thực tế dùng để tính OT.</p>':'')+'</div>';
 html+=row('Mức lương dùng để tính OT',otBase,'Nếu không biết công ty dùng mức riêng nào, để “Ước tính theo lương hiện tại”.','current-ot-row','data-current-ot-row="base"'+(paid?'':' hidden'));
 html+='</div>';
 html+='<details class="benefits compare-benefits v3-current-benefits"'+(benefitsOpen?' open':'')+'><summary>Thưởng, phụ cấp & phúc lợi</summary><div class="benefits-body"><div class="offer-matrix v3-current-matrix">'+head();
 html+=row('Thưởng đảm bảo / năm (tháng lương)',inp('guaranteedBonusMonths',o.guaranteedBonusMonths,'Ví dụ: 1','tháng'),'Ví dụ tháng 13 chắc chắn nhận = 1. Khoản này dùng cùng loại Gross/Net của công việc hiện tại.');
 html+=row('Thưởng hiệu suất / năm','<div class="control-stack">'+sg('performanceBonusType',o.performanceBonusType,[['months','Tháng lương'],['amount','Số tiền']])+'<div class="sub-input">'+inp('performanceBonusValue',o.performanceBonusValue,perfAmount?'Ví dụ: 60,000,000':'Ví dụ: 2',perfAmount?'đ':'tháng',perfAmount)+'</div></div>','Nhập đúng cách công ty nêu khoản thưởng: ví dụ 2 tháng lương hoặc 60,000,000đ. Khoản này không được cộng vào “Thu nhập cố định”.');
 html+=row('Phụ cấp cố định ngoài mức lương trên / tháng',inp('fixedAllowance',o.fixedAllowance,'Ví dụ: 1,000,000','đ',true));
 html+=row('Phụ cấp này có tính vào căn cứ BH?',sg('allowanceBh',o.allowanceBh,[['unknown','Chưa rõ'],['yes','Có'],['no','Không']],true),'Nếu để “Chưa rõ”, tool tạm tính Có để tránh làm tiền về tay trông cao hơn thực tế. Nếu bạn chọn “Tôi biết mức cụ thể” ở phần BH phía trên, mức bạn nhập được ưu tiên.');
 html+=row('Nghỉ phép hưởng lương / năm',inp('paidLeaveDays',o.paidLeaveDays,'Ví dụ: 12','ngày'),'Ngày phép không được cộng thành “tiền thưởng”. Tool chỉ dùng phép để giảm số giờ bạn phải bỏ ra khi tính giá trị/giờ.');
 html+='</div></div></details>';
 host.innerHTML=html;syncCurrentOtVisibility();
}
'''
s=s[:start]+new_renderer+s[end:]

# Current OT values should reveal/hide progressive rows immediately while typing, without a re-render/focus loss.
old_handler="currentHost.addEventListener('input',function(e){const el=e.target,k=el.getAttribute('data-current');if(!k||el.tagName==='SELECT')return;const money=['gross','customBase','fixedAllowance','otBaseAmount'].includes(k)||(k==='performanceBonusValue'&&state.currentJob.performanceBonusType==='amount');if(money){const f=grp(el.value);el.value=f;state.currentJob[k]=f.replace(/,/g,'')}else state.currentJob[k]=el.value;if(k==='name'){renderSwitchingInputs();renderSolverInputs()}markDirty();scheduleCalculation()});"
new_handler="currentHost.addEventListener('input',function(e){const el=e.target,k=el.getAttribute('data-current');if(!k||el.tagName==='SELECT')return;const money=['gross','customBase','fixedAllowance','otBaseAmount'].includes(k)||(k==='performanceBonusValue'&&state.currentJob.performanceBonusType==='amount');if(money){const f=grp(el.value);el.value=f;state.currentJob[k]=f.replace(/,/g,'')}else state.currentJob[k]=el.value;if(k==='name'){renderSwitchingInputs();renderSolverInputs()}if(k==='otMonthly'||k.startsWith('otBreakdown')||k.startsWith('otFactor'))syncCurrentOtVisibility();markDirty();scheduleCalculation()});"
if old_handler not in s: raise SystemExit('Current Job input handler anchor missing')
s=s.replace(old_handler,new_handler,1)

# CSP hash follows JS changes.
js_start=s.index('<script>')+len('<script>');js_end=s.index('</script>',js_start);js=s[js_start:js_end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
HTML.write_text(s)

# Browser QA for visual grammar, row order, progressive OT and compact mobile geometry.
anchor="  if(!(await page.locator('#currentEnabledSeg [data-v=\"on\"]').evaluate(e=>e.classList.contains('on'))))throw new Error(label+': Current Job toggle did not persist');\n"
extra=anchor+"""  const currentMatrix=page.locator('#currentFields > .v3-current-matrix');if(await currentMatrix.count()!==1)throw new Error(label+': Current Job is not using the offer matrix grammar');
  if(await page.locator('#currentFields .v3-current-grid').count())throw new Error(label+': legacy Current Job form grid still rendered');
  const currentLabels=await currentMatrix.locator(':scope > .offer-mrow > .offer-mlabel').allTextContents();
  const expectedCurrent=['Chỉ tiêu','Lương hiện tại ghi theo','Lương / tháng','Công ty dùng mức nào để đóng BH?','Lên văn phòng / tuần','Di chuyển 1 chiều','Làm thêm giờ (OT) trung bình / tháng','OT có được trả tiền không?','OT chủ yếu rơi vào','Hệ số OT','OT ngày thường','OT ngày nghỉ hằng tuần','OT ngày lễ/Tết','Mức lương dùng để tính OT'];
  if(currentLabels.join('|')!==expectedCurrent.join('|'))throw new Error(label+': Current Job row order drifted: '+currentLabels.join(' | '));
  const currentName=page.locator('#currentFields .v3-current-matrix .offer-mrow.head [data-current="name"]').first();if(await currentName.count()!==1)throw new Error(label+': Current Job name is not editable in matrix header');
  if(await page.locator('#currentFields [data-k="probationEnabled"],#currentFields [data-current="probationEnabled"]').count())throw new Error(label+': Current Job unexpectedly contains probation controls');
  const matrixGeom=await currentMatrix.evaluate(e=>{const r=e.getBoundingClientRect(),row=e.querySelector('.offer-mrow').getBoundingClientRect();return{w:r.width,scroll:e.scrollWidth,rowW:row.width}});if(matrixGeom.scroll>matrixGeom.w+2||matrixGeom.rowW>matrixGeom.w+2)throw new Error(label+': Current matrix overflow');
  const otPaidRow=page.locator('#currentFields [data-current-ot-row="paid"]');if(await otPaidRow.isVisible())throw new Error(label+': Current OT paid row should start hidden when OT is blank');
  await page.locator('#currentFields [data-current="otMonthly"]').fill('8');await page.waitForTimeout(40);if(!(await otPaidRow.isVisible()))throw new Error(label+': Current OT disclosure did not open immediately after typing hours');
  await page.locator('#currentFields [data-current-seg="otPaid"] [data-v="yes"]').click();await page.waitForTimeout(40);if(!(await page.locator('#currentFields [data-current-ot-row="type"]').isVisible()))throw new Error(label+': Current OT type row did not follow paid OT selection');
  const benefits=page.locator('#currentFields .v3-current-benefits');await benefits.locator('summary').click();if(!(await benefits.locator('.v3-current-matrix').isVisible()))throw new Error(label+': Current benefits did not use the matrix grammar');
"""
if anchor not in t: raise SystemExit('Current Job browser QA anchor missing')
t=t.replace(anchor,extra,1)
TEST.write_text(t)
print('PATCHED V3 Current Job matrix redesign')
