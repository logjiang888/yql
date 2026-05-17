import os, re

for root, dirs, filenames in os.walk(r'D:\yql\wxmini'):
    if 'node_modules' in root or 'miniprogram_npm' in root:
        continue
    for name in filenames:
        if name.endswith('.wxml'):
            path = os.path.join(root, name)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                stripped = line.rstrip('\n')
                if not stripped:
                    continue
                # Count unescaped double quotes
                quotes = 0
                j = 0
                while j < len(stripped):
                    if stripped[j] == '\\' and j+1 < len(stripped) and stripped[j+1] == '\"':
                        j += 2
                    elif stripped[j] == '\"':
                        quotes += 1
                        j += 1
                    else:
                        j += 1
                if quotes % 2 == 1:
                    # Check if next line starts with an attribute continuation
                    if i < len(lines):
                        next_line = lines[i]
                        next_stripped = next_line.strip()
                        # Valid continuations: more attributes
                        is_continuation = (
                            next_stripped.startswith('bind') or
                            next_stripped.startswith('data-') or
                            next_stripped.startswith('wx:') or
                            next_stripped.startswith('placeholder') or
                            next_stripped.startswith('background') or
                            next_stripped.startswith('class') or
                            next_stripped.startswith('id') or
                            next_stripped.startswith('src') or
                            next_stripped.startswith('value') or
                            next_stripped.startswith('label') or
                            next_stripped.startswith('title') or
                            next_stripped.startswith('name') or
                            next_stripped.startswith('type') or
                            next_stripped.startswith('color') or
                            next_stripped.startswith('size') or
                            next_stripped.startswith('icon') or
                            next_stripped.startswith('mode') or
                            next_stripped.startswith('round') or
                            next_stripped.startswith('plain') or
                            next_stripped.startswith('hairline') or
                            next_stripped.startswith('block') or
                            next_stripped.startswith('disabled') or
                            next_stripped.startswith('required') or
                            next_stripped.startswith('readonly') or
                            next_stripped.startswith('maxlength') or
                            next_stripped.startswith('border') or
                            next_stripped.startswith('is-link') or
                            next_stripped.startswith('custom-class') or
                            next_stripped.startswith('scroll-x') or
                            next_stripped.startswith('scroll-y') or
                            next_stripped.startswith('enhanced') or
                            next_stripped.startswith('showScrollbar') or
                            next_stripped.startswith('lazy-load') or
                            next_stripped.startswith('slot') or
                            next_stripped.startswith('data-') or
                            '=' in next_stripped or
                            next_stripped.startswith('/>') or
                            next_stripped.startswith('>')
                        )
                        if not is_continuation:
                            print('ODD QUOTES: ' + path + ':' + str(i))
                            print('  ' + stripped[:100])
