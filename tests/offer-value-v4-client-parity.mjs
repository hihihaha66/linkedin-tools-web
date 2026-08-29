import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const API_URL = process.env.OFFER_API_URL || 'https://linkedin-tools-api-test.vercel.app/api/offer-value-v4';
const ORIGIN = process.env.OFFER_API_ORIGIN || 'https://hihihaha66.github.io';
const engineCode = fs.readFileSync(new URL('../offer-value-v4-client.js', import.meta.url), 'utf8');
vm.runInThisContext(engineCode, {filename:'offer-value-v4-client.js'});
const engine = globalThis.OfferValueV4Client;
assert.ok(engine && typeof engine.calculate === 'function', 'Client engine not loaded');

function blankOffer(name='Offer A'){
  return {
    name,gross:null,payType:'gross',base:'full',bhMode:'salary',customBase:null,
    days:0,commute:0,ot:0,otMonthly:0,otPaid:'no',otType:'weekday',otFactor:150,
    otBreakdownWeekday:null,otBreakdownRest:null,otBreakdownHoliday:null,
    otFactorWeekday:150,otFactorRest:200,otFactorHoliday:300,
    otBaseMode:'offer',otBaseAmount:null,
    probationEnabled:'no',probPct:null,probMon:null,probInsurance:'no',probJobType:'unknown',
    guaranteedBonusMonths:0,performanceBonusType:'months',performanceBonusValue:0,
    fixedAllowance:0,allowanceBh:'no',paidLeaveDays:0
  };
}
function blankSwitch(){
  return {
    enabled:false,switchingVersion:2,targetOffer:'0',lastWorkingDate:'',onboardDate:'',
    currentGuaranteedIfStay:0,currentGuaranteedRule:'unknown',currentGuaranteedIfLeave:null,
    newGuaranteedRule:'none',newGuaranteedCustom:null,currentPerformanceIfStay:0,
    currentPerformanceRule:'unknown',currentPerformanceIfLeave:null,newPerformanceRule:'none',
    newPerformanceCustom:null
  };
}
function baseState(o={}){
  return {
    schemaVersion:4,deps:0,region:'I',sickDays:null,mat:'hide',
    currentJobEnabled:false,currentJob:blankOffer('Công việc hiện tại'),
    offerCount:1,offers:[blankOffer('Offer A'),blankOffer('Offer B')],
    comparison:{left:null,right:null,mode:'pair'},switching:blankSwitch(),
    solver:{enabled:false,templateOffer:'0',goalNoLoss:false,noLossBuffer:0,goalMonthlyNet:false,targetMonthlyNet:null,goalAnnualFixed:false,targetAnnualFixed:null},
    ...o
  };
}
function one(gross, opts={}){
  const s=baseState();
  s.offers[0]={...s.offers[0],gross,...opts};
  return s;
}
function caseOf(id,state){return {id,state};}
function stable(x){return JSON.parse(JSON.stringify(x));}
async function api(raw){
  const res=await fetch(API_URL,{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json'},body:JSON.stringify(raw)});
  const txt=await res.text();
  if(!res.ok)throw new Error('API '+res.status+': '+txt);
  return JSON.parse(txt);
}
function moneyFromRow(html,label){
  const marker='<span class="lbl">'+label;
  const start=String(html||'').indexOf(marker);
  if(start<0)throw new Error('Missing row '+label);
  const va='<span class="va">',vs=String(html).indexOf(va,start),ve=String(html).indexOf('<span class="vb">',vs);
  if(vs<0||ve<0)throw new Error('Missing value cell '+label);
  const cell=String(html).slice(vs+va.length,ve);
  const m=cell.match(/title="([0-9,]+)đ"/)||cell.match(/([0-9,]+)đ/);
  if(!m)throw new Error('Missing money '+label+': '+cell);
  return Number(m[1].replaceAll(',',''));
}
function assertCleanResult(result,label){
  const s=JSON.stringify(result);
  assert.ok(!s.includes('NaN'),label+' contains NaN');
  assert.ok(!s.includes('undefined'),label+' contains undefined');
}

const cases=[];

// G1-G3 are the permanent first 3 parity cases.
cases.push(caseOf('G1 gross30m deps0 sick5', baseState({deps:0,sickDays:5,offers:[{...blankOffer('Offer A'),gross:30_000_000},blankOffer('Offer B')]})));
cases.push(caseOf('G2 gross60m deps1 maternity', baseState({deps:1,mat:'show',offers:[{...blankOffer('Offer A'),gross:60_000_000},blankOffer('Offer B')]})));
cases.push(caseOf('G3 gross120m deps0', one(120_000_000)));

cases.push(caseOf('P04 net input 51.5144m', baseState({deps:1,offers:[{...blankOffer('Offer A'),gross:51_514_400,payType:'net'},blankOffer('Offer B')]})));
cases.push(caseOf('P05 gross15m', one(15_000_000)));
cases.push(caseOf('P06 gross20m deps2 regionII', baseState({deps:2,region:'II',offers:[{...blankOffer('Offer A'),gross:20_000_000},blankOffer('Offer B')]})));
cases.push(caseOf('P07 gross45m regionIII', baseState({region:'III',offers:[{...blankOffer('Offer A'),gross:45_000_000},blankOffer('Offer B')]})));
cases.push(caseOf('P08 gross80m deps3 regionIV', baseState({deps:3,region:'IV',offers:[{...blankOffer('Offer A'),gross:80_000_000},blankOffer('Offer B')]})));
cases.push(caseOf('P09 custom BH 20m', one(40_000_000,{bhMode:'custom',base:'custom',customBase:20_000_000})));
cases.push(caseOf('P10 custom BH above gross clamp', one(40_000_000,{bhMode:'custom',base:'custom',customBase:50_000_000})));
cases.push(caseOf('P11 allowance 5m BH yes', one(40_000_000,{fixedAllowance:5_000_000,allowanceBh:'yes'})));
cases.push(caseOf('P12 allowance 5m BH no', one(40_000_000,{fixedAllowance:5_000_000,allowanceBh:'no'})));
cases.push(caseOf('P13 paid OT weekday', one(35_000_000,{otMonthly:10,otPaid:'yes',otType:'weekday',otFactor:150})));
cases.push(caseOf('P14 paid OT rest', one(35_000_000,{otMonthly:8,otPaid:'yes',otType:'rest',otFactor:200})));
cases.push(caseOf('P15 paid OT mixed', one(35_000_000,{otMonthly:8,otPaid:'yes',otType:'mixed',otBreakdownWeekday:4,otBreakdownRest:4,otBreakdownHoliday:0,otFactorWeekday:150,otFactorRest:200,otFactorHoliday:300})));
cases.push(caseOf('P16 unpaid OT', one(35_000_000,{otMonthly:10,otPaid:'no',otType:'weekday',otFactor:150})));
cases.push(caseOf('P17 probation 85pct 2m insured', one(35_000_000,{probationEnabled:'yes',probPct:85,probMon:2,probInsurance:'yes',probJobType:'college'})));
cases.push(caseOf('P18 probation 90pct 1m uninsured', one(35_000_000,{probationEnabled:'yes',probPct:90,probMon:1,probInsurance:'no',probJobType:'intermediate'})));
cases.push(caseOf('P19 guaranteed bonus 1m', one(35_000_000,{guaranteedBonusMonths:1})));
cases.push(caseOf('P20 performance bonus 2m', one(35_000_000,{performanceBonusType:'months',performanceBonusValue:2})));
cases.push(caseOf('P21 performance bonus amount', one(35_000_000,{performanceBonusType:'amount',performanceBonusValue:30_000_000})));
cases.push(caseOf('P22 leave commute time', one(35_000_000,{days:5,commute:30,paidLeaveDays:12})));
{
  const s=baseState({currentJobEnabled:true,currentJob:{...blankOffer('Công việc hiện tại'),gross:25_000_000},offers:[{...blankOffer('Offer A'),gross:35_000_000},blankOffer('Offer B')],comparison:{left:'current',right:'0',mode:'pair'}});
  cases.push(caseOf('P23 current plus offer',s));
}
{
  const s=baseState({offerCount:2,offers:[{...blankOffer('Offer A'),gross:30_000_000},{...blankOffer('Offer B'),gross:40_000_000}],comparison:{left:'0',right:'1',mode:'pair'}});
  cases.push(caseOf('P24 two offers pair',s));
}
{
  const s=baseState({currentJobEnabled:true,currentJob:{...blankOffer('Công việc hiện tại'),gross:25_000_000},offerCount:2,offers:[{...blankOffer('Offer A'),gross:30_000_000},{...blankOffer('Offer B'),gross:40_000_000}],comparison:{left:'current',right:'0',mode:'all'}});
  cases.push(caseOf('P25 all three',s));
}
{
  const s=baseState({
    currentJobEnabled:true,currentJob:{...blankOffer('Công việc hiện tại'),gross:30_000_000,guaranteedBonusMonths:1},
    offers:[{...blankOffer('Offer A'),gross:42_000_000,guaranteedBonusMonths:1},blankOffer('Offer B')],
    switching:{enabled:true,switchingVersion:2,targetOffer:'0',lastWorkingDate:'2026-09-30',onboardDate:'2026-10-01',currentGuaranteedIfStay:30_000_000,currentGuaranteedRule:'lost',currentGuaranteedIfLeave:0,newGuaranteedRule:'time',newGuaranteedCustom:null,currentPerformanceIfStay:0,currentPerformanceRule:'unknown',currentPerformanceIfLeave:0,newPerformanceRule:'none',newPerformanceCustom:null}
  });
  cases.push(caseOf('P26 switching year-end',s));
}
{
  const s=one(40_000_000);
  s.solver={enabled:true,templateOffer:'0',goalNoLoss:false,noLossBuffer:0,goalMonthlyNet:true,targetMonthlyNet:45_000_000,goalAnnualFixed:false,targetAnnualFixed:null};
  cases.push(caseOf('P27 solver monthly net',s));
}
{
  const s=one(40_000_000);
  s.solver={enabled:true,templateOffer:'0',goalNoLoss:false,noLossBuffer:0,goalMonthlyNet:false,targetMonthlyNet:null,goalAnnualFixed:true,targetAnnualFixed:600_000_000};
  cases.push(caseOf('P28 solver annual fixed',s));
}
cases.push(caseOf('P29 high salary BHTN cap', one(110_000_000)));
cases.push(caseOf('P30 combo maternity sick7', baseState({deps:1,mat:'show',sickDays:7,offers:[{...blankOffer('Offer A'),gross:60_000_000},blankOffer('Offer B')]})));

assert.equal(cases.length,30,'Parity suite must contain exactly 30 cases');

for(const tc of cases){
  const local=stable(engine.calculate(tc.state));
  const remote=stable(await api(tc.state));
  assert.deepEqual(local,remote,'Parity mismatch: '+tc.id);
  assertCleanResult(local,tc.id);
  console.log('PASS',tc.id);
}
console.log('PARITY_30=PASS');

// 1.6 Net -> Gross inverse conversion.
const netCase=baseState({deps:1,region:'I',offers:[{...blankOffer('Offer A'),gross:51_514_400,payType:'net'},blankOffer('Offer B')]});
const netResult=engine.calculate(netCase);
const inferredGross=moneyFromRow(netResult.l1cols,'Lương gross');
const netGrossDiff=inferredGross-60_000_000;
console.log('NET_TO_GROSS',JSON.stringify({inputNet:51_514_400,deps:1,region:'I',inferredGross,diff:netGrossDiff}));
assert.ok(Math.abs(netGrossDiff)<=10_000,'Net->Gross exceeds ±10,000đ');

// 1.7 Bad numeric inputs: engine must never surface NaN/undefined.
for(const bad of ['abc',-100,'']){
  const s=one(bad);
  const out=engine.calculate(s);
  assert.equal(out.hasResults,false,'Invalid salary should return start state: '+JSON.stringify(bad));
  assertCleanResult(out,'bad salary '+JSON.stringify(bad));
}

const badOptionalFields=[
  ['deps','abc',s=>{s.deps='abc'}],['deps negative',-1,s=>{s.deps=-1}],
  ['sickDays','abc',s=>{s.sickDays='abc'}],['sickDays negative',-5,s=>{s.sickDays=-5}],
  ['days','abc',s=>{s.offers[0].days='abc'}],['days negative',-1,s=>{s.offers[0].days=-1}],
  ['commute','abc',s=>{s.offers[0].commute='abc'}],['commute negative',-1,s=>{s.offers[0].commute=-1}],
  ['otMonthly','abc',s=>{s.offers[0].otMonthly='abc'}],['otMonthly negative',-1,s=>{s.offers[0].otMonthly=-1}],
  ['otFactor negative',-1,s=>{s.offers[0].otMonthly=4;s.offers[0].otPaid='yes';s.offers[0].otFactor=-1}],
  ['customBase text','abc',s=>{s.offers[0].bhMode='custom';s.offers[0].base='custom';s.offers[0].customBase='abc'}],
  ['customBase negative',-1,s=>{s.offers[0].bhMode='custom';s.offers[0].base='custom';s.offers[0].customBase=-1}],
  ['probPct text','abc',s=>{s.offers[0].probationEnabled='yes';s.offers[0].probPct='abc';s.offers[0].probMon=2;s.offers[0].probInsurance='yes'}],
  ['probPct negative',-1,s=>{s.offers[0].probationEnabled='yes';s.offers[0].probPct=-1;s.offers[0].probMon=2;s.offers[0].probInsurance='yes'}],
  ['probMon text','abc',s=>{s.offers[0].probationEnabled='yes';s.offers[0].probPct=85;s.offers[0].probMon='abc';s.offers[0].probInsurance='yes'}],
  ['probMon negative',-1,s=>{s.offers[0].probationEnabled='yes';s.offers[0].probPct=85;s.offers[0].probMon=-1;s.offers[0].probInsurance='yes'}],
  ['guaranteedBonusMonths text','abc',s=>{s.offers[0].guaranteedBonusMonths='abc'}],
  ['guaranteedBonusMonths negative',-1,s=>{s.offers[0].guaranteedBonusMonths=-1}],
  ['performanceBonusValue text','abc',s=>{s.offers[0].performanceBonusValue='abc'}],
  ['performanceBonusValue negative',-1,s=>{s.offers[0].performanceBonusValue=-1}],
  ['fixedAllowance text','abc',s=>{s.offers[0].fixedAllowance='abc'}],
  ['fixedAllowance negative',-1,s=>{s.offers[0].fixedAllowance=-1}],
  ['paidLeaveDays text','abc',s=>{s.offers[0].paidLeaveDays='abc'}],
  ['paidLeaveDays negative',-1,s=>{s.offers[0].paidLeaveDays=-1}],
  ['otBaseAmount text','abc',s=>{s.offers[0].otMonthly=4;s.offers[0].otPaid='yes';s.offers[0].otBaseMode='custom';s.offers[0].otBaseAmount='abc'}],
  ['otBaseAmount negative',-1,s=>{s.offers[0].otMonthly=4;s.offers[0].otPaid='yes';s.offers[0].otBaseMode='custom';s.offers[0].otBaseAmount=-1}],
  ['solver target text','abc',s=>{s.solver={...s.solver,enabled:true,goalMonthlyNet:true,targetMonthlyNet:'abc'}}],
  ['solver target negative',-1,s=>{s.solver={...s.solver,enabled:true,goalMonthlyNet:true,targetMonthlyNet:-1}}],
  ['switch guarantee text','abc',s=>{s.switching={...s.switching,enabled:true,currentGuaranteedIfStay:'abc'}}],
  ['switch guarantee negative',-1,s=>{s.switching={...s.switching,enabled:true,currentGuaranteedIfStay:-1}}]
];

for(const [label,,mutate] of badOptionalFields){
  const s=one(30_000_000);
  mutate(s);
  const out=engine.calculate(s);
  assertCleanResult(out,label);
}
console.log('BAD_INPUT_GUARD=PASS',badOptionalFields.length+3,'cases');
