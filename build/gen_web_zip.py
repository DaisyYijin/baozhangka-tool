# -*- coding: utf-8 -*-
# 打包 web/保障卡综合检查工具 -> build/web.zip + build/web_zip_data.c(C 数组,链接进 exe)
import zipfile, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(root, 'web')
zipout = os.path.join(root, 'build', 'web.zip')
cout = os.path.join(root, 'build', 'web_zip_data.c')
os.makedirs(os.path.dirname(zipout), exist_ok=True)

n = 0
with zipfile.ZipFile(zipout, 'w', zipfile.ZIP_DEFLATED) as z:
    for dirpath, dirnames, filenames in os.walk(src):
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root).replace(os.sep, '/')
            z.write(full, rel)
            n += 1

blob = open(zipout, 'rb').read()
with open(cout, 'w', encoding='ascii', newline='\n') as f:
    f.write('/* auto-generated */' + chr(10))
    f.write('const unsigned char WEB_ZIP_DATA[] = {\n')
    for i in range(0, len(blob), 16):
        chunk = blob[i:i+16]
        f.write(','.join(str(b) for b in chunk) + ',\n')
    f.write('};\n')
    f.write('const unsigned int WEB_ZIP_LEN = %d;\n' % len(blob))
print('web.zip: %d files, %d bytes; C array -> %s (%d bytes)' % (
    n, len(blob), cout, os.path.getsize(cout)))
