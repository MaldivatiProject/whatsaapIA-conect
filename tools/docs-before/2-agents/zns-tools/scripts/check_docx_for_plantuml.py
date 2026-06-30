from docx import Document
import sys
import os

word_dir = os.path.join(os.path.dirname(os.path.abspath('..')), '04-entregables', 'word')
# If running from project root, adjust
word_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '04-entregables', 'word'))
results = {}
for fn in os.listdir(word_dir):
    if fn.lower().endswith('.docx'):
        path = os.path.join(word_dir, fn)
        doc = Document(path)
        found = []
        for p in doc.paragraphs:
            if '@startuml' in p.text or '```plantuml' in p.text or '@enduml' in p.text:
                found.append(p.text[:200])
        results[fn] = found

for fn, items in results.items():
    print(fn)
    if items:
        for it in items:
            print('  FOUND:', it)
    else:
        print('  OK - No PlantUML text found')
