import markdown, sys, os
from bs4 import BeautifulSoup

md_path = os.path.abspath('03-arquitectura/diagramas/diagramas-arquitectura.md')
print('Analizando:', md_path)
with open(md_path, 'r', encoding='utf-8') as f:
    md = f.read()

html = markdown.markdown(md, extensions=['tables', 'fenced_code'])
soup = BeautifulSoup(html, 'html.parser')

# Buscar texto '@startuml' y mostrar la element chain
for elem in soup.find_all(string=lambda s: '@startuml' in s):
    parent = elem.parent
    chain = []
    p = parent
    depth = 0
    while p and depth < 6:
        chain.append(p.name)
        p = p.parent
        depth += 1
    print('---')
    print('Texto snippet:', elem.strip()[:120])
    print('Tag directo:', parent.name)
    print('Cadena de etiquetas (hasta 6):', ' > '.join(chain))
    print('Full parent attrs:', parent.attrs)

# Also print all code/pre tags counts
print('\nTotales:')
print('pre tags:', len(soup.find_all('pre')))
print('code tags:', len(soup.find_all('code')))
