from pathlib import Path
import hashlib,base64,re
p=Path('net-cao-hon-co-that-tot-hon-v2.html')
s=p.read_text()

s=s.replace('>Bằng gross</button><button data-v="custom"', '>Theo mặc định</button><button data-v="custom"',1)
s=s.replace('>Khác gross</button></div>'+"'", '>Tự nhập</button></div>'+"'",1) if False else s
# The second label lives inside a JS string; direct text replacement is simpler.
s=s.replace('>Khác gross</button></div>', '>Tự nhập</button></div>',1)
old='“Phụ cấp cố định” trong tool được hiểu là khoản trả thêm ngoài mức lương offer, chịu thuế TNCN nhưng không tự tính vào căn cứ đóng BH; nếu khoản của bạn có bản chất hoặc cách đóng BH khác, hãy phản ánh ở ô mức lương làm căn cứ đóng BH.'
new='“Phụ cấp cố định” trong tool được hiểu là khoản trả thêm ngoài mức lương offer và chịu thuế TNCN. Căn cứ BH dùng theo lựa chọn ở từng offer; nếu để “Chưa rõ”, tool tạm tính Có để tránh làm tiền về tay trông cao hơn thực tế, còn mức “Tự nhập” luôn được ưu tiên.'
if old not in s: raise SystemExit('allowance disclaimer target missing')
s=s.replace(old,new,1)

# Recompute the CSP hash after changing inline JavaScript.
start=s.index('<script>')+len('<script>');end=s.index('</script>',start)
digest=base64.b64encode(hashlib.sha256(s[start:end].encode()).digest()).decode()
s=re.sub(r"script-src 'sha256-[^']+'",f"script-src 'sha256-{digest}'",s,count=1)
p.write_text(s)
