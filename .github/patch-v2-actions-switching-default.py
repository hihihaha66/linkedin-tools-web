from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

def rep(old,new,label):
    global s
    if old not in s: raise SystemExit('Missing target: '+label)
    s=s.replace(old,new,1)

# 1) Utility actions: import/reset at the top; save/export/download after the results.
old_toolbar='''<div class="toolbar">
<button class="btn" id="saveBtn">Lưu</button>
<button class="btn ghost tiny" id="exportBtn">↓ Xuất kết quả (.txt)</button>
<button class="btn ghost tiny" id="backupBtn">↓ Tải dữ liệu (.json)</button>
<button class="btn ghost tiny" id="importBtn">↑ Nhập dữ liệu (.json)</button>
<input type="file" id="importInput" accept="application/json" style="display:none">
<button class="btn danger tiny" id="clearBtn">Xoá hết</button>
<span class="save-state" id="saveState"></span>
</div>'''
new_toolbar='''<div class="toolbar toolbar-top">
<button class="btn ghost tiny" id="importBtn">↑ Nhập dữ liệu (.json)</button>
<input type="file" id="importInput" accept="application/json" style="display:none">
<button class="btn danger tiny" id="clearBtn">Xoá hết</button>
</div>'''
rep(old_toolbar,new_toolbar,'top toolbar')

bottom_marker='''</div>
<div class="disclaim">Đây là công cụ mô phỏng để so sánh, không thay thế tư vấn payroll/pháp lý.'''
bottom_insert='''</div>
<div class="toolbar toolbar-bottom">
<button class="btn" id="saveBtn">Lưu</button>
<button class="btn ghost tiny" id="exportBtn">↓ Xuất kết quả (.txt)</button>
<button class="btn ghost tiny" id="backupBtn">↓ Tải dữ liệu (.json)</button>
<span class="save-state" id="saveState"></span>
</div>
<div class="disclaim">Đây là công cụ mô phỏng để so sánh, không thay thế tư vấn payroll/pháp lý.'''
rep(bottom_marker,bottom_insert,'bottom toolbar')

css_marker='.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:4px 0 18px;align-items:center}'
css_new=css_marker+'.toolbar-bottom{margin:24px 0 8px;padding-top:16px;border-top:1px solid var(--line)}'
rep(css_marker,css_new,'toolbar CSS')

# 2+3) Switching is the primary differentiator: open by default and put Tính thêm on the left.
rep('<div class="seg" id="switchEnabledSeg"><button data-v="off" class="on">Bỏ qua</button><button data-v="on">Tính thêm</button></div>',
    '<div class="seg" id="switchEnabledSeg"><button data-v="on" class="on">Tính thêm</button><button data-v="off">Bỏ qua</button></div>',
    'switch toggle order')

rep('function blankSwitch(){return{enabled:false,targetOffer:"0",lastWorkingDate:"",currentBonusIfStay:null,currentBonusRule:"unknown",currentBonusPayDate:"",currentBonusIfLeave:null,onboardDate:"",newBonusRule:"unknown",newBonusCustom:null,currentNet:null}}',
    'function blankSwitch(){return{enabled:true,enabledExplicit:false,targetOffer:"0",lastWorkingDate:"",currentBonusIfStay:null,currentBonusRule:"lost",currentBonusRuleExplicit:false,currentBonusPayDate:"",currentBonusIfLeave:null,onboardDate:"",newBonusRule:"unknown",newBonusCustom:null,currentNet:null}}',
    'blank switching defaults')

old_ensure='''function ensureSwitching(x){const s=Object.assign(blankSwitch(),x||{});delete s.asOfDate;s.enabled=s.enabled===true;s.targetOffer=s.targetOffer==="1"?"1":"0";if(s.currentBonusRule==="active"){const l=String(s.lastWorkingDate||"").slice(0,10),p=String(s.currentBonusPayDate||"").slice(0,10);s.currentBonusRule=l&&p?(l>=p?"full":"lost"):"unknown"}if(!["unknown","lost","time","full","custom"].includes(s.currentBonusRule))s.currentBonusRule="unknown";if(!["unknown","time","full","none","custom"].includes(s.newBonusRule))s.newBonusRule="unknown";return s}'''
new_ensure='''function ensureSwitching(x){const raw=x||{},s=Object.assign(blankSwitch(),raw);delete s.asOfDate;const hasEnabledFlag=typeof raw.enabledExplicit==="boolean";s.enabled=hasEnabledFlag?raw.enabled===true:true;s.enabledExplicit=hasEnabledFlag?raw.enabledExplicit===true:false;s.targetOffer=s.targetOffer==="1"?"1":"0";const hasRuleFlag=typeof raw.currentBonusRuleExplicit==="boolean",legacyRuleExplicit=["lost","time","full","custom","active"].includes(raw.currentBonusRule),ruleExplicit=hasRuleFlag?raw.currentBonusRuleExplicit===true:legacyRuleExplicit;if(s.currentBonusRule==="active"){const l=String(s.lastWorkingDate||"").slice(0,10),p=String(s.currentBonusPayDate||"").slice(0,10);s.currentBonusRule=l&&p?(l>=p?"full":"lost"):"lost"}if(!["unknown","lost","time","full","custom"].includes(s.currentBonusRule))s.currentBonusRule="lost";if(!ruleExplicit&&(raw.currentBonusRule==null||raw.currentBonusRule==="unknown"))s.currentBonusRule="lost";s.currentBonusRuleExplicit=ruleExplicit;if(!["unknown","time","full","none","custom"].includes(s.newBonusRule))s.newBonusRule="unknown";return s}'''
rep(old_ensure,new_ensure,'switching migration')

# Prioritize the common outcome visibly in the dropdown, without hiding the fact that it is selectable.
old_options='''<select data-sw="currentBonusRule"><option value="unknown" '+(sw.currentBonusRule==="unknown"?"selected":"")+'>Chưa rõ</option><option value="lost" '+(sw.currentBonusRule==="lost"?"selected":"")+'>Mất toàn bộ</option><option value="time" '+(sw.currentBonusRule==="time"?"selected":"")+'>Nhận theo thời gian đã làm</option><option value="full" '+(sw.currentBonusRule==="full"?"selected":"")+'>Vẫn nhận đủ</option><option value="custom" '+(sw.currentBonusRule==="custom"?"selected":"")+'>Tôi biết số sẽ nhận</option></select>'''
new_options='''<select data-sw="currentBonusRule"><option value="lost" '+(sw.currentBonusRule==="lost"?"selected":"")+'>Mất toàn bộ</option><option value="unknown" '+(sw.currentBonusRule==="unknown"?"selected":"")+'>Chưa rõ</option><option value="time" '+(sw.currentBonusRule==="time"?"selected":"")+'>Nhận theo thời gian đã làm</option><option value="full" '+(sw.currentBonusRule==="full"?"selected":"")+'>Vẫn nhận đủ</option><option value="custom" '+(sw.currentBonusRule==="custom"?"selected":"")+'>Tôi biết số sẽ nhận</option></select>'''
rep(old_options,new_options,'bonus rule option priority')

# Once the user explicitly changes either default, preserve that choice across reload/import.
rep('document.getElementById("switchEnabledSeg").addEventListener("click",function(e){const b=e.target.closest("button");if(!b)return;state.switching.enabled=b.getAttribute("data-v")==="on";markDirty();renderSwitchingInputs();scheduleCalculation()});',
    'document.getElementById("switchEnabledSeg").addEventListener("click",function(e){const b=e.target.closest("button");if(!b)return;state.switching.enabled=b.getAttribute("data-v")==="on";state.switching.enabledExplicit=true;markDirty();renderSwitchingInputs();scheduleCalculation()});',
    'switch explicit choice')
rep('if(el.tagName==="SELECT")state.switching[k]=el.value;else if(el.type==="date")state.switching[k]=el.value;else return;markDirty();',
    'if(el.tagName==="SELECT"){state.switching[k]=el.value;if(k==="currentBonusRule")state.switching.currentBonusRuleExplicit=true}else if(el.type==="date")state.switching[k]=el.value;else return;markDirty();',
    'bonus rule explicit choice')

# Re-pin CSP after inline JavaScript changes.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
