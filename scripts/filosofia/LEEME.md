# Datos de /filosofia/

1. `lista.py`: los filosofos (titulo de la Wikipedia en ingles).
2. `python3 wikidata.py` → `wikidata.json`: fechas, retrato, Wikipedia, SEP, IEP, Gutenberg, Wikisource, Wikiquote y obras, de Wikidata.
3. `fichas/`: los textos (resumen, ideas, curiosidad, frase, obras, enlaces extra) y el glosario de cada bloque, escritos segun `INSTRUCCIONES.md`. `glosario-base.json` tiene las palabras comunes.
4. `cd scripts/filosofia && python3 build.py ../../src/filosofia/datos` junta todo en `lista.json`, `fichas.json` y `glosario.json`.
