import json, re, sys, time, urllib.parse, urllib.request
exec(open('lista.py').read())
UA = {'User-Agent': 'petramika-filosofia/0.1 (https://petramika.github.io; personal site build script)'}
def get(url, data=None):
    for i in range(9):
        try:
            req = urllib.request.Request(url, data=data, headers={**UA, **({'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/sparql-results+json'} if data else {})})
            return json.load(urllib.request.urlopen(req, timeout=90))
        except Exception as e:
            print('retry', e, file=sys.stderr); time.sleep(min(90, 4 * 2 ** i))
    raise SystemExit('fallo ' + url)

# 1. titulo de Wikipedia -> QID (resolviendo redirecciones). Por defecto, la
#    inglesa; «es:Titulo» para quien solo tiene articulo en la española.
qid = {}
def lotes():
    for wiki in ['en', 'es']:
        suyos = [t for t in TITULOS if (t.startswith('es:') if wiki == 'es' else not t.startswith('es:'))]
        for i in range(0, len(suyos), 50):
            yield wiki, suyos[i:i+50]
for wiki, lote in lotes():
    limpio = {t: t[3:] if t.startswith('es:') else t for t in lote}
    r = get(f'https://{wiki}.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'format': 'json', 'redirects': 1, 'prop': 'pageprops', 'ppprop': 'wikibase_item', 'titles': '|'.join(limpio.values())}))
    q = r['query']
    mapa = {t: limpio[t] for t in lote}
    for n in q.get('normalized', []): mapa = {k: (n['to'] if v == n['from'] else v) for k, v in mapa.items()}
    for n in q.get('redirects', []): mapa = {k: (n['to'] if v == n['from'] else v) for k, v in mapa.items()}
    porTit = {p['title']: p.get('pageprops', {}).get('wikibase_item') for p in q['pages'].values()}
    for t in lote:
        qid[t] = porTit.get(mapa[t])
faltan = [t for t, v in qid.items() if not v]
print('sin QID:', faltan, file=sys.stderr)

# 2. SPARQL por lotes
def sparql(q):
    return get('https://query.wikidata.org/sparql', urllib.parse.urlencode({'query': q, 'format': 'json'}).encode())['results']['bindings']
out = {}
ids = [v for v in qid.values() if v]
for i in range(0, len(ids), 60):
    vals = ' '.join('wd:' + x for x in ids[i:i+60])
    b = sparql(f'''SELECT ?p ?nac ?nacP ?mue ?mueP ?img ?sep ?iep ?gut ?es ?en ?wsEs ?wqEs ?esLabel ?sexo ?links WHERE {{
      VALUES ?p {{ {vals} }}
      ?p wikibase:sitelinks ?links .
      OPTIONAL {{ ?p wdt:P21 ?sexo }}
      OPTIONAL {{ ?p p:P569/psv:P569 [wikibase:timeValue ?nac; wikibase:timePrecision ?nacP] }}
      OPTIONAL {{ ?p p:P570/psv:P570 [wikibase:timeValue ?mue; wikibase:timePrecision ?mueP] }}
      OPTIONAL {{ ?p wdt:P18 ?img }}
      OPTIONAL {{ ?p wdt:P3123 ?sep }}
      OPTIONAL {{ ?p wdt:P5088 ?iep }}
      OPTIONAL {{ ?p wdt:P1938 ?gut }}
      OPTIONAL {{ ?es schema:about ?p; schema:isPartOf <https://es.wikipedia.org/> }}
      OPTIONAL {{ ?en schema:about ?p; schema:isPartOf <https://en.wikipedia.org/> }}
      OPTIONAL {{ ?wsEs schema:about ?p; schema:isPartOf <https://es.wikisource.org/> }}
      OPTIONAL {{ ?wqEs schema:about ?p; schema:isPartOf <https://es.wikiquote.org/> }}
      OPTIONAL {{ ?p rdfs:label ?esLabel FILTER(lang(?esLabel)="es") }}
    }}''')
    for r in b:
        k = r['p']['value'].rsplit('/', 1)[1]
        o = out.setdefault(k, {'qid': k})
        for c in ['nac', 'nacP', 'mue', 'mueP', 'img', 'sep', 'iep', 'gut', 'es', 'en', 'wsEs', 'wqEs', 'esLabel', 'sexo', 'links']:
            if c in r and c not in o: o[c] = r[c]['value']
    # obras destacadas (P800)
    b = sparql(f'''SELECT ?p ?o ?oLabel ?fecha ?oes ?oen WHERE {{
      VALUES ?p {{ {vals} }} ?p wdt:P800 ?o.
      OPTIONAL {{ ?o wdt:P577 ?fecha }}
      OPTIONAL {{ ?oes schema:about ?o; schema:isPartOf <https://es.wikipedia.org/> }}
      OPTIONAL {{ ?oen schema:about ?o; schema:isPartOf <https://en.wikipedia.org/> }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en". }} }}''')
    for r in b:
        k = r['p']['value'].rsplit('/', 1)[1]
        obras = out[k].setdefault('obras', {})
        oq = r['o']['value'].rsplit('/', 1)[1]
        ob = obras.setdefault(oq, {'qid': oq, 'titulo': r['oLabel']['value']})
        for c in ['fecha', 'oes', 'oen']:
            if c in r and c not in ob: ob[c] = r[c]['value']
    print(i, file=sys.stderr); time.sleep(1)

# Sexo segun Wikidata (P21): hombre, mujer u otro (no binario, etc.)
SEXO = {'Q6581097': 'hombre', 'Q2449503': 'hombre', 'Q6581072': 'mujer', 'Q1052281': 'mujer'}
for o in out.values():
    if 'sexo' in o: o['sexo'] = SEXO.get(o['sexo'].rsplit('/', 1)[1], 'otro')
    if 'links' in o: o['links'] = int(o['links'])

# El id de cada filosofo (el de la direccion: #plato). Se conservan los que ya habia.
import os, unicodedata
def slug(t):
    t = re.sub(r'\s*\(.*?\)', '', t.removeprefix('es:'))
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')
antes = {x['enTitulo']: x['id'] for x in json.load(open('wikidata.json'))} if os.path.exists('wikidata.json') else {}

res = []
for t in TITULOS:
    q = qid.get(t)
    o = out.get(q, {}) if q else {}
    if 'obras' in o: o['obras'] = list(o['obras'].values())
    res.append({'enTitulo': t, **o, 'id': antes.get(t) or slug(t)})
json.dump(res, open('wikidata.json', 'w'), ensure_ascii=False, indent=1)
print('ok', len(res), file=sys.stderr)
