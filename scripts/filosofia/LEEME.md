# Datos de /historia-filosofia-tldr/

1. `lista.py`: los filósofos, por su título en la Wikipedia inglesa. Para quien solo tiene artículo en la española, «es:Título».
2. `python3 wikidata.py` → `wikidata.json`: fechas, sexo, retrato, Wikipedia, SEP, IEP, Gutenberg, Wikisource, Wikiquote, número de idiomas y obras, sacado de Wikidata. Los `id` que ya existían se conservan.
3. `python3 fama.py` → `fama.json`: el reconocimiento. Mide tres cosas:
   - las lecturas de su Wikipedia en inglés y en español en los últimos 12 meses;
   - en cuántas Wikipedias tiene artículo;
   - cuántos papers lo nombran, según Semantic Scholar (este paso es lento y se puede cortar y relanzar).

   Para volver a medirlo todo cada pocos meses: `python3 fama.py --todo`.
4. `fichas/`: los textos y el glosario de cada bloque, escritos según `INSTRUCCIONES.md`. `glosario-base.json` tiene las palabras comunes.
5. `historia/`: los datos de «La historia con lupa». `eventos.json` y `periodos.json` traen enlaces a Wikipedia comprobados; `frases.json` trae frases célebres verificadas con su fuente.
6. `python3 build.py ../../src/filosofia/datos` junta todo en `lista.json`, `fichas/NN.json` (trozos de 40), `glosario.json` e `historia.json`. Solo salen en la web los filósofos que tienen ficha.

**Reconocimiento**
- Para cada señal se calcula el percentil, en escala logarítmica, y se hace la media de las dos mejores. Así, que su nombre se busque mal en los papers no hunde a nadie.
- Niveles:
  - muy alta: el 10 % de arriba;
  - alta: hasta el 35 %;
  - media: hasta el 70 %;
  - baja: el resto.
