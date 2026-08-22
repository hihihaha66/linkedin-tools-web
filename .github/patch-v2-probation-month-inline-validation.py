from pathlib import Path
import hashlib,base64,re

p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

old="""  const trialOn=o.probationEnabled===\"yes\";
  const trial=trialOn?'<div class=\"prob-wrap\"><div class=\"duo\"><div class=\"field\"><label>Lương thử việc (% mức lương offer)</label><input type=\"text\" data-i=\"'+i+'\" data-k=\"probPct\" inputmode=\"decimal\" placeholder=\"100\" value=\"'+(o.probPct==null?\"100\":esc(o.probPct))+'\"><p class=\"benefit-note\">Hưởng đủ mức lương offer thì để 100%. Chỉ đổi khi lương thử việc thấp hơn.</p></div><div class=\"field\"><label>Số tháng thử việc</label><input type=\"text\" data-i=\"'+i+'\" data-k=\"probMon\" inputmode=\"decimal\" placeholder=\"vd 2\" value=\"'+(o.probMon==null?\"\":esc(o.probMon))+'\"></div></div>"""
new="""  const trialOn=o.probationEnabled===\"yes\";
  const probMonRaw=hasInput(o.probMon)?Number(String(o.probMon).replace(/,/g,\"\")):null;
  const probMonInvalid=trialOn&&probMonRaw!=null&&(!Number.isFinite(probMonRaw)||probMonRaw<=0);
  const probMonHelp=probMonInvalid?'<p class=\"benefit-note\" style=\"color:var(--clay);font-weight:600\">Số tháng thử việc phải lớn hơn 0.</p>':(!hasInput(o.probMon)?'<p class=\"benefit-note\">Khi chọn Có, số tháng thử việc cần lớn hơn 0.</p>':'');
  const trial=trialOn?'<div class=\"prob-wrap\"><div class=\"duo\"><div class=\"field\"><label>Lương thử việc (% mức lương offer)</label><input type=\"text\" data-i=\"'+i+'\" data-k=\"probPct\" inputmode=\"decimal\" placeholder=\"100\" value=\"'+(o.probPct==null?\"100\":esc(o.probPct))+'\"><p class=\"benefit-note\">Hưởng đủ mức lương offer thì để 100%. Chỉ đổi khi lương thử việc thấp hơn.</p></div><div class=\"field\"><label>Số tháng thử việc</label><input type=\"text\" data-i=\"'+i+'\" data-k=\"probMon\" inputmode=\"decimal\" placeholder=\"vd 2\" value=\"'+(o.probMon==null?\"\":esc(o.probMon))+'\" '+(probMonInvalid?'aria-invalid=\"true\"':'')+'>'+probMonHelp+'</div></div>"""
if old not in s: raise SystemExit('probation month field target missing')
s=s.replace(old,new,1)

start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
