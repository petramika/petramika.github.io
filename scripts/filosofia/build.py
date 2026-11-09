"""Junta Wikidata + fichas de los agentes + glosarios en los JSON de la app."""
import json, glob, re, sys, unicodedata, urllib.parse
DEST = sys.argv[1]
wd = {x['id']: x for x in json.load(open('wikidata.json'))}
fichas = {}
for f in sorted(glob.glob('fichas/fichas-*.json')):
    for x in json.load(open(f)): fichas[x['id']] = x
glos = {g['clave']: g for g in json.load(open('glosario-base.json'))}
for f in sorted(glob.glob('fichas/glosario-*.json')):
    for g in json.load(open(f)): glos.setdefault(g['clave'], g)

def anio(t):
    if not t: return None
    m = re.match(r'(-?)(\d+)-', t); return (-1 if m.group(1) else 1) * int(m.group(2))
def norm(s): return re.sub(r'[^a-z0-9 ]', '', unicodedata.normalize('NFKD', s.lower()).encode('ascii', 'ignore').decode()).strip()
def era(fl):
    return 'antigua' if fl < 476 else 'medieval' if fl < 1453 else 'moderna' if fl < 1789 else 'contemporanea'
def fechas(n, m):
    f = lambda a: f'{-a} a. C.' if a < 0 else str(a)
    if n is None and m is None: return ''
    if n is None: return f'? – {f(m)}'
    if m is None: return f'{f(n)} –'
    if n < 0 and m < 0: return f'{-n} – {-m} a. C.'
    return f'{f(n)} – {f(m)}'

def deTexto(t):
    """'c. 427 – 347 a. C.' -> (-427, -347); 'c. 4 a. C. – 65' -> (-4, 65); '1949 –' -> (1949, None)"""
    if not t: return None
    lados = re.split(r'\s+[–-]\s*', t.strip(), maxsplit=1)
    nums = [re.search(r'(\d{1,4})', l) for l in lados]
    if not nums[0]: return None
    ac = ['a. C' in l or 'a.C' in l for l in lados]
    a = int(nums[0].group(1)); b = int(nums[1].group(1)) if len(nums) > 1 and nums[1] else None
    if len(lados) > 1 and ac[1] and not ac[0]: ac[0] = True
    return (-a if ac[0] else a, (-b if ac[1] else b) if b is not None else None)

# Reconocimiento: percentil de cada señal (en escala logaritmica, para que
# Platon no aplaste a todos) y media de las dos mejores. Niveles por puesto.
import math, os
fama = json.load(open('fama.json')) if os.path.exists('fama.json') else {}
def percentiles(campo):
    v = sorted((math.log1p(x[campo]), k) for k, x in fama.items() if k in wd and x.get(campo) is not None)
    return {k: round(100 * i / max(1, len(v) - 1)) for i, (_, k) in enumerate(v)}
pp, pv, pi = percentiles('papers'), percentiles('visitas'), percentiles('idiomas')
# La señal mas floja no cuenta: si los papers fallan por como se le nombra
# («Seneca the Younger») o casi nadie lo lee en Wikipedia, no lo hunde.
def media(k):
    s = sorted(x for x in [pp.get(k), pv.get(k), pi.get(k)] if x is not None)
    return sum(s[-2:]) / len(s[-2:])  # sin papers todavia: con visitas e idiomas
nota = {k: media(k) for k in pv if k in fichas}
orden = sorted(nota, key=lambda k: -nota[k])
FAMA = {}
for i, k in enumerate(orden):
    q = i / len(orden)
    FAMA[k] = {'n': 4 if q < .10 else 3 if q < .35 else 2 if q < .70 else 1, 'puesto': i + 1}

import hashlib
def miniatura(url, px):
    """Direccion directa de la miniatura en Wikimedia (sin la redireccion de Special:FilePath).
    La web cambia «120px-» por «250px-» cuando el retrato se ve grande."""
    nombre = urllib.parse.unquote(url.rsplit('/', 1)[1]).replace(' ', '_')
    h = hashlib.md5(nombre.encode()).hexdigest()
    q = urllib.parse.quote(nombre)
    base = f'https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/'
    ext = nombre.rsplit('.', 1)[-1].lower()
    if ext == 'svg': return base + f'{px}px-{q}.png'
    if ext in ('tif', 'tiff'): return base + f'lossy-page1-{px}px-{q}.jpg'
    if ext in ('djvu', 'pdf'): return base + f'page1-{px}px-{q}.jpg'
    return base + f'{px}px-{q}'

lista, detalle = [], {}
sinFicha = [k for k in wd if k not in fichas]
if sinFicha: print('sin ficha todavia (no salen):', len(sinFicha))
for id_, w in wd.items():
    if id_ not in fichas: continue
    fi = fichas[id_]
    n, m = anio(w.get('nac')), anio(w.get('mue'))
    dt = deTexto(fi.get('fechas'))
    if dt: n, m = dt[0], (dt[1] if dt[1] is not None else m)
    fl = n + 35 if n is not None else (m - 30 if m is not None else 0)
    img = miniatura(w['img'], 120) if w.get('img') else None
    lista.append({
        'id': id_, 'nombre': fi.get('nombre') or w.get('esLabel') or w['enTitulo'],
        'fechas': fi.get('fechas') or fechas(n, m), 'nace': n, 'muere': m, 'fl': fl, 'era': era(fl),
        'region': fi.get('region'), 'escuela': fi.get('escuela'), 'categorias': fi.get('categorias', []),
        'conocidoPor': fi.get('conocidoPor'), 'img': img,
        'sexo': w.get('sexo'), 'fama': FAMA.get(id_),
    })
    enl = []
    if w.get('es'): enl.append({'titulo': 'Wikipedia', 'url': w['es'], 'tipo': 'wiki'})
    elif w.get('en'): enl.append({'titulo': 'Wikipedia (en inglés)', 'url': w['en'], 'tipo': 'wiki'})
    if w.get('sep'): enl.append({'titulo': 'Stanford Encyclopedia of Philosophy (en inglés)', 'url': f"https://plato.stanford.edu/entries/{w['sep']}/", 'tipo': 'enciclopedia'})
    if w.get('iep'): enl.append({'titulo': 'Internet Encyclopedia of Philosophy (en inglés)', 'url': f"https://iep.utm.edu/{w['iep']}/", 'tipo': 'enciclopedia'})
    if w.get('wsEs'): enl.append({'titulo': 'Sus textos en Wikisource', 'url': w['wsEs'], 'tipo': 'texto'})
    if w.get('gut'): enl.append({'titulo': 'Sus libros gratis en Proyecto Gutenberg', 'url': f"https://www.gutenberg.org/ebooks/author/{w['gut']}", 'tipo': 'libro'})
    if w.get('wqEs'): enl.append({'titulo': 'Sus frases en Wikiquote', 'url': w['wqEs'], 'tipo': 'frases'})
    vistos = {e['url'] for e in enl}
    for e in fi.get('enlaces', []) or []:
        if e.get('url') and e['url'] not in vistos: enl.append(e); vistos.add(e['url'])
    obrasWd = w.get('obras', [])
    obras = []
    for o in fi.get('obras', []) or []:
        t = norm(o['titulo']); link = None
        for ow in obrasWd:
            tw = norm(ow['titulo'])
            if tw and (tw == t or (len(tw) > 6 and (tw in t or t in tw))):
                link = ow.get('oes') or ow.get('oen'); break
        obras.append({**o, **({'url': link} if link else {})})
    detalle[id_] = {k: fi.get(k) for k in ['resumen', 'ideas', 'curiosidad', 'frase', 'influyeEn']}
    detalle[id_]['obras'] = obras
    detalle[id_]['enlaces'] = enl
    detalle[id_]['commons'] = ('https://commons.wikimedia.org/wiki/File:' + urllib.parse.unquote(w['img'].rsplit('/', 1)[1])) if w.get('img') else None
    detalle[id_]['wikidata'] = 'https://www.wikidata.org/wiki/' + w['qid']

lista.sort(key=lambda x: (x['nace'] if x['nace'] is not None else x['fl'] - 35))
# solo terminos usados
usados = set()
def marcas(s):
    for mt in re.finditer(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]', s or ''): usados.add((mt.group(2) or mt.group(1)).strip())
for x in lista: marcas(x['conocidoPor'])
for d in detalle.values():
    marcas(d['resumen']); marcas(d['curiosidad']); [marcas(i) for i in d['ideas'] or []]
faltan = sorted(usados - set(glos))
# Quien le influyo (al reves que influyeEn), para no tener que leer todas las fichas
for k, d in detalle.items():
    d['influidoPor'] = [o for o, x in detalle.items() if k in (x.get('influyeEn') or [])]

# Las fichas, en trozos de 40 por orden cronologico: al abrir una se baja solo su trozo
import shutil
TROZO = 40
shutil.rmtree(f'{DEST}/fichas', ignore_errors=True); os.makedirs(f'{DEST}/fichas')
if os.path.exists(f'{DEST}/fichas.json'): os.remove(f'{DEST}/fichas.json')
for i, x in enumerate(lista):
    x['t'] = i // TROZO
for t in range(-(-len(lista) // TROZO)):
    suyos = {x['id']: detalle[x['id']] for x in lista if x['t'] == t}
    json.dump(suyos, open(f'{DEST}/fichas/{t:02d}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(lista, open(f'{DEST}/lista.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump({k: {'t': g['termino'], 'd': g['def']} for k, g in glos.items()}, open(f'{DEST}/glosario.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('filosofos', len(lista), 'con ficha', len(fichas), 'glosario', len(glos), 'usados', len(usados), 'faltan', faltan[:30], len(faltan))

# La historia con lupa: acontecimientos y periodos (historia/*.json)
if os.path.exists('historia/eventos.json'):
    ev = sorted(json.load(open('historia/eventos.json')), key=lambda e: e['anio'])
    pe = sorted(json.load(open('historia/periodos.json')), key=lambda p: p['desde'])
    fr = sorted(json.load(open('historia/frases.json')), key=lambda f: f['anio']) if os.path.exists('historia/frases.json') else []
    ids = {x['id'] for x in lista}
    for f in fr:
        if f.get('autor') and f['autor'] not in ids: f['autor'] = None
    # La frase de cada filosofo que sale en la linea del tiempo (reconocimiento alto o muy alto)
    frasesFil = {x['id']: detalle[x['id']]['frase'] for x in lista if (x.get('fama') or {}).get('n', 0) >= 3 and detalle[x['id']].get('frase')}
    json.dump({'eventos': ev, 'periodos': pe, 'frases': fr, 'frasesFil': frasesFil}, open(f'{DEST}/historia.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    print('historia', len(ev), 'eventos', len(pe), 'periodos', len(fr), 'frases')
