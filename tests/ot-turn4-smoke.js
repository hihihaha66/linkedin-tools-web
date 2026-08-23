const fs=require('fs');
const {JSDOM}=require('jsdom');
let html=fs.readFileSync('net-cao-hon-co-that-tot-hon-v2.html','utf8')
 .replace(/<link[^>]+fonts\.googleapis\.com[^>]*>/g,'')
 .replace(/<link[^>]+fonts\.gstatic\.com[^>]*>/g,'');
const requests=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test/',beforeParse(w){
 w.fetch=async(_url,opts)=>{requests.push(JSON.parse(opts.body));return{status:200,ok:true,json:async()=>({hasResults:false})}};
}});
const w=dom.window,d=w.document;
const q=s=>d.querySelector(s), visible=e=>!!e&&e.style.display!=='none';
const click=e=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const input=(e,v)=>{e.value=v;e.dispatchEvent(new w.Event('input',{bubbles:true}))};
const change=(e,v)=>{e.value=v;e.dispatchEvent(new w.Event('change',{bubbles:true}))};
const field=(k,i=0)=>q(`input[data-i="${i}"][data-k="${k}"]`);
const select=(k,i=0)=>q(`select[data-i="${i}"][data-k="${k}"]`);
const fail=m=>{throw new Error(m)};

if(q('.ot-paid-row').style.display!=='none')fail('paid row visible before OT');
input(field('otMonthly'),'8');
if(!visible(q('.ot-paid-row')))fail('paid row did not appear after 8h');
if(visible(q('.ot-type-row')))fail('type row visible before paid=yes');
click(q('[data-seg="otPaid"][data-i="0"] [data-v="yes"]'));
if(!visible(q('.ot-type-row'))||!visible(q('.ot-factor-row'))||!visible(q('.ot-base-row')))fail('paid OT details missing');
if(select('otType').value!=='weekday'||field('otFactor').value!=='150')fail('weekday/150 default missing');
if(select('otBaseMode').value!=='offer')fail('offer salary base default missing');

change(select('otType'),'rest');
if(field('otFactor').value!=='200')fail('rest-day factor did not default to 200');
input(field('otFactor'),'180');
if(!q('[data-ot-factor-help="0-otFactor"]').textContent.includes('200%'))fail('below-minimum rest warning missing');

change(select('otType'),'mixed');
if(visible(q('.ot-factor-row')))fail('single factor row visible in mixed mode');
if(!visible(q('.ot-mixed-weekday-row'))||!visible(q('.ot-mixed-rest-row'))||!visible(q('.ot-mixed-holiday-row')))fail('mixed rows missing');
const mixed=()=>q('[data-ot-mixed-help="0"]');
if(!mixed().textContent.includes('0/8'))fail('initial mixed allocation warning missing');
input(field('otBreakdownWeekday'),'4');input(field('otBreakdownRest'),'2');input(field('otBreakdownHoliday'),'2');
if(mixed().textContent!=='')fail('4+2+2 did not clear mismatch');
if(field('otFactorWeekday').value!=='150'||field('otFactorRest').value!=='200'||field('otFactorHoliday').value!=='300')fail('mixed factors wrong');

change(select('otBaseMode'),'custom');
if(!field('otBaseAmount'))fail('custom base field missing');
input(field('otBaseAmount'),'20000000');
if(field('otBaseAmount').value!=='20,000,000')fail('custom base money formatting failed');

const guard=()=>q('[data-ot-guard="0"]').textContent;
input(field('otMonthly'),'20');if(!guard().includes('240 giờ/năm')||!guard().includes('200 giờ/năm'))fail('>200 annual warning missing');
input(field('otMonthly'),'30');if(!guard().includes('360 giờ/năm')||!guard().includes('300 giờ/năm'))fail('>300 annual warning missing');
input(field('otMonthly'),'45');if(!guard().includes('40 giờ/tháng')||!guard().includes('540 giờ/năm')||!guard().includes('300 giờ/năm'))fail('>40 monthly warning incomplete');
input(field('otMonthly'),'8');
input(field('gross'),'30000000');

setTimeout(()=>{
 try{
  const body=requests.at(-1);if(!body)fail('no API payload captured');
  const o=body.offers[0];
  if(Number(o.otMonthly)!==8)fail('otMonthly not sent directly');
  if(o.otType!=='mixed'||Number(o.otBreakdownWeekday)!==4||Number(o.otBreakdownRest)!==2||Number(o.otBreakdownHoliday)!==2)fail('mixed payload wrong');
  if(Number(o.otFactorWeekday)!==150||Number(o.otFactorRest)!==200||Number(o.otFactorHoliday)!==300)fail('factor payload wrong');
  if(o.otBaseMode!=='custom'||String(o.otBaseAmount)!=='20000000')fail('custom base payload wrong');
  if(!(Number(o.ot)>0))fail('legacy weekly fallback missing');
  console.log('PASS Turn 4 OT behavior + payload');
  w.close();
 }catch(e){console.error(e);process.exitCode=1;w.close()}
},900);
