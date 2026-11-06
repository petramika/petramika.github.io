"""ICF por pais de nacimiento de la madre: nacimientos vivos (microdatos MNP) / mujeres por grupo de edad (ECP tabla 56937)."""
import csv, json, sys, datetime
from collections import Counter, defaultdict
mic, pob, dic, fecha = sys.argv[1:5]
campo = sys.argv[5] if len(sys.argv) > 5 else 'PAISNXM'
cl = json.load(open(dic))['codelists']['TPAIS']
UE = {'102','103','104','106','107','109','110','111','112','113','115','117','118','121','122','123','126','128','131','136','141','142','143','144','146','147','159'}
def grupos(c):
    if c in UE: return ['UE27_2020 sin España', 'Extranjero']
    if c[0] == '1': return ['Europa menos UE27_2020', 'Extranjero']
    if c[0] == '2': return ['África', 'Extranjero']
    if c in ('301','302','370','371','396'): return ['América del Norte', 'Extranjero']
    if c == '303': return ['MEX', 'Extranjero']
    if c[0] == '3' and (c[1] in '1238' or c in ('352','353','354','397')) and c not in ('340','341','342','343','344','345','346','347','348','349','350','351','394','395','398'): return ['Centro América y Caribe', 'Extranjero']
    if c[0] == '3' and c != '399': return ['Sudamérica', 'Extranjero']
    if c[0] == '4': return ['Asia', 'Extranjero']
    if c[0] == '5': return ['Oceanía', 'Extranjero']
    return ['Extranjero']
def g(e):
    e = min(max(int(e), 15), 49); return (e - 15) // 5
nac = defaultdict(Counter)
with open(mic, encoding='latin-1') as f:
    for x in csv.DictReader(f, delimiter='\t'):
        if x['CLASIF'] not in ('1', '3'): continue
        a = g(x['EDADM']); c = x[campo].strip()
        if not c or c == '108':
            nac['España'][a] += 1
        else:
            nac[cl.get(c, 'cod' + c)][a] += 1
            for k in grupos(c): nac[k][a] += 1
        nac['Total'][a] += 1
d = json.load(open(pob))
ED = ['De 15 a 19 años', 'De 20 a 24 años', 'De 25 a 29 años', 'De 30 a 34 años', 'De 35 a 39 años', 'De 40 a 44 años', 'De 45 a 49 años']
P = defaultdict(dict)
for s in d:
    p = [z.strip() for z in s['Nombre'].split('.')]
    if p[3] != 'Mujeres' or p[2] not in ED: continue
    for x in s['Data']:
        if str(datetime.datetime.fromtimestamp(x['Fecha'] / 1000).date()) == fecha:
            P[p[1]][ED.index(p[2])] = x['Valor']
out = {}
for k in P:
    if k not in nac or len(P[k]) < 7 or None in P[k].values(): continue
    icf = 5 * sum(nac[k][a] / P[k][a] for a in range(7) if P[k][a])
    out[k] = {'icf': round(icf, 2), 'nacimientos': sum(nac[k].values()), 'mujeres15a49': round(sum(P[k].values()))}
json.dump(out, sys.stdout, ensure_ascii=False)
for k, v in sorted(out.items(), key=lambda z: -z[1]['nacimientos']):
    print(f"{k:42s} ICF={v['icf']:.2f} nac={v['nacimientos']:7d} mujeres={v['mujeres15a49']:8d}", file=sys.stderr)
