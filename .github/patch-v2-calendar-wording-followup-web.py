from pathlib import Path
import hashlib,base64,re
p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()
old='''  +'<div class="field suffix-row"><label>Nếu ở lại đến 31/12, khoản thưởng bạn dự kiến được hưởng (về tay)</label><input type="text" data-sw="currentBonusIfStay" inputmode="numeric" placeholder="có thể để trống" value="'+grp(sw.currentBonusIfStay==null?"":sw.currentBonusIfStay)+'"><span class="suffix">đ</span></div>'
'''
new='''  +'<div class="field suffix-row"><label>Nếu ở lại đến 31/12, khoản thưởng bạn dự kiến được hưởng (về tay)</label><input type="text" data-sw="currentBonusIfStay" inputmode="numeric" placeholder="có thể để trống" value="'+grp(sw.currentBonusIfStay==null?"":sw.currentBonusIfStay)+'"><span class="suffix">đ</span><p class="benefit-note">Không có thì để trống. Tool hiểu đây là khoản bạn được hưởng nếu ở lại đến 31/12; không xét ngày thực trả thưởng.</p></div>'
'''
if old not in s: raise SystemExit('stay bonus block missing')
s=s.replace(old,new,1)
s=s.replace('So hai phương án từ hôm nay đến 31/12: ở lại công ty hiện tại, hoặc nghỉ vào ngày bạn chọn rồi sang offer mới.', 'So tổng quy đổi của hai phương án từ hôm nay đến 31/12: ở lại công ty hiện tại, hoặc nghỉ vào ngày bạn chọn rồi sang offer mới.',1)
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
