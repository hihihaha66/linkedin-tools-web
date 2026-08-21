(function initRecurringUx(){
  const oldRecurringPlanFields=recurringPlanFields;
  recurringPlanFields=function(s,input){
    let html=oldRecurringPlanFields(s,input);
    html=html.replace('Chi phí tăng thêm cho mỗi người đang dùng / tháng','Mỗi người dùng làm phát sinh thêm bao nhiêu chi phí mỗi tháng?');
    html=html.replace('Ví dụ: server, API, support hoặc license phát sinh theo số người dùng.','Chỉ nhập phần chi phí tăng theo số người dùng, ví dụ server, API, license hoặc hỗ trợ tính theo người. Nếu có thêm 1 người dùng mà tổng chi phí không đổi, nhập 0đ.');
    return html;
  };

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(typeof previewLineHtml==='function'){
      clearInterval(timer);
      wrapRecurringPreview();
    }else if(tries>120)clearInterval(timer);
  },50);
})();

function wrapRecurringPreview(){
  if(previewLineHtml._recurringUx)return;
  const previous=previewLineHtml;
  previewLineHtml=function(line){
    const s=currentStream();
    if(s?.model!=='recurring')return previous(line);
    const raw=String(line||'').trim();

    if(raw.includes('=')&&raw.includes('/tháng quy đổi')&&!raw.includes('lợi nhuận')){
      const text=raw.replace('/tháng quy đổi','').trim();
      return '<span class="previewLabel">Doanh thu:</span> '+esc(text)+' <span class="previewPeriod">/tháng quy đổi</span>';
    }

    if(/ lợi nhuận\/tháng$/.test(raw)){
      const text=raw.replace(/ lợi nhuận\/tháng$/,'').trim();
      return '<span class="previewLabel">Lợi nhuận:</span> '+esc(text)+' <span class="previewPeriod">/tháng</span>';
    }

    return previous(line);
  };
  previewLineHtml._recurringUx=true;
}
