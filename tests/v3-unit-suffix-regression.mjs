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
    await page.locator('#switchEnabledSeg [data-v="on"]').click();
    await page.locator('[data-sw="currentBonusRule"]').selectOption('custom');
    await page.locator('[data-sw="newBonusRule"]').selectOption('custom');
    await page.locator('#solverEnabledSeg [data-v="on"]').click();
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
    for(const x of audit.suffixes){
      if(!x.unit)throw new Error(label+': empty suffix '+JSON.stringify(x));
      if(x.opacity<0.99||x.display==='none'||x.visibility==='hidden')throw new Error(label+': suffix hidden '+JSON.stringify(x));
      if(label.startsWith('mobile')&&x.inputFont<15.99)throw new Error(label+': iOS zoom-risk input '+JSON.stringify(x));
      if(x.placeholder&&!x.placeholder.startsWith('VD: '))throw new Error(label+': placeholder convention drift '+JSON.stringify(x));
      if(label.startsWith('mobile')&&x.placeholder&&x.phWidth>x.available+3)throw new Error(label+': placeholder collides with visible suffix '+JSON.stringify(x));
    }

    // Specific regression from the screenshot: empty salary fields must show both the example and the real currency unit.
    const salary=await page.evaluate(()=>[...document.querySelectorAll('#offersIn [data-k="gross"],#currentFields [data-current="gross"]')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0}).map(el=>({ph:el.placeholder,unit:el.parentElement.querySelector('.suffix')?.textContent.trim(),opacity:getComputedStyle(el.parentElement.querySelector('.suffix')).opacity})));
    if(!salary.some(x=>x.ph==='VD: 20 triệu'&&x.unit==='đ'&&Number(x.opacity)===1))throw new Error(label+': Current Job salary example/unit regression');
    if(!salary.some(x=>x.ph==='VD: 25 triệu'&&x.unit==='đ'&&Number(x.opacity)===1))throw new Error(label+': Offer A salary example/unit regression');
    if(!salary.some(x=>x.ph==='VD: 30 triệu'&&x.unit==='đ'&&Number(x.opacity)===1))throw new Error(label+': Offer B salary example/unit regression');

    await page.close();console.log('PASS V3 unit suffix regression '+label+' ('+audit.suffixes.length+' fields)');
  }
} finally {await browser.close();}
