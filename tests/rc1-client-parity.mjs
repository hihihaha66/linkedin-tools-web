import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isDeepStrictEqual } from 'node:util';

const API_URL=process.env.OFFER_API_URL||'https://linkedin-tools-api-test.vercel.app/api/offer-value-v4';
const ORIGIN=process.env.OFFER_API_ORIGIN||'https://hihihaha66.github.io';
const engineCode=fs.readFileSync(new URL('../calc-engine.js',import.meta.url),'utf8');
vm.runInThisContext(engineCode,{filename:'calc-engine.js'});
assert.equal(typeof globalThis.computeOfferValue,'function','computeOfferValue must exist');

const UI_WKS=4.33;
function blankOffer(name='Offer A'){
  return{name,gross:null,payType:'gross',base:'full',bhMode:'salary',customBase:null,days:null,commute:null,otMonthly:null,otPaid:'no',otType:'weekday',otFactor:150,otBreakdownWeekday:null,otBreakdownRest:null,otBreakdownHoliday:null,otFactorWeekday:150,otFactorRest:200,otFactorHoliday:300,otBaseMode:'offer',otBaseAmount:null,probationEnabled:'no',probPct:null,probDurationValue:null,probDurationUnit:'months',probInsurance:'no',probJobType:'unknown',guaranteedBonusMonths:null,performanceBonusType:'months',performanceBonusValue:null,fixedAllowance:null,allowanceBh:'no',paidLeaveDays:null};
}
function blankSwitch(){return{enabled:false,enabledExplicit:false,switchingVersion:2,targetOffer:'0',lastWorkingDate:'',onboardDate:'',currentGuaranteedIfStay:null,currentGuaranteedRule:'unknown',currentGuaranteedIfLeave:null,newGuaranteedRule:'unknown',newGuaranteedCustom:null,currentPerformanceIfStay:null,currentPerformanceRule:'unknown',currentPerformanceIfLeave:null,newPerformanceRule:'unknown',newPerformanceCustom:null};}
function blankSolver(){return{enabled:false,templateOffer:'0',goalNoLoss:false,noLossBuffer:0,goalMonthlyNet:false,targetMonthlyNet:null,goalAnnualFixed:false,targetAnnualFixed:null};}
function baseState(overrides={}){
  return{schemaVersion:4,deps:0,region:'I',sickDays:null,mat:'hide',currentJobEnabled:false,currentJob:{...blankOffer('Công việc hiện tại'),probationEnabled:'no',probInsurance:'yes'},offerCount:1,offers:[blankOffer('Offer A'),blankOffer('Offer B')],comparison:{left:null,right:null,mode:'pair'},switching:blankSwitch(),solver:blankSolver(),...overrides};
}
function offerState(gross,opts={},stateOpts={}){
  const s=baseState(stateOpts);s.offers[0]={...s.offers[0],gross,...opts};return s;
}
function hasInput(v){return v!==null&&v!==undefined&&String(v).trim()!==''}
function probMonths(src){
  if(!hasInput(src.probDurationValue))return null;
  const n=Number(String(src.probDurationValue).replace(/,/g,''));
  if(!Number.isFinite(n))return null;
  if(src.probDurationUnit==='days')return n/(src.probJobType==='other'?22:30);
  return n;
}
// Exact adapter contract used by RC1 before both old API and client engine.
function toApiState(ui){
  const out=JSON.parse(JSON.stringify(ui));out.schemaVersion=4;delete out.migrationNotice;
  const adapt=(o,src,isCurrent)=>{
    const raw=src.otMonthly,n=hasInput(raw)?Number(String(raw).replace(/,/g,'')):NaN;
    o.otMonthly=Number.isFinite(n)?n:null;
    o.ot=Number.isFinite(n)&&n>0?n/UI_WKS:0;
    o.probMon=isCurrent?0:probMonths(src);
    delete o.probDurationValue;delete o.probDurationUnit;
    o.bhMode=src.bhMode==='custom'?'custom':'salary';
    o.base=o.bhMode==='custom'?'custom':'full';
    if(isCurrent){o.probationEnabled='no';o.probInsurance='yes'}
  };
  out.offers.forEach((o,i)=>adapt(o,ui.offers[i],false));adapt(out.currentJob,ui.currentJob,true);
  return out;
}
async function oldApi(input){
  const res=await fetch(API_URL,{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json'},body:JSON.stringify(input)});
  const text=await res.text();if(!res.ok)throw new Error('API '+res.status+': '+text);return JSON.parse(text);
}
function firstDiff(a,b,path='$'){
  if(Object.is(a,b))return null;
  if(typeof a!==typeof b)return path+': type '+typeof a+' != '+typeof b;
  if(a===null||b===null)return path+': '+String(a)+' != '+String(b);
  if(typeof a!=='object'){
    if(typeof a==='number'&&typeof b==='number')return path+': '+a+' != '+b+' (Δ '+(a-b)+')';
    return path+': '+JSON.stringify(a)+' != '+JSON.stringify(b);
  }
  if(Array.isArray(a)!==Array.isArray(b))return path+': array mismatch';
  const ak=Object.keys(a),bk=Object.keys(b);
  if(!isDeepStrictEqual(ak,bk))return path+': keys '+JSON.stringify(ak)+' != '+JSON.stringify(bk);
  for(const k of ak){const d=firstDiff(a[k],b[k],path+'.'+k);if(d)return d}
  return path+': unknown mismatch';
}
function moneyFromRow(html,label){
  const marker='<span class="lbl">'+label,start=String(html||'').indexOf(marker);
  if(start<0)throw new Error('Missing row '+label);
  const va='<span class="va">',vs=String(html).indexOf(va,start),ve=String(html).indexOf('<span class="vb">',vs);
  const cell=String(html).slice(vs+va.length,ve),m=cell.match(/title="([0-9,]+)đ"/)||cell.match(/([0-9,]+)đ/);
  if(!m)throw new Error('Missing money '+label+' in '+cell);return Number(m[1].replaceAll(',',''));
}
function cleanJson(x){const s=JSON.stringify(x);return !s.includes('NaN')&&!s.includes('undefined');}

const cases=[
  ['G1 · Gross 30tr · 0 NPT · ốm đau 5 ngày',offerState(30_000_000,{}, {deps:0,sickDays:5})],
  ['G2 · Gross 60tr · 1 NPT · thai sản',offerState(60_000_000,{}, {deps:1,mat:'show'})],
  ['G3 · Gross 120tr · 0 NPT',offerState(120_000_000,{}, {deps:0})],
  ['Gross 10tr · vùng I · 0 NPT',offerState(10_000_000)],
  ['Gross 80tr · vùng I · 3 NPT',offerState(80_000_000,{}, {deps:3})],
  ['Gross 30tr · vùng II · 1 NPT',offerState(30_000_000,{}, {deps:1,region:'II'})],
  ['Gross 30tr · vùng III · 1 NPT',offerState(30_000_000,{}, {deps:1,region:'III'})],
  ['Gross 30tr · vùng IV · 1 NPT',offerState(30_000_000,{}, {deps:1,region:'IV'})],
  ['Net 51.514.400 · 1 NPT · vùng I',offerState(51_514_400,{payType:'net'},{deps:1})],
  ['Net 26.215.000 · 0 NPT',offerState(26_215_000,{payType:'net'},{deps:0})],
  ['BH Chưa rõ · fallback lương offer',offerState(30_000_000,{bhMode:'unknown'})],
  ['BH custom 20tr trên Gross 40tr',offerState(40_000_000,{bhMode:'custom',base:'custom',customBase:20_000_000})],
  ['2 offer · Gross 30tr vs 40tr',(()=>{const s=baseState({offerCount:2,comparison:{left:'0',right:'1',mode:'pair'}});s.offers=[{...s.offers[0],gross:30_000_000},{...s.offers[1],gross:40_000_000}];return s})()],
  ['2 offer · Gross 30tr vs Net 35tr',(()=>{const s=baseState({offerCount:2,comparison:{left:'0',right:'1',mode:'pair'},deps:1});s.offers=[{...s.offers[0],gross:30_000_000},{...s.offers[1],gross:35_000_000,payType:'net'}];return s})()],
  ['Có công việc hiện tại · 1 offer',(()=>{const s=offerState(35_000_000);s.currentJobEnabled=true;s.currentJob={...s.currentJob,gross:25_000_000};s.comparison={left:'current',right:'0',mode:'pair'};return s})()],
  ['Công việc hiện tại + 2 offer · xem cả 3',(()=>{const s=baseState({currentJobEnabled:true,offerCount:2,comparison:{left:'current',right:'0',mode:'all'}});s.currentJob={...s.currentJob,gross:25_000_000};s.offers=[{...s.offers[0],gross:30_000_000},{...s.offers[1],gross:40_000_000}];return s})()],
  ['OT không trả · 10h/tháng',offerState(35_000_000,{otMonthly:10,otPaid:'no'})],
  ['OT trả ngày thường · 10h · 150%',offerState(35_000_000,{otMonthly:10,otPaid:'yes',otType:'weekday',otFactor:150})],
  ['OT mixed · ngày thường + ngày nghỉ',offerState(35_000_000,{otMonthly:8,otPaid:'yes',otType:'mixed',otBreakdownWeekday:4,otBreakdownRest:4,otBreakdownHoliday:0,otFactorWeekday:150,otFactorRest:200,otFactorHoliday:300})],
  ['Thưởng đảm bảo 1 tháng',offerState(35_000_000,{guaranteedBonusMonths:1})],
  ['Thưởng hiệu suất 2 tháng',offerState(35_000_000,{performanceBonusType:'months',performanceBonusValue:2})],
  ['Phụ cấp 5tr · tính BH',offerState(35_000_000,{fixedAllowance:5_000_000,allowanceBh:'yes'})],
  ['Thử việc 85% · 2 tháng · có BH',offerState(35_000_000,{probationEnabled:'yes',probPct:85,probDurationValue:2,probDurationUnit:'months',probInsurance:'yes',probJobType:'college'})],
  ['Ốm đau 7 ngày · không thai sản',offerState(40_000_000,{}, {sickDays:7,mat:'hide'})],
  ['Thai sản · không ốm đau',offerState(40_000_000,{}, {sickDays:null,mat:'show'})],
  ['Ốm đau 7 ngày + thai sản',offerState(60_000_000,{}, {deps:1,sickDays:7,mat:'show'})],
  ['Chuyển việc đến 31/12',(()=>{const s=offerState(42_000_000,{guaranteedBonusMonths:1});s.currentJobEnabled=true;s.currentJob={...s.currentJob,gross:30_000_000,guaranteedBonusMonths:1};s.switching={...blankSwitch(),enabled:true,enabledExplicit:true,targetOffer:'0',lastWorkingDate:'2026-09-30',onboardDate:'2026-10-01',currentGuaranteedIfStay:30_000_000,currentGuaranteedRule:'lost',newGuaranteedRule:'time',currentPerformanceIfStay:0,currentPerformanceRule:'lost',newPerformanceRule:'none'};return s})()],
  ['Lớp 6 · mục tiêu Net/tháng',(()=>{const s=offerState(40_000_000);s.solver={...blankSolver(),enabled:true,goalMonthlyNet:true,targetMonthlyNet:45_000_000};return s})()],
  ['Lớp 6 · mục tiêu Net/năm',(()=>{const s=offerState(40_000_000);s.solver={...blankSolver(),enabled:true,goalAnnualFixed:true,targetAnnualFixed:600_000_000};return s})()],
  ['Lớp 6 · 2 offer · mục tiêu Net/tháng',(()=>{const s=baseState({offerCount:2});s.offers=[{...s.offers[0],gross:40_000_000},{...s.offers[1],gross:50_000_000}];s.solver={...blankSolver(),enabled:true,templateOffer:'1',goalMonthlyNet:true,targetMonthlyNet:55_000_000};return s})()]
];
assert.equal(cases.length,30);

const rows=[];let allPass=true;
for(let i=0;i<cases.length;i++){
  const [desc,ui]=cases[i],input=toApiState(ui),remote=await oldApi(input),local=globalThis.computeOfferValue(input);
  const pass=isDeepStrictEqual(remote,local),diff=pass?'':firstDiff(remote,local);
  rows.push([i+1,desc,pass?'PASS':'FAIL',diff||'']);
  if(!pass)allPass=false;
}
console.log('| STT | mô tả | PASS/FAIL | field lệch nếu FAIL |');
console.log('|---:|---|:---:|---|');
for(const r of rows)console.log('| '+r[0]+' | '+r[1]+' | '+r[2]+' | '+String(r[3]).replaceAll('|','\\|')+' |');
console.log('');
console.log('PARITY_30='+(allPass?'PASS':'FAIL'));
assert.equal(allPass,true,'30-case parity chưa PASS');

// 1.6 Net -> Gross.
const netUi=offerState(51_514_400,{payType:'net'},{deps:1,region:'I'});
const netOut=globalThis.computeOfferValue(toApiState(netUi));
const inferredGross=moneyFromRow(netOut.l1cols,'Lương gross'),grossDiff=inferredGross-60_000_000;
console.log('NET_TO_GROSS='+JSON.stringify({inputNet:51_514_400,deps:1,region:'I',inferredGross,diff:grossDiff,pass:Math.abs(grossDiff)<=10_000}));
assert.ok(Math.abs(grossDiff)<=10_000,'Net->Gross lệch quá ±10.000đ');

// 1.7 engine bad-input safety.
const numericMutators=[
 ['deps',s=>s.deps],['sickDays',s=>s.sickDays],
 ['offer.gross',s=>s.offers[0].gross],['offer.customBase',s=>s.offers[0].customBase],
 ['offer.days',s=>s.offers[0].days],['offer.commute',s=>s.offers[0].commute],
 ['offer.otMonthly',s=>s.offers[0].otMonthly],['offer.otFactor',s=>s.offers[0].otFactor],
 ['offer.otBreakdownWeekday',s=>s.offers[0].otBreakdownWeekday],['offer.otBreakdownRest',s=>s.offers[0].otBreakdownRest],
 ['offer.otBreakdownHoliday',s=>s.offers[0].otBreakdownHoliday],['offer.otFactorWeekday',s=>s.offers[0].otFactorWeekday],
 ['offer.otFactorRest',s=>s.offers[0].otFactorRest],['offer.otFactorHoliday',s=>s.offers[0].otFactorHoliday],
 ['offer.otBaseAmount',s=>s.offers[0].otBaseAmount],['offer.probPct',s=>s.offers[0].probPct],
 ['offer.probDurationValue',s=>s.offers[0].probDurationValue],['offer.guaranteedBonusMonths',s=>s.offers[0].guaranteedBonusMonths],
 ['offer.performanceBonusValue',s=>s.offers[0].performanceBonusValue],['offer.fixedAllowance',s=>s.offers[0].fixedAllowance],
 ['offer.paidLeaveDays',s=>s.offers[0].paidLeaveDays],
 ['current.gross',s=>s.currentJob.gross],['current.customBase',s=>s.currentJob.customBase],
 ['current.days',s=>s.currentJob.days],['current.commute',s=>s.currentJob.commute],['current.otMonthly',s=>s.currentJob.otMonthly],
 ['switch.currentGuaranteedIfStay',s=>s.switching.currentGuaranteedIfStay],['switch.currentGuaranteedIfLeave',s=>s.switching.currentGuaranteedIfLeave],
 ['switch.newGuaranteedCustom',s=>s.switching.newGuaranteedCustom],['switch.currentPerformanceIfStay',s=>s.switching.currentPerformanceIfStay],
 ['switch.currentPerformanceIfLeave',s=>s.switching.currentPerformanceIfLeave],['switch.newPerformanceCustom',s=>s.switching.newPerformanceCustom],
 ['solver.noLossBuffer',s=>s.solver.noLossBuffer],['solver.targetMonthlyNet',s=>s.solver.targetMonthlyNet],['solver.targetAnnualFixed',s=>s.solver.targetAnnualFixed]
];
function setPath(root,path,value){
 const p=path.split('.');let x=root;if(p[0]==='offer'){x=root.offers[0];p.shift()}else if(p[0]==='current'){x=root.currentJob;p.shift()}else if(p[0]==='switch'){x=root.switching;p.shift()}else if(p[0]==='solver'){x=root.solver;p.shift()}
 x[p[0]]=value;
}
const badValues=['abc',-1,''];let badCount=0;
for(const [path] of numericMutators){
 for(const bad of badValues){
  const s=offerState(30_000_000);s.currentJobEnabled=true;s.currentJob.gross=25_000_000;s.switching={...blankSwitch(),enabled:true};s.solver={...blankSolver(),enabled:true,goalMonthlyNet:true,targetMonthlyNet:40_000_000};
  setPath(s,path,bad);
  const out=globalThis.computeOfferValue(toApiState(s));
  assert.ok(cleanJson(out),'NaN/undefined: '+path+' = '+JSON.stringify(bad));badCount++;
 }
}
const html=fs.readFileSync(new URL('../net-cao-hon-co-that-tot-hon-rc1.html',import.meta.url),'utf8');
assert.ok(html.includes('Nhập lương để bắt đầu'),'RC1 must contain exact empty salary state');
assert.ok(!html.includes('linkedin-tools-api-test.vercel.app'),'RC1 HTML must not contain API URL');
assert.ok(!/\bfetch\s*\(/.test(html),'RC1 HTML must not call fetch');
assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(html),'RC1 HTML must not contain business network primitives');
assert.ok(html.includes("connect-src 'none'"),'CSP connect-src must be none');
console.log('BAD_INPUT_GUARD=PASS '+badCount+' engine mutations; RC1 empty-state/network static checks PASS');
