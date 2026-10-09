import json
from collections import Counter

with open('src/data/oxford3000.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

terms = [d['term'].lower() for d in data]
print('Total entries:', len(data))
print('Unique lowercase terms:', len(set(terms)))

c = Counter(terms)
multi = [t for t, count in c.items() if count > 1]
print('Terms appearing multiple times (e.g. diff pos/meaning):', len(multi))

for t in multi[:10]:
    meanings = [f"{d['pos']} - {d['meaning']}" for d in data if d['term'].lower() == t]
    print(f"  - {t}: {meanings}")
