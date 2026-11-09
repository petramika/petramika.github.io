"""Mide la fama de cada filosofo con tres señales abiertas y comprobables.

  papers   cuantos trabajos academicos lo nombran en el titulo o el resumen
           (Semantic Scholar, del Allen Institute: ~200 millones de papers
           de todas las disciplinas. Google Scholar y PhilPapers no dejan
           consultarse de forma automatica, y OpenAlex ya pide clave)
  visitas  cuanta gente lee su articulo de Wikipedia (ingles + español,
           ultimos 12 meses, sin bots)
  idiomas  en cuantas Wikipedias y proyectos tiene articulo (Wikidata)

Guarda los numeros en bruto en fama.json; build.py los convierte en ranking.

  python3 fama.py            # solo los que faltan
  python3 fama.py --todo     # vuelve a medir a todos (cada pocos meses)
"""
import json, os, re, sys, time, datetime, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {'User-Agent': 'petramika-filosofia/0.1 (https://petramika.github.io; personal site build script)'}
# Nombres con los que se le busca en los papers cuando el titulo de Wikipedia es ambiguo
NOMBRE = {
    'The Buddha': 'Gautama Buddha', 'Philo': 'Philo of Alexandria', 'Diogenes': 'Diogenes of Sinope',
    'Porphyry (philosopher)': 'Porphyry', 'Gorgias': 'Gorgias of Leontini', 'Heloise': 'Heloise',
    'Seneca the Younger': 'Seneca', 'Thales of Miletus': 'Thales', 'Adi Shankara': 'Shankara', 'Zeno of Citium': 'Zeno of Citium',
    'Anaximenes of Miletus': 'Anaximenes', 'Hipparchia of Maroneia': 'Hipparchia', 'Diotima of Mantinea': 'Diotima',
    'Augustine of Hippo': 'Saint Augustine', 'Elisabeth of the Palatinate': 'Elisabeth of Bohemia', 'Juana Inés de la Cruz': 'Sor Juana',
}

class Fallo(Exception): pass
NADA = {}  # 404: no existe (cuenta como 0)

def get(url):
    """Pide con paciencia: si el servidor dice «demasiadas peticiones» (429), espera y reintenta."""
    for i in range(10):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60))
        except urllib.error.HTTPError as e:
            if e.code == 404: return NADA
            espera = int(e.headers.get('Retry-After') or 0) or min(60, 3 * 2 ** i)
            time.sleep(espera)
        except Exception:
            time.sleep(min(60, 3 * 2 ** i))
    raise Fallo(url)

hoy = datetime.date.today().replace(day=1)
fin = hoy - datetime.timedelta(days=1)
ini = (fin.replace(day=1) - datetime.timedelta(days=330)).replace(day=1)
RANGO = f"{ini:%Y%m}01/{fin:%Y%m%d}"

def visitas(url):
    if not url: return 0
    m = re.match(r'https://(\w+)\.wikipedia\.org/wiki/(.+)', url)
    r = get(f'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/{m.group(1)}.wikipedia/all-access/user/{m.group(2)}/monthly/{RANGO}')
    return sum(i['views'] for i in r.get('items', []))

def papers(nombre):
    # Sin clave, Semantic Scholar comparte un cupo pequeño entre todos: de uno en uno y con pausa
    time.sleep(1.2)
    q = urllib.parse.quote(f'"{nombre}"')
    r = get(f'https://api.semanticscholar.org/graph/v1/paper/search/bulk?query={q}&fields=title')
    return r.get('total', 0)

def senalesRapidas(w):
    """Visitas e idiomas (Wikimedia, rapido)."""
    try:
        return w['id'], {'visitas': visitas(w.get('en')) + visitas(w.get('es')), 'idiomas': w.get('links', 0), 'sep': bool(w.get('sep'))}
    except Fallo as e:
        print('fallo', w['id'], e, file=sys.stderr)
        return w['id'], None

def nombreBuscado(w):
    return NOMBRE.get(w['enTitulo'], re.sub(r'\s*\(.*?\)', '', w['enTitulo'].removeprefix('es:')))

if __name__ == '__main__':
    wd = json.load(open('wikidata.json'))
    fama = json.load(open('fama.json')) if os.path.exists('fama.json') else {}
    todo = '--todo' in sys.argv
    guardar = lambda: json.dump({k: v for k, v in fama.items() if k in {w['id'] for w in wd}}, open('fama.json', 'w'), ensure_ascii=False, indent=0, sort_keys=True)

    # 1. Visitas e idiomas para todos los que falten (unos minutos)
    pendientes = [w for w in wd if todo or w['id'] not in fama or 'visitas' not in fama[w['id']]]
    print('1) visitas e idiomas:', len(pendientes), 'periodo', RANGO, file=sys.stderr, flush=True)
    with ThreadPoolExecutor(4) as ex:
        for k, v in ex.map(senalesRapidas, pendientes):
            if v: fama[k] = {**fama.get(k, {}), **v, 'medido': datetime.date.today().isoformat()}
    guardar()

    # 2. Papers (lento: Semantic Scholar sin clave). Se guarda cada 10; si se corta, se sigue luego.
    porNombre = {w['id']: nombreBuscado(w) for w in wd}
    pendientes = [w for w in wd if w['id'] in fama and (todo or fama[w['id']].get('papers') is None or fama[w['id']].get('buscado') != porNombre[w['id']])]
    print('2) papers:', len(pendientes), file=sys.stderr, flush=True)
    for n, w in enumerate(pendientes):
        try:
            fama[w['id']].update(papers=papers(porNombre[w['id']]), buscado=porNombre[w['id']])
        except Fallo as e:
            print('fallo', w['id'], e, file=sys.stderr)
        if n % 10 == 9:
            guardar()
            print(n + 1, w['id'], fama[w['id']].get('papers'), file=sys.stderr, flush=True)
    guardar()
    print('ok', len(fama), 'sin papers:', [k for k, v in fama.items() if v.get('papers') is None], file=sys.stderr)
