from pathlib import Path
import shutil,re,base64,hashlib

SRC=Path('net-cao-hon-co-that-tot-hon-v3.html')
DST=Path('net-cao-hon-co-that-tot-hon-v4.html')
TEST=Path('tests/v4-clean-ui.mjs')
if not SRC.exists(): raise SystemExit('V3 source missing')
s=SRC.read_text()
if 'uiLabelBtn' in s or 'UI_COMPONENT_RULES' in s: raise SystemExit('V3 is not the frozen clean baseline')

# Clone V3 first. From here on only V4 is edited.
s=s.replace('<title>Net cao hơn có thật tốt hơn? - V3</title>','<title>Net cao hơn có thật tốt hơn? - V4</title>',1)
s=s.replace('<body>','<body class="v4">',1)

# Version-isolated local persistence/export names; calculation API intentionally remains V3.
s=s.replace('const KEY="net-cao-hon-v3-state";','const KEY="net-cao-hon-v4-state";',1)
s=s.replace('const LEGACY_KEY="net-cao-hon-v3";','const LEGACY_KEY="net-cao-hon-v3-state";',1)
s=s.replace('const t="__v3_state"','const t="__v4_state"',1)
s=s.replace('download("career-options-v3.txt"','download("career-options-v4.txt"',1)
s=s.replace('download("career-options-v3-du-lieu.json"','download("career-options-v4-du-lieu.json"',1)

# V4 copy-light pass: remove repetition, not information required to use a field.
repls=[
('So công việc hiện tại với một hoặc hai offer mới - hoặc chỉ so hai offer với nhau. Tool đưa tiền, thời gian, bảo hiểm và tác động khi chuyển việc về cùng một khung để bạn thấy mình đang đổi gì lấy gì.',
 'So công việc hiện tại với 1-2 offer theo tiền, thời gian, bảo hiểm và tác động khi chuyển việc.'),
('Thêm khi bạn muốn biết offer mới có thực sự đáng để rời công việc hiện tại hay không. Không cần nhập lại lương hiện tại ở phần chuyển việc.',
 'Thêm khi muốn so offer mới với phương án ở lại.'),
('Có một offer thì chỉ nhập Offer A. Khi có Offer B, bật “2 offer” để so A/B hoặc so từng offer với công việc hiện tại.',
 'Có 1 offer thì nhập Offer A; có thêm Offer B thì bật “2 offer”.'),
('<b>Chưa biết mức đóng bảo hiểm?</b> Chọn “Chưa rõ”. Tool tạm lấy mức lương offer làm mức dùng để tính BH; nếu có phụ cấp cố định, phần phụ cấp được xử lý theo lựa chọn bạn nhập. Nếu HR cho biết một mức riêng, chọn “Tôi biết mức cụ thể” và nhập số tiền.',
 '<b>BH chưa rõ?</b> Chọn “Chưa rõ”; tool sẽ nêu giả định trong kết quả.'),
('Chỉ dùng để mô phỏng quyền lợi BHXH ở mục “Nếu có biến cố”, không ảnh hưởng lương net hay thu nhập so sánh. Thai sản được so theo mức lương làm căn cứ đóng BHXH; tool không kiểm tra điều kiện hưởng.',
 'Chỉ dùng để mô phỏng quyền lợi BHXH; không ảnh hưởng lương/thu nhập so sánh. Tool không kiểm tra điều kiện hưởng.'),
('So phần còn lại của năm từ ngày sau khi bạn nghỉ đến 31/12: nếu ở lại công ty hiện tại thì nhận bao nhiêu, còn nếu nghỉ rồi sang offer mới thì nhận bao nhiêu. Phần trước ngày nghỉ giống nhau ở hai phương án nên không cần tính lại.',
 'So phương án ở lại và chuyển việc từ ngày nghỉ đến 31/12 của năm onboard.'),
('Chọn mục tiêu bạn muốn đạt, tool sẽ tính mức lương tối thiểu cần thương lượng. Các điều kiện khác của từng offer như bảo hiểm, thử việc, thưởng, OT và phụ cấp được giữ nguyên; Công việc hiện tại được dùng để so với phương án ở lại.',
 'Chọn mục tiêu; tool tính mức lương tối thiểu cần thương lượng theo điều kiện của offer.'),
('Tool cảnh báo theo mốc 40 giờ/tháng và quy đổi mức trung bình này ra 12 tháng để đối chiếu 200/300 giờ/năm. Không đủ dữ liệu để kiểm tra giới hạn theo từng ngày.',
 'Quy đổi OT trung bình theo tháng ra 12 tháng để đối chiếu mốc 40 giờ/tháng và 200/300 giờ/năm.'),
('Chọn Không nếu không có thử việc, hoặc giai đoạn thử việc có lương và BH giống điều kiện chính thức nên không cần tách riêng. Nếu có khác biệt, chọn Có.',
 'Chọn Có khi thử việc khác giai đoạn chính thức về lương hoặc BH.'),
]
for old,new in repls:
    if old not in s: raise SystemExit('copy anchor missing: '+old[:80])
    s=s.replace(old,new)

# Move the long disclaimer + legal parameters behind one disclosure instead of deleting them.
legal_start='<div class="disclaim">Đây là công cụ mô phỏng để so sánh, không thay thế tư vấn payroll/pháp lý.'
legal_end='</p>\n</div>\n<script>'
if legal_start not in s or legal_end not in s: raise SystemExit('legal block anchors missing')
start=s.index(legal_start)
end=s.index(legal_end,start)
legal=s[start:end+len('</p>')]
wrapped='<details class="v4-legal"><summary>Giả định & nguồn pháp lý</summary><div class="v4-legal-body">'+legal+'</div></details>'
s=s[:start]+wrapped+s[end+len('</p>'):]

# Slightly tighter V4 rhythm + legal disclosure styling; no component is hidden by default except legal prose.
style_end='\n</style>'
v4_css="""

/* V4: copy-light presentation. V3 logic/layout primitives are intentionally preserved. */
.v4 p.hint{margin-bottom:10px}.v4 .rule{margin:18px 0}.v4 .toolbar{margin-bottom:14px}
.v4 .v3-current-box{margin-bottom:14px}.v4 .solver-box{margin-top:18px}.v4 .switch-box{margin-top:14px}
.v4-legal{margin:18px 0 0;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.45);padding:0 12px}
.v4-legal>summary{cursor:pointer;list-style:none;color:var(--moss);font-weight:600;font-size:13px;padding:10px 0;display:flex;align-items:center;gap:7px}
.v4-legal>summary::-webkit-details-marker{display:none}.v4-legal>summary:before{content:'＋';font-family:var(--mono);font-size:15px}.v4-legal[open]>summary:before{content:'−'}
.v4-legal-body{border-top:1px solid var(--line);padding:10px 0 2px}.v4-legal-body .disclaim{margin-top:0}
"""
if style_end not in s: raise SystemExit('style end missing')
s=s.replace(style_end,v4_css+style_end,1)

# Refresh CSP after inline JS version/storage/export changes.
js_start=s.index('<script>')+len('<script>');js_end=s.index('</script>',js_start);js=s[js_start:js_end]
h=base64.b64encode(hashlib.sha256(js.encode()).digest()).decode();s,n=re.subn(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{h}'",s,count=1)
if n!=1: raise SystemExit('CSP hash anchor missing')
DST.write_text(s)

TEST.write_text(r'''import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  for(const [label,width,height] of [['desktop',1280,900],['mobile-320',320,740],['mobile-375',375,812],['mobile-430',430,932]]){
    const page=await browser.newPage({viewport:{width,height}});const bodies=[];
    await page.route('**/api/offer-value-v3',async route=>{try{bodies.push(JSON.parse(route.request().postData()||'{}'))}catch{};await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({hasResults:false,v3:true,availableOptions:[],comparison:{left:null,right:null},comparisonMode:'pair',summaryHtml:'',modeTitle:'',l1cols:'',annualcols:'',tcols:'',l2basis:'',l3events:'',verdictHtml:'',showSwitching:false,switchingHtml:'',showLayer6:false,layer6Html:'',exportText:''})})});
    await page.goto('http://127.0.0.1:8000/net-cao-hon-co-that-tot-hon-v4.html',{waitUntil:'domcontentloaded'});
    if(!(await page.title()).includes('V4')||(await page.title()).includes('V3'))throw new Error(label+': wrong V4 title '+await page.title());
    const text=await page.locator('body').innerText();
    for(const must of ['So công việc hiện tại với 1-2 offer','Thêm khi muốn so offer mới với phương án ở lại.','Có 1 offer thì nhập Offer A; có thêm Offer B thì bật “2 offer”.','BH chưa rõ?','Chọn mục tiêu; tool tính mức lương tối thiểu cần thương lượng theo điều kiện của offer.'])if(!text.includes(must))throw new Error(label+': compact copy missing '+must);
    for(const old of ['Tool đưa tiền, thời gian, bảo hiểm và tác động khi chuyển việc về cùng một khung','Không cần nhập lại lương hiện tại ở phần chuyển việc.','Các điều kiện khác của từng offer như bảo hiểm, thử việc, thưởng, OT và phụ cấp được giữ nguyên'])if(text.includes(old))throw new Error(label+': old verbose copy still visible '+old);
    const legal=page.locator('.v4-legal');if(await legal.count()!==1)throw new Error(label+': missing legal disclosure');if(await legal.getAttribute('open')!==null)throw new Error(label+': legal disclosure must default collapsed');
    if(!await legal.locator('summary').getByText('Giả định & nguồn pháp lý').count())throw new Error(label+': legal disclosure label missing');
    await legal.locator('summary').click();if(!(await legal.innerText()).includes('Nguồn pháp lý chính'))throw new Error(label+': legal content was lost');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(overflow>2)throw new Error(label+': horizontal overflow '+overflow);
    await page.locator('#offerCountSeg [data-v="2"]').click();await page.locator('#offersIn [data-i="0"][data-k="gross"]').fill('25000000');await page.waitForTimeout(700);
    if(!bodies.length||String(bodies.at(-1)?.offers?.[0]?.gross)!=='25000000')throw new Error(label+': V4 no longer sends the V3-compatible offer payload');
    await page.close();
  }
  console.log('PASS V4 clean UI clone');
}finally{await browser.close()}
''')
print('CREATED V4 clean UI from frozen V3')
