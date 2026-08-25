import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true});
try{
  for(const [label,width,height] of [['desktop',1280,900],['mobile-320',320,740],['mobile-375',375,812],['mobile-430',430,932]]){
    const page=await browser.newPage({viewport:{width,height}});
    await page.route('**/api/offer-value-v3',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({hasResults:true,v3:true,availableOptions:[{id:'current',name:'Công việc hiện tại',kind:'current'},{id:'0',name:'Offer A',kind:'offer'}],comparison:{left:'current',right:'0'},comparisonMode:'pair',summaryHtml:'',modeTitle:'So sánh phương án',l1cols:'',l1delta:'',showL1Delta:false,annualcols:'',annualdelta:'',showAnnualDelta:false,tcols:'',tdelta:'',showTDelta:false,l2basis:'',l3events:'',verdictHtml:'',showAssumptions:false,assumptionsHtml:'',showSwitching:false,switchingHtml:'',showLayer6:false,layer6Html:'',exportText:''})}));
    await page.goto('http://127.0.0.1:8000/net-cao-hon-co-that-tot-hon-v3.html',{waitUntil:'domcontentloaded'});

    // Reveal every input family that can carry a unit suffix.
    await page.locator('#bhSim summary').click();
    await page.locator('#currentEnabledSeg [data-v="on"]').click();
    await page.locator('#offerCountSeg [data-v="2"]').click();
    await page.locator('#currentFields [data-current="bhMode"]').selectOption('custom');
    await page.locator('#offersIn [data-i="0"][data-k="bhMode"]').selectOption('custom');
    await page.locator('#offersIn [data-i="1"][data-k="bhMode"]').selectOption('custom');
    await page.locator('#currentFields [data-current="otMonthly"]').fill('8');
    await page.locator('#currentFields [data-current-seg="otPaid"] [data-v="yes"]').click();
    await page.locator('#offersIn [data-i="0"][data-k="otMonthly"]').fill('8');
    await page.locator('#offersIn [data-i="1"][data-k="otMonthly"]').fill('8');
    await page.locator('#offersIn [data-seg="otPaid"][data-i="0"] [data-v="yes"]').click();
    await page.locator('#offersIn [data-seg="otPaid"][data-i="1"] [data-v="yes"]').click();
    await page.locator('#currentFields .v3-current-benefits summary').click();
    await page.locator('#offersIn .compare-benefits summary').click();
    await page.locator('#offersIn [data-seg="probationEnabled"][data-i="0"] [data-v="yes"]').click();
    await page.locator('#offersIn [data-seg="probationEnabled"][data-i="1"] [data-v="yes"]').click();
    await page.evaluate(()=>{
      document.querySelector('.results')?.classList.remove('hidden');
      document.querySelectorAll('.switch-box-results,.solver-box').forEach(x=>{x.style.display='';x.style.visibility='visible'});
      document.querySelector('#switchEnabledSeg [data-v="on"]')?.click();
    });
    await page.waitForTimeout(40);
    await page.locator('[data-sw="currentBonusRule"]').selectOption('custom');
    await page.locator('[data-sw="newBonusRule"]').selectOption('custom');
    await page.evaluate(()=>document.querySelector('#solverEnabledSeg [data-v="on"]')?.click());
    await page.waitForTimeout(120);

    const audit=await page.evaluate(()=>{
      const visible=el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden'};
      const suffixRows=[...document.querySelectorAll('.suffix-row')].filter(row=>visible(row)&&row.querySelector('input')&&row.querySelector('.suffix'));
      const suffixes=suffixRows.map(row=>{
        const input=row.querySelector('input'),suffix=row.querySelector('.suffix'),ir=input.getBoundingClientRect(),sr=suffix.getBoundingClientRect(),ics=getComputedStyle(input),scs=getComputedStyle(suffix);
        const pseudo=getComputedStyle(input,'::placeholder'),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=pseudo.font||`${pseudo.fontSize} ${pseudo.fontFamily}`;
        const phWidth=ctx.measureText(input.placeholder||'').width,leftPad=parseFloat(ics.paddingLeft)||0;
        const available=Math.max(0,sr.left-ir.left-leftPad-4);
        return{placeholder:input.placeholder,unit:suffix.textContent.trim(),opacity:parseFloat(scs.opacity),display:scs.display,visibility:scs.visibility,inputFont:parseFloat(ics.fontSize),phWidth,available,inputWidth:ir.width,suffixWidth:sr.width,section:row.closest('#currentFields')?'current':row.closest('#offersIn')?'offers':row.closest('#switchFields')?'switch':row.closest('#solverFields')?'solver':row.closest('#bhSim')?'bh':'context'};
      });
      return{suffixes,overflow:document.documentElement.scrollWidth-innerWidth};
    });

    if(audit.overflow>2)throw new Error(label+': horizontal overflow '+audit.overflow);
    if(!audit.suffixes.length)throw new Error(label+': no visible unit-suffix rows audited');
    const uncontracted=await page.evaluate(()=>[...document.querySelectorAll('#offersIn .suffix-row,#currentFields .suffix-row')].filter(row=>row.querySelector('.suffix')&&!row.hasAttribute('data-unit-field')).length);if(uncontracted)throw new Error(label+': offer/current unit fields bypass shared renderer: '+uncontracted);
    for(const x of audit.suffixes){
      if(!x.unit)throw new Error(label+': empty suffix '+JSON.stringify(x));
      if(x.opacity<0.99||x.display==='none'||x.visibility==='hidden')throw new Error(label+': suffix hidden '+JSON.stringify(x));
      if(label.startsWith('mobile')&&x.inputFont<15.99)throw new Error(label+': iOS zoom-risk input '+JSON.stringify(x));
      if(x.placeholder&&!x.placeholder.startsWith('VD: '))throw new Error(label+': placeholder convention drift '+JSON.stringify(x));
      if(x.unit==='đ'&&x.placeholder&&!/^VD: (?:0|[1-9]\d{0,2}(?:,\d{3})+)$/.test(x.placeholder))throw new Error(label+': currency example must be full comma-formatted VND '+JSON.stringify(x));
      if(x.unit!=='đ'&&x.placeholder&&/(triệu|tỷ|nghìn)/i.test(x.placeholder))throw new Error(label+': non-currency field contains a money scale '+JSON.stringify(x));
      if(label.startsWith('mobile')&&x.placeholder&&x.phWidth>x.available+3)throw new Error(label+': placeholder collides with visible suffix '+JSON.stringify(x));
    }


    // Contract examples requested for the compact matrix: example value + stable suffix.
    const exact=await page.evaluate(()=>{
      const pick=(sel)=>{const el=document.querySelector(sel),suffix=el?.parentElement?.querySelector('.suffix');return el?{ph:el.placeholder,unit:suffix?.textContent.trim(),suffixOpacity:suffix?Number(getComputedStyle(suffix).opacity):null}:null};
      return{
        aOffice:pick('#offersIn [data-i="0"][data-k="days"]'),
        aCommute:pick('#offersIn [data-i="0"][data-k="commute"]'),
        aOt:pick('#offersIn [data-i="0"][data-k="otMonthly"]'),
        currentOffice:pick('#currentFields [data-current="days"]'),
        currentCommute:pick('#currentFields [data-current="commute"]')
      };
    });
    for(const [name,x,ph,unit] of [['aOffice',exact.aOffice,'VD: 5','buổi'],['aCommute',exact.aCommute,'VD: 45','phút'],['aOt',exact.aOt,'VD: 8','giờ'],['currentOffice',exact.currentOffice,'VD: 5','buổi'],['currentCommute',exact.currentCommute,'VD: 45','phút']]){
      if(!x||x.ph!==ph||x.unit!==unit||x.suffixOpacity!==1)throw new Error(label+': exact unit-field contract failed '+name+' '+JSON.stringify(x));
    }

    // Empty -> typed -> cleared must never hide or move semantic ownership of the unit.
    const transition=page.locator('#offersIn [data-i="0"][data-k="days"]');
    const readTransition=()=>transition.evaluate(el=>{const s=el.parentElement.querySelector('.suffix'),r=s.getBoundingClientRect();return{value:el.value,ph:el.placeholder,unit:s.textContent.trim(),opacity:Number(getComputedStyle(s).opacity),display:getComputedStyle(s).display,visibility:getComputedStyle(s).visibility,suffixX:r.x}});
    const emptyState=await readTransition();
    await transition.fill('3');const filledState=await readTransition();
    await transition.fill('');const clearedState=await readTransition();
    for(const [stateName,x] of [['empty',emptyState],['filled',filledState],['cleared',clearedState]]){
      if(x.unit!=='buổi'||x.opacity!==1||x.display==='none'||x.visibility==='hidden')throw new Error(label+': suffix changed in '+stateName+' state '+JSON.stringify(x));
    }
    if(emptyState.ph!=='VD: 5'||clearedState.ph!=='VD: 5'||filledState.value!=='3')throw new Error(label+': example/value transition failed');
    if(Math.abs(emptyState.suffixX-filledState.suffixX)>1||Math.abs(emptyState.suffixX-clearedState.suffixX)>1)throw new Error(label+': suffix shifted between input states');

    // Specific regression from the screenshot: empty salary fields must show both the example and the real currency unit.
    const salary=await page.evaluate(()=>[...document.querySelectorAll('#offersIn [data-k="gross"],#currentFields [data-current="gross"]')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0}).map(el=>({ph:el.placeholder,unit:el.parentElement.querySelector('.suffix')?.textContent.trim(),opacity:getComputedStyle(el.parentElement.querySelector('.suffix')).opacity})));
    if(!salary.some(x=>x.ph==='VD: 20,000,000'&&x.unit==='đ'&&Number(x.opacity)===1))throw new Error(label+': Current Job salary example/unit regression');
    if(!salary.some(x=>x.ph==='VD: 25,000,000'&&x.unit==='đ'&&Number(x.opacity)===1))throw new Error(label+': Offer A salary example/unit regression');
    if(!salary.some(x=>x.ph==='VD: 30,000,000'&&x.unit==='đ'&&Number(x.opacity)===1))throw new Error(label+': Offer B salary example/unit regression');

    await page.close();console.log('PASS V3 unit suffix regression '+label+' ('+audit.suffixes.length+' fields)');
  }
} finally {await browser.close();}
