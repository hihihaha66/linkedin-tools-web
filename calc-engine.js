const R_BHXH=0.08,R_BHYT=0.015,R_BHTN=0.01;
const RATE_ER_BASE=0.205,RATE_ER_BHTN=0.01;
const CAP_BHXH=50600000,REF_LEVEL=2530000,SELF=15500000,DEP=6200000;
const MINWAGE={I:5310000,II:4730000,III:4140000,IV:3700000};
const STD_HRS=176,WKS=4.33,DAY_MS=86400000,MIN_SWITCH_CURRENT_NET=1000000;
const ALLOWED_ORIGINS=new Set(['https://hihihaha66.github.io','http://localhost:8000','http://127.0.0.1:8000']);
const MAX_BODY_BYTES=32768,RATE_WINDOW_MS=60000,RATE_MAX=120;
const RATE_BUCKETS=globalThis.__offerV2RateBuckets||(globalThis.__offerV2RateBuckets=new Map());

function num(v){if(v==null)return NaN;const n=parseFloat(String(v).replace(/,/g,''));return Number.isFinite(n)?n:NaN;}
function numF(v){if(v==null)return NaN;const n=parseFloat(String(v).trim().replace(',','.'));return Number.isFinite(n)?n:NaN;}
function safeNonNeg(v,cap){const n=numF(v);if(!Number.isFinite(n)||n<0)return 0;return Number.isFinite(cap)?Math.min(n,cap):n;}
function fmt(v){if(!Number.isFinite(v))return '-';return Math.round(v).toLocaleString('en-US')+'đ';}
function fmtN(v,d=1){if(!Number.isFinite(v))return '-';return Number(v.toFixed(d)).toLocaleString('en-US');}
function fmtShort(v){
  if(!Number.isFinite(v))return '-';
  const sign=v<0?'-':'',a=Math.abs(v);
  if(a>=1e9)return sign+Number((a/1e9).toFixed(a>=10e9?0:1)).toLocaleString('vi-VN')+' tỷ';
  if(a>=1e6)return sign+Number((a/1e6).toFixed(a>=100e6?0:1)).toLocaleString('vi-VN')+'tr';
  if(a>=1e3)return sign+Number((a/1e3).toFixed(a>=100e3?0:1)).toLocaleString('vi-VN')+'k';
  return sign+Math.round(a).toLocaleString('en-US')+'đ';
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function parseDate(v){
  const m=String(v??'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
  const dt=new Date(Date.UTC(y,mo-1,d));
  if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return null;
  return dt;
}
function monthNo(dt){return dt?dt.getUTCMonth()+1:null;}
function gapDaysBetween(lastDay,onboard){
  if(!lastDay||!onboard)return null;
  return Math.max(0,Math.floor((onboard-lastDay)/DAY_MS)-1);
}
function daysInclusive(start,end){if(!start||!end||end<start)return 0;return Math.floor((end-start)/DAY_MS)+1;}
function addDays(dt,days){return new Date(dt.getTime()+Math.round(days)*DAY_MS);}
function monthStartUtc(dt){return dt?new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth(),1)):null;}
function monthEndUtc(dt){return dt?new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth()+1,0)):null;}
function monthlyIncomeForRange(start,end,monthlyAmount){
  if(!start||!end||end<start||!Number.isFinite(monthlyAmount))return 0;
  let cursor=new Date(start.getTime()),total=0,guard=0;
  while(cursor<=end&&guard++<36){
    const mStart=monthStartUtc(cursor),mEnd=monthEndUtc(cursor),segEnd=end<mEnd?end:mEnd;
    const fullMonth=cursor.getTime()===mStart.getTime()&&segEnd.getTime()===mEnd.getTime();
    total+=fullMonth?monthlyAmount:monthlyAmount/30*daysInclusive(cursor,segEnd);
    cursor=addDays(segEnd,1);
  }
  return total;
}
function minDate(a,b){return a&&b?(a<b?a:b):(a||b);}
function maxDate(a,b){return a&&b?(a>b?a:b):(a||b);}
function endOfYear(dt){return dt?new Date(Date.UTC(dt.getUTCFullYear(),11,31)):null;}
function dateLabel(dt){if(!dt)return'-';return String(dt.getUTCDate()).padStart(2,'0')+'/'+String(dt.getUTCMonth()+1).padStart(2,'0')+'/'+dt.getUTCFullYear();}

function clientIp(req){
  const x=String(req.headers?.['x-forwarded-for']||'').split(',')[0].trim();
  return x||String(req.headers?.['x-real-ip']||'').trim();
}
function allowRequest(req){
  const ip=clientIp(req);if(!ip)return true;
  const now=Date.now();let b=RATE_BUCKETS.get(ip);
  if(!b||now-b.start>=RATE_WINDOW_MS)b={start:now,count:0};
  b.count++;RATE_BUCKETS.set(ip,b);
  if(RATE_BUCKETS.size>2000){for(const [k,v] of RATE_BUCKETS){if(now-v.start>RATE_WINDOW_MS*2)RATE_BUCKETS.delete(k);}}
  return b.count<=RATE_MAX;
}
function bodyTooLarge(raw,req){
  const len=Number(req.headers?.['content-length']||0);if(Number.isFinite(len)&&len>MAX_BODY_BYTES)return true;
  try{return Buffer.byteLength(typeof raw==='string'?raw:JSON.stringify(raw??{}),'utf8')>MAX_BODY_BYTES;}catch{return true;}
}

function progressiveTax(taxable,annual=false){
  const t=Math.max(0,taxable),m=annual?12:1;
  const brackets=[[10e6*m,.05],[30e6*m,.10],[60e6*m,.20],[100e6*m,.30],[Infinity,.35]];
  let tax=0,prev=0;
  for(const [cap,rate] of brackets){
    if(t>prev){const slice=Math.min(t,cap)-prev;if(slice>0)tax+=slice*rate;}
    if(t<=cap)break;
    prev=cap;
  }
  return tax;
}

function insuranceBases(insuredInput,region){
  return{
    bhxhBase:Math.min(Math.max(0,insuredInput),CAP_BHXH),
    bhtnBase:Math.min(Math.max(0,insuredInput),20*MINWAGE[region])
  };
}

function scenario(gross,insuredInput,deps,region,hasInsurance=true){
  const {bhxhBase,bhtnBase}=insuranceBases(hasInsurance?insuredInput:0,region);
  const bhxh=bhxhBase*R_BHXH,bhyt=bhxhBase*R_BHYT,bhtn=bhtnBase*R_BHTN;
  const eeIns=bhxh+bhyt+bhtn;
  const erIns=bhxhBase*RATE_ER_BASE+bhtnBase*RATE_ER_BHTN;
  const taxable=gross-eeIns-SELF-(deps>0?deps*DEP:0);
  const tax=progressiveTax(taxable,false);
  return{gross,bhxhBase,bhtnBase,bhxh,bhyt,bhtn,eeIns,erIns,tax,net:gross-eeIns-tax};
}

function annualNet(grossTotal,annualEeIns,deps){
  const taxable=grossTotal-annualEeIns-SELF*12-(deps>0?deps*DEP*12:0);
  const tax=progressiveTax(taxable,true);
  return{tax,net:grossTotal-annualEeIns-tax};
}

function solveGrossFromNet(targetNet,deps,region,insuredFor,hasInsurance=true){
  let lo=Math.max(0,targetNet),hi=Math.max(targetNet*2+60000000,120000000);
  for(let it=0;it<80;it++){
    const mid=(lo+hi)/2,ins=hasInsurance?insuredFor(mid):0;
    if(scenario(mid,ins,deps,region,hasInsurance).net<targetNet)lo=mid;else hi=mid;
  }
  return(lo+hi)/2;
}

function grossUpAnnualNetBonus(baseGross,annualEeIns,deps,desiredNet){
  if(!Number.isFinite(desiredNet)||desiredNet<=0)return 0;
  const baseNet=annualNet(baseGross,annualEeIns,deps).net;
  let lo=0,hi=Math.max(desiredNet*2+60000000,120000000);
  for(let it=0;it<80;it++){
    const mid=(lo+hi)/2;
    const delta=annualNet(baseGross+mid,annualEeIns,deps).net-baseNet;
    if(delta<desiredNet)lo=mid;else hi=mid;
  }
  return(lo+hi)/2;
}

function bonusInputLabel(s,type){
  if(type==='guaranteed'){
    if(!s||s.guaranteedBonusMonths<=0)return'-';
    return fmtN(s.guaranteedBonusMonths)+' tháng '+(s.fromNet?'net':'gross');
  }
  if(!s||!s.hasPerformanceBonus)return'-';
  if(s.performanceBonusType==='amount')return fmt(s.performanceBonusOfferValue)+' '+(s.fromNet?'net':'gross');
  return fmtN(s.performanceBonusValue)+' tháng '+(s.fromNet?'net':'gross');
}

function computeOffer(o,deps,region){
  const amt=num(o.gross);if(!Number.isFinite(amt)||amt<=0)return null;
  const depsReady=Number.isFinite(deps)&&deps>=0&&Math.floor(deps)===deps,depsCalc=depsReady?deps:0;
  const rawC=num(o.customBase);
  const fixedAllowance=safeNonNeg(String(o.fixedAllowance??'').replace(/,/g,''));
  const allowanceBh=['yes','no'].includes(o.allowanceBh)?o.allowanceBh:'unknown';
  const bhMode=['unknown','salary','custom'].includes(o.bhMode)?o.bhMode:'unknown';
  const useCustomBh=bhMode==='custom',bhModeMissing=bhMode==='unknown';
  const bhCustomMissing=useCustomBh&&!(Number.isFinite(rawC)&&rawC>0);
  const allowanceBhMissing=fixedAllowance>0&&!useCustomBh&&allowanceBh==='unknown';
  const insuranceReady=!bhModeMissing&&!bhCustomMissing&&!allowanceBhMissing;
  const insuredFor=g=>{
    const maxIns=g+fixedAllowance;
    const defaultIns=g+(fixedAllowance>0&&allowanceBh!=='no'?fixedAllowance:0);
    let ins=(useCustomBh&&Number.isFinite(rawC)&&rawC>0)?rawC:defaultIns;
    if(ins>maxIns)ins=maxIns;
    return Math.max(0,ins);
  };

  const gross=o.payType==='net'?solveGrossFromNet(amt,depsCalc,region,insuredFor,true):amt;
  const insuredInput=insuredFor(gross);
  const s=scenario(gross,insuredInput,depsCalc,region,true);
  s.fixedAllowance=fixedAllowance;
  s.salaryNet=s.net;
  s.salaryTax=s.tax;
  s.totalMonthlyGross=s.gross+s.fixedAllowance;
  if(s.fixedAllowance>0){
    const totalTaxable=s.totalMonthlyGross-s.eeIns-SELF-(depsCalc>0?depsCalc*DEP:0);
    s.tax=progressiveTax(totalTaxable,false);
    s.net=s.totalMonthlyGross-s.eeIns-s.tax;
  }
  s.allowanceNetEffect=s.net-s.salaryNet;
  Object.assign(s,{
    name:o.name||'Offer',fromNet:o.payType==='net',payType:o.payType==='net'?'net':'gross',enteredSalary:amt,insuredInput,allowanceBh,bhMode,bhModeAssumed:false,bhModeMissing,bhCustomMissing,allowanceBhMissing,depsReady,financialReady:depsReady&&insuranceReady,
    allowanceBhAssumed:false,
    under:useCustomBh&&Number.isFinite(rawC)&&rawC>0&&rawC<gross,
    over:useCustomBh&&Number.isFinite(rawC)&&rawC>gross+s.fixedAllowance,
    belowRef:useCustomBh&&Number.isFinite(rawC)&&rawC>0&&rawC<REF_LEVEL,
    belowMinWage:gross<MINWAGE[region]
  });

  const daysRaw=numF(o.days),daysMissing=!Number.isFinite(daysRaw),daysInvalid=Number.isFinite(daysRaw)&&(daysRaw<0||daysRaw>7);
  const commuteRaw=numF(o.commute),commuteMissing=!Number.isFinite(commuteRaw),commuteInvalid=Number.isFinite(commuteRaw)&&(commuteRaw<0||commuteRaw>24*60);
  const otMonthlyInput=numF(o.otMonthly),legacyOt=safeNonNeg(o.ot,168),otMonthlyMissing=!Number.isFinite(otMonthlyInput)&&!(legacyOt>0),otMonthlyInvalid=Number.isFinite(otMonthlyInput)&&(otMonthlyInput<0||otMonthlyInput>744);
  const days=daysInvalid||daysMissing?null:daysRaw;
  const cm=commuteInvalid||commuteMissing?0:commuteRaw;
  const otMonthly=otMonthlyInvalid||otMonthlyMissing?0:(Number.isFinite(otMonthlyInput)?otMonthlyInput:legacyOt*WKS);
  s.daysMissing=daysMissing;s.commuteMissing=commuteMissing;s.otMonthlyMissing=otMonthlyMissing;
  s.daysInvalid=daysInvalid;s.commuteInvalid=commuteInvalid;s.otMonthlyInvalid=otMonthlyInvalid;
  s.commuteNeedsDays=!commuteMissing&&cm>0&&daysMissing;
  s.hasT=!daysMissing||!commuteMissing||!otMonthlyMissing;
  s.officeDays=Number.isFinite(days)?days:null;
  s.commuteMin=cm;
  s.commuteH=(Number.isFinite(days)&&days>0&&cm>0)?days*cm*2/60*WKS:0;
  s.otH=otMonthly;
  s.otMonthly=otMonthly;
  s.otAnnualizedHours=otMonthly*12;
  s.otMonthlyOver40=otMonthly>40+1e-9;
  s.otAnnualOver200=s.otAnnualizedHours>200+1e-9;
  s.otAnnualOver300=s.otAnnualizedHours>300+1e-9;
  s.otPaid=['yes','no'].includes(o.otPaid)?o.otPaid:'unknown';
  s.otPaidMissing=s.otH>0&&s.otPaid==='unknown';
  const newOtType=['weekday','rest','mixed'].includes(o.otType)?o.otType:null;
  s.otType=newOtType||'legacy';
  const minFactor=s.otType==='rest'?200:150;
  const factorRaw=numF(o.otFactor);
  s.otFactorInvalid=s.otPaid==='yes'&&s.otType!=='mixed'&&Number.isFinite(factorRaw)&&(factorRaw<=0||factorRaw>1000);
  s.otFactor=s.otFactorInvalid?null:((s.otPaid==='yes'&&Number.isFinite(factorRaw)&&factorRaw>0)?factorRaw:(s.otPaid==='yes'&&newOtType&&s.otType!=='mixed'?minFactor:null));
  s.otFactorBelowLegalMin=s.otPaid==='yes'&&s.otType!=='mixed'&&s.otFactor!=null&&s.otFactor<minFactor;
  const bwRaw=numF(o.otBreakdownWeekday),brRaw=numF(o.otBreakdownRest),bhRaw=numF(o.otBreakdownHoliday);
  s.otBreakdownWeekdayInvalid=Number.isFinite(bwRaw)&&(bwRaw<0||bwRaw>744);
  s.otBreakdownRestInvalid=Number.isFinite(brRaw)&&(brRaw<0||brRaw>744);
  s.otBreakdownHolidayInvalid=Number.isFinite(bhRaw)&&(bhRaw<0||bhRaw>744);
  s.otBreakdownWeekday=s.otBreakdownWeekdayInvalid?0:(Number.isFinite(bwRaw)?bwRaw:0);
  s.otBreakdownRest=s.otBreakdownRestInvalid?0:(Number.isFinite(brRaw)?brRaw:0);
  s.otBreakdownHoliday=s.otBreakdownHolidayInvalid?0:(Number.isFinite(bhRaw)?bhRaw:0);
  const fWRaw=numF(o.otFactorWeekday),fRRaw=numF(o.otFactorRest),fHRaw=numF(o.otFactorHoliday);
  s.otFactorWeekdayInvalid=Number.isFinite(fWRaw)&&(fWRaw<=0||fWRaw>1000);
  s.otFactorRestInvalid=Number.isFinite(fRRaw)&&(fRRaw<=0||fRRaw>1000);
  s.otFactorHolidayInvalid=Number.isFinite(fHRaw)&&(fHRaw<=0||fHRaw>1000);
  s.otFactorWeekday=s.otFactorWeekdayInvalid?null:(Number.isFinite(fWRaw)?fWRaw:150);
  s.otFactorRest=s.otFactorRestInvalid?null:(Number.isFinite(fRRaw)?fRRaw:200);
  s.otFactorHoliday=s.otFactorHolidayInvalid?null:(Number.isFinite(fHRaw)?fHRaw:300);
  s.otMixedFactorBelowLegalMin=s.otPaid==='yes'&&s.otType==='mixed'&&Number.isFinite(s.otFactorWeekday)&&Number.isFinite(s.otFactorRest)&&Number.isFinite(s.otFactorHoliday)&&(s.otFactorWeekday<150||s.otFactorRest<200||s.otFactorHoliday<300);
  const breakdownTotal=s.otBreakdownWeekday+s.otBreakdownRest+s.otBreakdownHoliday;
  s.otBreakdownMismatch=s.otPaid==='yes'&&s.otType==='mixed'&&Math.abs(breakdownTotal-s.otH)>0.05;
  s.otBaseMode=o.otBaseMode==='custom'?'custom':'offer';
  const otBaseRaw=num(o.otBaseAmount);
  s.otBaseMissing=s.otPaid==='yes'&&s.otBaseMode==='custom'&&!(Number.isFinite(otBaseRaw)&&otBaseRaw>0);
  s.otBaseMonthly=s.otBaseMode==='custom'&&Number.isFinite(otBaseRaw)&&otBaseRaw>0?Math.min(otBaseRaw,1e12):s.gross;
  s.otHourlyBase=s.otBaseMonthly/STD_HRS;
  if(s.otType==='mixed')s.otWeightedUnits=s.otBreakdownWeekday*s.otFactorWeekday/100+s.otBreakdownRest*s.otFactorRest/100+s.otBreakdownHoliday*s.otFactorHoliday/100;
  else s.otWeightedUnits=s.otFactor!=null?s.otH*s.otFactor/100:0;
  const otConfigInvalid=s.otMonthlyInvalid||s.otFactorInvalid||s.otBreakdownWeekdayInvalid||s.otBreakdownRestInvalid||s.otBreakdownHolidayInvalid||s.otFactorWeekdayInvalid||s.otFactorRestInvalid||s.otFactorHolidayInvalid;
  const otPayReady=s.otPaid==='yes'&&s.otH>0&&!s.otBaseMissing&&!s.otBreakdownMismatch&&!otConfigInvalid&&s.otWeightedUnits>0;
  s.otPayReady=otPayReady;
  s.otPayKnown=s.otH<=0||s.otPaid==='no'||otPayReady;
  s.otPayMonthly=otPayReady?s.otHourlyBase*s.otWeightedUnits:0;
  s.monthlyTakeHomeWithOt=s.financialReady&&s.otPayKnown?s.net+s.otPayMonthly:null;
  const otWarnings=[];
  if(s.otMonthlyOver40)otWarnings.push('OT '+fmtN(s.otH,1)+'h/tháng vượt mốc 40h/tháng');
  if(s.otAnnualOver300)otWarnings.push('nếu duy trì 12 tháng ≈ '+fmtN(s.otAnnualizedHours,0)+'h/năm, vượt mốc 300h/năm');
  else if(s.otAnnualOver200)otWarnings.push('nếu duy trì 12 tháng ≈ '+fmtN(s.otAnnualizedHours,0)+'h/năm, vượt mốc 200h/năm; một số ngành/trường hợp có thể đến 300h/năm');
  s.otGuardrailText=otWarnings.join('; ')+(otWarnings.length?'.':'');

  s.probationEnabled=['yes','no'].includes(o.probationEnabled)?o.probationEnabled:'unknown';
  s.probationKnown=s.probationEnabled!=='unknown';
  const pp=numF(o.probPct),pmRaw=numF(o.probMon),probMonthsInvalid=Number.isFinite(pmRaw)&&(pmRaw<=0||pmRaw>12),pm=probMonthsInvalid?0:(Number.isFinite(pmRaw)?pmRaw:0);
  const probPctBlank=!Number.isFinite(pp);
  s.probPctN=s.probationEnabled==='yes'?(probPctBlank?null:((pp>0&&pp<=100)?pp:null)):null;
  s.probPctMissing=s.probationEnabled==='yes'&&probPctBlank;
  s.probPctDefaulted=false;
  s.probPctInvalid=s.probationEnabled==='yes'&&!probPctBlank&&s.probPctN==null;
  s.probMonthsInvalid=s.probationEnabled==='yes'&&probMonthsInvalid;
  s.probMissingMonths=s.probationEnabled==='yes'&&!(pm>0);
  s.probM=(s.probationEnabled==='yes'&&s.probPctN!=null&&pm>0)?pm:0;
  s.probInsurance=['yes','no'].includes(o.probInsurance)?o.probInsurance:'unknown';
  s.probInsuranceMissing=s.probationEnabled==='yes'&&s.probInsurance==='unknown';
  s.probJobType=['manager','college','intermediate','other'].includes(o.probJobType)?o.probJobType:'unknown';
  s.probBelow85=s.probM>0&&s.probPctN<85;
  const probMaxMonths={manager:6,college:2,intermediate:1,other:6/22};
  s.probTooLong=s.probM>0&&s.probJobType!=='unknown'&&s.probM>probMaxMonths[s.probJobType]+1e-9;
  s.annualReady=s.financialReady&&s.probationKnown&&!(s.probationEnabled==='yes'&&(s.probPctMissing||s.probPctInvalid||s.probMissingMonths||s.probMonthsInvalid||s.probInsuranceMissing));
  if(s.probM>0){
    let pg;
    if(s.fromNet){
      const targetProbNet=amt*s.probPctN/100;
      const probInsFor=g=>s.probInsurance==='yes'?Math.min(insuredInput,g+s.fixedAllowance):0;
      pg=solveGrossFromNet(targetProbNet,depsCalc,region,probInsFor,s.probInsurance==='yes');
    }else pg=gross*s.probPctN/100;
    const pIns=s.probInsurance==='yes'?Math.min(insuredInput,pg+s.fixedAllowance):0;
    const ps=scenario(pg,pIns,depsCalc,region,s.probInsurance==='yes');
    const pTotalGross=pg+s.fixedAllowance;
    const pTax=progressiveTax(pTotalGross-ps.eeIns-SELF-(depsCalc>0?depsCalc*DEP:0),false);
    s.probGross=pg;s.probTotalGross=pTotalGross;s.probNet=pTotalGross-ps.eeIns-pTax;s.probEeIns=ps.eeIns;s.probTax=pTax;
    s.probDelta=(s.probNet-s.net)*s.probM;
  }else{
    s.probGross=0;s.probTotalGross=0;s.probNet=0;s.probEeIns=0;s.probTax=0;s.probDelta=0;
  }

  const probOtBase=s.otBaseMode==='custom'&&s.gross>0?s.otBaseMonthly*(s.probGross/s.gross):s.probGross;
  s.probOtPayMonthly=(s.otPaid==='yes'&&s.otPayMonthly>0&&s.probM>0)?probOtBase/STD_HRS*s.otWeightedUnits:0;

  const guaranteedRaw=numF(o.guaranteedBonusMonths);
  s.guaranteedBonusInvalid=Number.isFinite(guaranteedRaw)&&(guaranteedRaw<0||guaranteedRaw>24);
  s.guaranteedBonusMonths=s.guaranteedBonusInvalid?0:(Number.isFinite(guaranteedRaw)?guaranteedRaw:0);
  s.performanceBonusType=o.performanceBonusType==='amount'?'amount':'months';
  const perfRaw=numF(String(o.performanceBonusValue??'').replace(/,/g,''));
  s.performanceBonusInvalid=Number.isFinite(perfRaw)&&(perfRaw<0||(s.performanceBonusType==='months'&&perfRaw>24)||(s.performanceBonusType==='amount'&&perfRaw>1e12));
  s.performanceBonusValue=s.performanceBonusInvalid?0:(Number.isFinite(perfRaw)?perfRaw:0);
  const leaveRaw=numF(o.paidLeaveDays);
  s.paidLeaveMissing=!Number.isFinite(leaveRaw);
  s.paidLeaveInvalid=Number.isFinite(leaveRaw)&&(leaveRaw<0||leaveRaw>60);
  s.paidLeaveDays=s.paidLeaveMissing||s.paidLeaveInvalid?0:leaveRaw;
  if(s.guaranteedBonusInvalid)s.annualReady=false;
  s.performanceReady=s.annualReady&&!s.performanceBonusInvalid;

  const probMonths=s.probM||0,fullMonths=12-probMonths;
  s.otPayAnnual=s.otPayMonthly*fullMonths+(probMonths>0?s.probOtPayMonthly*probMonths:0);
  s.annualBaseGross=s.gross*fullMonths+(probMonths>0?s.probGross*probMonths:0);
  s.annualAllowance=s.fixedAllowance*12;
  s.annualEeIns=s.eeIns*fullMonths+(probMonths>0?s.probEeIns*probMonths:0);

  s.guaranteedBonusOfferValue=amt*s.guaranteedBonusMonths;
  const beforeGuaranteed=s.annualBaseGross+s.annualAllowance;
  s.guaranteedBonusGross=s.fromNet
    ?grossUpAnnualNetBonus(beforeGuaranteed,s.annualEeIns,depsCalc,s.guaranteedBonusOfferValue)
    :s.guaranteedBonusOfferValue;
  s.guaranteedAnnualGross=beforeGuaranteed+s.guaranteedBonusGross;
  const guaranteed=annualNet(s.guaranteedAnnualGross,s.annualEeIns,depsCalc);
  s.guaranteedAnnualTax=guaranteed.tax;s.guaranteedAnnualNet=guaranteed.net;

  s.performanceBonusOfferValue=s.performanceBonusType==='amount'?s.performanceBonusValue:amt*s.performanceBonusValue;
  s.hasPerformanceBonus=s.performanceBonusOfferValue>0;
  s.performanceBonusGross=s.hasPerformanceBonus
    ?(s.fromNet?grossUpAnnualNetBonus(s.guaranteedAnnualGross,s.annualEeIns,depsCalc,s.performanceBonusOfferValue):s.performanceBonusOfferValue)
    :0;
  s.performanceAnnualGross=s.guaranteedAnnualGross+s.performanceBonusGross;
  const performance=annualNet(s.performanceAnnualGross,s.annualEeIns,depsCalc);
  s.performanceAnnualTax=performance.tax;s.performanceAnnualNet=performance.net;

  s.leaveHours=s.paidLeaveDays*8;
  s.timeReady=!(s.daysMissing||s.commuteMissing||s.otMonthlyMissing||s.paidLeaveMissing||s.daysInvalid||s.commuteInvalid||s.otMonthlyInvalid||s.paidLeaveInvalid||s.commuteNeedsDays);
  s.annualHours=Math.max(1,STD_HRS*12-s.leaveHours+(s.commuteH+s.otH)*12);
  s.avgMonthlyHours=s.annualHours/12;
  s.guaranteedPerHour=s.annualReady&&s.timeReady?s.guaranteedAnnualNet/s.annualHours:null;
  s.guaranteedPerHourWithOt=s.annualReady&&s.timeReady&&s.otPayKnown?(s.guaranteedAnnualNet+s.otPayAnnual)/s.annualHours:null;
  s.performancePerHour=s.hasPerformanceBonus&&s.performanceReady&&s.timeReady?s.performanceAnnualNet/s.annualHours:null;
  s.performancePerHourWithOt=s.hasPerformanceBonus&&s.performanceReady&&s.timeReady&&s.otPayKnown?(s.performanceAnnualNet+s.otPayAnnual)/s.annualHours:null;
  return s;
}

function compute(state){
  let deps=num(state.deps);if(Number.isFinite(deps)&&deps>=0)deps=Math.floor(deps);else deps=NaN;
  const region=MINWAGE[state.region]?state.region:'I';
  return(state.offers||[]).slice(0,2).map(o=>computeOffer(o||{},deps,region));
}

function normalizedDeps(state){
  const deps=num(state.deps);return Number.isFinite(deps)&&deps>=0?Math.floor(deps):NaN;
}

function marginalGuaranteedBonusNet(s,ratio,deps){
  if(!s||s.guaranteedBonusOfferValue<=0)return 0;
  const r=Math.max(0,Math.min(1,ratio));
  if(s.fromNet)return s.guaranteedBonusOfferValue*r;
  const baseGross=s.annualBaseGross+s.annualAllowance;
  const baseNet=annualNet(baseGross,s.annualEeIns,deps).net;
  const withBonus=annualNet(baseGross+s.guaranteedBonusGross*r,s.annualEeIns,deps).net;
  return Math.max(0,withBonus-baseNet);
}

function marginalPerformanceBonusNet(s,ratio,deps){
  if(!s||!s.hasPerformanceBonus||s.performanceBonusOfferValue<=0)return 0;
  const r=Math.max(0,Math.min(1,ratio));
  if(s.fromNet)return s.performanceBonusOfferValue*r;
  const baseGross=s.guaranteedAnnualGross;
  const baseNet=annualNet(baseGross,s.annualEeIns,deps).net;
  const withBonus=annualNet(baseGross+s.performanceBonusGross*r,s.annualEeIns,deps).net;
  return Math.max(0,withBonus-baseNet);
}

function computeSwitching(state,r){
  const sw=state.switching||{};
  if(!sw.enabled)return{enabled:false,show:false};
  const idx=sw.targetOffer==='1'?1:0,offer=r[idx];
  if(!offer)return{enabled:true,show:true,needs:['Nhập lương cho offer bạn muốn chuyển sang.']};

  const needs=[],performanceNeeds=[];
  const lastDay=parseDate(sw.lastWorkingDate),onboard=parseDate(sw.onboardDate);
  const comparisonYear=onboard?onboard.getUTCFullYear():(lastDay?lastDay.getUTCFullYear():null);
  const yearEnd=comparisonYear!=null?new Date(Date.UTC(comparisonYear,11,31)):null;
  const comparisonStart=lastDay&&comparisonYear!=null?(lastDay.getUTCFullYear()<comparisonYear?new Date(Date.UTC(comparisonYear,0,1)):addDays(lastDay,1)):null;
  const policyYearWarning=comparisonYear&&comparisonYear!==2026?'Mốc so sánh thuộc năm '+comparisonYear+'; tool vẫn đang dùng tham số thuế và bảo hiểm của bộ quy tắc 2026. Quy định áp dụng cho '+comparisonYear+' có thể khác.':'';

  if(!lastDay)needs.push('Nhập ngày làm việc cuối cùng ở công ty hiện tại.');
  if(!onboard)needs.push('Nhập ngày onboard công ty mới.');
  if(lastDay&&onboard&&onboard<lastDay)needs.push('Ngày onboard đang trước ngày làm việc cuối cùng. Hãy kiểm tra lại hai ngày này.');
  if(!offer.financialReady)needs.push(offer.name+': '+financialMissingReason(offer)+'.');
  if(offer.probationEnabled==='unknown')needs.push(offer.name+': chưa xác nhận có giai đoạn thử việc cần tính riêng hay không.');
  if(offer.probationEnabled==='yes'&&offer.probPctMissing)needs.push(offer.name+': đã bật thử việc nhưng chưa nhập % lương thử việc.');
  if(offer.probationEnabled==='yes'&&offer.probPctInvalid)needs.push(offer.name+': % lương thử việc cần lớn hơn 0 và không vượt 100%.');
  if(offer.probationEnabled==='yes'&&offer.probMissingMonths)needs.push(offer.name+': đã chọn tính riêng thử việc nhưng chưa nhập thời gian thử việc hợp lệ.');
  if(offer.probationEnabled==='yes'&&offer.probInsuranceMissing)needs.push(offer.name+': chưa xác nhận trong thời gian thử việc có đóng BH bắt buộc hay không.');

  const currentNet=num(sw.currentNet),currentNetTooSmall=Number.isFinite(currentNet)&&currentNet>0&&currentNet<MIN_SWITCH_CURRENT_NET;
  if(currentNetTooSmall)needs.push('Net hiện tại đang là '+fmt(currentNet)+'. Ô này nhập theo đồng; nếu bạn muốn nhập 22 triệu, hãy nhập 22,000,000đ.');
  const hasCurrentNet=Number.isFinite(currentNet)&&currentNet>=MIN_SWITCH_CURRENT_NET;
  if(sw.currentFinancialBlocked)needs.push('Công việc hiện tại: '+(sw.currentFinancialReason||'còn thiếu dữ liệu để tính Net')+'.');
  else if(!hasCurrentNet)needs.push('Hoàn thiện Công việc hiện tại để tool tính Net làm mốc so đến 31/12.');

  const deps=normalizedDeps(state);
  const validMoney=v=>{const n=num(v);return Number.isFinite(n)&&n>=0?n:null;};
  const currentGuaranteedStay=validMoney(sw.currentGuaranteedIfStay);
  if(currentGuaranteedStay==null)needs.push('Nhập thưởng đảm bảo nếu ở lại đến 31/12; nhập 0 nếu không có.');
  const currentGuaranteedRule=['unknown','lost','time','full','custom'].includes(sw.currentGuaranteedRule)?sw.currentGuaranteedRule:'unknown';
  if(currentGuaranteedStay>0&&currentGuaranteedRule==='unknown')needs.push('Chọn nếu nghỉ vào ngày trên thì thưởng đảm bảo bên hiện tại sẽ thế nào.');
  let currentGuaranteedReceived=currentGuaranteedStay===0?0:null,currentGuaranteedNote=currentGuaranteedStay===0?'Bạn xác nhận không có thưởng đảm bảo nếu ở lại.':'';
  if(currentGuaranteedStay>0){
    if(currentGuaranteedRule==='lost'){currentGuaranteedReceived=0;currentGuaranteedNote='Bạn chọn mất toàn bộ thưởng đảm bảo nếu nghỉ.';}
    else if(currentGuaranteedRule==='full'){currentGuaranteedReceived=currentGuaranteedStay;currentGuaranteedNote='Bạn chọn vẫn nhận đủ thưởng đảm bảo nếu nghỉ.';}
    else if(currentGuaranteedRule==='time'&&lastDay){const m=monthNo(lastDay);currentGuaranteedReceived=currentGuaranteedStay*m/12;currentGuaranteedNote='Nghỉ trong tháng '+m+' → tool tính '+m+'/12 thưởng đảm bảo. Đây là giả định theo tháng, nên nghỉ đầu hay cuối tháng '+m+' vẫn tính trọn tháng '+m+'.';}
    else if(currentGuaranteedRule==='custom'){const v=validMoney(sw.currentGuaranteedIfLeave);if(v==null)needs.push('Nhập số thưởng đảm bảo bên hiện tại dự kiến vẫn nhận khi nghỉ.');else{currentGuaranteedReceived=v;currentGuaranteedNote='Dùng đúng số thưởng đảm bảo bạn nhập.';}}
  }

  let newGuaranteed=offer.guaranteedBonusOfferValue<=0?0:null,newGuaranteedRatio=null;
  const newGuaranteedRule=['unknown','time','full','none','custom'].includes(sw.newGuaranteedRule)?sw.newGuaranteedRule:'unknown';
  let newGuaranteedNote=offer.guaranteedBonusOfferValue<=0?'Offer mới không có thưởng đảm bảo theo dữ liệu đã nhập.':'';
  if(offer.guaranteedBonusOfferValue>0){
    if(newGuaranteedRule==='unknown')needs.push('Chọn thưởng đảm bảo ở công ty mới trong năm onboard sẽ được tính thế nào.');
    else if(newGuaranteedRule==='none'){newGuaranteed=0;newGuaranteedNote='Bạn chọn không nhận thưởng đảm bảo trong năm onboard.';}
    else if(newGuaranteedRule==='full'){newGuaranteed=marginalGuaranteedBonusNet(offer,1,deps);newGuaranteedRatio=1;newGuaranteedNote='Bạn chọn nhận đủ thưởng đảm bảo đã nhập ở offer.';}
    else if(newGuaranteedRule==='time'&&onboard){newGuaranteedRatio=(13-monthNo(onboard))/12;newGuaranteed=marginalGuaranteedBonusNet(offer,newGuaranteedRatio,deps);newGuaranteedNote='Onboard tháng '+monthNo(onboard)+' → tool tính '+(13-monthNo(onboard))+'/12 thưởng đảm bảo. Đây là giả định tính theo tháng, nên tháng onboard được tính là một tháng đầy đủ.';}
    else if(newGuaranteedRule==='custom'){const v=validMoney(sw.newGuaranteedCustom);if(v==null)needs.push('Nhập số thưởng đảm bảo dự kiến nhận ở công ty mới trong năm onboard.');else{newGuaranteed=v;newGuaranteedNote='Dùng đúng số thưởng đảm bảo bạn nhập.';}}
  }

  const currentPerformanceStay=validMoney(sw.currentPerformanceIfStay);
  if(currentPerformanceStay==null)performanceNeeds.push('Nhập thưởng hiệu suất dự kiến nếu ở lại đến 31/12; nhập 0 nếu không có, để trống nếu chưa biết.');
  const currentPerformanceRule=['unknown','lost','time','full','custom'].includes(sw.currentPerformanceRule)?sw.currentPerformanceRule:'unknown';
  if(currentPerformanceStay>0&&currentPerformanceRule==='unknown')performanceNeeds.push('Chọn nếu nghỉ vào ngày trên thì thưởng hiệu suất bên hiện tại sẽ thế nào.');
  let currentPerformanceReceived=currentPerformanceStay===0?0:null,currentPerformanceNote=currentPerformanceStay===0?'Bạn xác nhận không có thưởng hiệu suất nếu ở lại.':'';
  if(currentPerformanceStay>0){
    if(currentPerformanceRule==='lost'){currentPerformanceReceived=0;currentPerformanceNote='Bạn chọn mất toàn bộ thưởng hiệu suất nếu nghỉ.';}
    else if(currentPerformanceRule==='full'){currentPerformanceReceived=currentPerformanceStay;currentPerformanceNote='Bạn chọn vẫn nhận đủ thưởng hiệu suất nếu nghỉ.';}
    else if(currentPerformanceRule==='time'&&lastDay){const m=monthNo(lastDay);currentPerformanceReceived=currentPerformanceStay*m/12;currentPerformanceNote='Nghỉ trong tháng '+m+' → tool tính '+m+'/12 thưởng hiệu suất. Đây là giả định theo tháng.';}
    else if(currentPerformanceRule==='custom'){const v=validMoney(sw.currentPerformanceIfLeave);if(v==null)performanceNeeds.push('Nhập số thưởng hiệu suất bên hiện tại dự kiến vẫn nhận khi nghỉ.');else{currentPerformanceReceived=v;currentPerformanceNote='Dùng đúng số thưởng hiệu suất bạn nhập.';}}
  }

  const newPerformanceRule=['unknown','time','full','none','custom'].includes(sw.newPerformanceRule)?sw.newPerformanceRule:'unknown';
  let newPerformance=offer.hasPerformanceBonus?null:0,newPerformanceRatio=null,newPerformanceNote=offer.hasPerformanceBonus?'':'Offer mới không có thưởng hiệu suất theo dữ liệu đã nhập.';
  if(offer.hasPerformanceBonus){
    if(newPerformanceRule==='unknown')performanceNeeds.push('Chọn thưởng hiệu suất ở công ty mới trong năm onboard sẽ được tính thế nào.');
    else if(newPerformanceRule==='none'){newPerformance=0;newPerformanceNote='Bạn chọn không nhận thưởng hiệu suất trong năm onboard.';}
    else if(newPerformanceRule==='full'){newPerformance=marginalPerformanceBonusNet(offer,1,deps);newPerformanceRatio=1;newPerformanceNote='Bạn chọn nhận đủ thưởng hiệu suất đã nhập ở offer.';}
    else if(newPerformanceRule==='time'&&onboard){newPerformanceRatio=(13-monthNo(onboard))/12;newPerformance=marginalPerformanceBonusNet(offer,newPerformanceRatio,deps);newPerformanceNote='Onboard tháng '+monthNo(onboard)+' → tool tính '+(13-monthNo(onboard))+'/12 thưởng hiệu suất. Đây là giả định theo tháng.';}
    else if(newPerformanceRule==='custom'){const v=validMoney(sw.newPerformanceCustom);if(v==null)performanceNeeds.push('Nhập số thưởng hiệu suất dự kiến nhận ở công ty mới trong năm onboard.');else{newPerformance=v;newPerformanceNote='Dùng đúng số thưởng hiệu suất bạn nhập.';}}
  }

  const gapDays=gapDaysBetween(lastDay,onboard);
  const probationMonths=offer.probM||0;
  let staySalary=null,newTrialSalary=0,newFullSalary=0,trialDays=0,fullDays=0;
  let stayGuaranteedTotal=null,switchGuaranteedTotal=null,guaranteedDiff=null;
  let stayPerformanceTotal=null,switchPerformanceTotal=null,performanceDiff=null;
  let stayOtPay=0,switchOtPay=0,stayWithOt=null,switchWithOt=null,otDiff=null;
  let comparisonNote='Kỳ so sánh kết thúc vào 31/12 của năm onboard. Tháng đầy đủ được tính đúng 1 tháng Net; chỉ phần tháng lẻ mới dùng Net tháng ÷ 30. Thưởng được so theo quyền lợi đến 31/12 và đặt vào cùng mốc so sánh giữa hai phương án. Chưa tính chênh lệch do quyết toán thuế khi đổi nơi làm việc.';

  if(!needs.length&&lastDay&&onboard&&yearEnd&&onboard>=lastDay){
    staySalary=monthlyIncomeForRange(comparisonStart,yearEnd,currentNet);
    if(onboard<=yearEnd){
      const newDays=daysInclusive(onboard,yearEnd);
      trialDays=Math.min(newDays,Math.max(0,Math.round(probationMonths*30)));
      fullDays=Math.max(0,newDays-trialDays);
      const trialStart=probationMonths>0?onboard:null,trialEnd=probationMonths>0?minDate(yearEnd,addDays(onboard,trialDays-1)):null;
      const fullStart=fullDays>0?addDays(onboard,trialDays):null;
      newTrialSalary=probationMonths>0?monthlyIncomeForRange(trialStart,trialEnd,offer.probNet):0;
      newFullSalary=fullDays>0?monthlyIncomeForRange(fullStart,yearEnd,offer.net):0;
      if(offer.otPayMonthly>0){
        switchOtPay=(probationMonths>0?monthlyIncomeForRange(trialStart,trialEnd,offer.probOtPayMonthly):0)+(fullDays>0?monthlyIncomeForRange(fullStart,yearEnd,offer.otPayMonthly):0);
      }
    }
    stayGuaranteedTotal=staySalary+currentGuaranteedStay;
    switchGuaranteedTotal=currentGuaranteedReceived+newTrialSalary+newFullSalary+newGuaranteed;
    guaranteedDiff=switchGuaranteedTotal-stayGuaranteedTotal;

    const currentOtMonthly=num(sw.currentOtPayMonthly);
    if(Number.isFinite(currentOtMonthly)&&currentOtMonthly>0)stayOtPay=monthlyIncomeForRange(comparisonStart,yearEnd,currentOtMonthly);
    if(stayOtPay>0||switchOtPay>0){
      stayWithOt=stayGuaranteedTotal+stayOtPay;switchWithOt=switchGuaranteedTotal+switchOtPay;otDiff=switchWithOt-stayWithOt;
    }

    if(!performanceNeeds.length&&Number.isFinite(currentPerformanceStay)&&Number.isFinite(currentPerformanceReceived)&&Number.isFinite(newPerformance)){
      stayPerformanceTotal=stayGuaranteedTotal+currentPerformanceStay;
      switchPerformanceTotal=switchGuaranteedTotal+currentPerformanceReceived+newPerformance;
      performanceDiff=switchPerformanceTotal-stayPerformanceTotal;
    }
  }

  return{
    enabled:true,show:true,idx,offerName:offer.name,needs,performanceNeeds,
    comparisonYear,comparisonStartLabel:dateLabel(comparisonStart),lastDayLabel:dateLabel(lastDay),onboardLabel:dateLabel(onboard),yearEndLabel:dateLabel(yearEnd),policyYearWarning,gapDays,
    probationMonths,trialDays,fullDays,staySalary,newTrialSalary,newFullSalary,
    currentGuaranteedStay,currentGuaranteedReceived,currentGuaranteedRule,currentGuaranteedNote,newGuaranteed,newGuaranteedRatio,newGuaranteedRule,newGuaranteedNote,
    stayGuaranteedTotal,switchGuaranteedTotal,guaranteedDiff,
    currentPerformanceStay,currentPerformanceReceived,currentPerformanceRule,currentPerformanceNote,newPerformance,newPerformanceRatio,newPerformanceRule,newPerformanceNote,
    stayPerformanceTotal,switchPerformanceTotal,performanceDiff,
    stayOtPay,switchOtPay,stayWithOt,switchWithOt,otDiff,comparisonNote,
    taxNote:(Number.isFinite(newGuaranteed)&&newGuaranteed>0)||(Number.isFinite(newPerformance)&&newPerformance>0)?'Thưởng bên mới được quy đổi về tay theo mô hình thuế của offer; chưa gộp quyết toán thuế với thu nhập ở công ty hiện tại.':''
  };
}
function cmpHead(A,B,label='Chỉ tiêu'){
  const a=A?esc(A.name):'-',b=B?esc(B.name):'-';
  return '<div class="erow head"><span>'+esc(label)+'</span><span title="'+a+'" style="overflow:hidden;text-overflow:ellipsis">'+a+'</span><span title="'+b+'" style="overflow:hidden;text-overflow:ellipsis">'+b+'</span></div>';
}
function cmpRow(label,sub,a,b,primary=false){
  const style=primary?' style="background:rgba(47,94,84,.06);font-weight:600"':'';
  return '<div class="erow"'+style+'><span class="lbl">'+label+(sub?'<small>'+sub+'</small>':'')+'</span><span class="va">'+a+'</span><span class="vb">'+b+'</span></div>';
}
function shortMoneyCell(v,strong=false,best=false,prefix=''){
  if(!Number.isFinite(v))return '-';
  const style=(strong?'font-weight:600;':'')+(best?'color:var(--moss);':'');
  return '<span title="'+fmt(v)+'" style="'+style+'">'+prefix+fmtShort(v)+'</span>';
}
function exactMoneyCell(v,prefix='',strong=false,best=false){
  if(!Number.isFinite(v))return '-';
  const style=(strong?'font-weight:600;':'')+(best?'color:var(--moss);':'');
  return '<span title="'+fmt(v)+'" style="'+style+'">'+prefix+fmt(v)+'</span>';
}
function textCell(v,strong=false,best=false){
  const style=(strong?'font-weight:600;':'')+(best?'color:var(--moss);':'');
  return '<span style="'+style+'">'+esc(v)+'</span>';
}
function matrixWrap(A,B,rows,details=''){
  return '<div style="width:100%;min-width:0"><div class="events" style="width:100%">'+cmpHead(A,B)+rows+'</div>'+details+'</div>';
}
function detailWrap(A,B,rows,note='',kind=''){
  const explain=kind?'<div style="margin-top:10px"><div class="events" style="width:100%;border-radius:6px">'+cmpHead(A,B,'Giải thích')+explainabilityRows(kind,A,B)+'</div></div>':'';
  return '<details style="width:100%;margin-top:8px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:0 12px"><summary class="calc-summary" style="list-style:none;cursor:pointer;color:var(--moss);font-family:var(--sans);font-size:13px;font-weight:600;padding:10px 0">Xem cách tính</summary><div style="padding:0 0 10px"><div class="events" style="width:100%;border-radius:6px">'+cmpHead(A,B,'Chi tiết')+rows+'</div>'+explain+note+'</div></details>';
}
function explainOnlyWrap(A,B,note='',kind=''){
  const explain=kind?'<div class="events" style="width:100%;border-radius:6px">'+cmpHead(A,B,'Giải thích')+explainabilityRows(kind,A,B)+'</div>':'';
  return '<details style="width:100%;margin-top:8px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:0 12px"><summary class="calc-summary" style="list-style:none;cursor:pointer;color:var(--moss);font-family:var(--sans);font-size:13px;font-weight:600;padding:10px 0">Xem cách tính</summary><div style="padding:0 0 10px">'+explain+note+'</div></details>';
}
function explainTextCell(v){return '<span style="white-space:normal;overflow-wrap:anywhere;line-height:1.5">'+esc(v)+'</span>';}
function bhModeText(s){if(!s)return'-';if(s.bhMode==='custom')return'Tôi biết mức cụ thể';if(s.bhMode==='unknown')return'Chưa rõ';return'Theo mức lương offer';}
function financialMissingReason(s){
  if(!s)return'còn thiếu dữ liệu tài chính';
  if(!s.depsReady)return'chưa nhập số người phụ thuộc';
  if(s.bhModeMissing)return'chưa chọn công ty dùng mức nào để đóng BH';
  if(s.bhCustomMissing)return'đã chọn mức đóng BH cụ thể nhưng chưa nhập số tiền';
  if(s.allowanceBhMissing)return'đã nhập phụ cấp nhưng chưa xác nhận phụ cấp có tính vào căn cứ BH hay không';
  return'còn thiếu dữ liệu để tính BH/thuế/Net';
}
function otRuleText(s){
  if(!s||s.otH<=0)return'Không có OT trong input hiện tại.';
  if(s.otPaid!=='yes')return fmtN(s.otH,1)+'h/tháng; không trả thêm tiền.';
  const type=s.otType==='mixed'?'Nhiều loại':s.otType==='rest'?'Ngày nghỉ hằng tuần':s.otType==='weekday'?'Ngày thường':'Legacy';
  return fmtN(s.otH,1)+'h/tháng; '+type+'; mức lương tính OT '+fmt(s.otBaseMonthly)+(s.otType==='mixed'?' - hệ số theo từng loại':' - hệ số '+(s.otFactor==null?'-':fmtN(s.otFactor,0)+'%'))+'.';
}
function explainData(kind,s){
  if(!s)return{formula:'-',sub:'-',rule:'-',assumption:'-'};
  if(kind==='monthly'&&!s.financialReady){
    const why=!s.depsReady?'chưa nhập số người phụ thuộc':s.bhModeMissing?'chưa chọn mức dùng để đóng BH':s.bhCustomMissing?'đã chọn biết mức đóng BH cụ thể nhưng chưa nhập số tiền':s.allowanceBhMissing?'đã nhập phụ cấp nhưng chưa xác nhận phụ cấp có tính vào căn cứ BH hay không':'còn dữ liệu tài chính chưa đầy đủ';
    return{formula:'Net tháng = Tổng trước khấu trừ - BH bắt buộc - PIT.',sub:'Chưa đủ dữ liệu để thế số vì '+why+'.',rule:'Hoàn thiện dữ liệu đang báo thiếu trước khi tính Net, thuế và bảo hiểm.',assumption:'Tool không tự thay ô trống bằng 0 hoặc một mức BH giả định.'};
  }
  if(kind==='monthly'){
    const ot=s.otPayMonthly>0?' Kịch bản có OT = Net + tiền OT.':'';
    const otSub=s.otPayMonthly>0?' + '+fmt(s.otPayMonthly)+' = '+fmt(s.monthlyTakeHomeWithOt):'';
    const assumption=['Net chính chưa tự cộng OT.',s.otPaidMissing?'Đã có giờ OT nhưng chưa rõ có được trả tiền, nên chưa cộng tiền OT.':''].filter(Boolean).join(' ');
    return{formula:'Net tháng = Tổng trước khấu trừ - BH bắt buộc - PIT.'+ot,sub:fmt(s.totalMonthlyGross)+' - '+fmt(s.eeIns)+' - '+fmt(s.tax)+' = '+fmt(s.net)+otSub,rule:'Offer nhập '+(s.fromNet?'Net':'Gross')+' '+fmt(s.enteredSalary)+'. BH: '+bhModeText(s)+'. '+otRuleText(s),assumption};
  }
  if(kind==='annual'&&!s.annualReady){
    const why=!s.depsReady?'chưa nhập số người phụ thuộc':s.bhModeMissing?'chưa chọn mức dùng để đóng BH':s.bhCustomMissing?'mức đóng BH cụ thể đang để trống':s.allowanceBhMissing?'phụ cấp chưa xác nhận có tính vào căn cứ BH hay không':s.probationEnabled==='unknown'?'chưa xác nhận có thử việc hay không':s.probInsuranceMissing?'chưa xác nhận BH trong thời gian thử việc':s.guaranteedBonusInvalid?'thưởng đảm bảo / năm đang ngoài giới hạn hợp lệ':s.probPctMissing?'% lương thử việc đang để trống':s.probPctInvalid?'% lương thử việc không hợp lệ':s.probMissingMonths||s.probMonthsInvalid?'thời gian thử việc chưa hợp lệ':'còn dữ liệu chưa hợp lệ';
    return{formula:'Thu nhập cố định năm = Gross các tháng (đã tách thử việc) + phụ cấp 12 tháng + thưởng đảm bảo gross quy đổi - BH NLĐ năm - PIT năm.',sub:'Chưa đủ dữ liệu để thế số vì '+why+'.',rule:'Hoàn thiện dữ liệu đang báo thiếu trước khi tính 12 tháng.',assumption:'Tool không tự thay dữ liệu thiếu bằng một giá trị khác để tạo total có vẻ hợp lệ.'};
  }
  if(kind==='annual'){
    const trial=s.probationEnabled==='yes'?(s.probM>0?fmtN(s.probPctN,0)+'% × '+fmtN(s.probM,1)+' tháng':'đã bật nhưng chưa đủ dữ liệu'):'không tách';
    return{formula:'Thu nhập cố định năm = Gross các tháng (đã tách thử việc) + phụ cấp 12 tháng + thưởng đảm bảo gross quy đổi - BH NLĐ năm - PIT năm.',sub:fmt(s.annualBaseGross)+' + '+fmt(s.annualAllowance)+' + '+fmt(s.guaranteedBonusGross)+' - '+fmt(s.annualEeIns)+' - '+fmt(s.guaranteedAnnualTax)+' = '+fmt(s.guaranteedAnnualNet),rule:'Thử việc: '+trial+'. Thưởng đảm bảo: '+bonusInputLabel(s,'guaranteed')+'. Thưởng hiệu suất: '+bonusInputLabel(s,'performance')+'.',assumption:'Thưởng hiệu suất không nằm trong thu nhập cố định. OT chỉ xuất hiện ở dòng kịch bản nếu mức OT hiện tại duy trì tương tự. Phụ cấp cố định giả định trả đủ 12 tháng.'};
  }
  if(kind==='time'&&!s.timeReady){
    const missing=[];if(s.daysMissing)missing.push('số buổi lên văn phòng / tuần');if(s.commuteMissing)missing.push('thời gian di chuyển 1 chiều');if(s.otMonthlyMissing)missing.push('OT trung bình / tháng');if(s.paidLeaveMissing)missing.push('ngày phép / năm');
    const why=missing.length?'còn thiếu '+missing.join(', '):(s.commuteNeedsDays?'đã nhập thời gian di chuyển nhưng chưa nhập số buổi lên văn phòng / tuần':'có input thời gian nằm ngoài giới hạn hợp lệ');
    return{formula:'Giờ năm = 176×12 - ngày phép×8 + (đi lại/tháng + OT/tháng)×12. Giá trị/giờ = (thu nhập cố định năm + OT có lương năm) ÷ giờ năm.',sub:'Chưa đủ dữ liệu để thế số vì '+why+'.',rule:'Tool giữ nguyên trạng thái thiếu/không hợp lệ thay vì tự coi commute = 0 hoặc tự cắt input về một mức khác.',assumption:'Hoàn thiện input thời gian trước khi dùng kết quả giờ/năm và giá trị/giờ.'};
  }
  if(kind==='time'&&!s.annualReady)return{formula:'Giờ năm = 176×12 - ngày phép×8 + (đi lại/tháng + OT/tháng)×12. Giá trị/giờ = (thu nhập cố định năm + OT có lương năm) ÷ giờ năm.',sub:'Tổng giờ có thể tính được, nhưng chưa thế số giá trị/giờ vì gói thu nhập năm chưa hợp lệ.',rule:'Giữ các input đi lại, OT và ngày phép như đã nhập.',assumption:'Cần hoàn thiện dữ liệu tài chính/thử việc trước khi dùng thu nhập năm làm tử số giá trị/giờ.'};
  if(kind==='time'&&!s.otPayKnown)return{formula:'Giờ năm = 176×12 - ngày phép×8 + (đi lại/tháng + OT/tháng)×12. Giá trị/giờ = (thu nhập cố định năm + OT có lương năm) ÷ giờ năm.',sub:'Tổng giờ = '+fmtN(s.annualHours,0)+'h/năm. Chưa tính giá trị/giờ vì bạn đã nhập OT nhưng chưa xác nhận OT có được trả tiền hay không.',rule:'OT vẫn được cộng vào thời gian bỏ ra; tiền OT chỉ được cộng sau khi bạn xác nhận Có/Không và hoàn thiện cấu hình nếu Có.',assumption:'Quy đổi thời gian dùng 176h/tháng, 4,33 tuần/tháng và 8h/ngày phép.'};
  if(kind==='time'){
    const numerator=s.guaranteedAnnualNet+s.otPayAnnual;
    const days=Number.isFinite(s.officeDays)?fmtN(s.officeDays,1):'-';
    return{formula:'Giờ năm = 176×12 - ngày phép×8 + (đi lại/tháng + OT/tháng)×12. Giá trị/giờ = (thu nhập cố định năm + OT có lương năm) ÷ giờ năm.',sub:'176×12 - '+fmtN(s.leaveHours,0)+' + ('+fmtN(s.commuteH,1)+' + '+fmtN(s.otH,1)+')×12 = '+fmtN(s.annualHours,0)+'h; '+fmt(numerator)+' ÷ '+fmtN(s.annualHours,0)+' = '+fmt(s.guaranteedPerHourWithOt)+'/giờ.',rule:'Lên văn phòng '+days+' buổi/tuần; di chuyển '+fmtN(s.commuteMin,0)+' phút/chiều; OT '+fmtN(s.otH,1)+'h/tháng; ngày phép '+fmtN(s.paidLeaveDays,0)+' ngày/năm.',assumption:'Giờ làm chuẩn dùng 176h/tháng; 1 ngày phép = 8h. Đi lại là khứ hồi theo số buổi/tuần. OT luôn cộng vào thời gian bỏ ra, kể cả khi không được trả tiền.'};
  }
  if(kind==='insurance'){
    if(!s.financialReady){
      const why=!s.depsReady?'chưa nhập số người phụ thuộc':s.bhModeMissing?'chưa chọn công ty dùng mức nào để đóng BH':s.bhCustomMissing?'đã chọn mức cụ thể nhưng chưa nhập số tiền':s.allowanceBhMissing?'chưa xác nhận phụ cấp có tính vào căn cứ BH hay không':'còn dữ liệu chưa đầy đủ';
      return{formula:'BHXH/BHYT base = min(mức dùng để tính BH, trần BHXH/BHYT). BHTN base = min(mức dùng để tính BH, 20×LTT vùng).',sub:'Chưa đủ dữ liệu để thế số vì '+why+'.',rule:'Tool chờ dữ liệu bạn xác nhận thay vì tự chọn mức BH.',assumption:'Không dùng lương offer hoặc giá trị 0 làm fallback.'};
    }
    return{formula:'BHXH/BHYT base = min(mức dùng để tính BH, trần BHXH/BHYT). BHTN base = min(mức dùng để tính BH, 20×LTT vùng). NLĐ đóng = 8% BHXH + 1,5% BHYT + 1% BHTN.',sub:'Mức đầu vào '+fmt(s.insuredInput)+' → BHXH/BHYT '+fmt(s.bhxhBase)+', BHTN '+fmt(s.bhtnBase)+' → NLĐ đóng '+fmt(s.eeIns)+'/tháng.',rule:'Nguồn mức BH: '+bhModeText(s)+'. Phụ cấp cố định: '+(s.fixedAllowance>0?fmt(s.fixedAllowance)+'/tháng; BH '+(s.allowanceBh==='yes'?'Có':s.allowanceBh==='no'?'Không':'Chưa rõ'):'không nhập')+'.',assumption:(s.bhModeAssumed?'Mức BH là giả định tạm thời. ':'')+'Các mức trần được áp sau mức đầu vào; BHXH/BHYT và BHTN có trần khác nhau.'};
  }
  return{formula:'-',sub:'-',rule:'-',assumption:'-'};
}
function explainabilityRows(kind,A,B){
  const a=explainData(kind,A),b=explainData(kind,B),cell=x=>explainTextCell(x);
  return cmpRow('1. Công thức','',A?cell(a.formula):'-',B?cell(b.formula):'-')+
    cmpRow('2. Thế số','',A?cell(a.sub):'-',B?cell(b.sub):'-')+
    cmpRow('3. Dữ liệu / quy tắc đang dùng','',A?cell(a.rule):'-',B?cell(b.rule):'-')+
    cmpRow('4. Chưa tính / giả định','',A?cell(a.assumption):'-',B?cell(b.assumption):'-');
}
function warnText(s){
  if(!s)return'';
  const w=[];
  if(s.over)w.push('Mức căn cứ BH nhập cao hơn tổng lương gross + phụ cấp cố định nên đã giới hạn về mức tối đa này.');
  if(s.belowRef)w.push('Mức căn cứ BH nhập thấp hơn mức tham chiếu 2,53 triệu.');
  if(s.belowMinWage)w.push('Gross thấp hơn lương tối thiểu vùng đã chọn.');
  if(s.allowanceBhAssumed)w.push('Chưa xác nhận phụ cấp có tính vào căn cứ BH. Tool đang tạm tính Có để tránh đánh giá quá cao tiền về tay.');
  if(s.probBelow85)w.push('Lương thử việc thấp hơn 85% mức lương của công việc. Hãy kiểm tra lại thỏa thuận thử việc.');
  if(s.probTooLong){const lim={manager:'180 ngày',college:'60 ngày',intermediate:'30 ngày',other:'06 ngày làm việc'}[s.probJobType];w.push('Thời gian thử việc có vẻ vượt giới hạn '+lim+' của nhóm công việc đã chọn. Bạn đang nhập theo tháng nên hãy đối chiếu ngày thực tế trong hợp đồng.');}
  return w.join(' ');
}
function compareL1Html(A,B){
  const aReady=!!(A&&A.financialReady),bReady=!!(B&&B.financialReady);
  const aBest=!!(aReady&&bReady&&A.net>B.net),bBest=!!(aReady&&bReady&&B.net>A.net);
  const hasAllowance=!!((A&&A.fixedAllowance>0)||(B&&B.fixedAllowance>0));
  const hasPaidOt=!!((A&&A.otPayMonthly>0)||(B&&B.otPayMonthly>0));
  const cell=(x,v,prefix='',strong=false,best=false)=>!x?'-':x.financialReady?exactMoneyCell(v,prefix,strong,best):textCell('Chưa đủ dữ liệu',strong);
  let rows=cmpRow('Net / tháng','về tay sau BH bắt buộc + thuế',cell(A,A&&A.net,'',true,aBest),cell(B,B&&B.net,'',true,bBest),true)+
    cmpRow('Lương gross','quy ngược nếu offer nhập net',cell(A,A&&A.gross),cell(B,B&&B.gross));
  if(hasAllowance){
    rows+=cmpRow('+ Phụ cấp cố định','ngoài mức lương trên; chịu thuế; BH theo lựa chọn',A?exactMoneyCell(A.fixedAllowance):'-',B?exactMoneyCell(B.fixedAllowance):'-')+
      cmpRow('Tổng trước khấu trừ','lương gross + phụ cấp cố định',cell(A,A&&A.totalMonthlyGross),cell(B,B&&B.totalMonthlyGross));
  }
  rows+=cmpRow('BH người lao động','BHXH + BHYT + BHTN / tháng',cell(A,A&&A.eeIns,'-'),cell(B,B&&B.eeIns,'-'))+
    cmpRow('Thuế TNCN','ước tính / tháng',cell(A,A&&A.tax,'-'),cell(B,B&&B.tax,'-'));
  if(hasPaidOt){
    rows+=cmpRow('+ Tiền OT ước tính','theo giờ OT và hệ số đã nhập; miễn PIT 2026',A?(A.otPayMonthly>0?exactMoneyCell(A.otPayMonthly,'+'):textCell('-')):'-',B?(B.otPayMonthly>0?exactMoneyCell(B.otPayMonthly,'+'):textCell('-')):'-')+
      cmpRow('Về tay nếu OT như đã nhập','net tháng + tiền OT ước tính',cell(A,A&&A.monthlyTakeHomeWithOt,'',true),cell(B,B&&B.monthlyTakeHomeWithOt,'',true));
  }
  const wa=warnText(A),wb=warnText(B);
  const allowanceNote=hasAllowance?'<p style="font-size:12px;color:var(--ink-soft);margin:8px 2px 0">Phụ cấp cố định được tính vào căn cứ BH theo lựa chọn của từng offer. Nếu phụ cấp có số tiền nhưng trạng thái BH còn “Chưa rõ”, các kết quả phụ thuộc BH/thuế sẽ ở trạng thái “Chưa đủ dữ liệu”.</p>':'';
  const otNote=hasPaidOt?'<p style="font-size:12px;color:var(--ink-soft);margin:8px 2px 0">Tiền OT được ước tính từ mức lương dùng để tính OT, 176h/tháng, số giờ và hệ số theo loại ngày bạn nhập. Trong mô phỏng kỳ thuế 2026, tiền làm thêm giờ được miễn PIT và không tự cộng vào căn cứ BH.</p>':'';
  const missing=[A,B].filter(x=>x&&!x.financialReady).map(x=>esc(x.name));
  const missingNote=missing.length?'<p style="font-size:12px;color:var(--clay);margin:8px 2px 0"><b>'+missing.join(', ')+':</b> còn thiếu dữ liệu cần để tính BH/thuế/Net. Tool không tự lấy ô trống làm 0 hoặc tự chọn mức BH.</p>':'';
  const warnNote=(wa||wb)?'<p style="font-size:12px;color:var(--clay);margin:8px 2px 0">'+(wa?'<b>'+esc(A.name)+':</b> '+esc(wa)+' ':'')+(wb?'<b>'+esc(B.name)+':</b> '+esc(wb):'')+'</p>':'';
  return matrixWrap(A,B,rows,explainOnlyWrap(A,B,allowanceNote+otNote+missingNote+warnNote,'monthly'));
}
function compareAnnualHtml(A,B){
  const comparable=!!(A&&B&&A.annualReady&&B.annualReady);
  const aBest=!!(comparable&&A.guaranteedAnnualNet>B.guaranteedAnnualNet),bBest=!!(comparable&&B.guaranteedAnnualNet>A.guaranteedAnnualNet);
  const annualCell=(x,v,strong=false,best=false)=>!x?'-':x.annualReady?shortMoneyCell(v,strong,best):textCell('Chưa đủ dữ liệu',strong);
  const exactAnnualCell=(x,v,prefix='')=>!x?'-':x.annualReady?exactMoneyCell(v,prefix):textCell('Chưa đủ dữ liệu');
  const hasPerformance=!!((A&&A.hasPerformanceBonus)||(B&&B.hasPerformanceBonus));
  const hasPaidOt=!!((A&&A.otPayAnnual>0)||(B&&B.otPayAnnual>0));
  let rows=cmpRow('Thu nhập cố định','gồm lương + thưởng cố định như tháng 13 (nếu có)',annualCell(A,A&&A.guaranteedAnnualNet,true,aBest),annualCell(B,B&&B.guaranteedAnnualNet,true,bBest),true);
  if(hasPaidOt)rows+=cmpRow('Nếu mức OT này duy trì 12 tháng','cộng tiền OT ước tính; không coi là khoản đảm bảo',annualCell(A,A&&A.guaranteedAnnualNet+A.otPayAnnual),annualCell(B,B&&B.guaranteedAnnualNet+B.otPayAnnual));
  if(hasPerformance)rows+=cmpRow('Nếu có thêm thưởng hiệu suất','cộng thêm thưởng hiệu suất bạn đã nhập; chưa cộng kịch bản OT',A?(A.performanceReady?annualCell(A,A.performanceAnnualNet):textCell('Chưa đủ dữ liệu')):'-',B?(B.performanceReady?annualCell(B,B.performanceAnnualNet):textCell('Chưa đủ dữ liệu')):'-');
  const trial=s=>{
    if(!s)return'-';
    if(s.probationEnabled==='unknown')return'Chưa rõ';
    if(s.probationEnabled!=='yes')return'Không';
    return s.probM>0?fmtN(s.probPctN,0)+'% × '+fmtN(s.probM,1)+'th':'Chưa đủ dữ liệu';
  };
  const trialIns=s=>!s||s.probationEnabled!=='yes'?'-':(s.probInsurance==='unknown'?'Chưa rõ':s.probInsurance==='yes'?'Có':'Không');
  let detailRows=
    cmpRow('Lương gross 12 tháng','đã tính thử việc nếu có',exactAnnualCell(A,A&&A.annualBaseGross),exactAnnualCell(B,B&&B.annualBaseGross))+
    cmpRow('Thử việc','% lương × số tháng',A?textCell(trial(A)):'-',B?textCell(trial(B)):'-')+
    cmpRow('BH trong thử việc','',A?textCell(trialIns(A)):'-',B?textCell(trialIns(B)):'-')+
    cmpRow('+ Thưởng đảm bảo',A?bonusInputLabel(A,'guaranteed'):'',exactAnnualCell(A,A&&A.guaranteedBonusGross),exactAnnualCell(B,B&&B.guaranteedBonusGross));
  if(hasPerformance){
    detailRows+=cmpRow('+ Thưởng hiệu suất','theo offer: '+(A?bonusInputLabel(A,'performance'):'-')+' | '+(B?bonusInputLabel(B,'performance'):'-'),exactAnnualCell(A,A&&A.performanceBonusGross),exactAnnualCell(B,B&&B.performanceBonusGross));
  }
  detailRows+=cmpRow('+ Phụ cấp cố định ngoài lương','chịu thuế; BH theo lựa chọn',exactAnnualCell(A,A&&A.annualAllowance),exactAnnualCell(B,B&&B.annualAllowance))+
    cmpRow('- BH người lao động','12 tháng',exactAnnualCell(A,A&&A.annualEeIns,'-'),exactAnnualCell(B,B&&B.annualEeIns,'-'))+
    cmpRow('- Thuế TNCN - thu nhập cố định','',exactAnnualCell(A,A&&A.guaranteedAnnualTax,'-'),exactAnnualCell(B,B&&B.guaranteedAnnualTax,'-'));
  if(hasPerformance)detailRows+=cmpRow('- Thuế TNCN - có thêm thưởng hiệu suất','',exactAnnualCell(A,A&&A.performanceAnnualTax,'-'),exactAnnualCell(B,B&&B.performanceAnnualTax,'-'));
  return matrixWrap(A,B,rows,detailWrap(A,B,detailRows,'<p style="font-size:12px;color:var(--ink-soft);margin:8px 2px 0">Thưởng hiệu suất chỉ được cộng ở dòng “Nếu có thêm thưởng hiệu suất”. Nếu offer nhập net, số tháng/số tiền thưởng cũng được hiểu theo net và được quy ngược để ước tính PIT. Phụ cấp cố định đang được giả định trả đủ 12 tháng. Tiền OT không nằm trong “Thu nhập cố định”. Nếu có OT được trả tiền, tool chỉ thêm một dòng kịch bản giả định mức OT hiện tại duy trì tương tự trong 12 tháng.</p>','annual'));
}
function compareTimeHtml(A,B){
  const aReady=!!(A&&A.timeReady),bReady=!!(B&&B.timeReady);
  const aHours=aReady?Math.round(A.avgMonthlyHours):null,bHours=bReady?Math.round(B.avgMonthlyHours):null;
  const aHoursBest=!!(aReady&&bReady&&aHours<bHours),bHoursBest=!!(aReady&&bReady&&bHours<aHours);
  const aValue=A&&A.annualReady&&A.timeReady?A.guaranteedPerHourWithOt:null,bValue=B&&B.annualReady&&B.timeReady?B.guaranteedPerHourWithOt:null;
  const aValueBest=!!(Number.isFinite(aValue)&&Number.isFinite(bValue)&&aValue>bValue),bValueBest=!!(Number.isFinite(aValue)&&Number.isFinite(bValue)&&bValue>aValue);
  const hrs=v=>Number.isFinite(v)?textCell(Math.round(v)+'h'):textCell('-');
  const timeCell=(x,v,strong=false,best=false)=>!x?'-':x.timeReady?textCell(Math.round(v)+'h',strong,best):textCell('Chưa đủ dữ liệu',strong);
  const valueCell=(x,v,strong=false,best=false)=>!x?'-':(x.annualReady&&x.timeReady&&Number.isFinite(v))?shortMoneyCell(v,strong,best):textCell('Chưa đủ dữ liệu',strong);
  const exactValueCell=(x,v,strong=false)=>!x?'-':(x.annualReady&&x.timeReady&&Number.isFinite(v))?exactMoneyCell(v,'',strong):textCell('Chưa đủ dữ liệu',strong);
  const commuteCell=x=>!x?'-':x.commuteNeedsDays?textCell('Cần số buổi/tuần'):x.commuteMissing||x.daysMissing||x.commuteInvalid||x.daysInvalid?textCell('Chưa đủ dữ liệu'):(x.commuteH>0?hrs(x.commuteH):textCell('0h'));
  const otPaid=s=>{if(!s||s.otH<=0)return'-';if(s.otPaid==='unknown')return'Chưa rõ';if(s.otPaid!=='yes')return'Không';if(s.otType==='mixed')return s.otBreakdownMismatch?'Có · phân bổ chưa khớp':'Có · nhiều loại';if(s.otFactor==null)return'Có · thiếu hệ số';if(s.otType==='legacy')return'Có · '+fmtN(s.otFactor,0)+'%';return'Có · '+(s.otType==='rest'?'ngày nghỉ':'ngày thường')+' · '+fmtN(s.otFactor,0)+'%';};
  const hasPaidOt=!!((A&&A.otPayMonthly>0)||(B&&B.otPayMonthly>0));
  let rows=
    cmpRow('Giờ / tháng','làm việc + đi lại + OT - phép quy đổi',timeCell(A,A&&A.avgMonthlyHours,true,aHoursBest),timeCell(B,B&&B.avgMonthlyHours,true,bHoursBest),true)+
    cmpRow('Đi lại / tháng','',commuteCell(A),commuteCell(B))+
    cmpRow('OT / tháng','giờ bạn bỏ thêm',A?(A.otMonthlyMissing||A.otMonthlyInvalid?textCell('Chưa đủ dữ liệu'):(A.otH>0?hrs(A.otH):textCell('0h'))):'-',B?(B.otMonthlyMissing||B.otMonthlyInvalid?textCell('Chưa đủ dữ liệu'):(B.otH>0?hrs(B.otH):textCell('0h'))):'-')+
    cmpRow('OT có được trả tiền','',A?textCell(otPaid(A)):'-',B?textCell(otPaid(B)):'-');
  if(hasPaidOt)rows+=cmpRow('Tiền OT / tháng','ước tính từ hệ số OT',A?(A.financialReady&&A.otPayMonthly>0?shortMoneyCell(A.otPayMonthly,false,false,'+'):'-'):'-',B?(B.financialReady&&B.otPayMonthly>0?shortMoneyCell(B.otPayMonthly,false,false,'+'):'-'):'-');
  rows+=cmpRow('Ngày phép / năm','hưởng lương',A?(A.paidLeaveMissing||A.paidLeaveInvalid?textCell('Chưa đủ dữ liệu'):textCell(fmtN(A.paidLeaveDays,0)+' ngày')):'-',B?(B.paidLeaveMissing||B.paidLeaveInvalid?textCell('Chưa đủ dữ liệu'):textCell(fmtN(B.paidLeaveDays,0)+' ngày')):'-')+
    cmpRow('Giá trị / giờ','thu nhập cố định 12 tháng + tiền OT có lương',valueCell(A,aValue,true,aValueBest),valueCell(B,bValue,true,bValueBest));
  const prob=s=>{
    if(!s)return'-';
    if(s.probationEnabled==='unknown')return'Chưa rõ';
    if(s.probationEnabled!=='yes')return'Không';
    return s.probM>0?'≈ '+fmt(s.probNet)+'/th':'Chưa đủ dữ liệu';
  };
  const probIns=s=>!s||s.probationEnabled!=='yes'?'-':(s.probInsurance==='unknown'?'Chưa rõ':s.probInsurance==='yes'?'Có':'Không');
  let detailRows=
    cmpRow('Giờ làm chuẩn','giả định',A?textCell(STD_HRS+'h/th'):'-',B?textCell(STD_HRS+'h/th'):'-')+
    cmpRow('- Ngày phép quy đổi','',A?(A.paidLeaveMissing||A.paidLeaveInvalid?textCell('Chưa đủ dữ liệu'):textCell(A.leaveHours>0?fmtN(A.leaveHours,0)+'h/năm':'0h/năm')):'-',B?(B.paidLeaveMissing||B.paidLeaveInvalid?textCell('Chưa đủ dữ liệu'):textCell(B.leaveHours>0?fmtN(B.leaveHours,0)+'h/năm':'0h/năm')):'-')+
    cmpRow('+ Đi lại','',commuteCell(A),commuteCell(B))+
    cmpRow('+ OT','',A?(A.otMonthlyMissing||A.otMonthlyInvalid?textCell('Chưa đủ dữ liệu'):textCell(A.otH>0?Math.round(A.otH)+'h/th':'0h/th')):'-',B?(B.otMonthlyMissing||B.otMonthlyInvalid?textCell('Chưa đủ dữ liệu'):textCell(B.otH>0?Math.round(B.otH)+'h/th':'0h/th')):'-')+
    cmpRow('OT có được trả tiền','',A?textCell(otPaid(A)):'-',B?textCell(otPaid(B)):'-')+
    cmpRow('Tiền OT ước tính','',A?(A.financialReady&&A.otPayMonthly>0?exactMoneyCell(A.otPayMonthly,'+'):'-'):'-',B?(B.financialReady&&B.otPayMonthly>0?exactMoneyCell(B.otPayMonthly,'+'):'-'):'-')+
    cmpRow('Thử việc - net','',A?textCell(prob(A)):'-',B?textCell(prob(B)):'-')+
    cmpRow('BH trong thử việc','',A?textCell(probIns(A)):'-',B?textCell(probIns(B)):'-')+
    cmpRow('Tổng giờ / năm','',A?(A.timeReady?textCell(Math.round(A.annualHours)+'h'):textCell('Chưa đủ dữ liệu')):'-',B?(B.timeReady?textCell(Math.round(B.annualHours)+'h'):textCell('Chưa đủ dữ liệu')):'-')+
    cmpRow('Giá trị / giờ','thu nhập cố định 12 tháng + OT có lương',exactValueCell(A,A&&A.guaranteedPerHourWithOt,true),exactValueCell(B,B&&B.guaranteedPerHourWithOt,true),true);
  if((A&&A.hasPerformanceBonus)||(B&&B.hasPerformanceBonus))detailRows+=cmpRow('Giá trị / giờ','thu nhập 12 tháng có thêm thưởng hiệu suất + OT có lương',A&&A.hasPerformanceBonus?exactValueCell(A,A.performancePerHourWithOt):'-',B&&B.hasPerformanceBonus?exactValueCell(B,B.performancePerHourWithOt):'-');
  return matrixWrap(A,B,rows,detailWrap(A,B,detailRows,'<p style="font-size:12px;color:var(--ink-soft);margin:8px 2px 0">OT luôn được cộng vào tổng giờ bạn bỏ ra. Nếu đã nhập thời gian di chuyển mà chưa nhập số buổi lên văn phòng, tool dừng phép tính thời gian thay vì tự coi đi lại bằng 0. Các input vượt giới hạn hợp lệ cũng không bị tự cắt về một số khác. Ngày phép hưởng lương được trừ khỏi tổng thời gian bạn phải làm trong năm vì bạn vẫn nhận lương nhưng không phải làm việc trong những ngày đó.</p>','time'));
}
function compareInsuranceHtml(A,B){
  const cell=(x,v,strong=false)=>!x?'-':x.financialReady?shortMoneyCell(v,strong):textCell('Chưa đủ dữ liệu',strong);
  const exact=(x,v,prefix='')=>!x?'-':x.financialReady?exactMoneyCell(v,prefix):textCell('Chưa đủ dữ liệu');
  const rows=
    cmpRow('Mức dùng để tính BH','trước khi áp các mức trần',cell(A,A&&A.insuredInput,true),cell(B,B&&B.insuredInput,true),true)+
    cmpRow('Căn cứ BHXH/BHYT','sau trần',cell(A,A&&A.bhxhBase),cell(B,B&&B.bhxhBase))+
    cmpRow('Căn cứ BHTN','',cell(A,A&&A.bhtnBase),cell(B,B&&B.bhtnBase))+
    cmpRow('Bạn đóng / tháng','BH bắt buộc',cell(A,A&&A.eeIns),cell(B,B&&B.eeIns))+
    cmpRow('Công ty đóng / tháng','mức chuẩn',cell(A,A&&A.erIns),cell(B,B&&B.erIns));
  const detailRows=
    cmpRow('Mức dùng để tính BH','trước khi áp trần',exact(A,A&&A.insuredInput),exact(B,B&&B.insuredInput))+
    cmpRow('Căn cứ BHXH/BHYT','sau trần',exact(A,A&&A.bhxhBase),exact(B,B&&B.bhxhBase))+
    cmpRow('Căn cứ BHTN','',exact(A,A&&A.bhtnBase),exact(B,B&&B.bhtnBase))+
    cmpRow('BHXH 8% - bạn','',exact(A,A&&A.bhxh),exact(B,B&&B.bhxh))+
    cmpRow('BHYT 1,5% - bạn','',exact(A,A&&A.bhyt),exact(B,B&&B.bhyt))+
    cmpRow('BHTN 1% - bạn','',exact(A,A&&A.bhtn),exact(B,B&&B.bhtn))+
    cmpRow('Công ty đóng','BH bắt buộc mức chuẩn',exact(A,A&&A.erIns),exact(B,B&&B.erIns));
  const blocked=[A,B].filter(x=>x&&!x.financialReady).map(x=>esc(x.name));
  const blockedNote=blocked.length?'<p style="font-size:12px;color:var(--clay);margin:8px 2px 0"><b>'+blocked.join(', ')+':</b> còn thiếu dữ liệu BH/thuế hoặc số người phụ thuộc. Tool chờ dữ liệu bạn xác nhận thay vì tự chọn mức BH.</p>':'';
  return matrixWrap(A,B,rows,detailWrap(A,B,detailRows,'<p style="font-size:12px;color:var(--ink-soft);margin:8px 2px 0">“Mức dùng để tính BH” là mức đầu vào trước khi áp trần. BHXH/BHYT và BHTN có trần căn cứ khác nhau.</p>'+blockedNote,'insurance'));
}
function collectAssumptions(state,r){
  const assumed=[],confirm=[];
  const deps=num(state.deps);
  if(!(Number.isFinite(deps)&&deps>=0))confirm.push('Bối cảnh chung: chưa nhập số người phụ thuộc. Nhập 0 nếu không có; tool không tự hiểu ô trống là 0.');
  let anyTimeModel=false;
  r.forEach((o,i)=>{
    if(!o)return;
    const name=o.name||('Offer '+(i?'B':'A'));
    if(o.bhModeMissing)confirm.push(name+': chưa chọn công ty dùng mức nào để đóng BH → các kết quả phụ thuộc BH/thuế đang để Chưa đủ dữ liệu.');
    if(o.bhCustomMissing)confirm.push(name+': đã chọn biết mức đóng BH cụ thể nhưng chưa nhập số tiền → các kết quả phụ thuộc BH/thuế đang để Chưa đủ dữ liệu.');
    if(o.allowanceBhMissing)confirm.push(name+': đã nhập phụ cấp cố định nhưng chưa xác nhận phụ cấp có tính vào căn cứ BH hay không.');
    if(o.probationEnabled==='unknown')confirm.push(name+': chưa xác nhận có giai đoạn thử việc cần tính riêng hay không → thu nhập 12 tháng đang để Chưa đủ dữ liệu.');
    if(o.probPctMissing)confirm.push(name+': đã bật thử việc nhưng chưa nhập % lương thử việc.');
    if(o.probInsuranceMissing)confirm.push(name+': đã bật thử việc nhưng chưa xác nhận trong thời gian thử việc có đóng BH bắt buộc hay không.');
    if(o.probMonthsInvalid)confirm.push(name+': thời gian thử việc phải lớn hơn 0 và không vượt 12 tháng.');
    if(o.probationEnabled==='yes'&&o.probMissingMonths)confirm.push(name+': đã chọn tính riêng thử việc nhưng chưa nhập thời gian thử việc.');
    if(o.probationEnabled==='yes'&&o.probPctInvalid)confirm.push(name+': % lương thử việc cần lớn hơn 0 và không vượt 100%.');
    if(o.probationEnabled==='yes'&&o.probJobType==='unknown')confirm.push(name+': chưa chọn nhóm công việc nên tool chưa kiểm tra được trần thời gian thử việc.');
    const missingTime=[];
    if(o.daysMissing)missingTime.push('số buổi lên văn phòng / tuần');
    if(o.commuteMissing)missingTime.push('thời gian di chuyển 1 chiều');
    if(o.otMonthlyMissing)missingTime.push('OT trung bình / tháng');
    if(o.paidLeaveMissing)missingTime.push('ngày phép / năm');
    if(missingTime.length)confirm.push(name+': còn thiếu '+missingTime.join(', ')+' → tổng thời gian và giá trị/giờ đang để Chưa đủ dữ liệu.');
    if(o.commuteNeedsDays)confirm.push(name+': đã nhập thời gian di chuyển nhưng chưa nhập số buổi lên văn phòng / tuần.');
    if(o.daysInvalid)confirm.push(name+': số buổi lên văn phòng / tuần phải từ 0 đến 7.');
    if(o.commuteInvalid)confirm.push(name+': thời gian di chuyển 1 chiều phải từ 0 đến 1,440 phút.');
    if(o.otMonthlyInvalid)confirm.push(name+': OT trung bình / tháng phải từ 0 đến 744 giờ.');
    if(o.paidLeaveInvalid)confirm.push(name+': ngày phép / năm phải từ 0 đến 60.');
    if(o.guaranteedBonusInvalid)confirm.push(name+': thưởng đảm bảo / năm phải từ 0 đến 24 tháng lương.');
    if(o.performanceBonusInvalid)confirm.push(name+': thưởng hiệu suất đang nằm ngoài giới hạn hợp lệ của loại dữ liệu đã chọn.');
    if(o.otPaidMissing)confirm.push(name+': đã nhập OT nhưng chưa xác nhận OT có được trả tiền hay không. Thời gian OT vẫn được tính, nhưng tiền OT chưa được cộng.');
    if(o.otBreakdownWeekdayInvalid||o.otBreakdownRestInvalid||o.otBreakdownHolidayInvalid)confirm.push(name+': giờ OT theo từng loại phải từ 0 đến 744 giờ.');
    if(o.otFactorInvalid||o.otFactorWeekdayInvalid||o.otFactorRestInvalid||o.otFactorHolidayInvalid)confirm.push(name+': hệ số OT phải lớn hơn 0% và không vượt 1,000%.');
    if(o.fixedAllowance>0)assumed.push(name+': phụ cấp cố định được giả định trả đủ 12 tháng trong phép so “Nếu làm đủ 12 tháng”.');
    if(o.otH>0&&o.otPaid==='yes'&&o.otType==='legacy'&&o.otFactor==null)confirm.push(name+': đã chọn OT có lương nhưng chưa nhập hệ số OT.');
    if(o.otBreakdownMismatch)confirm.push(name+': tổng giờ ở 3 loại OT chưa bằng tổng OT/tháng đã nhập, nên tool chưa cộng tiền OT.');
    if(o.otBaseMissing)confirm.push(name+': đã chọn biết mức lương dùng để tính OT nhưng chưa nhập số tiền.');
    if(o.otFactorBelowLegalMin||o.otMixedFactorBelowLegalMin)confirm.push(name+': hệ số OT bạn nhập thấp hơn mức tối thiểu tương ứng 150% ngày thường, 200% ngày nghỉ hằng tuần, 300% ngày lễ/Tết.');
    if(o.otGuardrailText)confirm.push(name+': '+o.otGuardrailText+' Đây là cảnh báo để kiểm tra, không phải chặn dữ liệu thực tế.');
    if(o.timeReady)anyTimeModel=true;
  });
  if(anyTimeModel)assumed.push('Quy đổi thời gian dùng 176 giờ/tháng, 4,33 tuần/tháng và 8 giờ cho mỗi ngày phép hưởng lương.');
  return{assumed,confirm};
}
function collectSwitchingAssumptions(sw){
  const confirm=[];
  if(!sw||!sw.enabled)return confirm;
  if(sw.currentGuaranteedStay>0&&sw.currentGuaranteedRule==='unknown')confirm.push('Công ty hiện tại: chưa rõ thưởng đảm bảo sẽ còn được nhận bao nhiêu nếu nghỉ.');
  if(sw.newGuaranteed==null&&sw.newGuaranteedRule==='unknown')confirm.push(sw.offerName+': chưa rõ thưởng đảm bảo trong năm onboard được tính thế nào.');
  if(sw.performanceNeeds&&sw.performanceNeeds.length)confirm.push(...sw.performanceNeeds);
  return [...new Set(confirm)];
}
function assumptionsHtml(a){
  if(!a||(!a.assumed.length&&!a.confirm.length))return'';
  const list=(title,items,cls)=>items.length?'<div class="assumption-group '+cls+'"><b>'+esc(title)+'</b><ul>'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'';
  return '<div class="assumption-card"><div class="assumption-title">Trước khi chốt, kiểm tra mấy điểm này</div><p class="assumption-sub">Con số có thể rất cụ thể nhưng một số đầu vào vẫn là giả định. Tool không chấm “độ chính xác” bằng %.</p>'+list('Tool đang tạm tính',a.assumed,'assumed')+list('Nên xác nhận',a.confirm,'confirm')+'</div>';
}
function switchingAssumptionsHtml(items){
  if(!items||!items.length)return'';
  return '<div class="switch-assumptions"><b>Còn điểm cần xác nhận cho phép tính chuyển việc</b><ul>'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>';
}

function switchingHtml(sw){
  if(!sw||!sw.enabled)return'';
  if(sw.needs&&sw.needs.length)return '<div class="switch-result"><h4>Còn thiếu dữ liệu để so đến 31/12</h4><p class="subt">'+sw.needs.map(esc).join('<br>')+'</p></div>';
  const money=v=>Number.isFinite(v)?fmt(v):'Chưa đủ dữ liệu';
  const signed=v=>!Number.isFinite(v)?'Chưa đủ dữ liệu':(v>0?'+':'')+fmt(v);
  const diffSentence=(v,label)=>{
    if(!Number.isFinite(v))return'Chưa đủ dữ liệu để so '+label+'.';
    if(Math.abs(v)<1)return'Hai phương án gần như bằng nhau trong '+label+'.';
    return v>0?'Nếu chuyển sang '+esc(sw.offerName)+', bạn có nhiều hơn khoảng <b>'+fmt(v)+'</b> đến 31/12.':'Nếu ở lại, bạn có nhiều hơn khoảng <b>'+fmt(Math.abs(v))+'</b> đến 31/12.';
  };
  const baseSentence='<p class="switch-callout">Tính đến 31/12, sau khi cộng lương trong kỳ và thưởng đảm bảo theo dữ liệu bạn xác nhận: '+diffSentence(sw.guaranteedDiff,'kịch bản thu nhập đảm bảo')+'</p>';
  const performanceReady=!(sw.performanceNeeds&&sw.performanceNeeds.length)&&Number.isFinite(sw.performanceDiff);
  const performanceBlock=performanceReady
    ?'<div class="switch-scenario-row"><span><b>Kịch bản 2 · Nếu có thêm thưởng hiệu suất</b><small>So thưởng hiệu suất của cả hai bên theo dữ liệu/quy tắc bạn nhập.</small></span><span class="v">Ở lại '+money(sw.stayPerformanceTotal)+' · Chuyển '+money(sw.switchPerformanceTotal)+' · chênh '+signed(sw.performanceDiff)+'</span></div><p class="switch-callout">'+diffSentence(sw.performanceDiff,'kịch bản có thêm thưởng hiệu suất')+'</p>'
    :'<div class="switch-scenario-row"><span><b>Kịch bản 2 · Nếu có thêm thưởng hiệu suất</b><small>Chưa đủ dữ liệu: '+(sw.performanceNeeds||[]).map(esc).join(' · ')+'</small></span><span class="v">Chưa đủ dữ liệu</span></div>';

  const otBlock=Number.isFinite(sw.otDiff)
    ?'<div class="switch-scenario-row"><span><b>Kịch bản phụ · Nếu OT có lương như đã nhập</b><small>OT được so riêng, không trộn vào hai kịch bản thưởng phía trên.</small></span><span class="v">Ở lại '+money(sw.stayWithOt)+' · Chuyển '+money(sw.switchWithOt)+' · chênh '+signed(sw.otDiff)+'</span></div>'
    :'';

  const details='<details class="switch-details"><summary class="calc-summary">Xem cách tính đến '+esc(sw.yearEndLabel)+'</summary><div class="switch-detail-body">'+
    '<div class="row"><span><b>Kịch bản 1 · Thu nhập đảm bảo / tương đối chắc chắn</b></span><span class="v"></span></div>'+
    '<div class="row"><span>Ở lại - lương trong kỳ</span><span class="v">'+money(sw.staySalary)+'</span></div>'+
    '<div class="row"><span>Ở lại - thưởng đảm bảo đến 31/12</span><span class="v">'+money(sw.currentGuaranteedStay)+'</span></div>'+
    '<div class="row"><span><b>Ở lại - tổng kịch bản 1</b></span><span class="v"><b>'+money(sw.stayGuaranteedTotal)+'</b></span></div>'+
    '<div class="row"><span>Chuyển - thưởng đảm bảo bên cũ vẫn nhận</span><span class="v">'+money(sw.currentGuaranteedReceived)+'</span></div>'+
    (sw.newTrialSalary>0?'<div class="row"><span>Chuyển - lương thử việc bên mới</span><span class="v">'+money(sw.newTrialSalary)+'</span></div>':'')+
    (sw.newFullSalary>0?'<div class="row"><span>Chuyển - lương chính thức bên mới</span><span class="v">'+money(sw.newFullSalary)+'</span></div>':'')+
    '<div class="row"><span>Chuyển - thưởng đảm bảo bên mới trong năm onboard</span><span class="v">'+money(sw.newGuaranteed)+'</span></div>'+
    '<div class="row"><span><b>Chuyển - tổng kịch bản 1</b></span><span class="v"><b>'+money(sw.switchGuaranteedTotal)+'</b></span></div>'+
    (performanceReady?'<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:8px">'+
      '<div class="row"><span><b>Kịch bản 2 · Có thêm thưởng hiệu suất</b></span><span class="v"></span></div>'+
      '<div class="row"><span>Ở lại - thưởng hiệu suất dự kiến</span><span class="v">+'+money(sw.currentPerformanceStay)+'</span></div>'+
      '<div class="row"><span><b>Ở lại - tổng kịch bản 2</b></span><span class="v"><b>'+money(sw.stayPerformanceTotal)+'</b></span></div>'+
      '<div class="row"><span>Chuyển - thưởng hiệu suất bên cũ vẫn nhận</span><span class="v">'+money(sw.currentPerformanceReceived)+'</span></div>'+
      '<div class="row"><span>Chuyển - thưởng hiệu suất bên mới</span><span class="v">+'+money(sw.newPerformance)+'</span></div>'+
      '<div class="row"><span><b>Chuyển - tổng kịch bản 2</b></span><span class="v"><b>'+money(sw.switchPerformanceTotal)+'</b></span></div>'+
    '</div>':'')+
    '<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:8px">'+
      '<div class="row"><span><b>Quy tắc thưởng đảm bảo bên cũ</b></span><span class="v" style="white-space:normal;text-align:right">'+esc(sw.currentGuaranteedNote||'-')+'</span></div>'+
      '<div class="row"><span><b>Quy tắc thưởng đảm bảo bên mới</b></span><span class="v" style="white-space:normal;text-align:right">'+esc(sw.newGuaranteedNote||'-')+'</span></div>'+
      (performanceReady?'<div class="row"><span><b>Quy tắc thưởng hiệu suất bên cũ</b></span><span class="v" style="white-space:normal;text-align:right">'+esc(sw.currentPerformanceNote||'-')+'</span></div>'+
      '<div class="row"><span><b>Quy tắc thưởng hiệu suất bên mới</b></span><span class="v" style="white-space:normal;text-align:right">'+esc(sw.newPerformanceNote||'-')+'</span></div>':'')+
      '<p class="subt" style="margin-top:8px">'+esc(sw.comparisonNote||'')+' '+esc(sw.taxNote||'')+'</p>'+
    '</div></div></details>';

  return '<div class="switch-result"><h4>Đến '+esc(sw.yearEndLabel)+': ở lại hay chuyển?</h4>'+
    '<p class="subt">So từ '+esc(sw.comparisonStartLabel)+' đến '+esc(sw.yearEndLabel)+'. Tool đặt lương và thưởng của hai phương án vào cùng mốc 31/12 để so trực tiếp.</p>'+
    (sw.policyYearWarning?'<p class="assumption-note"><b>Lưu ý về năm tính:</b> '+esc(sw.policyYearWarning)+'</p>':'')+
    '<div class="switch-scenarios"><div class="switch-scenario-title">Kịch bản 1 · Thu nhập đảm bảo / tương đối chắc chắn</div>'+
      '<div class="switch-scenario-row"><span>Ở lại công ty hiện tại</span><span class="v">'+money(sw.stayGuaranteedTotal)+'</span></div>'+
      '<div class="switch-scenario-row"><span>Chuyển sang '+esc(sw.offerName)+'</span><span class="v">'+money(sw.switchGuaranteedTotal)+'</span></div>'+
      '<div class="switch-scenario-row combined"><span><b>Chênh đến '+esc(sw.yearEndLabel)+'</b></span><span class="v"><b>'+signed(sw.guaranteedDiff)+'</b></span></div>'+
    '</div>'+baseSentence+
    '<div class="switch-scenarios"><div class="switch-scenario-title">Kịch bản 2 · Nếu có thêm thưởng hiệu suất</div>'+performanceBlock+'</div>'+
    (otBlock?'<div class="switch-scenarios"><div class="switch-scenario-title">Kịch bản phụ · OT</div>'+otBlock+'</div>':'')+
    details+switchingAssumptionsHtml(collectSwitchingAssumptions(sw))+'</div>';
}
function annualDriverData(A,B){
  if(!A||!B)return[];
  return[
    {label:'Lương gross trong 12 tháng',value:A.annualBaseGross-B.annualBaseGross},
    {label:'Phụ cấp cố định',value:A.annualAllowance-B.annualAllowance},
    {label:'Thưởng đảm bảo',value:A.guaranteedBonusGross-B.guaranteedBonusGross},
    {label:'BH người lao động',value:B.annualEeIns-A.annualEeIns},
    {label:'Thuế TNCN',value:B.guaranteedAnnualTax-A.guaranteedAnnualTax}
  ];
}
function timeDriverData(A,B){
  if(!A||!B)return[];
  return[
    {label:'Đi lại',value:(A.commuteH-B.commuteH)*12},
    {label:'OT',value:(A.otH-B.otH)*12},
    {label:'Ngày phép hưởng lương',value:B.leaveHours-A.leaveHours}
  ];
}
function deltaDriversHtml(A,B){
  if(!A||!B||!A.annualReady||!B.annualReady)return'';
  const diff=A.guaranteedAnnualNet-B.guaranteedAnnualNet,drivers=annualDriverData(A,B).filter(x=>Math.abs(x.value)>=1).sort((x,y)=>Math.abs(y.value)-Math.abs(x.value));
  const title=Math.abs(diff)<1?'Vì sao hai offer gần bằng nhau ở thu nhập cố định?':'Vì sao '+esc(diff>0?A.name:B.name)+' hơn '+esc(diff>0?B.name:A.name)+' ở thu nhập cố định?';
  const lis=drivers.slice(0,4).map(d=>{const fav=d.value>0?A:B;return '<li><b>'+esc(d.label)+'</b> kéo chênh lệch về phía '+esc(fav.name)+' khoảng '+fmt(Math.abs(d.value))+'.</li>';}).join('');
  const td=timeDriverData(A,B).filter(x=>Math.abs(x.value)>=8).sort((x,y)=>Math.abs(y.value)-Math.abs(x.value))[0];
  const time=td?'<p style="margin:8px 0 0;font-size:12.5px"><b>Yếu tố thời gian lớn nhất:</b> '+esc(td.label)+' làm '+esc(td.value>0?A.name:B.name)+' tốn thêm khoảng '+fmtN(Math.abs(td.value),0)+' giờ/năm so với bên kia.</p>':'';
  return '<div style="margin:14px 0 4px;padding:12px 13px;border-radius:8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28)"><h4 style="margin:0 0 5px;font-family:var(--serif);font-size:16px">'+title+'</h4><p style="margin:0 0 7px;font-size:12.5px;opacity:.92">Đây là phân tích các yếu tố tạo ra chênh lệch, không phải lặp lại bảng tổng. Driver dương kéo về Offer A, yếu tố âm kéo về Offer B.</p><ul style="margin:0;padding-left:18px;font-size:12.5px">'+(lis||'<li>Các yếu tố chính đang gần triệt tiêu nhau.</li>')+'</ul>'+time+'<p style="margin:8px 0 0;font-size:11.5px;opacity:.88">Không đưa thưởng hiệu suất và kịch bản OT vào phân tích các yếu tố của thu nhập cố định.</p></div>';
}

function buildTxt(state,r,sw,sol){
  const A=r[0],B=r[1],L=['SO SÁNH 2 OFFER - V2','(mô phỏng theo các tham số áp dụng cho kỳ tính thuế/năm 2026; từng mốc hiệu lực xem trên website)',''];
  r.forEach(s=>{
    if(!s)return;
    const moneyLine=s.financialReady
      ?'  Lương gross: '+fmt(s.gross)+' | Phụ cấp cố định ngoài lương: '+fmt(s.fixedAllowance)+' | Tổng trước khấu trừ: '+fmt(s.totalMonthlyGross)+' | Net về tay: '+fmt(s.net)
      :'  Lương / Net / BH: Chưa đủ dữ liệu - đã chọn mức đóng BH cụ thể nhưng chưa nhập số tiền.';
    const annualLine=s.annualReady?'  Thu nhập cố định nếu làm đủ 12 tháng ≈ '+fmt(s.guaranteedAnnualNet):'  Thu nhập cố định nếu làm đủ 12 tháng: Chưa đủ dữ liệu.';
    const guaranteedLine='  Thưởng đảm bảo: '+bonusInputLabel(s,'guaranteed')+' | gross quy đổi: '+(s.annualReady?fmt(s.guaranteedBonusGross):'Chưa đủ dữ liệu');
    const performanceLine='  Thưởng hiệu suất: '+bonusInputLabel(s,'performance')+(s.hasPerformanceBonus?(s.performanceReady?' | nếu có thêm thưởng hiệu suất ≈ '+fmt(s.performanceAnnualNet):' | Chưa đủ dữ liệu'):'');
    const bhLine=s.financialReady?'  Căn cứ BHXH/BHYT: '+fmt(s.bhxhBase)+' | Căn cứ BHTN: '+fmt(s.bhtnBase):'  Căn cứ BH: Chưa đủ dữ liệu.';
    const timeLine=s.timeReady
      ?'  Giờ bình quân ≈ '+Math.round(s.avgMonthlyHours)+' h/tháng | Giá trị/giờ '+(s.annualReady?'≈ '+fmt(s.guaranteedPerHourWithOt)+'/giờ':'Chưa đủ dữ liệu')
      :'  Thời gian quy đổi / giá trị giờ: Chưa đủ dữ liệu.';
    L.push('● '+s.name,moneyLine,annualLine,guaranteedLine,performanceLine,
      '  Phụ cấp cố định ngoài lương, chịu thuế; BH theo lựa chọn: '+fmt(s.fixedAllowance)+'/tháng | Ngày phép: '+(s.paidLeaveInvalid?'Chưa đủ dữ liệu':fmtN(s.paidLeaveDays,0)+' ngày/năm'),
      bhLine,timeLine,
      '  OT: '+(s.otMonthlyInvalid?'Chưa đủ dữ liệu':(s.otH>0?fmtN(s.otH,1)+' h/tháng':'-'))+' | Được trả tiền: '+(s.otH<=0?'-':s.otPaid==='yes'?'Có':'Không')+' | Tiền OT ước tính: '+(s.otPayMonthly>0?fmt(s.otPayMonthly)+'/tháng':'-'));
    if(s.probationEnabled==='yes')L.push(s.probM>0?'  Thử việc tính riêng '+fmtN(s.probPctN,0)+'% × '+fmtN(s.probM,1)+' tháng: ≈ '+fmt(s.probNet)+'/tháng | BH: '+(s.probInsurance==='yes'?'Có':'Không'):'  Thử việc: Chưa đủ dữ liệu - cần % lương và thời gian hợp lệ.');
    else L.push('  Tính riêng thử việc: Không');
    const cap=5*MINWAGE[state.region||'I'];
    L.push(s.financialReady?'  Thất nghiệp ước tính (giả định 6 tháng gần nhất cùng mức): '+fmt(Math.min(s.bhtnBase*.6,cap))+'/tháng':'  Thất nghiệp ước tính: Chưa đủ dữ liệu.');
    if(state.mat==='show')L.push(s.financialReady?'  Thai sản 6 tháng (giả định 6 tháng gần nhất cùng mức): '+fmt(s.bhxhBase*6):'  Thai sản 6 tháng: Chưa đủ dữ liệu.');
    L.push('');
  });
  if(A&&B){
    if(A.financialReady&&B.financialReady){
      const nHi=A.net>=B.net?A:B,nLo=nHi===A?B:A;
      L.push('→ '+nHi.name+' net tháng cao hơn '+fmt(nHi.net-nLo.net)+'.');
      if(A.otPayMonthly>0||B.otPayMonthly>0){const otHi=A.monthlyTakeHomeWithOt>=B.monthlyTakeHomeWithOt?A:B,otLo=otHi===A?B:A;L.push('→ Nếu OT đúng như đã nhập, '+otHi.name+' tiền về tay cao hơn ≈ '+fmt(otHi.monthlyTakeHomeWithOt-otLo.monthlyTakeHomeWithOt)+'/tháng.');}
    }else L.push('→ Chưa so Net/tháng vì còn thiếu mức đóng BH cụ thể.');
    if(A.annualReady&&B.annualReady){
      const gHi=A.guaranteedAnnualNet>=B.guaranteedAnnualNet?A:B,gLo=gHi===A?B:A;
      L.push('→ Nếu làm đủ 12 tháng, thu nhập cố định của '+gHi.name+' cao hơn ≈ '+fmt(gHi.guaranteedAnnualNet-gLo.guaranteedAnnualNet)+'/năm.');
      annualDriverData(A,B).filter(x=>Math.abs(x.value)>=1).sort((x,y)=>Math.abs(y.value)-Math.abs(x.value)).slice(0,4).forEach(d=>L.push('  Driver: '+d.label+' → '+(d.value>0?A.name:B.name)+' khoảng '+fmt(Math.abs(d.value))));
    }else L.push('→ Chưa so thu nhập 12 tháng vì còn dữ liệu thiếu/không hợp lệ.');
  }
  const assumptions=collectAssumptions(state,r);
  if(assumptions.assumed.length||assumptions.confirm.length){
    L.push('','TRƯỚC KHI CHỐT');
    assumptions.assumed.forEach(x=>L.push('  Đang tạm tính: '+x));
    assumptions.confirm.forEach(x=>L.push('  Nên xác nhận: '+x));
  }
  if(sw&&sw.enabled){
    L.push('','NẾU CHUYỂN VIỆC THÌ SAO?');
    if(sw.needs&&sw.needs.length)L.push('  Còn thiếu cho kịch bản đảm bảo: '+sw.needs.join(' | '));
    else{
      L.push('  So từ '+sw.comparisonStartLabel+' đến '+sw.yearEndLabel,
        '  Kịch bản 1 - Ở lại: '+(Number.isFinite(sw.stayGuaranteedTotal)?fmt(sw.stayGuaranteedTotal):'Chưa đủ dữ liệu'),
        '  Kịch bản 1 - Chuyển sang '+sw.offerName+': '+(Number.isFinite(sw.switchGuaranteedTotal)?fmt(sw.switchGuaranteedTotal):'Chưa đủ dữ liệu'),
        '  Kịch bản 1 - Chênh đến 31/12: '+(Number.isFinite(sw.guaranteedDiff)?(sw.guaranteedDiff>0?'+':'')+fmt(sw.guaranteedDiff):'Chưa đủ dữ liệu'));
      if(Number.isFinite(sw.performanceDiff))L.push(
        '  Kịch bản 2 có thêm thưởng hiệu suất - Ở lại: '+fmt(sw.stayPerformanceTotal),
        '  Kịch bản 2 có thêm thưởng hiệu suất - Chuyển: '+fmt(sw.switchPerformanceTotal),
        '  Kịch bản 2 - Chênh: '+(sw.performanceDiff>0?'+':'')+fmt(sw.performanceDiff)
      );
      else if(sw.performanceNeeds&&sw.performanceNeeds.length)L.push('  Kịch bản 2 thưởng hiệu suất - còn thiếu: '+sw.performanceNeeds.join(' | '));
      collectSwitchingAssumptions(sw).forEach(x=>L.push('  Nên xác nhận: '+x));
    }
  }
  if(sol&&sol.enabled){
    L.push('','LỚP 6 - OFFER TỐI THIỂU ĐỂ ĐÁNG CHUYỂN');
    if(sol.needs&&sol.needs.length)sol.needs.forEach(x=>L.push('  Cần hoàn thiện: '+x));
    else{
      L.push('  Cấu trúc tham chiếu: '+sol.templateName,
        '  Mức sàn: '+(sol.base.payType==='net'?'Net ':'Gross ')+fmt(sol.base.input)+'/tháng | Gross '+fmt(sol.base.gross)+' | Net '+fmt(sol.base.net),
        '  Mục tiêu quyết định mức này: '+(sol.binding?sol.binding.label:'-'));
    }
  }
  L.push('','Lưu ý: ô thiếu dữ liệu được giữ ở trạng thái “Chưa đủ dữ liệu”; tool không tự thay bằng một giá trị khác để hoàn tất phép tính.');
  return L.join('\n');
}
function solverConfig(state){
  const raw=state.solver||{};
  return{
    enabled:raw.enabled===true,
    templateOffer:raw.templateOffer==='1'?'1':'0',
    goalNoLoss:raw.goalNoLoss===true,
    noLossBuffer:Math.max(0,num(raw.noLossBuffer)||0),
    goalMonthlyNet:raw.goalMonthlyNet===true,
    targetMonthlyNet:Math.max(0,num(raw.targetMonthlyNet)||0),
    goalAnnualFixed:raw.goalAnnualFixed===true,
    targetAnnualFixed:Math.max(0,num(raw.targetAnnualFixed)||0)
  };
}
function solverCandidateState(state,cfg,salary){
  const x=JSON.parse(JSON.stringify(state||{})),idx=cfg.templateOffer==='1'?1:0;
  x.offers=Array.isArray(x.offers)?x.offers:[{},{}];
  x.offers[idx]=Object.assign({},x.offers[idx]||{}, {gross:salary});
  x.switching=Object.assign({},x.switching||{}, {enabled:true,targetOffer:String(idx)});
  delete x.solver;
  return x;
}
function solverEval(state,cfg,salary){
  const x=solverCandidateState(state,cfg,salary),r=compute(x),idx=cfg.templateOffer==='1'?1:0,offer=r[idx],sw=computeSwitching(x,r);
  return{state:x,r,offer,sw};
}
function solverScenarioDiff(sw,mode){
  if(!sw)return null;
  if(mode==='ot')return sw.otDiff;
  if(mode==='performance')return sw.performanceDiff;
  return sw.guaranteedDiff;
}
function solverComparisonYearEndLabel(state){
  const onboard=parseDate(state?.switching?.onboardDate);
  return onboard?'31/12/'+onboard.getUTCFullYear():'31/12 của năm onboard';
}
function solverConstraintDefs(cfg,state){
  const a=[];
  if(cfg.goalNoLoss)a.push({key:'noLoss',label:'Đến '+solverComparisonYearEndLabel(state)+', tổng thu nhập khi chuyển việc không thấp hơn ở lại',target:cfg.noLossBuffer});
  if(cfg.goalMonthlyNet)a.push({key:'monthlyNet',label:'Đạt mục tiêu Net/tháng: '+fmt(cfg.targetMonthlyNet),target:cfg.targetMonthlyNet});
  if(cfg.goalAnnualFixed)a.push({key:'annualFixed',label:'Đạt mục tiêu Net/năm: '+fmt(cfg.targetAnnualFixed),target:cfg.targetAnnualFixed});
  return a;
}
function solverConstraintPass(ev,def,mode='base'){
  if(!ev||!ev.offer)return false;
  if(def.key==='monthlyNet')return ev.offer.net>=def.target-1;
  if(def.key==='annualFixed')return ev.offer.annualReady&&ev.offer.guaranteedAnnualNet>=def.target-1;
  if(def.key==='noLoss'){const d=solverScenarioDiff(ev.sw,mode);return Number.isFinite(d)&&d>=def.target-1;}
  return false;
}
function solverSalarySearch(state,cfg,defs,mode='base'){
  if(!defs.length)return null;
  const passes=salary=>{const ev=solverEval(state,cfg,salary);return defs.every(d=>solverConstraintPass(ev,d,mode));};
  let lo=0,hi=10_000_000,guard=0;
  while(hi<2_000_000_000&&!passes(hi)){lo=hi;hi*=2;guard++;if(guard>20)break;}
  if(!passes(hi))return null;
  for(let i=0;i<56;i++){const mid=(lo+hi)/2;if(passes(mid))hi=mid;else lo=mid;}
  const rounded=Math.ceil(hi/100_000)*100_000;
  return passes(rounded)?rounded:Math.ceil((rounded+100_000)/100_000)*100_000;
}
function solverSnapshot(state,cfg,salary){
  if(!Number.isFinite(salary))return null;
  const ev=solverEval(state,cfg,salary);
  if(!ev.offer)return null;
  return{input:salary,payType:ev.offer.fromNet?'net':'gross',gross:ev.offer.gross,net:ev.offer.net,annualFixed:ev.offer.guaranteedAnnualNet,sw:ev.sw};
}
function computeSolver(state,r){
  const cfg=solverConfig(state);
  if(!cfg.enabled)return{enabled:false,show:false};
  const idx=cfg.templateOffer==='1'?1:0,rawOffer=(state.offers||[])[idx]||{},templateName=String(rawOffer.name||('Offer '+(idx?'B':'A'))),defs=solverConstraintDefs(cfg,state),needs=[];
  if(!defs.length)needs.push('Chọn ít nhất một mục tiêu cần đạt.');
  if(cfg.goalMonthlyNet&&!(cfg.targetMonthlyNet>0))needs.push('Nhập mục tiêu Net/tháng lớn hơn 0.');
  if(cfg.goalAnnualFixed&&!(cfg.targetAnnualFixed>0))needs.push('Nhập mục tiêu Net/năm lớn hơn 0.');
  const probe=solverEval(state,cfg,100_000_000);
  if(!probe.offer)needs.push('Cấu hình '+templateName+' chưa đủ để mô phỏng mức lương.');
  else{
    if(!probe.offer.financialReady)needs.push(templateName+': '+financialMissingReason(probe.offer)+'.');
    if(probe.offer.probationEnabled==='unknown'&&(cfg.goalAnnualFixed||cfg.goalNoLoss))needs.push(templateName+': chưa xác nhận có giai đoạn thử việc cần tính riêng hay không.');
    if(probe.offer.probPctMissing)needs.push(templateName+': đã bật thử việc nhưng chưa nhập % lương thử việc.');
    if(probe.offer.probInsuranceMissing)needs.push(templateName+': chưa xác nhận BH bắt buộc trong thời gian thử việc.');
    if((cfg.goalAnnualFixed||cfg.goalNoLoss)&&!probe.offer.annualReady)needs.push(templateName+': cần hoàn thiện dữ liệu tài chính/thử việc trước khi giải mục tiêu năm/chuyển việc.');
  }
  if(cfg.goalNoLoss){
    const currentNet=num((state.switching||{}).currentNet);
    if(!Number.isFinite(currentNet)||currentNet<MIN_SWITCH_CURRENT_NET)needs.push('Net hiện tại / tháng: cần nhập để giải mục tiêu so đến 31/12.');
    if(probe.sw&&probe.sw.needs&&probe.sw.needs.length)needs.push(...probe.sw.needs);
  }
  const uniqueNeeds=[...new Set(needs)];
  if(uniqueNeeds.length)return{enabled:true,show:true,templateName,needs:uniqueNeeds};
  const threshold=solverSalarySearch(state,cfg,defs,'base');
  const perConstraint=defs.map(d=>{const x=solverSalarySearch(state,cfg,[d],'base');return{key:d.key,label:d.label,input:x,snapshot:solverSnapshot(state,cfg,x)};});
  if(!Number.isFinite(threshold))return{enabled:true,show:true,templateName,cfg,noSolution:true,perConstraint};
  const base=solverSnapshot(state,cfg,threshold);
  const binding=perConstraint.filter(x=>Number.isFinite(x.input)).sort((a,b)=>b.input-a.input)[0]||null;
  const hasOt=probe.offer.otPayMonthly>0,hasPerf=probe.offer.hasPerformanceBonus;
  const scenarioModes=[];
  if(hasOt)scenarioModes.push({key:'ot',label:'Nếu OT có lương duy trì như đã nhập'});
  if(hasPerf)scenarioModes.push({key:'performance',label:'Nếu có thêm thưởng hiệu suất đã nhập'});
  const scenarios=scenarioModes.map(m=>{const x=solverSalarySearch(state,cfg,defs,m.key);return Number.isFinite(x)?{...m,input:x,snapshot:solverSnapshot(state,cfg,x)}:null;}).filter(Boolean);
  const currentNet=num((state.switching||{}).currentNet),premium=Number.isFinite(currentNet)&&currentNet>0?base.net-currentNet:null,premiumPct=Number.isFinite(premium)&&currentNet>0?premium/currentNet*100:null;
  const annotations=(r||[]).map((o,i)=>o?{idx:i,name:o.name,gross:o.gross,net:o.net,pass:o.gross+1>=base.gross,diffGross:o.gross-base.gross}:null).filter(Boolean);
  return{enabled:true,show:true,templateName,templateIdx:idx,cfg,base,perConstraint,binding,scenarios,currentNet:Number.isFinite(currentNet)?currentNet:null,premium,premiumPct,buffer5:Math.ceil(threshold*1.05/100_000)*100_000,buffer10:Math.ceil(threshold*1.10/100_000)*100_000,annotations};
}
function solverHtml(sol){
  if(!sol||!sol.enabled)return'';
  if(sol.needs&&sol.needs.length)return '<div class="solver-result"><h3>Lớp 6 · Mức lương tối thiểu để đạt mục tiêu tài chính</h3><div class="solver-needs"><b>Cần hoàn thiện trước khi tính</b><ul>'+sol.needs.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div></div>';
  const b=sol.base,ptype=b.payType==='net'?'Net':'Gross',bind=sol.binding?sol.binding.label:'Mục tiêu đã chọn';
  const constraints=sol.perConstraint.map(x=>'<div class="solver-row"><span>'+esc(x.label)+'</span><span class="v">'+(x.snapshot?(x.snapshot.payType==='net'?'Net ':'Gross ')+fmt(x.input):'-')+'</span></div>').join('');
  const scenarios=sol.scenarios.length?'<div class="solver-scenarios"><b>Kịch bản từ khoản biến động đã nhập</b>'+sol.scenarios.map(x=>'<div class="solver-row"><span>'+esc(x.label)+'</span><span class="v">'+(x.snapshot?(x.snapshot.payType==='net'?'Net ':'Gross ')+fmt(x.input):'-')+'</span></div>').join('')+'<p>Đây là kịch bản, không thay thế mức sàn theo khoản cố định/đảm bảo.</p></div>':'';
  const premium=Number.isFinite(sol.premium)?'<p class="solver-premium"><b>Chênh Net tối thiểu so với hiện tại:</b> '+(sol.premium>=0?'+':'')+fmt(sol.premium)+' net/tháng'+(Number.isFinite(sol.premiumPct)?' ('+(sol.premiumPct>=0?'+':'')+fmtN(sol.premiumPct,1)+'%)':'')+' so với net hiện tại.</p>':'';
  const ann=sol.annotations.length?'<div class="solver-annotations">'+sol.annotations.map(x=>'<div class="solver-row"><span>'+esc(x.name)+'</span><span class="v '+(x.pass?'ok':'under')+'">'+(x.pass?'Trên sàn ':'Dưới sàn ')+fmt(Math.abs(x.diffGross))+' gross</span></div>').join('')+'</div>':'';
  return '<div class="solver-result"><h3>Lớp 6 · Mức lương tối thiểu để đạt mục tiêu tài chính</h3><p class="solver-sub">Dùng điều kiện của <b>'+esc(sol.templateName)+'</b>, chỉ coi mức lương là ẩn số cần giải.</p><div class="solver-hero"><span>Mức lương tối thiểu để đạt mục tiêu tài chính</span><strong>'+ptype+' '+fmt(b.input)+'/tháng</strong><small>≈ Gross '+fmt(b.gross)+' · Net '+fmt(b.net)+'/tháng</small></div><p><b>Mục tiêu quyết định mức này:</b> '+esc(bind)+'.</p>'+premium+'<div class="solver-breakdown"><b>Mỗi mục tiêu riêng cần tối thiểu</b>'+constraints+'</div>'+scenarios+'<div class="solver-buffer"><b>Khoảng đàm phán tham khảo</b><div class="solver-row"><span>Sàn + 5%</span><span class="v">'+ptype+' '+fmt(sol.buffer5)+'</span></div><div class="solver-row"><span>Sàn + 10%</span><span class="v">'+ptype+' '+fmt(sol.buffer10)+'</span></div><p>Mức sàn là điểm vừa đủ đạt mục tiêu, không phải mức tool khuyên bạn báo HR.</p></div>'+ann+'<p class="solver-foot">Tool không tự quy đổi commute/phép/công việc/sếp thành tiền. Hãy đọc Layer 3-5 song song trước khi quyết định.</p></div>';
}

function render(state){
  const r=compute(state),A=r[0],B=r[1],both=!!(A&&B),sw=computeSwitching(state,r),assumptions=collectAssumptions(state,r),sol=computeSolver(state,r);
  if(!A&&!B)return{hasResults:false,showSwitching:sw.show,switchingHtml:switchingHtml(sw),showLayer6:sol.show,layer6Html:solverHtml(sol),showAssumptions:false,assumptionsHtml:'',exportText:buildTxt(state,r,sw,sol)};

  const l1cols=compareL1Html(A,B);
  let l1delta='';
  if(both){
    if(!A.financialReady||!B.financialReady)l1delta='Chưa so Net/tháng vì ít nhất một phương án đang thiếu mức đóng BH cụ thể.';
    else{
      const hi=A.net>=B.net?A:B,lo=hi===A?B:A;
      l1delta='<b>Chưa tính tiền OT:</b> '+esc(hi.name)+' về tay cao hơn <b class="up">'+fmt(hi.net-lo.net)+'/tháng</b>.';
      if(A.otPayMonthly>0||B.otPayMonthly>0){
        const otHi=A.monthlyTakeHomeWithOt>=B.monthlyTakeHomeWithOt?A:B,otLo=otHi===A?B:A;
        l1delta+=' <b>Nếu OT đúng như đã nhập:</b> '+esc(otHi.name)+' về tay cao hơn ≈ <b>'+fmt(otHi.monthlyTakeHomeWithOt-otLo.monthlyTakeHomeWithOt)+'/tháng</b>.';
      }
    }
  }

  const annualcols=compareAnnualHtml(A,B);
  let annualdelta='';
  if(both){
    if(!A.annualReady||!B.annualReady)annualdelta='Chưa so thu nhập 12 tháng vì ít nhất một phương án còn thiếu hoặc có dữ liệu không hợp lệ.';
    else{
      const gHi=A.guaranteedAnnualNet>=B.guaranteedAnnualNet?A:B,gLo=gHi===A?B:A;
      annualdelta='<b>Thu nhập cố định:</b> '+esc(gHi.name)+' cao hơn ≈ <b>'+fmt(gHi.guaranteedAnnualNet-gLo.guaranteedAnnualNet)+'/năm</b>.';
      if((A.hasPerformanceBonus&&A.performanceReady)||(B.hasPerformanceBonus&&B.performanceReady)){
        const ap=A.hasPerformanceBonus&&A.performanceReady?A.performanceAnnualNet:A.guaranteedAnnualNet;
        const bp=B.hasPerformanceBonus&&B.performanceReady?B.performanceAnnualNet:B.guaranteedAnnualNet;
        const pHi=ap>=bp?A:B,pLo=pHi===A?B:A,pHiVal=pHi===A?ap:bp,pLoVal=pLo===A?ap:bp;
        annualdelta+=' <b>Nếu có thêm thưởng hiệu suất hợp lệ:</b> '+esc(pHi.name)+' cao hơn ≈ <b>'+fmt(pHiVal-pLoVal)+'/năm</b>.';
      }
    }
  }

  const tcols=compareTimeHtml(A,B);
  let tdelta='';
  if(both){
    if(!A.timeReady||!B.timeReady)tdelta='Chưa so thời gian vì ít nhất một phương án đang thiếu số buổi lên văn phòng hoặc có input thời gian không hợp lệ.';
    else{
      const dH=A.annualHours-B.annualHours;
      if(!A.hasT&&!B.hasT&&A.paidLeaveDays===0&&B.paidLeaveDays===0)tdelta='Nhập số buổi lên văn phòng, thời gian di chuyển, OT hoặc ngày phép để so trục thời gian.';
      else if(Math.abs(dH)<8)tdelta='Hai bên lấy thời gian gần tương đương trong năm.';
      else{const more=dH>0?A:B,less=dH>0?B:A;tdelta='<b>'+esc(more.name)+'</b> lấy nhiều hơn ≈ <b class="up">'+Math.round(Math.abs(dH))+' giờ/năm</b> - tương đương khoảng '+fmtN(Math.abs(dH)/8,1)+' ngày công so với '+esc(less.name)+'.';}
    }
  }

  const l2basis=compareInsuranceHtml(A,B);
  const region=MINWAGE[state.region]?state.region:'I',unempCap=5*MINWAGE[region];
  let sickDays=num(state.sickDays);if(!Number.isFinite(sickDays)||sickDays<0)sickDays=0;sickDays=Math.floor(sickDays);
  const rows=[{lbl:'Trợ cấp thất nghiệp',sub:'60% bình quân 6 tháng đóng BHTN; ở đây giả định 6 tháng cùng mức hiện tại',get:s=>Math.min(s.bhtnBase*.60,unempCap),cap:s=>s.bhtnBase*.60>unempCap}];
  if(state.mat==='show')rows.push({lbl:'Thai sản - 6 tháng khi sinh con',sub:'100% bình quân 6 tháng đóng BHXH; giả định 6 tháng cùng mức. Chưa gồm trợ cấp một lần khi sinh',get:s=>s.bhxhBase*6});
  if(sickDays>0)rows.push({lbl:'Ốm đau ('+sickDays+' ngày)',sub:'(căn cứ BHXH ÷ 24) × 75% × số ngày; không kiểm tra giới hạn ngày/điều kiện hưởng',get:s=>(s.bhxhBase/24*.75*sickDays)});
  const first=A||B;
  const head='<div class="erow head"><span>Nếu xảy ra</span><span>'+esc(first.name)+'</span><span>'+(both?esc(B.name):'-')+'</span></div>';
  const l3events=head+rows.map(row=>{const cell=s=>{if(!s)return'-';if(!s.financialReady)return'Chưa đủ dữ liệu';let v=fmt(row.get(s));if(row.cap&&row.cap(s))v+=' <span class="capped">(chạm trần)</span>';return v;};return '<div class="erow"><span class="lbl">'+row.lbl+'<small>'+row.sub+'</small></span><span class="va">'+cell(A)+'</span><span class="vb">'+(both?cell(B):'-')+'</span></div>';}).join('');

  const parts=[];
  if(both){
    parts.push('<h3>Bạn đang đổi gì lấy gì - bốn trục</h3>');
    if(A.financialReady&&B.financialReady){
      const mHi=A.net>=B.net?A:B,mLo=mHi===A?B:A;
      let moneyLine='<p><b>Tiền tháng</b> - chưa tính OT, '+esc(mHi.name)+' cao hơn <span class="hl">'+fmt(mHi.net-mLo.net)+'/tháng</span>.';
      if(A.otPayMonthly>0||B.otPayMonthly>0){const otHi=A.monthlyTakeHomeWithOt>=B.monthlyTakeHomeWithOt?A:B,otLo=otHi===A?B:A;moneyLine+=' Nếu OT đúng như đã nhập, '+esc(otHi.name)+' cao hơn ≈ <span class="hl">'+fmt(otHi.monthlyTakeHomeWithOt-otLo.monthlyTakeHomeWithOt)+'/tháng</span>.';}
      parts.push(moneyLine+'</p>');
    }else parts.push('<p><b>Tiền tháng</b> - chưa so được vì ít nhất một phương án đã chọn mức đóng BH cụ thể nhưng chưa nhập số tiền.</p>');

    const annualComparable=A.annualReady&&B.annualReady;
    if(annualComparable){
      const gHi=A.guaranteedAnnualNet>=B.guaranteedAnnualNet?A:B,gLo=gHi===A?B:A;
      let pkg='<p><b>Nếu làm đủ 12 tháng</b> - thu nhập cố định của '+esc(gHi.name)+' cao hơn <span class="hl">≈ '+fmt(gHi.guaranteedAnnualNet-gLo.guaranteedAnnualNet)+'/năm</span>.';
      if((A.hasPerformanceBonus&&A.performanceReady)||(B.hasPerformanceBonus&&B.performanceReady)){const ap=A.hasPerformanceBonus&&A.performanceReady?A.performanceAnnualNet:A.guaranteedAnnualNet,bp=B.hasPerformanceBonus&&B.performanceReady?B.performanceAnnualNet:B.guaranteedAnnualNet,pHi=ap>=bp?A:B,pLo=pHi===A?B:A;pkg+=' Nếu có thêm thưởng hiệu suất hợp lệ, '+esc(pHi.name)+' cao hơn ≈ '+fmt(Math.abs(ap-bp))+'/năm.';}
      parts.push(pkg+' Thưởng hiệu suất không nằm trong thu nhập cố định.</p>');
    }else parts.push('<p><b>Nếu làm đủ 12 tháng</b> - chưa so được vì có dữ liệu còn thiếu hoặc không hợp lệ.</p>');

    if(A.timeReady&&B.timeReady){
      const timeLess=A.annualHours<=B.annualHours?A:B,timeMore=timeLess===A?B:A;
      if(Math.abs(A.annualHours-B.annualHours)<8)parts.push('<p><b>Thời gian</b> - hai bên gần tương đương sau khi tính đi lại, OT và ngày phép hưởng lương.</p>');
      else parts.push('<p><b>Thời gian</b> - '+esc(timeLess.name)+' giữ lại nhiều hơn khoảng <span class="hl">'+fmtN(Math.abs(A.annualHours-B.annualHours)/8,1)+' ngày công/năm</span> so với '+esc(timeMore.name)+'.</p>');
    }else parts.push('<p><b>Thời gian</b> - chưa so được vì thiếu số buổi lên văn phòng hoặc có input thời gian không hợp lệ.</p>');

    if(A.financialReady&&B.financialReady){
      if(A.bhxhBase!==B.bhxhBase||A.bhtnBase!==B.bhtnBase){const bhHi=A.bhxhBase>=B.bhxhBase?A:B,bhLo=bhHi===A?B:A;parts.push('<p><b>An sinh</b> - '+esc(bhHi.name)+' có căn cứ BHXH/BHYT cao hơn '+fmt(bhHi.bhxhBase-bhLo.bhxhBase)+'. BHTN được so riêng theo trần vùng.</p>');}
      else parts.push('<p><b>An sinh</b> - hai bên có căn cứ BH tương đương theo dữ liệu đã nhập.</p>');
    }else parts.push('<p><b>An sinh</b> - chưa so được vì còn thiếu mức đóng BH cụ thể.</p>');

    if(annualComparable)parts.push(deltaDriversHtml(A,B));
    parts.push('<p>Tool không tự đoán để lấp dữ liệu thiếu: ô nào chưa đủ sẽ được giữ ở trạng thái “Chưa đủ dữ liệu”.</p>');
  }else parts.push('<h3>Thêm offer thứ hai để so</h3>','<p>Đang có một offer. Nhập bên còn lại để nhìn cả tiền tháng, thu nhập 12 tháng, thời gian và an sinh.</p>');

  return{hasResults:true,l1cols,l1delta,showL1Delta:both,annualcols,annualdelta,showAnnualDelta:both,tcols,tdelta,showTDelta:both,l2basis,l3events,verdictHtml:parts.join(''),showAssumptions:!!(assumptions.assumed.length||assumptions.confirm.length),assumptionsHtml:assumptionsHtml(assumptions),showSwitching:sw.show,switchingHtml:switchingHtml(sw),showLayer6:sol.show,layer6Html:solverHtml(sol),exportText:buildTxt(state,r,sw,sol)};
}
function optionRawV3(state,id){
  if(id==='current')return state.currentJob||{};
  if(id==='1')return (state.offers||[])[1]||{};
  return (state.offers||[])[0]||{};
}
function optionComputedV3(state){
  const deps=normalizedDeps(state),region=MINWAGE[state.region]?state.region:'I';
  const current=state.currentJobEnabled?computeOffer({...state.currentJob,probationEnabled:'no',probPct:null,probMon:null,probInsurance:'yes'},deps,region):null;
  const candidates=compute(state);if(state.offerCount!==2)candidates[1]=null;
  return{current,candidates};
}
function availableOptionsV3(state,computed){
  const out=[];
  if(computed.current)out.push({id:'current',name:computed.current.name||'Công việc hiện tại',kind:'current'});
  if(computed.candidates[0])out.push({id:'0',name:computed.candidates[0].name||'Offer A',kind:'offer'});
  if(state.offerCount===2&&computed.candidates[1])out.push({id:'1',name:computed.candidates[1].name||'Offer B',kind:'offer'});
  return out;
}
function resolveComparisonV3(state,available){
  const ids=new Set(available.map(x=>x.id));let left=state.comparison?.left,right=state.comparison?.right;
  if(!ids.has(left))left=null;if(!ids.has(right)||right===left)right=null;
  if(!left){
    if(ids.has('current')&&ids.has('0')){left='current';right='0';}
    else if(ids.has('0')&&ids.has('1')){left='0';right='1';}
    else if(ids.has('current')&&ids.has('1')){left='current';right='1';}
    else left=available[0]?.id||null;
  }
  if(!right){const next=available.find(x=>x.id!==left);right=next?next.id:null;}
  return{left,right};
}
function optionByIdV3(computed,id){if(id==='current')return computed.current;if(id==='1')return computed.candidates[1];if(id==='0')return computed.candidates[0];return null;}
function pairProjectedStateV3(state,pair){
  const left=pair.left?optionRawV3(state,pair.left):{},right=pair.right?optionRawV3(state,pair.right):{};
  return{...state,offers:[left||{},right||{}],switching:{...(state.switching||{}),enabled:false},solver:{...(state.solver||{}),enabled:false}};
}
function summaryHtmlV3(state,computed,available){
  if(!available.length)return'';
  const card=o=>{
    const s=optionByIdV3(computed,o.id);if(!s)return'';
    const monthly=s.financialReady?fmt(s.net)+'/tháng':'Chưa đủ dữ liệu';
    const annual=s.annualReady?fmt(s.guaranteedAnnualNet)+'/năm':'Chưa đủ dữ liệu';
    const time=s.timeReady?fmtN(s.annualHours,0)+' giờ/năm':'Chưa đủ dữ liệu';
    const bh=s.financialReady?fmt(s.bhxhBase):'Chưa đủ dữ liệu';
    const badge=o.kind==='current'?'<span class="v3-badge">Mốc so sánh</span>':'';
    return '<div class="v3-summary-card" data-option="'+esc(o.id)+'"><div class="v3-summary-name">'+esc(o.name)+badge+'</div><strong>'+monthly+'</strong><span>Thu nhập cố định: '+annual+'</span><span>Thời gian quy đổi: '+time+'</span><span>Căn cứ BHXH/BHYT: '+bh+'</span></div>';
  };
  return '<div class="v3-summary"><div class="v3-summary-title">Tổng quan các phương án</div><div class="v3-summary-grid">'+available.map(card).join('')+'</div></div>';
}
function modeTitleV3(available){
  const cur=available.find(x=>x.id==='current'),a=available.find(x=>x.id==='0'),b=available.find(x=>x.id==='1');
  if(cur&&a&&b)return'Ở lại, chọn '+a.name+' hay '+b.name+'?';
  if(cur&&(a||b))return'Ở lại hay chuyển sang '+(a||b).name+'?';
  if(a&&b)return a.name+' hay '+b.name+'?';
  if(available.length===1)return'Phân tích '+available[0].name;
  return'Chưa có phương án đủ dữ liệu';
}
function derivedCurrentBonusNetV3(state,current){return current?marginalGuaranteedBonusNet(current,1,normalizedDeps(state)):null;}
function computeSwitchingV3(state,computed){
  const sw=state.switching||{};if(!sw.enabled)return{enabled:false,show:false};
  if(!computed.current)return{enabled:true,show:true,needs:['Thêm dữ liệu Công việc hiện tại để tính tác động khi chuyển việc.']};
  let idx=sw.targetOffer==='1'&&state.offerCount===2?'1':'0';if(!computed.candidates[Number(idx)])idx=computed.candidates[0]?'0':'1';
  if(!computed.candidates[Number(idx)])return{enabled:true,show:true,needs:['Nhập lương cho offer bạn muốn chuyển sang.']};
  const projected={...state,switching:{...sw,targetOffer:idx,currentNet:computed.current.financialReady?computed.current.net:null,currentOtPayMonthly:computed.current.otPayKnown?computed.current.otPayMonthly:null,currentFinancialBlocked:computed.current.financialReady===false,currentFinancialReason:computed.current.financialReady?'':financialMissingReason(computed.current)}};
  return computeSwitching(projected,computed.candidates);
}
function solverStateForV3(state,computed,idx){
  return{...state,solver:{...(state.solver||{}),templateOffer:String(idx)},switching:{...(state.switching||{}),enabled:true,targetOffer:String(idx),currentNet:computed.current?.financialReady?computed.current.net:null,currentOtPayMonthly:computed.current?.otPayKnown?computed.current.otPayMonthly:null,currentFinancialBlocked:computed.current?.financialReady===false,currentFinancialReason:computed.current?.financialReady?'':financialMissingReason(computed.current)}};
}

function diagV3(kind,code,title,section,fieldLabel,reason,action){return{kind,code,title,section,fieldLabel,reason,action};}
function solverActionForConstraintV3(key){
  if(key==='monthlyNet')return{scope:'solver',field:'targetMonthlyNet'};
  if(key==='annualFixed')return{scope:'solver',field:'targetAnnualFixed'};
  if(key==='noLoss')return{scope:'solver',field:'noLossBuffer'};
  return{scope:'solver',field:'goals'};
}
function solverDiagnosticsV3(state,computed,idx,sol){
  const out=[],offerRaw=(state.offers||[])[idx]||{},offerName=String(offerRaw.name||('Offer '+(idx?'B':'A'))),cfg=solverConfig(state),sw=state.switching||{},current=state.currentJob||{};
  if(!state.currentJobEnabled){
    out.push(diagV3('missing','current_disabled','Cần thêm Công việc hiện tại','Công việc hiện tại','Lương / tháng','Lớp 6 cần Công việc hiện tại để làm mốc so sánh với phương án ở lại.',{scope:'current',field:'gross',activate:true}));
    return out;
  }
  const deps=num(state.deps);
  if(!(Number.isFinite(deps)&&deps>=0))out.push(diagV3('missing','dependents','Thiếu số người phụ thuộc','Bối cảnh chung','Người phụ thuộc','Nhập 0 nếu không có; tool không tự hiểu ô trống là 0.',{scope:'global',field:'deps'}));
  const currentSalary=num(current.gross);
  if(!Number.isFinite(currentSalary)||currentSalary<=0)out.push(diagV3('missing','current_salary','Thiếu lương hiện tại','Công việc hiện tại','Lương / tháng','Cần để tính Net hiện tại và làm mốc so sánh khi chuyển việc.',{scope:'current',field:'gross'}));
  if(current.bhMode==='unknown')out.push(diagV3('missing','current_bh_mode','Chưa rõ mức đóng bảo hiểm','Công việc hiện tại','Công ty dùng mức nào để đóng BH?','Chọn “Theo mức lương hiện tại” hoặc “Tôi biết mức cụ thể”.',{scope:'current',field:'bhMode'}));
  if(current.bhMode==='custom'&&!(num(current.customBase)>0))out.push(diagV3('missing','current_custom_bh','Thiếu mức đóng bảo hiểm','Công việc hiện tại','Mức dùng để đóng BH','Bạn đã chọn biết mức cụ thể nhưng chưa nhập số tiền.',{scope:'current',field:'customBase'}));
  if(num(current.fixedAllowance)>0&&current.bhMode!=='custom'&&current.allowanceBh==='unknown')out.push(diagV3('missing','current_allowance_bh','Chưa rõ BH của phụ cấp','Công việc hiện tại','Phụ cấp này có tính vào căn cứ BH?','Chọn Có hoặc Không để tính Net chính xác.',{scope:'current',field:'allowanceBh'}));
  if(!sol)return out;

  if(!(cfg.goalNoLoss||cfg.goalMonthlyNet||cfg.goalAnnualFixed))out.push(diagV3('missing','solver_goal','Chưa chọn mục tiêu','Lớp 6','Các mục tiêu tài chính','Chọn ít nhất một mục tiêu để tool biết mức lương nào cần tìm.',{scope:'solver',field:'goals'}));
  if(cfg.goalMonthlyNet&&!(cfg.targetMonthlyNet>0))out.push(diagV3('invalid','monthly_net_target','Cần nhập mục tiêu Net/tháng','Lớp 6','Net tối thiểu/tháng','Nhập mức Net/tháng lớn hơn 0.',{scope:'solver',field:'targetMonthlyNet'}));
  if(cfg.goalAnnualFixed&&!(cfg.targetAnnualFixed>0))out.push(diagV3('invalid','annual_net_target','Cần nhập mục tiêu Net/năm','Lớp 6','Net tối thiểu/năm','Nhập mức Net/năm lớn hơn 0.',{scope:'solver',field:'targetAnnualFixed'}));

  if(offerRaw.bhMode==='unknown')out.push(diagV3('missing','offer_bh_mode','Chưa rõ mức đóng bảo hiểm',offerName,'Công ty dùng mức nào để đóng BH?','Chọn “Theo mức lương offer” hoặc “Tôi biết mức cụ thể”.',{scope:'offer',idx,field:'bhMode'}));
  if(offerRaw.bhMode==='custom'&&!(num(offerRaw.customBase)>0))out.push(diagV3('missing','offer_custom_bh','Thiếu mức đóng bảo hiểm',offerName,'Mức dùng để đóng BH','Bạn đã chọn biết mức cụ thể nhưng chưa nhập số tiền.',{scope:'offer',idx,field:'customBase'}));
  if(num(offerRaw.fixedAllowance)>0&&offerRaw.bhMode!=='custom'&&offerRaw.allowanceBh==='unknown')out.push(diagV3('missing','offer_allowance_bh','Chưa rõ BH của phụ cấp',offerName,'Phụ cấp này có tính vào căn cứ BH?','Chọn Có hoặc Không để tính Net chính xác.',{scope:'offer',idx,field:'allowanceBh'}));
  if(offerRaw.probationEnabled==='unknown'&&(cfg.goalAnnualFixed||cfg.goalNoLoss))out.push(diagV3('missing','probation_known','Chưa rõ có thử việc hay không',offerName,'Có giai đoạn thử việc cần tính riêng?','Chọn Chưa rõ/Không/Có; để giải mục tiêu năm hoặc so đến 31/12 cần xác nhận Không hoặc Có.',{scope:'offer',idx,field:'probationEnabled'}));
  if(offerRaw.probationEnabled==='yes'){
    const pct=numF(offerRaw.probPct),months=numF(offerRaw.probMon);
    if(!Number.isFinite(pct))out.push(diagV3('missing','prob_pct','Thiếu % lương thử việc',offerName,'Lương thử việc (% mức lương offer)','Đã bật thử việc nhưng chưa nhập tỷ lệ lương thử việc.',{scope:'offer',idx,field:'probPct'}));
    else if(pct<=0||pct>100)out.push(diagV3('invalid','prob_pct','Cần kiểm tra lương thử việc',offerName,'Lương thử việc (% mức lương offer)','Tỷ lệ thử việc phải lớn hơn 0% và không vượt 100%.',{scope:'offer',idx,field:'probPct'}));
    if(!Number.isFinite(months)||months<=0)out.push(diagV3('missing','prob_duration','Thiếu thời gian thử việc',offerName,'Thời gian thử việc','Bạn đã chọn tính riêng thử việc nhưng chưa nhập thời gian.',{scope:'offer',idx,field:'probDurationValue'}));
    if(offerRaw.probInsurance==='unknown')out.push(diagV3('missing','prob_insurance','Chưa rõ BH trong thử việc',offerName,'Trong thời gian thử việc có đóng BH bắt buộc?','Chọn Có hoặc Không để tính thu nhập 12 tháng.',{scope:'offer',idx,field:'probInsurance'}));
  }

  if(cfg.goalNoLoss){
    if(!parseDate(sw.lastWorkingDate))out.push(diagV3('missing','last_working_date','Thiếu ngày làm việc cuối cùng','Nếu chuyển việc thì sao?','Ngày làm việc cuối cùng ở công ty hiện tại','Cần để xác định thời điểm hai phương án bắt đầu khác nhau và phần thu nhập bị hụt.',{scope:'switching',field:'lastWorkingDate'}));
    if(!parseDate(sw.onboardDate))out.push(diagV3('missing','onboard_date','Thiếu ngày onboard','Nếu chuyển việc thì sao?','Ngày onboard công ty mới','Cần để tính khoảng nghỉ và mốc 31/12 của năm onboard.',{scope:'switching',field:'onboardDate'}));
    const ld=parseDate(sw.lastWorkingDate),ob=parseDate(sw.onboardDate);
    if(ld&&ob&&ob<ld)out.push(diagV3('invalid','date_order','Hai ngày chuyển việc đang mâu thuẫn','Nếu chuyển việc thì sao?','Ngày onboard công ty mới','Ngày onboard đang trước ngày làm việc cuối cùng. Hãy kiểm tra lại hai ngày.',{scope:'switching',field:'onboardDate'}));

    const currentGuaranteed=num(sw.currentGuaranteedIfStay);
    if(!Number.isFinite(currentGuaranteed)||currentGuaranteed<0)out.push(diagV3('missing','current_guaranteed','Thiếu thưởng đảm bảo nếu ở lại','Nếu chuyển việc thì sao?','Thưởng đảm bảo nếu ở lại đến 31/12','Nhập 0 nếu không có. Đây là dữ liệu bắt buộc cho kịch bản thu nhập đảm bảo.',{scope:'switching',field:'currentGuaranteedIfStay'}));
    if(currentGuaranteed>0&&(!sw.currentGuaranteedRule||sw.currentGuaranteedRule==='unknown'))out.push(diagV3('missing','current_guaranteed_rule','Chưa rõ thưởng đảm bảo khi nghỉ','Nếu chuyển việc thì sao?','Thưởng đảm bảo bên hiện tại khi nghỉ','Chọn mất toàn bộ, theo thời gian, nhận đủ hoặc nhập số cụ thể.',{scope:'switching',field:'currentGuaranteedRule'}));
    if(sw.currentGuaranteedRule==='custom'&&!(num(sw.currentGuaranteedIfLeave)>=0))out.push(diagV3('missing','current_guaranteed_custom','Thiếu số thưởng đảm bảo vẫn nhận','Nếu chuyển việc thì sao?','Số thưởng đảm bảo bên hiện tại vẫn nhận','Bạn đã chọn nhập số cụ thể nhưng chưa điền số tiền.',{scope:'switching',field:'currentGuaranteedIfLeave'}));

    const computedOffer=computed.candidates[idx];
    if(computedOffer&&computedOffer.guaranteedBonusOfferValue>0&&(!sw.newGuaranteedRule||sw.newGuaranteedRule==='unknown'))out.push(diagV3('missing','new_guaranteed_rule','Chưa rõ thưởng đảm bảo năm onboard','Nếu chuyển việc thì sao?','Thưởng đảm bảo bên mới trong năm onboard','Chọn theo số tháng, nhận đủ, không nhận hoặc nhập số cụ thể.',{scope:'switching',field:'newGuaranteedRule'}));
    if(sw.newGuaranteedRule==='custom'&&!(num(sw.newGuaranteedCustom)>=0))out.push(diagV3('missing','new_guaranteed_custom','Thiếu số thưởng đảm bảo bên mới','Nếu chuyển việc thì sao?','Số thưởng đảm bảo dự kiến nhận','Bạn đã chọn nhập số cụ thể nhưng chưa điền số tiền.',{scope:'switching',field:'newGuaranteedCustom'}));
  }

  const knownCodes=new Set(out.map(x=>x.code));
  for(const msg of (sol.needs||[])){
    let code='other_'+out.length;
    if(msg.includes('ngày làm việc cuối cùng'))code='last_working_date';
    else if(msg.includes('ngày onboard'))code='onboard_date';
    else if(msg.includes('% lương thử việc'))code='prob_pct';
    else if(msg.includes('số tháng thử việc'))code='prob_duration';
    else if(msg.includes('mức đóng BH cụ thể'))code='offer_custom_bh';
    else if(msg.includes('số thưởng bạn dự kiến vẫn nhận'))code='old_bonus_custom';
    else if(msg.includes('số thưởng đảm bảo bạn dự kiến nhận'))code='new_bonus_custom';
    if(knownCodes.has(code))continue;
    out.push(diagV3('invalid',code,'Có dữ liệu cần kiểm tra',offerName,null,msg,{scope:'solver',field:'goals'}));knownCodes.add(code);
  }
  return out;
}
function diagnosticButtonV3(action,label='Đi tới'){
  if(!action)return'';
  const attrs=['data-diag-scope="'+esc(action.scope||'')+'"','data-diag-field="'+esc(action.field||'')+'"'];
  if(action.idx!=null)attrs.push('data-diag-idx="'+esc(action.idx)+'"');
  if(action.activate)attrs.push('data-diag-activate="1"');
  return '<button type="button" class="diag-action" '+attrs.join(' ')+'>'+esc(label)+'</button>';
}
function diagnosticListHtmlV3(items){
  if(!items||!items.length)return'';
  const title=items.some(x=>x.kind==='invalid')?'Có dữ liệu cần kiểm tra':'Cần thêm thông tin để tính';
  const rows=items.map((x,i)=>'<div class="diag-item"><div class="diag-copy"><b>'+esc(x.title)+'</b>'+(x.section?'<span class="diag-path">'+esc(x.section)+(x.fieldLabel?' → '+esc(x.fieldLabel):'')+'</span>':'')+(x.reason?'<small>'+esc(x.reason)+'</small>':'')+'</div>'+diagnosticButtonV3(x.action,i===0?'Đi tới':'Sửa')+'</div>').join('');
  const first=items[0]?.action;
  return '<div class="solver-needs diag-card"><b>'+esc(title)+'</b>'+rows+(items.length>1&&first?'<div class="diag-start">'+diagnosticButtonV3(first,'Bắt đầu từ thông tin đầu tiên')+'</div>':'')+'</div>';
}
function noSolutionHtmlV3(sol,name){
  const rows=(sol.perConstraint||[]).map(x=>{
    const ok=!!x.snapshot,action=solverActionForConstraintV3(x.key);
    const value=ok?((x.snapshot.payType==='net'?'Net ':'Gross ')+fmt(x.input)):'Chưa tìm được mức đáp ứng';
    return '<div class="diag-constraint '+(ok?'ok':'block')+'"><span class="diag-symbol">'+(ok?'✓':'✕')+'</span><div class="diag-copy"><b>'+esc(x.label)+'</b><small>'+esc(value)+'</small></div>'+diagnosticButtonV3(action,ok?'Xem mục tiêu':'Chỉnh mục tiêu')+'</div>';
  }).join('');
  const blocked=(sol.perConstraint||[]).filter(x=>!x.snapshot);
  const intro=blocked.length?'Một hoặc nhiều mục tiêu đang chặn kết quả. Tool vẫn hiển thị mục tiêu nào có thể đạt để bạn biết cần chỉnh ở đâu.':'Từng mục tiêu riêng đều tính được, nhưng chưa tìm được một mức lương đáp ứng đồng thời tất cả mục tiêu đã bật.';
  return '<div class="solver-needs diag-card no-solution"><b>Chưa tìm được mức lương đáp ứng tất cả mục tiêu</b><p>'+esc(intro)+'</p>'+rows+'</div>';
}
function solverCardV3(sol,name,actual,diagnostics){
  if(!sol||!sol.enabled)return'';
  if(diagnostics&&diagnostics.length)return '<div class="solver-result v3-solver-card"><h3>'+esc(name)+'</h3>'+diagnosticListHtmlV3(diagnostics)+'</div>';
  if(sol.noSolution)return '<div class="solver-result v3-solver-card"><h3>'+esc(name)+'</h3>'+noSolutionHtmlV3(sol,name)+'</div>';
  if(sol.needs&&sol.needs.length)return '<div class="solver-result v3-solver-card"><h3>'+esc(name)+'</h3>'+diagnosticListHtmlV3(sol.needs.map((x,i)=>diagV3('invalid','fallback_'+i,'Có dữ liệu cần kiểm tra',name,null,x,{scope:'solver',field:'goals'})))+'</div>';
  const b=sol.base,ptype=b.payType==='net'?'Net':'Gross',bind=sol.binding?sol.binding.label:'Mục tiêu đã chọn';
  const constraints=sol.perConstraint.map(x=>'<div class="solver-row"><span>'+esc(x.label)+'</span><span class="v">'+(x.snapshot?(x.snapshot.payType==='net'?'Net ':'Gross ')+fmt(x.input):'-')+'</span></div>').join('');
  const scenarios=sol.scenarios.length?'<div class="solver-scenarios"><b>Kịch bản từ khoản biến động đã nhập</b>'+sol.scenarios.map(x=>'<div class="solver-row"><span>'+esc(x.label)+'</span><span class="v">'+(x.snapshot?(x.snapshot.payType==='net'?'Net ':'Gross ')+fmt(x.input):'-')+'</span></div>').join('')+'<p>Đây là kịch bản, không thay thế mức sàn theo khoản cố định/đảm bảo.</p></div>':'';
  const actualLine=actual?'<p class="solver-actual"><b>'+esc(name)+' thực tế:</b> '+fmt(actual.gross)+' Gross - '+(actual.gross+1>=b.gross?'đang trên':'đang dưới')+' mức tối thiểu theo cấu trúc này khoảng '+fmt(Math.abs(actual.gross-b.gross))+' Gross/tháng.</p>':'';
  const premium=Number.isFinite(sol.premium)?'<p class="solver-premium"><b>Chênh Net tối thiểu so với hiện tại:</b> '+(sol.premium>=0?'+':'')+fmt(sol.premium)+'/tháng'+(Number.isFinite(sol.premiumPct)?' ('+(sol.premiumPct>=0?'+':'')+fmtN(sol.premiumPct,1)+'%)':'')+'.</p>':'';
  const policyWarning=b.sw&&b.sw.policyYearWarning?'<p class="assumption-note"><b>Lưu ý về năm tính:</b> '+esc(b.sw.policyYearWarning)+'</p>':'';
  return '<div class="solver-result v3-solver-card"><h3>Theo cấu trúc '+esc(name)+'</h3><div class="solver-hero"><span>Mức lương tối thiểu để đạt mục tiêu tài chính</span><strong>'+ptype+' '+fmt(b.input)+'/tháng</strong><small>≈ Gross '+fmt(b.gross)+' · Net '+fmt(b.net)+'/tháng</small></div><p><b>Mục tiêu quyết định mức này:</b> '+esc(bind)+'.</p>'+actualLine+premium+policyWarning+'<div class="solver-breakdown"><b>Mỗi mục tiêu riêng cần tối thiểu</b>'+constraints+'</div>'+scenarios+'<div class="solver-buffer"><b>Khoảng đàm phán tham khảo</b><div class="solver-row"><span>Sàn + 5%</span><span class="v">'+ptype+' '+fmt(sol.buffer5)+'</span></div><div class="solver-row"><span>Sàn + 10%</span><span class="v">'+ptype+' '+fmt(sol.buffer10)+'</span></div></div></div>';
}
function computeSolverV3(state,computed){
  const cfg=solverConfig(state);if(!cfg.enabled)return{show:false,html:'',diagnostics:[]};
  if(!computed.current){
    const currentItems=solverDiagnosticsV3(state,computed,0,{needs:[]});
    return{show:true,diagnostics:currentItems,html:'<div class="solver-result"><h3>Lớp 6 · Mức lương tối thiểu để đạt mục tiêu tài chính</h3>'+diagnosticListHtmlV3(currentItems)+'</div>'};
  }
  const available=[];if(computed.candidates[0])available.push(0);if(state.offerCount===2&&computed.candidates[1])available.push(1);
  if(!available.length){
    const item=diagV3('missing','offer_salary','Cần thêm offer mới','Offer mới','Lương / tháng','Nhập ít nhất một offer để tool có cấu trúc dùng khi tìm mức lương tối thiểu.',{scope:'offer',idx:0,field:'gross'});
    return{show:true,diagnostics:[item],html:'<div class="solver-result"><h3>Lớp 6 · Mức lương tối thiểu để đạt mục tiêu tài chính</h3>'+diagnosticListHtmlV3([item])+'</div>'};
  }
  let targets=[];if(state.solver?.templateOffer==='both'&&available.length>1)targets=available;else{const wanted=state.solver?.templateOffer==='1'?1:0;targets=available.includes(wanted)?[wanted]:[available[0]];}
  const allDiagnostics=[];
  const cards=targets.map(i=>{const st=solverStateForV3(state,computed,i),sol=computeSolver(st,computed.candidates),diagnostics=solverDiagnosticsV3(state,computed,i,sol);allDiagnostics.push(...diagnostics.map(x=>({...x,offerIdx:i})));return solverCardV3(sol,computed.candidates[i].name,computed.candidates[i],diagnostics);}).join('');
  return{show:true,diagnostics:allDiagnostics,html:'<div class="v3-solver-wrap">'+cards+'<p class="solver-foot">Mỗi mức tối thiểu được tính riêng theo chính cấu trúc BH, thử việc, thưởng, OT và phụ cấp của offer tương ứng. Thời gian/công việc/sếp không tự quy đổi thành tiền.</p></div>'};
}
function exportTextV3(state,computed,available,pair,pairResult,sw,solverV3){
  const lines=['SO SÁNH PHƯƠNG ÁN CÔNG VIỆC - V3',''];
  for(const o of available){const x=optionByIdV3(computed,o.id);lines.push('● '+o.name+' | Net '+(x.financialReady?fmt(x.net)+'/tháng':'Chưa đủ dữ liệu')+' | Thu nhập cố định '+(x.annualReady?fmt(x.guaranteedAnnualNet)+'/năm':'Chưa đủ dữ liệu'));}
  if(pair.left){const l=available.find(x=>x.id===pair.left)?.name||pair.left,r=available.find(x=>x.id===pair.right)?.name||pair.right;lines.push('','CẶP ĐANG XEM: '+l+(pair.right?' ↔ '+r:''));}
  if(pairResult?.exportText)lines.push('',pairResult.exportText.replace('SO SÁNH 2 OFFER - V2','CHI TIẾT CẶP ĐANG XEM'));
  if(sw?.enabled&&sw?.needs?.length)lines.push('','CHUYỂN VIỆC: '+sw.needs.join(' | '));
  if(state.solver?.enabled)lines.push('','LỚP 6: xem mức sàn theo từng cấu trúc offer trên giao diện V3.');
  return lines.join('\n');
}

function threeValueV3(value,{money=false,strong=false,best=false,suffix='',text=null}={}){
  if(text!=null)return '<span class="v3-three-value'+(strong?' strong':'')+(best?' best':'')+'">'+esc(text)+'</span>';
  if(!Number.isFinite(value))return '<span class="v3-three-value">-</span>';
  const shown=money?fmtShort(value):(fmtN(value,1)+suffix),title=money?fmt(value):(fmtN(value,1)+suffix);
  return '<span class="v3-three-value'+(strong?' strong':'')+(best?' best':'')+'" title="'+esc(title)+'">'+esc(shown)+'</span>';
}
function threeBestV3(items,get,prefer='max'){
  const vals=items.map(get).filter(Number.isFinite);if(!vals.length)return null;
  return prefer==='min'?Math.min(...vals):Math.max(...vals);
}
function threeMatrixV3(items,rows,label='Chỉ tiêu'){
  const head='<div class="erow head"><span>'+esc(label)+'</span>'+items.map(x=>'<span title="'+esc(x.name)+'">'+esc(x.name)+'</span>').join('')+'</div>';
  const body=rows.map(r=>{
    const best=r.prefer?threeBestV3(items,r.get,r.prefer):null;
    const cells=items.map(x=>{
      const raw=r.get(x),isBest=best!=null&&Number.isFinite(raw)&&Math.abs(raw-best)<1e-7;
      return r.cell?r.cell(x,raw,isBest):threeValueV3(raw,{money:!!r.money,strong:!!r.primary,best:isBest,suffix:r.suffix||''});
    }).join('');
    const style=r.primary?' style="background:rgba(47,94,84,.06);font-weight:600"':'';
    return '<div class="erow"'+style+'><span class="lbl">'+esc(r.label)+(r.sub?'<small>'+esc(r.sub)+'</small>':'')+'</span>'+cells+'</div>';
  }).join('');
  return '<div class="events v3-three-matrix">'+head+body+'</div>';
}
function threeDeltaV3(items,get,label,prefer='max',unit=''){
  const ranked=items.map(x=>({x,v:get(x)})).filter(z=>Number.isFinite(z.v));if(ranked.length<2)return'';
  ranked.sort((a,b)=>prefer==='min'?a.v-b.v:b.v-a.v);const top=ranked[0],low=ranked[ranked.length-1],diff=Math.abs(top.v-low.v);
  if(diff<1)return '<b>'+esc(label)+':</b> các phương án đang gần tương đương.';
  const val=unit==='money'?fmt(top.v):(fmtN(top.v,0)+unit),gap=unit==='money'?fmt(diff):(fmtN(diff,0)+unit);
  return '<b>'+esc(prefer==='min'?'Ít nhất - '+label:'Cao nhất - '+label)+':</b> '+esc(top.x.name)+' <b>'+esc(val)+'</b>; chênh '+esc(gap)+' so với '+esc(low.x.name)+'.';
}
function renderAllThreeV3(state,computed,available){
  const items=available.map(o=>optionByIdV3(computed,o.id)).filter(Boolean),region=MINWAGE[state.region]?state.region:'I';
  const anyAllowance=items.some(x=>x.fixedAllowance>0),anyOt=items.some(x=>x.otPayMonthly>0),anyPerf=items.some(x=>x.hasPerformanceBonus);
  const moneyCell=(x,raw,best,strong=false)=>x.financialReady?threeValueV3(raw,{money:true,best,strong}):threeValueV3(null,{text:'Chưa đủ dữ liệu',strong});
  const l1rows=[
    {label:'Net / tháng',sub:'về tay sau BH bắt buộc + thuế',get:x=>x.financialReady?x.net:NaN,primary:true,prefer:'max',cell:(x,v,b)=>moneyCell(x,v,b,true)},
    {label:'Lương gross',sub:'quy ngược nếu nhập net',get:x=>x.financialReady?x.gross:NaN,cell:(x,v,b)=>moneyCell(x,v,b)},
    {label:'BH người lao động',sub:'BHXH + BHYT + BHTN / tháng',get:x=>x.financialReady?-x.eeIns:NaN,cell:(x,v,b)=>moneyCell(x,v,b)},
    {label:'Thuế TNCN',sub:'ước tính / tháng',get:x=>x.financialReady?-x.tax:NaN,cell:(x,v,b)=>moneyCell(x,v,b)}
  ];
  if(anyAllowance)l1rows.push({label:'Phụ cấp cố định',sub:'khoản ngoài lương offer',get:x=>x.fixedAllowance,money:true});
  if(anyOt)l1rows.push({label:'Nếu OT có lương như đã nhập',sub:'Net tháng + tiền OT ước tính',get:x=>x.financialReady?x.monthlyTakeHomeWithOt:NaN,prefer:'max',cell:(x,v,b)=>moneyCell(x,v,b)});
  const financialItems=items.filter(x=>x.financialReady);
  const l1cols=threeMatrixV3(items,l1rows),l1delta=financialItems.length>=2?threeDeltaV3(financialItems,x=>x.net,'Net/tháng','max','money'):'Chưa đủ dữ liệu để so Net/tháng giữa các phương án.';

  const annualCell=(x,raw,best,strong=false)=>x.annualReady?threeValueV3(raw,{money:true,best,strong}):threeValueV3(null,{text:'Chưa đủ dữ liệu',strong});
  const annualRows=[{label:'Thu nhập cố định',sub:'lương + phụ cấp cố định + thưởng đảm bảo',get:x=>x.annualReady?x.guaranteedAnnualNet:NaN,prefer:'max',primary:true,cell:(x,v,b)=>annualCell(x,v,b,true)}];
  if(anyOt)annualRows.push({label:'Nếu mức OT này duy trì 12 tháng',sub:'kịch bản, không coi là khoản đảm bảo',get:x=>x.annualReady?x.guaranteedAnnualNet+x.otPayAnnual:NaN,prefer:'max',cell:(x,v,b)=>annualCell(x,v,b)});
  if(anyPerf)annualRows.push({label:'Nếu có thêm thưởng hiệu suất',sub:'chưa cộng kịch bản OT',get:x=>x.annualReady&&x.performanceReady&&x.hasPerformanceBonus?x.performanceAnnualNet:(x.annualReady&&!x.hasPerformanceBonus?x.guaranteedAnnualNet:NaN),prefer:'max',cell:(x,v,b)=>x.performanceReady||!x.hasPerformanceBonus?annualCell(x,v,b):threeValueV3(null,{text:'Chưa đủ dữ liệu'})});
  const annualcols=threeMatrixV3(items,annualRows),annualReady=items.filter(x=>x.annualReady),annualdelta=annualReady.length>=2?threeDeltaV3(annualReady,x=>x.guaranteedAnnualNet,'thu nhập cố định/năm','max','money'):'Chưa đủ dữ liệu để so thu nhập năm giữa các phương án.';

  const timeRows=[
    {label:'Tổng thời gian quy đổi / năm',sub:'giờ làm chuẩn - ngày phép + đi lại + OT',get:x=>x.timeReady?x.annualHours:NaN,prefer:'min',primary:true,suffix:'h',cell:(x,v,b)=>x.timeReady?threeValueV3(v,{best:b,strong:true,suffix:'h'}):threeValueV3(null,{text:'Chưa đủ dữ liệu',strong:true})},
    {label:'Lên văn phòng / tuần',get:x=>x.timeReady&&Number.isFinite(x.officeDays)?x.officeDays:NaN,suffix:' buổi',cell:(x,v,b)=>x.timeReady?threeValueV3(v,{suffix:' buổi'}):threeValueV3(null,{text:'Chưa đủ dữ liệu'})},
    {label:'Đi lại / tháng',sub:'khứ hồi theo số buổi lên văn phòng',get:x=>x.timeReady?x.commuteH:NaN,suffix:'h',cell:(x,v,b)=>x.timeReady?threeValueV3(v,{suffix:'h'}):threeValueV3(null,{text:x.commuteNeedsDays?'Cần số buổi/tuần':'Chưa đủ dữ liệu'})},
    {label:'OT trung bình / tháng',get:x=>x.timeReady?x.otH:NaN,suffix:'h',cell:(x,v,b)=>x.timeReady?threeValueV3(v,{suffix:'h'}):threeValueV3(null,{text:'Chưa đủ dữ liệu'})},
    {label:'Ngày phép / năm',get:x=>x.timeReady?x.paidLeaveDays:NaN,suffix:' ngày',cell:(x,v,b)=>x.timeReady?threeValueV3(v,{suffix:' ngày'}):threeValueV3(null,{text:'Chưa đủ dữ liệu'})},
    {label:'Giá trị / giờ',sub:'thu nhập cố định + OT có lương / thời gian quy đổi',get:x=>x.annualReady&&x.timeReady?x.guaranteedPerHourWithOt:NaN,prefer:'max',cell:(x,v,b)=>x.annualReady&&x.timeReady?threeValueV3(v,{money:true,best:b}):threeValueV3(null,{text:'Chưa đủ dữ liệu'})}
  ];
  const timeReady=items.filter(x=>x.timeReady);
  const tcols=threeMatrixV3(items,timeRows),tdelta=timeReady.length>=2?threeDeltaV3(timeReady,x=>x.annualHours,'thời gian quy đổi/năm','min','h'):'Chưa đủ dữ liệu để so thời gian giữa các phương án.';

  const insuranceRows=[
    {label:'Mức dùng để tính BH',sub:'trước khi áp trần',get:x=>x.financialReady?x.insuredInput:NaN,cell:(x,v,b)=>moneyCell(x,v,b)},
    {label:'Căn cứ BHXH / BHYT',get:x=>x.financialReady?x.bhxhBase:NaN,cell:(x,v,b)=>moneyCell(x,v,b)},
    {label:'Căn cứ BHTN',get:x=>x.financialReady?x.bhtnBase:NaN,cell:(x,v,b)=>moneyCell(x,v,b)},
    {label:'NLĐ đóng / tháng',sub:'BHXH + BHYT + BHTN',get:x=>x.financialReady?x.eeIns:NaN,cell:(x,v,b)=>moneyCell(x,v,b)}
  ];
  const l2basis=threeMatrixV3(items,insuranceRows);

  let sickDays=num(state.sickDays);if(!Number.isFinite(sickDays)||sickDays<0)sickDays=0;sickDays=Math.floor(sickDays);const unempCap=5*MINWAGE[region];
  const eventCell=(x,v,b)=>x.financialReady?threeValueV3(v,{money:true}):threeValueV3(null,{text:'Chưa đủ dữ liệu'});
  const eventRows=[{label:'Trợ cấp thất nghiệp',sub:'ước tính / tháng',get:x=>x.financialReady?Math.min(x.bhtnBase*.6,unempCap):NaN,cell:eventCell}];
  if(state.mat==='show')eventRows.push({label:'Thai sản - 6 tháng khi sinh con',sub:'mô phỏng theo căn cứ BHXH',get:x=>x.financialReady?x.bhxhBase*6:NaN,cell:eventCell});
  if(sickDays>0)eventRows.push({label:'Ốm đau ('+sickDays+' ngày)',sub:'mô phỏng, chưa kiểm tra điều kiện hưởng',get:x=>x.financialReady?x.bhxhBase/24*.75*sickDays:NaN,cell:eventCell});
  const l3events=threeMatrixV3(items,eventRows,'Nếu xảy ra');

  const netTop=[...financialItems].sort((a,b)=>b.net-a.net)[0]||null,timeTop=[...timeReady].sort((a,b)=>a.annualHours-b.annualHours)[0]||null,annualTop=[...annualReady].sort((a,b)=>b.guaranteedAnnualNet-a.guaranteedAnnualNet)[0]||null;
  const summary=[
    netTop?'<b>Net/tháng cao nhất:</b> '+esc(netTop.name)+' '+fmt(netTop.net)+'.':'<b>Net/tháng:</b> chưa đủ dữ liệu.',
    annualTop?'<b>Thu nhập cố định/năm cao nhất:</b> '+esc(annualTop.name)+' '+fmt(annualTop.guaranteedAnnualNet)+'.':'<b>Thu nhập năm:</b> chưa đủ dữ liệu.',
    timeTop?'<b>Ít thời gian quy đổi nhất:</b> '+esc(timeTop.name)+' '+fmtN(timeTop.annualHours,0)+' giờ/năm.':'<b>Thời gian:</b> chưa đủ dữ liệu.'
  ].join(' ');
  const verdict='<h3>Đang xem cả 3 phương án</h3><p>'+summary+'</p><p>Ô nào thiếu dữ liệu sẽ được giữ ở trạng thái “Chưa đủ dữ liệu”; tool không tự thay bằng một giá trị khác để hoàn tất phép so.</p>';
  return{l1cols,l1delta,showL1Delta:true,annualcols,annualdelta,showAnnualDelta:true,tcols,tdelta,showTDelta:true,l2basis,l3events,verdictHtml:verdict};
}
function renderV3(state){
  const computed=optionComputedV3(state),available=availableOptionsV3(state,computed),pair=resolveComparisonV3(state,available),allMode=state.comparison?.mode==='all'&&available.length===3;
  const pairState=pairProjectedStateV3(state,pair),pairResult=render(pairState),viewResult=allMode?renderAllThreeV3(state,computed,available):pairResult,sw=computeSwitchingV3(state,computed),sol=computeSolverV3(state,computed);
  const activeComputed=available.map(o=>optionByIdV3(computed,o.id)).filter(Boolean),globalAssumptions=collectAssumptions(state,activeComputed);
  let verdict=viewResult.verdictHtml||'';
  if(available.length===1)verdict='<h3>'+esc(modeTitleV3(available))+'</h3><p>Đang phân tích một phương án. Thêm Công việc hiện tại hoặc Offer B để bật so sánh chênh lệch.</p>';
  if(state.stateShapeErrors&&state.stateShapeErrors.length)verdict='<h3>Chưa đủ dữ liệu</h3><p>'+state.stateShapeErrors.map(esc).join('<br>')+'</p>';
  return{
    ...viewResult,
    hasResults:available.length>0,
    v3:true,modeTitle:modeTitleV3(available),summaryHtml:summaryHtmlV3(state,computed,available),availableOptions:available,comparison:pair,comparisonMode:allMode?'all':'pair',showPairSelector:available.length>2,
    verdictHtml:verdict,
    showAssumptions:!!(globalAssumptions.assumed.length||globalAssumptions.confirm.length),assumptionsHtml:assumptionsHtml(globalAssumptions),
    showSwitching:sw.show,switchingHtml:switchingHtml(sw),
    showLayer6:sol.show,layer6Html:sol.html,layer6Diagnostics:sol.diagnostics||[],
    exportText:exportTextV3(state,computed,available,pair,pairResult,sw,sol)
  };
}
function cleanState(raw){
  const schemaVersion=Number(raw?.schemaVersion)||0,legacy=schemaVersion<4,stateShapeErrors=[];
  const blank=n=>({name:n,gross:null,payType:'gross',base:'full',bhMode:'unknown',customBase:null,days:null,commute:null,ot:null,otMonthly:null,otPaid:'unknown',otType:null,otFactor:null,otBreakdownWeekday:null,otBreakdownRest:null,otBreakdownHoliday:null,otFactorWeekday:null,otFactorRest:null,otFactorHoliday:null,otBaseMode:'offer',otBaseAmount:null,probationEnabled:'unknown',probPct:null,probMon:null,probInsurance:'unknown',probJobType:'unknown',guaranteedBonusMonths:null,performanceBonusType:'months',performanceBonusValue:null,fixedAllowance:null,allowanceBh:'unknown',paidLeaveDays:null});
  const sanitize=(o,baseName,isCurrent=false)=>{
    o=o||{};
    const oldTrialEvidence=legacy&&!isCurrent&&(o.probationEnabled==='yes'||safeNonNeg(o.probMon,12)>0||safeNonNeg(o.probPct,100)>0||o.probInsurance==='yes');
    const perfValue=o.performanceBonusValue??o.targetBonusMonths??null;
    const probState=isCurrent?'no':(legacy?(oldTrialEvidence?'yes':'unknown'):(['unknown','yes','no'].includes(o.probationEnabled)?o.probationEnabled:'unknown'));
    const probInsurance=isCurrent?'yes':(legacy?(o.probInsurance==='yes'?'yes':'unknown'):(['unknown','yes','no'].includes(o.probInsurance)?o.probInsurance:'unknown'));
    const otPaid=legacy?(o.otPaid==='yes'?'yes':'unknown'):(['unknown','yes','no'].includes(o.otPaid)?o.otPaid:'unknown');
    const bhMode=['unknown','salary','custom'].includes(o.bhMode)?o.bhMode:(legacy&&o.base==='custom'?'custom':legacy&&o.base==='full'?'salary':'unknown');
    return{...blank(baseName),...o,name:String(o.name||baseName).slice(0,80),payType:o.payType==='net'?'net':'gross',base:bhMode==='custom'?'custom':'full',bhMode,otPaid,otType:['weekday','rest','mixed'].includes(o.otType)?o.otType:null,otFactor:o.otFactor??null,otBaseMode:o.otBaseMode==='custom'?'custom':'offer',probationEnabled:probState,probInsurance,probJobType:isCurrent?'unknown':(['manager','college','intermediate','other'].includes(o.probJobType)?o.probJobType:'unknown'),allowanceBh:['yes','no'].includes(o.allowanceBh)?o.allowanceBh:'unknown',performanceBonusType:o.performanceBonusType==='amount'?'amount':'months',performanceBonusValue:perfValue};
  };
  const offers=[sanitize((raw.offers||[])[0],'Offer A'),sanitize((raw.offers||[])[1],'Offer B')];
  const currentJob=sanitize(raw.currentJob,'Công việc hiện tại',true);
  const hasExplicitOfferCount=raw.offerCount===1||raw.offerCount==='1'||raw.offerCount===2||raw.offerCount==='2';
  const hasExplicitCurrentEnabled=typeof raw.currentJobEnabled==='boolean';
  let offerCount,currentJobEnabled;
  if(legacy){
    offerCount=hasExplicitOfferCount?Number(raw.offerCount):(num((raw.offers||[])[1]?.gross)>0?2:1);
    currentJobEnabled=hasExplicitCurrentEnabled?raw.currentJobEnabled:num(raw.currentJob?.gross)>0;
  }else{
    if(!hasExplicitOfferCount)stateShapeErrors.push('Thiếu offerCount trong dữ liệu V4.');
    if(!hasExplicitCurrentEnabled)stateShapeErrors.push('Thiếu currentJobEnabled trong dữ liệu V4.');
    offerCount=hasExplicitOfferCount?Number(raw.offerCount):1;
    currentJobEnabled=hasExplicitCurrentEnabled?raw.currentJobEnabled:false;
  }
  const rs=raw.switching||{};
  const switching={
    enabled:rs.enabled===true,switchingVersion:2,targetOffer:rs.targetOffer==='1'?'1':'0',
    lastWorkingDate:String(rs.lastWorkingDate||'').slice(0,10),onboardDate:String(rs.onboardDate||'').slice(0,10),
    currentGuaranteedIfStay:rs.currentGuaranteedIfStay??null,
    currentGuaranteedRule:['unknown','lost','time','full','custom'].includes(rs.currentGuaranteedRule)?rs.currentGuaranteedRule:'unknown',
    currentGuaranteedIfLeave:rs.currentGuaranteedIfLeave??null,
    newGuaranteedRule:['unknown','time','full','none','custom'].includes(rs.newGuaranteedRule)?rs.newGuaranteedRule:'unknown',
    newGuaranteedCustom:rs.newGuaranteedCustom??null,
    currentPerformanceIfStay:rs.currentPerformanceIfStay??null,
    currentPerformanceRule:['unknown','lost','time','full','custom'].includes(rs.currentPerformanceRule)?rs.currentPerformanceRule:'unknown',
    currentPerformanceIfLeave:rs.currentPerformanceIfLeave??null,
    newPerformanceRule:['unknown','time','full','none','custom'].includes(rs.newPerformanceRule)?rs.newPerformanceRule:'unknown',
    newPerformanceCustom:rs.newPerformanceCustom??null
  };
  const rv=raw.solver||{};
  const solver={enabled:rv.enabled===true,templateOffer:['0','1','both'].includes(rv.templateOffer)?rv.templateOffer:'0',goalNoLoss:rv.goalNoLoss===true,noLossBuffer:rv.noLossBuffer??0,goalMonthlyNet:rv.goalMonthlyNet===true,targetMonthlyNet:rv.targetMonthlyNet??null,goalAnnualFixed:rv.goalAnnualFixed===true,targetAnnualFixed:rv.targetAnnualFixed??null};
  const cv=raw.comparison||{},validId=x=>['current','0','1'].includes(x)?x:null;
  return{schemaVersion:4,legacyMigrated:legacy,stateShapeErrors,deps:raw.deps??null,region:MINWAGE[raw.region]?raw.region:'I',sickDays:raw.sickDays??null,mat:raw.mat==='show'?'show':'hide',currentJobEnabled,currentJob,offerCount,offers,comparison:{left:validId(cv.left),right:validId(cv.right),mode:cv.mode==='all'?'all':'pair'},switching,solver};
}

function computeOfferValue(apiState){
  return renderV3(cleanState(apiState||{}));
}

globalThis.computeOfferValue=computeOfferValue;
