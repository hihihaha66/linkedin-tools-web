import { chromium } from 'playwright';

const expected = {
  subtitle: 'So sánh công việc hiện tại với 1-2 offer theo tiền, thời gian, bảo hiểm và tác động khi chuyển việc - để bạn thấy mình đang đổi gì lấy gì.',
  privacy: 'Dữ liệu bạn nhập được gửi tới máy chủ để tính, không lưu vào cơ sở dữ liệu. Chỉ khi bấm "Lưu" mới giữ trên trình duyệt của bạn.',
  insurance: 'Chưa biết mức đóng bảo hiểm? Chọn "Chưa rõ" - tool tạm lấy lương offer làm căn cứ BH, nên kết quả Lớp 4 và Lớp 5 có thể cao hơn thực tế. Nếu HR cho biết mức riêng, chọn "Tôi biết mức cụ thể".',
  layer2: 'Quy cả hai phương án về cùng 12 tháng làm việc. Không phải số tiền từ hôm nay đến 31/12.',
  layer3Title: 'Lớp 3 · Thời gian bạn bỏ ra để có mức thu nhập đó',
  layer3: 'Giả định 176h/tháng; đi lại và OT được cộng vào thời gian. Ngày phép chỉ giảm thời gian bỏ ra, không cộng thành tiền.',
  layer5: 'Dùng mức lương làm căn cứ đóng BH đã nhập ở trên. Tool chỉ mô phỏng số tiền, không kiểm tra điều kiện hưởng.',
  switching: 'So sánh phần còn lại của năm từ ngày sau khi nghỉ đến 31/12: ở lại nhận bao nhiêu, sang offer mới nhận bao nhiêu. Chưa mô phỏng quyết toán thuế khi đổi nơi làm việc.'
};

const browser = await chromium.launch({ headless: true });
try {
  for (const [label,width,height] of [['mobile-320',320,800],['mobile-375',375,850],['mobile-430',430,900],['desktop',1280,900]]) {
    const page = await browser.newPage({ viewport:{width,height} });
    await page.route('**/api/offer-value-v4', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({hasResults:false,v3:true,availableOptions:[],comparison:{left:null,right:null},comparisonMode:'pair',summaryHtml:'',modeTitle:'',l1cols:'',annualcols:'',tcols:'',l2basis:'',l3events:'',verdictHtml:'',showSwitching:false,switchingHtml:'',showLayer6:false,layer6Html:'',exportText:''})}));
    await page.goto('http://127.0.0.1:8000/net-cao-hon-co-that-tot-hon-v4.html',{waitUntil:'domcontentloaded'});
    await page.evaluate(()=>document.getElementById('results').classList.remove('hidden'));

    const actual = {
      subtitle:(await page.locator('header .sub').innerText()).trim(),
      privacy:(await page.locator('.v4-header-note').innerText()).trim(),
      insurance:(await page.locator('.v4-insurance-note').innerText()).trim(),
      layer2:(await page.locator('[data-v4-layer="2"] .v4-layer-note').innerText()).trim(),
      layer3Title:(await page.locator('[data-v4-layer="3"] .lnum').innerText()).trim().replace(/\s+/g,' '),
      layer3:(await page.locator('[data-v4-layer="3"] .v4-layer-note').innerText()).trim(),
      layer5:(await page.locator('[data-v4-layer="5"] .v4-layer-note').innerText()).trim(),
      switching:(await page.locator('.v4-switch-note').innerText()).trim()
    };
    for (const [k,v] of Object.entries(expected)) {
      if(actual[k]!==v) throw new Error(label+': '+k+' mismatch\n'+actual[k]+'\n!=\n'+v);
    }

    const notes = page.locator('.v4-micro-note');
    for(let i=0;i<await notes.count();i++){
      const info=await notes.nth(i).evaluate(el=>{
        const cs=getComputedStyle(el), lh=parseFloat(cs.lineHeight), h=el.getBoundingClientRect().height;
        return {text:el.textContent.trim(),fontSize:parseFloat(cs.fontSize),color:cs.color,fontWeight:cs.fontWeight,lines:lh>0?h/lh:0};
      });
      if(info.fontWeight!=='400') throw new Error(label+': micro-note became bold: '+info.text);
      if(label.startsWith('mobile') && info.lines>2.12) throw new Error(label+': micro-note exceeds 2 lines ('+info.lines.toFixed(2)+'): '+info.text);
    }

    for(const n of [2,3,5]){
      const d=page.locator('[data-v4-layer="'+n+'"] .v4-layer-details');
      if(await d.getAttribute('open')!==null) throw new Error(label+': Layer '+n+' details must remain collapsed');
      if(!(await d.locator('summary').innerText()).includes('Xem cách tính')) throw new Error(label+': Layer '+n+' Xem cách tính missing');
    }
    const legal=page.locator('.v4-legal');
    if(await legal.getAttribute('open')!==null) throw new Error(label+': legal disclosure must remain collapsed');
    await legal.locator('summary').click();
    if(!(await legal.innerText()).includes('Tham số đang dùng:')) throw new Error(label+': legal parameters missing');
    if(!(await legal.innerText()).includes('Nguồn pháp lý chính:')) throw new Error(label+': legal sources missing');

    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    if(overflow>2) throw new Error(label+': horizontal overflow '+overflow);
    await page.close();
  }
  console.log('PASS V4 six microcopy regression');
} finally {
  await browser.close();
}
