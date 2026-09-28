#!/usr/bin/env python3
"""
Bağımsız yeniden hesap (SPEC §11.6): ortalama, en düşük/en yüksek (eşitlikte en erken tarih), ilk→son yüzde değişim.
Site kodundan (TypeScript, BigInt Decimal) tamamen ayrı: Python `decimal` ile data/normalized/*.json'dan hesaplar ve
`npm run verify:stats` çıktısıyla karşılaştırır. Kullanım: python3 scripts/validation/independent-recompute.py
"""
import json, subprocess, sys, glob
from decimal import Decimal, getcontext, ROUND_HALF_EVEN

getcontext().prec = 60
FIELDS = ['forexBuying', 'forexSelling', 'cashBuying', 'cashSelling']

obs = []
for f in sorted(glob.glob('data/normalized/*.json')):
    obs += json.load(open(f))['observations']

def q(x, n):
    return str(x.quantize(Decimal(1).scaleb(-n), rounding=ROUND_HALF_EVEN))

def norm(s):
    d = Decimal(s)
    return format(d.normalize(), 'f') if d != 0 else '0'

site = json.loads(subprocess.check_output(['npx', 'tsx', 'scripts/validation/dump-summaries.ts'], text=True).strip().splitlines()[-1])
bad = 0
checked = 0
for item in site:
    cur, prefix = item['currency'], item['prefix']
    rows = sorted((o for o in obs if o['currency'] == cur and o['date'].startswith(prefix)), key=lambda o: o['date'])
    for f in FIELDS:
        pts = [(o['date'], Decimal(o[f])) for o in rows if o.get(f) is not None]
        mine = None
        if pts:
            mn = pts[0]; mx = pts[0]
            for p in pts:
                if p[1] < mn[1]: mn = p
                if p[1] > mx[1]: mx = p
            mean = sum(v for _, v in pts) / len(pts)
            pct = (pts[-1][1] - pts[0][1]) * 100 / pts[0][1]
            mine = {
                'count': len(pts),
                'first': [pts[0][0], norm(str(pts[0][1]))],
                'last': [pts[-1][0], norm(str(pts[-1][1]))],
                'min': [mn[0], norm(str(mn[1]))],
                'max': [mx[0], norm(str(mx[1]))],
                'mean4': q(mean, 4),
                'changePct2': q(pct, 2),
            }
        theirs = item['fields'].get(f)
        if mine is None and theirs is None:
            continue
        checked += 1
        if theirs is None or mine is None:
            print(f'FARK {cur} {prefix} {f}: biri boş'); bad += 1; continue
        theirs = dict(theirs)
        theirs['mean4'] = q(Decimal(theirs['mean4']), 4)
        for k in ('first', 'last', 'min', 'max'):
            theirs[k] = [theirs[k][0], norm(theirs[k][1])]
        # Ortalama Decimal ile yuvarlama farkı: 4. basamakta yarı-çift; ilk→son %: iki ondalık
        if mine != theirs:
            print(f'FARK {cur} {prefix} {f}\n  python: {mine}\n  site:   {theirs}'); bad += 1
print(f'{checked} (dönem × kur türü) karşılaştırıldı, {bad} fark')
print('| Para | Dönem | Alan | Gözlem | Ortalama | En düşük | En yüksek | İlk→son % |')
print('|---|---|---|---|---|---|---|---|')
for item in site:
    s = item['fields'].get('forexSelling')
    if s:
        print(f"| {item['currency']} | {item['prefix']} | döviz satış | {s['count']} | {s['mean4']} | {s['min'][1]} ({s['min'][0]}) | {s['max'][1]} ({s['max'][0]}) | {s['changePct2']} |")
sys.exit(1 if bad else 0)
