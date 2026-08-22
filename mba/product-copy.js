(function cleanProductCopy(){
  const heroCopy=document.querySelector('#landing .hero p');
  if(heroCopy)heroCopy.textContent='MBA biến những con số rời rạc thành một bức tranh tổng quan cho các dự án kinh doanh của bạn: đang lời hay lỗ, hòa vốn ở đâu, tiền đang đi đâu và điều gì đáng chú ý.';

  const footer=document.querySelector('#landing .footerNote');
  if(footer)footer.textContent='MBA là công cụ hỗ trợ quản trị và mô phỏng, không thay thế phần mềm kế toán hoặc báo cáo thuế.';

  document.querySelectorAll('#landing .journey').forEach(card=>{
    const code=card.querySelector('.n')?.textContent||'';
    const p=card.querySelector('p');
    if(code.startsWith('02 /')&&p)p.textContent='Đưa dữ liệu bán hàng, chi phí và sao kê vào Hồ sơ kinh doanh để theo dõi doanh thu, lợi nhuận và dòng tiền thực tế.';
    if(code.startsWith('03 /')&&p)p.textContent='Thử trước tác động của tăng giá, thuê người, tăng quảng cáo hoặc thay đổi chi phí dựa trên Hồ sơ kinh doanh của bạn.';
  });

  const builderCopy=document.querySelector('#builder .builderFooter p');
  if(builderCopy)builderCopy.innerHTML='<b>Tổng hợp toàn hồ sơ:</b> Khi mọi nguồn đã có Kế hoạch nhanh, MBA sẽ ghép chúng lại, trừ chi phí dùng chung một lần và cho bạn chọn có phân bổ các khoản chung về từng nguồn hay không.';

  const sharedEyebrow=document.querySelector('#sharedCosts .eyebrow');
  if(sharedEyebrow)sharedEyebrow.textContent='CHI PHÍ DÙNG CHUNG';

  const resultEyebrow=document.querySelector('#businessResult .eyebrow');
  if(resultEyebrow)resultEyebrow.textContent='KẾT QUẢ TOÀN HỒ SƠ';
})();
