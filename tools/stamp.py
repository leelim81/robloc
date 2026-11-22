#!/usr/bin/env python3
"""Stamp a new version on every script in index.html so browsers load fresh code after each update.

Writes an import map that points every js/ file at "<file>?v=<stamp>" and adds the same stamp to the
main script tag. Run it before each commit:  python3 tools/stamp.py
"""
import pathlib, re, time

root = pathlib.Path(__file__).resolve().parent.parent
index = root / 'index.html'
stamp = time.strftime('%Y%m%d%H%M%S')
files = sorted(p.relative_to(root).as_posix() for p in (root / 'js').rglob('*.js'))
entries = ',\n'.join(f'      "./{f}": "./{f}?v={stamp}"' for f in files)
block = ('  <!-- versioned-scripts: written by tools/stamp.py -->\n'
         '  <script type="importmap">\n  {\n    "imports": {\n' + entries + '\n    }\n  }\n  </script>\n'
         f'  <script type="module" src="js/main.js?v={stamp}"></script>\n'
         '  <!-- /versioned-scripts -->')
html = index.read_text()
pattern = re.compile(r'  <!-- versioned-scripts: .*?<!-- /versioned-scripts -->', re.S)
if pattern.search(html):
    html = pattern.sub(lambda m: block, html)
else:
    html = html.replace('  <script type="module" src="js/main.js"></script>', block)
html = re.sub(r'href="css/style\.css(\?v=\d+)?"', f'href="css/style.css?v={stamp}"', html)
index.write_text(html)
print('stamped', stamp, 'for', len(files), 'files')
