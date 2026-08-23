const fs=require('fs');
const {JSDOM}=require('jsdom');

const rawHtml=fs.readFileSync('net-cao-hon-co-that-tot-hon-v2.html','utf8');
const html=rawHtml
 .replace(/<link[^>]+fonts\.googleapis\.com[^>]*>/g,'')
 .replace(/<link[^>]+fonts\.gstatic\.com[^>]*>/g,'');
const KEY='net-cao-hon-v2-state',LEGACY_KEY='net-cao-hon-v2';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const fail=m=>{throw new Error(m)};

function resultStub(){return{
 hasResults:true,
 l1cols:'<div data-test="l1">L1</div>',l1delta:'L1D',showL1Delta:true,
 annualcols:'<div data-test="annual">ANNUAL</div>',annualdelta:'AD',showAnnualDelta:true,
 tcols:'<div data-test="time">TIME</div>',tdelta:'TD',showTDelta:true,
 l2basis:'<div data-test="insurance">BH</div>',l3events:'<div data-test="events">EVENTS</div>',
 verdictHtml:'<div data-test="verdict">VERDICT</div>',assumptionsHtml:'<div data-test="assumptions">ASSUME</div>',showAssumptions:true,
 switchingHtml:'<div data-test="switching">SWITCH</div>',showSwitching:true,exportText:'EXPORT'
}}

function boot({storage={},apiResult=resultStub()}={}){
 const requests=[],alerts=[],downloads=[];
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test/',beforeParse(w){
  Object.entries(storage).forEach(([k,v])=>w.localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v)));
  w.fetch=async(_url,opts)=>{requests.push(JSON.parse(opts.body));return{status:200,ok:true,json:async()=>apiResult}};
  w.alert=m=>alerts.push(String(m));
  w.Blob=class{constructor(parts,opts){this.parts=parts;this.type=opts&&opts.type}};
  w.URL.createObjectURL=b=>{downloads.push(b);return'blob:test'};w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){};
  w.FileReader=class{readAsText(file){this.result=file&&file.__text||'';if(this.onload)this.onload();}};
 }});
 return{dom,w:dom.window,d:dom.window.document,requests,alerts,downloads};
}
const q=(d,s)=>d.querySelector(s);
const field=(d,k,i=0)=>q(d,`input[data-i="${i}"][data-k="${k}"]`);
const select=(d,k,i=0)=>q(d,`select[data-i="${i}"][data-k="${k}"]`);
const input=(w,e,v)=>{e.value=v;e.dispatchEvent(new w.Event('input',{bubbles:true}))};
const change=(w,e,v)=>{e.value=v;e.dispatchEvent(new w.Event('change',{bubbles:true}))};
const click=(w,e)=>e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));

(async()=>{
 // Responsive contract: both desktop and mobile remain a physical three-column matrix.
 if(!rawHtml.includes('grid-template-columns:minmax(160px,1.25fr) repeat(2,minmax(0,1fr))'))fail('desktop 3-column matrix contract missing');
 if(!rawHtml.includes('@media(max-width:540px)')||!rawHtml.includes('grid-template-columns:34% 33% 33%'))fail('mobile 3-column matrix contract missing');
 console.log('PASS Turn 6: desktop/mobile 3-column contract');

 // Turn 2 grouping contract: OT stays contiguous, then trial asks job group before duration; allowance stays next to BH treatment.
 {
  const {w,d}=boot();
  input(w,field(d,'otMonthly'),'8');
  click(w,q(d,'[data-seg="probationEnabled"][data-i="0"] [data-v="yes"]'));
  const labels=[...d.querySelectorAll('#offersIn .offer-mlabel')].map(x=>x.textContent.trim());
  const pos=x=>labels.indexOf(x);
  const ordered=['Làm thêm giờ (OT) trung bình / tháng','OT có được trả tiền không?','OT chủ yếu rơi vào','Hệ số OT','Mức lương dùng để tính OT','Có giai đoạn thử việc cần tính riêng?','Nhóm công việc của vị trí','Thời gian thử việc','Lương thử việc (% mức lương offer)','Trong thời gian thử việc có đóng BH bắt buộc?'];
  for(let i=1;i<ordered.length;i++)if(!(pos(ordered[i-1])>=0&&pos(ordered[i])>pos(ordered[i-1])))fail('Turn 2 grouping order broken: '+ordered[i-1]+' -> '+ordered[i]);
  if(!(pos('Phụ cấp cố định ngoài mức lương trên / tháng')<pos('Phụ cấp này có tính vào căn cứ BH?')&&pos('Phụ cấp này có tính vào căn cứ BH?')<pos('Nghỉ phép hưởng lương / năm')))fail('benefit grouping order broken');
  if(!d.body.textContent.includes('Nếu offer là Gross, % này áp trên Gross; nếu là Net, áp trên Net.'))fail('trial salary helper not moved to salary row');
  if(d.body.textContent.includes('Nếu bạn chọn “Tự nhập” mức căn cứ BH'))fail('stale benefit wording still present');
  w.close();
 }
 console.log('PASS Turn 2: OT/trial/benefit grouping order and helper placement');


 // Blank state + all result layers wired through existing response contract.
 {
  const {w,d,requests}=boot();
  if(select(d,'bhMode').value!=='unknown')fail('new blank BH must default unknown');
  input(w,field(d,'gross'),'30000000');await wait(750);
  if(!requests.length)fail('salary input did not call API');
  for(const s of ['[data-test="l1"]','[data-test="annual"]','[data-test="time"]','[data-test="insurance"]','[data-test="events"]','[data-test="verdict"]','[data-test="assumptions"]','[data-test="switching"]'])if(!q(d,s))fail('response layer not rendered: '+s);
  w.close();
 }
 console.log('PASS Turn 6: Layers 1-5 + switching response rendering');

 // Trial raw validation: zero is invalid; exact 6 working days is accepted, 7 warns for Other.
 {
  const {w,d}=boot();
  click(w,q(d,'[data-seg="probationEnabled"][data-i="0"] [data-v="yes"]'));
  input(w,field(d,'probDurationValue'),'0');
  if(!q(d,'[data-probdur-help="0"]').textContent.includes('phải lớn hơn 0'))fail('trial zero validation missing');
  if(field(d,'probDurationValue').getAttribute('aria-invalid')!=='true')fail('trial zero aria-invalid missing');
  change(w,select(d,'probDurationUnit'),'days');change(w,select(d,'probJobType'),'other');
  input(w,field(d,'probDurationValue'),'6');if(q(d,'[data-probdur-help="0"]').textContent)fail('6 working days should pass');
  input(w,field(d,'probDurationValue'),'7');if(!q(d,'[data-probdur-help="0"]').textContent.includes('tối đa 6 ngày làm việc'))fail('7-day trial warning missing');
  w.close();
 }
 console.log('PASS Turn 6: trial 0 / day-limit validation');

 // OT abnormal/legal warnings and zero-hours progressive disclosure.
 {
  const {w,d}=boot();const ot=field(d,'otMonthly');
  input(w,ot,'20');if(!q(d,'[data-ot-guard="0"]').textContent.includes('240 giờ/năm'))fail('OT >200 annual warning missing');
  input(w,ot,'30');if(!q(d,'[data-ot-guard="0"]').textContent.includes('300 giờ/năm'))fail('OT >300 annual warning missing');
  input(w,ot,'45');const txt=q(d,'[data-ot-guard="0"]').textContent;if(!txt.includes('40 giờ/tháng')||!txt.includes('540 giờ/năm')||!txt.includes('300 giờ/năm'))fail('combined monthly/annual OT warning missing');
  input(w,ot,'0');if(q(d,'.ot-paid-row').style.display!=='none')fail('paid row must hide again at OT=0');
  w.close();
 }
 console.log('PASS Turn 6: OT abnormal + legal warning matrix');

 // Suspicious switching unit remains blocked inline.
 {
  const {w,d}=boot();const net=q(d,'input[data-sw="currentNet"]');input(w,net,'22');
  if(!q(d,'[data-current-net-help]').textContent.includes('22 triệu = 22,000,000đ'))fail('switching suspicious-unit warning missing');
  input(w,net,'22000000');if(q(d,'[data-current-net-help]').textContent!=='')fail('valid switching net did not clear warning');
  w.close();
 }
 console.log('PASS Turn 6: switching unit validation');

 // Legacy localStorage migration: weekly OT -> monthly, probMon -> months, old base=full -> salary BH.
 {
  const legacy={deps:1,region:'II',mat:'hide',offers:[{name:'Legacy A',gross:30000000,payType:'gross',base:'full',ot:2,otPaid:'yes',otFactor:150,probPct:85,probMon:2,probInsurance:'no',targetBonusMonths:2},{name:'Offer B',gross:null}],switching:{enabled:false}};
  const {w,d,requests}=boot({storage:{[LEGACY_KEY]:legacy}});await wait(80);
  if(select(d,'bhMode').value!=='salary')fail('legacy full BH did not migrate to salary mode');
  if(field(d,'otMonthly').value!=='8.66')fail('legacy 2h/week did not migrate to 8.66h/month');
  if(field(d,'probDurationValue').value!=='2'||select(d,'probDurationUnit').value!=='months')fail('legacy probMon did not migrate to months');
  await wait(50);const body=requests.at(-1);if(!body||Math.abs(Number(body.offers[0].otMonthly)-8.66)>0.001||Number(body.offers[0].probMon)!==2)fail('legacy adapter payload wrong');
  w.close();
 }
 console.log('PASS Turn 6: old localStorage migration');

 // Current-state save/load preserves Turn 3/4/5-relevant raw fields.
 {
  const saved={deps:2,region:'III',sickDays:3,mat:'show',offers:[{name:'Saved A',gross:'32000000',payType:'net',bhMode:'custom',customBase:'8800000',days:'3',commute:'35',otMonthly:'8',otPaid:'yes',otType:'mixed',otBreakdownWeekday:'4',otBreakdownRest:'2',otBreakdownHoliday:'2',otFactorWeekday:'150',otFactorRest:'200',otFactorHoliday:'300',otBaseMode:'custom',otBaseAmount:'20000000',probationEnabled:'yes',probPct:'90',probDurationValue:'60',probDurationUnit:'days',probInsurance:'yes',probJobType:'college',guaranteedBonusMonths:'1',performanceBonusType:'amount',performanceBonusValue:'60000000',fixedAllowance:'1000000',allowanceBh:'no',paidLeaveDays:'14'},{name:'Offer B',bhMode:'unknown'}],switching:{enabled:true,targetOffer:'0',lastWorkingDate:'2026-08-31',onboardDate:'2026-09-07',currentNet:'22000000',currentBonusIfStay:'30000000',currentBonusRule:'lost',newBonusRule:'time'}};
  const {w,d,requests}=boot({storage:{[KEY]:saved}});await wait(80);
  if(select(d,'bhMode').value!=='custom'||select(d,'otType').value!=='mixed'||select(d,'probDurationUnit').value!=='days')fail('current saved state did not restore');
  const body=requests.at(-1);if(!body||body.offers[0].otBaseMode!=='custom'||Number(body.offers[0].probMon)!==2)fail('restored state API normalization wrong');
  w.close();
 }
 console.log('PASS Turn 6: current localStorage restore + adapter');

 // Backup JSON captures raw state, then import round-trip restores it.
 {
  const {w,d,downloads,requests,alerts}=boot();
  input(w,field(d,'gross'),'31000000');change(w,select(d,'bhMode'),'custom');input(w,field(d,'customBase'),'8800000');
  click(w,q(d,'#backupBtn'));if(!downloads.length)fail('backup did not create blob');
  const backupText=downloads.at(-1).parts.join(''),backup=JSON.parse(backupText);if(String(backup.offers[0].gross)!=='31000000'||backup.offers[0].bhMode!=='custom')fail('backup JSON lost raw offer state');
  const imported={...backup,region:'IV',mat:'show',offers:[{...backup.offers[0],name:'Imported A',otMonthly:'12'},backup.offers[1]]};
  const fi=q(d,'#importInput');Object.defineProperty(fi,'files',{configurable:true,value:[{__text:JSON.stringify(imported)}]});fi.dispatchEvent(new w.Event('change',{bubbles:true}));await wait(750);
  if(field(d,'gross').value!=='31,000,000'||field(d,'otMonthly').value!=='12'||q(d,'#region').value!=='IV')fail('valid backup import did not restore state');
  if(alerts.length)fail('valid import raised alert');
  const body=requests.at(-1);if(!body||body.region!=='IV'||Number(body.offers[0].otMonthly)!==12)fail('imported state API payload wrong');
  w.close();
 }
 console.log('PASS Turn 6: backup/import JSON round-trip');

 // Invalid enum values from edited JSON/localStorage must normalize to safe UI defaults.
 {
  const edited={deps:0,region:'INVALID',mat:'INVALID',offers:[{name:'A',gross:'30000000',bhMode:'unknown'},{name:'B',gross:null}],switching:{enabled:false}};
  const {w,d,requests}=boot({storage:{[KEY]:edited}});await wait(80);
  if(q(d,'#region').value!=='I')fail('invalid imported region must normalize to I');
  if(!q(d,'#matSeg [data-v="hide"]').classList.contains('on'))fail('invalid imported maternity mode must normalize to hide');
  const body=requests.at(-1);if(!body||body.region!=='I'||body.mat!=='hide')fail('normalized enum values not sent to API');
  w.close();
 }
 console.log('PASS Turn 6: edited JSON enum validation');

 // Invalid JSON import fails clearly.
 {
  const {w,d,alerts}=boot();const fi=q(d,'#importInput');Object.defineProperty(fi,'files',{configurable:true,value:[{__text:'{bad json'}]});fi.dispatchEvent(new w.Event('change',{bubbles:true}));
  if(!alerts.includes('File không đọc được'))fail('invalid JSON import alert missing');w.close();
 }
 console.log('PASS Turn 6: invalid JSON import');

 

 // Layer 6 state + API contract, including salary-as-unknown mode.
 {
  const solverState={deps:0,region:'I',sickDays:null,mat:'hide',offers:[{name:'Offer A',gross:null,payType:'gross',bhMode:'salary',probationEnabled:'no'},{name:'Offer B',gross:null}],switching:{enabled:true,targetOffer:'0',lastWorkingDate:'2026-06-30',onboardDate:'2026-07-01',currentNet:'30000000',currentBonusIfStay:'60000000',currentBonusRule:'lost',newBonusRule:'time'},solver:{enabled:true,templateOffer:'0',goalNoLoss:true,noLossBuffer:'0',goalBreakEven:true,breakEvenMonths:'6',goalMonthlyNet:true,targetMonthlyNet:'35000000',goalAnnualFixed:false,targetAnnualFixed:null}};
  const api={...resultStub(),showLayer6:true,layer6Html:'<div data-test="layer6">LAYER6</div>',hasResults:false};
  const {w,d,requests}=boot({storage:{[KEY]:solverState},apiResult:api});await wait(80);
  if(!q(d,'#solverEnabledSeg [data-v="on"]').classList.contains('on'))fail('Layer 6 enabled state did not restore');
  if(!requests.length)fail('Layer 6 did not call API when salary is intentionally blank');
  const body=requests.at(-1);if(!body.solver||body.solver.templateOffer!=='0'||body.solver.goalBreakEven!==true)fail('Layer 6 solver state missing from API body');
  if(!q(d,'[data-test="layer6"]'))fail('Layer 6 response did not render independently from Layers 1-5');
  w.close();
 }
 console.log('PASS Layer 6 frontend: persisted solver state, salary-as-unknown request, independent result rendering');

console.log('All V2 Turn 6 frontend smoke cases passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
