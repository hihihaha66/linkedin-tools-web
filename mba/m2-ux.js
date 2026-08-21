const PREVIEW_API_URL='https://linkedin-tools-api-test.vercel.app/api/mba-preview';
const TARGET_API_URL='https://linkedin-tools-api-test.vercel.app/api/mba-target';
let previewTimer=null,previewSeq=0;

targetField=function(){return''};

const _uxOpenPlanning=openPlanning;
openPlanning=function(id){
  _uxOpenPlanning(id);
  ensurePlanPreview();
  enhanceMoneyUnderstanding($('#planFields'));
  bindPreviewEvents();
  requestPlanPreview();
};

function ensurePlanPreview(){
  const fields=$('#planFields');if(!fields)return;
  let box=$('#calcPreview');
  if(!box){
    box=document.createElement('div');box.id='calcPreview';box.className='calcPreview';
    box.innerHTML='<div class="previewTitle">MBA đang tính như thế nào?</div><div id="previewLines"><div class="previewEmpty">Nhập các số ở trên, MBA sẽ cho bạn xem phép tính ngay tại đây.</div></div><div id="previewWarnings"></div>';
    fields.appendChild(box);
  }
}
function enhanceMoneyUnderstanding(root){
  if(!root)return;
  root.querySelectorAll('.amount .money').forEach(input=>{
    const wrap=input.closest('.amount');if(!wrap)return;
    let helper=wrap.nextElementSibling?.classList?.contains('moneyMeaning')?wrap.nextElementSibling:null;
    if(!helper){helper=document.createElement('div');helper.className='moneyMeaning';wrap.insertAdjacentElement('afterend',helper)}
    const update=()=>{const value=parseMoney(input.value);helper.textContent=value>0?'Số tiền bằng chữ: '+moneyInVietnameseWords(value):''};
    if(!input.dataset.moneyWordsBound){input.addEventListener('input',update);input.dataset.moneyWordsBound='1'}update();
  });
}
function moneyInVietnameseWords(v){
  const value=Math.round(Math.abs(Number(v)||0));if(!value)return'không đồng';
  const digits=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
  function readThree(n,full){
    const h=Math.floor(n/100),t=Math.floor((n%100)/10),u=n%10;const parts=[];
    if(h>0||full){parts.push(digits[h]+' trăm')}
    if(t>1){parts.push(digits[t]+' mươi');if(u===1)parts.push('mốt');else if(u===4)parts.push('tư');else if(u===5)parts.push('lăm');else if(u>0)parts.push(digits[u])}
    else if(t===1){parts.push('mười');if(u===5)parts.push('lăm');else if(u>0)parts.push(digits[u])}
    else if(u>0){if(h>0||full)parts.push('lẻ');parts.push(digits[u])}
    return parts.join(' ');
  }
  const units=['','nghìn','triệu','tỷ','nghìn tỷ','triệu tỷ'];let n=value,groups=[];
  while(n>0){groups.push(n%1000);n=Math.floor(n/1000)}
  const out=[];
  for(let i=groups.length-1;i>=0;i--){const g=groups[i];if(!g)continue;const hasHigher=out.length>0;const full=hasHigher&&g<100;const words=readThree(g,full);if(words)out.push(words+(units[i]?' '+units[i]:''))}
  const text=out.join(' ').replace(/\s+/g,' ').trim()+' đồng';return text.charAt(0).toUpperCase()+text.slice(1);
}
function humanMoney(v){
  const a=Math.abs(v),sign=v<0?'- ':'';
  if(a>=1e9)return sign+new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(a/1e9)+' tỷ đồng';
  if(a>=1e6)return sign+new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(a/1e6)+' triệu đồng';
  if(a>=1e3)return sign+new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(a/1e3)+' nghìn đồng';
  return sign+new Intl.NumberFormat('vi-VN').format(a)+' đồng';
}
function bindPreviewEvents(){
  const root=$('#planFields');if(!root)return;
  root.oninput=()=>{enhanceMoneyUnderstanding(root);schedulePlanPreview()};
  root.onclick=e=>{if(e.target.closest('.choice'))setTimeout(schedulePlanPreview,40)};
}
function schedulePlanPreview(){clearTimeout(previewTimer);previewTimer=setTimeout(requestPlanPreview,320)}
async function previewRequest(stream,input){
  const r=await fetch(PREVIEW_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:stream.model,config:stream.config,input})});
  if(!r.ok)throw new Error('HTTP '+r.status);return r.json();
}
async function requestPlanPreview(){
  const s=currentStream(),box=$('#calcPreview');if(!s||!box||!$('#plan').classList.contains('on'))return;
  const input=readPlanInput();delete input.targetProfit;const seq=++previewSeq;box.classList.add('previewLoading');
  try{const data=await previewRequest(s,input);if(seq!==previewSeq)return;renderPreviewBox(data,$('#previewLines'),$('#previewWarnings'))}catch(e){if(seq===previewSeq){$('#previewLines').innerHTML='<div class="previewEmpty">Chưa tải được preview. Bạn vẫn có thể bấm Xem kết quả.</div>';$('#previewWarnings').innerHTML=''}}finally{if(seq===previewSeq)box.classList.remove('previewLoading')}
}
function previewLineHtml(line){
  let text=String(line||'').trim();
  const revenuePatterns=[/ doanh thu hoa hồng$/,/ doanh thu sau hoàn\/hủy$/,/ doanh thu quảng cáo$/,/ doanh thu sau hoàn tiền$/,/ doanh thu\/tháng$/,/ doanh thu$/];
  for(const pattern of revenuePatterns){if(pattern.test(text)&&text.includes('=')){text=text.replace(pattern,'').trim();return'<span class="previewLabel">Doanh thu:</span> '+esc(text)+' <span class="previewPeriod">/tháng</span>'}}
  if(/ lợi nhuận\/tháng$/.test(text)){text=text.replace(/ lợi nhuận\/tháng$/,'').trim();return'<span class="previewLabel">Lợi nhuận:</span> '+esc(text)+' <span class="previewPeriod">/tháng</span>'}
  return esc(text).replace(/\/tháng\b/g,'<span class="previewPeriod">/tháng</span>');
}
function renderPreviewBox(data,lineHost,warningHost){
  const lines=data?.preview?.lines||[];
  lineHost.innerHTML=lines.length?lines.map(x=>'<div class="previewLine">'+previewLineHtml(x)+'</div>').join(''):'<div class="previewEmpty">Nhập thêm số để MBA cho bạn xem phép tính ngay tại đây.</div>';
  renderWarnings(data?.warnings||[],warningHost);
}
function renderWarnings(warnings,host){
  if(!host)return;host.innerHTML=warnings.length?'<div class="sanityBox"><b>Kiểm tra lại trước khi dùng kết quả</b>'+warnings.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':'';
}

const _uxRenderPlanResult=renderPlanResult;
renderPlanResult=function(s,data){
  _uxRenderPlanResult(s,data);
  ensureResultUX();
  renderTargetSection(s);
  loadResultExplanation(s);
};
function ensureResultUX(){
  const screen=$('#planResult'),hero=screen?.querySelector('.resultHero'),grid=$('#metricGrid'),actions=screen?.querySelector('.actions');if(!hero||!grid||!actions)return;
  let math=$('#resultMath');if(!math){math=document.createElement('div');math.id='resultMath';math.className='resultMath';math.innerHTML='<h3>Vì sao ra con số này?</h3><div id="resultMathLines"></div>';hero.insertAdjacentElement('afterend',math)}
  let sanity=$('#resultSanity');if(!sanity){sanity=document.createElement('div');sanity.id='resultSanity';math.insertAdjacentElement('afterend',sanity)}
  let target=$('#profitTargetBox');if(!target){target=document.createElement('div');target.id='profitTargetBox';target.className='targetBox';actions.insertAdjacentElement('beforebegin',target)}
}
async function loadResultExplanation(s){
  const input=JSON.parse(JSON.stringify(s.planning?.input||{}));delete input.targetProfit;
  try{const data=await previewRequest(s,input);const lines=data?.preview?.lines||[];$('#resultMathLines').innerHTML=lines.length?lines.map(x=>'<p>'+previewLineHtml(x)+'</p>').join(''):'<p class="hint">MBA đã tính từ các số bạn nhập ở Kế hoạch nhanh.</p>';renderWarnings(data?.warnings||[],$('#resultSanity'))}catch(e){$('#resultMathLines').innerHTML='<p class="hint">MBA đã tính từ các số bạn nhập ở Kế hoạch nhanh.</p>';$('#resultSanity').innerHTML=''}
}
function renderTargetSection(s){
  const box=$('#profitTargetBox');if(!box)return;const saved=s.planning?.targetResult,target=s.planning?.targetProfit||0;
  box.innerHTML='<h3>Muốn đặt mục tiêu lợi nhuận?</h3><p>Kết quả phía trên là tình hình theo mức bán bạn đã nhập. Chỉ khi muốn biết “cần bán bao nhiêu để lời X”, hãy đặt mục tiêu ở đây.</p><div class="targetActions"><button class="btn secondary" type="button" onclick="toggleTargetForm()">'+(target?'Đổi mục tiêu':'+ Đặt mục tiêu lợi nhuận')+'</button></div><div id="targetForm" class="targetForm"><div class="field" style="margin-top:12px"><label>Lợi nhuận bạn muốn đạt mỗi tháng</label><div class="amount"><input id="targetProfitInput" class="money" inputmode="numeric" value="'+moneyInputValue(target)+'" placeholder="10,000,000"><span>đ</span></div></div><button class="btn" id="targetCalcBtn" type="button" onclick="calculateProfitTarget()">Tính mức cần đạt</button></div><div id="targetResult" class="targetResult"></div>';
  enhanceMoneyUnderstanding(box);
  if(saved)renderSavedTarget(saved,target);
}
function toggleTargetForm(){const f=$('#targetForm');f.classList.toggle('on');if(f.classList.contains('on'))$('#targetProfitInput')?.focus()}
async function calculateProfitTarget(){
  const s=currentStream(),amount=parseMoney($('#targetProfitInput')?.value);if(!s||!amount){toast('Nhập mức lợi nhuận bạn muốn đạt.');return}
  const btn=$('#targetCalcBtn');btn.disabled=true;btn.textContent='Đang tính...';const input=JSON.parse(JSON.stringify(s.planning?.input||{}));delete input.targetProfit;
  try{const r=await fetch(TARGET_API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:s.model,config:s.config,input,targetProfit:amount})});if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();if(data.status!=='ok'){toast(data.message||'Chưa thể tính mục tiêu từ dữ liệu hiện tại.');return}s.planning.targetProfit=amount;s.planning.targetResult=data;s.updatedAt=now();currentProfile().updatedAt=now();persist();renderSavedTarget(data,amount)}catch(e){toast('Không kết nối được với bộ máy tính mục tiêu. Thử lại sau ít phút.')}finally{btn.disabled=false;btn.textContent='Tính mức cần đạt'}
}
function renderSavedTarget(data,amount){
  const host=$('#targetResult');if(!host)return;let warnings=[...(data.warnings||[])];const s=currentStream(),cap=s?.planning?.result?.summary?.capacity;if(s?.model==='service'&&cap?.max>0&&cap?.mode!=='custom'&&data.driver>cap.max)warnings.push('Mức cần đạt cao hơn khả năng phục vụ hiện tại. Chỉ tăng nhu cầu là chưa đủ, bạn sẽ cần tăng người, thời gian hoặc nguồn lực.');
  host.classList.add('on');host.innerHTML='<span class="hint">Để đạt '+esc(formatMoney(amount))+' lợi nhuận/tháng, MBA ước tính bạn cần:</span><strong>'+esc(formatNumber(data.driver))+' '+esc(data.unit)+'</strong>'+(data.planned>0?'<div class="hint">Mức hiện tại: '+esc(formatNumber(data.planned))+' '+esc(data.unit)+'.</div>':'')+(warnings.length?'<div class="sanityBox"><b>Điều cần kiểm tra</b>'+warnings.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':'');
}
function formatNumber(v){return new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(Number(v)||0)}

if(typeof renderSharedCosts==='function'){
  const _uxRenderSharedCosts=renderSharedCosts;
  renderSharedCosts=function(){_uxRenderSharedCosts();enhanceMoneyUnderstanding($('#sharedCosts'))};
}
