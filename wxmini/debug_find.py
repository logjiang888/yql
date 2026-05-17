import os
for root, dirs, filenames in os.walk(r'D:\yql\wxmini'):
    if 'node_modules' in root or 'miniprogram_npm' in root:
        continue
    for name in filenames:
        if name.endswith('.wxml'):
            path = os.path.join(root, name)
            with open(path, 'rb') as f:
                data = f.read()
            pattern = b"\x27\xe9\x93\xb6\x7d\x7d"
            idx = data.find(pattern)
            if idx >= 0:
                print('Missing closing quote in:', path)
