# Fichas de filósofos para una web de divulgación (en español)

Web personal en español: una línea del tiempo de la filosofía para gente **sin ninguna formación filosófica**. La regla de oro: **explícalo como a un chaval listo de 14 años o a tu abuela**. Frases cortas, ejemplos de la vida diaria, cero jerga sin explicar. Nada de tono de libro de texto. Pero **todo debe ser cierto**: no inventes fechas, frases célebres, anécdotas ni enlaces. Si dudas de algo, no lo pongas.

Tu bloque de filósofos está en `bloques/bloque-N.json` (este directorio). Cada fila trae datos ya verificados en Wikidata: `id` (no lo cambies), nombre en español, enlaces de Wikipedia, años de nacimiento y muerte (negativo = antes de Cristo) y `obrasWikidata`. Los retratos y los enlaces a Wikipedia, Stanford Encyclopedia, IEP, Gutenberg, Wikisource y Wikiquote **ya los añado yo** desde Wikidata: no los repitas.

## Lo que entregas

Dos archivos JSON válidos (UTF-8, sin comentarios):

### `out/fichas-N.json`: una lista con un objeto por filósofo, en el mismo orden

```json
{
  "id": "plato",
  "nombre": "Platón",
  "fechas": "c. 427 – 347 a. C.",
  "region": "Grecia",
  "escuela": "Platonismo",
  "categorias": ["metafisica", "politica", "etica", "conocimiento"],
  "conocidoPor": "Decir que lo que vemos son sombras de un mundo perfecto de [[Ideas|ideas-platon]]",
  "resumen": "2 a 4 frases: quién era, por qué es famoso y por qué sigue importando hoy, con algún ejemplo cotidiano.",
  "ideas": [
    "3 ideas clave, una frase cada una, fáciles, con algún ejemplo cotidiano.",
    "...",
    "..."
  ],
  "curiosidad": "Un dato curioso y verificable (1 o 2 frases). Si no hay ninguno fiable, null.",
  "frase": {"texto": "Frase célebre REAL y bien atribuida, en español.", "fuente": "Obra o contexto"},
  "obras": [{"titulo": "La República", "anio": "c. 375 a. C.", "deQueVa": "Una línea, fácil."}],
  "enlaces": [{"titulo": "La República, texto completo en español", "url": "https://...", "tipo": "texto"}],
  "influyeEn": ["aristotle", "plotinus"]
}
```

- `nombre`: el nombre habitual en español («Platón», «Tomás de Aquino», «Avicena»).
- `fechas`: texto para mostrar. Usa los años del bloque y corrígelos solo si sabes que Wikidata se equivoca. Usa «c.» si es aproximado, «a. C.» para antes de Cristo y «1949 –» si vive.
- `region`: país o zona cultural con la que se le asocia (Grecia, Roma, China, India, al-Ándalus, Persia, Francia, Alemania, España, México…).
- `escuela`: corriente principal en pocas palabras, por ejemplo «Estoicismo», «Empirismo», «Existencialismo» o «Teoría crítica (Escuela de Fráncfort)».
- `categorias`: de 1 a 4 claves de esta lista cerrada, **solo estas**:
  - `etica`: cómo vivir y qué está bien
  - `politica`: poder, Estado y justicia
  - `metafisica`: qué es la realidad
  - `conocimiento`: qué podemos saber
  - `logica`: razonar bien
  - `mente`: mente y conciencia
  - `lenguaje`
  - `ciencia`
  - `religion`: Dios y lo sagrado
  - `estetica`: arte y belleza
  - `existencia`: sentido de la vida, muerte y libertad
  - `sociedad`: cultura, género, raza, educación y economía
- `conocidoPor`: una frase de 120 caracteres como máximo. Es lo que se ve en la línea del tiempo.
- `frase`: solo si es auténtica y sale de una obra concreta. Nada de frases apócrifas de internet («Solo sé que no sé nada» se puede usar si aclaras en `fuente` que es una formulación tradicional basada en la *Apología* de Platón). Si no hay ninguna segura, pon `null`.
- `obras`: de 1 a 5 obras principales con el título en español. Si `anio` no es seguro, déjalo aproximado («c. 1650») o vacío. Si no escribió nada, como Sócrates o Buda, deja `[]` y dilo en el resumen.
- `enlaces`: de 0 a 3 enlaces **extra** muy útiles:
  - el texto original o traducido gratis y legal: Wikisource, Proyecto Gutenberg, Perseus, archive.org, filosofia.org, cervantesvirtual.com o la web de una universidad;
  - un artículo famoso suyo, por ejemplo «¿Qué es la Ilustración?» de Kant o «What Is It Like to Be a Bat?» de Nagel;
  - un artículo o una conferencia muy conocida sobre su obra.

  `tipo` es uno de: `"texto"` (fuente original), `"articulo"`, `"libro"`, `"video"` o `"web"`. **Cada URL tiene que estar comprobada**: `curl -sIL -o /dev/null -w '%{http_code}' URL` debe devolver 200. Lanza curl con `dangerouslyDisableSandbox: true`, porque el sandbox corta la red. Quita cualquier enlace que no dé 200 o que no estés seguro de que es lo que dice ser. Nada de enlaces de tiendas como Amazon.
- `influyeEn`: ids (de cualquier bloque) de filósofos de la lista completa en los que influyó claramente. La lista completa de ids está en `ids.txt`. Pon de 0 a 5 y solo los obvios.

### Palabras difíciles → glosario (MUY IMPORTANTE)

En `conocidoPor`, `resumen`, `ideas` y `curiosidad`, marca **toda palabra o concepto poco común** con `[[clave]]` o con `[[texto visible|clave]]`. Cuando la web muestre esa palabra, al pasar el ratón saldrá una explicación sencillísima. Ejemplos:
- `el [[empirismo]]`
- `las [[formas ideales|ideas-platon]]`
- `el [[imperativo categórico|imperativo-categorico]]`

La `clave` va en minúsculas, sin tildes y con guiones. Usa `[[clave]]` a secas solo cuando el texto visible sea igual que la clave, sin tildes; si lleva tildes o mayúsculas, usa `[[texto|clave]]`. Marca de verdad: si una palabra no la usarías hablando con tu abuela (ontología, dialéctica, a priori, silogismo, teodicea, alienación…), va marcada. No marques la misma clave dos veces en la misma frase.

Estas claves **comunes** ya las define otra persona: úsalas tal cual y **no** las incluyas en tu glosario:

`filosofia, etica, moral, metafisica, ontologia, epistemologia, logica, estetica, dialectica, empirismo, racionalismo, idealismo, materialismo, escepticismo, estoicismo, epicureismo, cinismo, neoplatonismo, escolastica, humanismo, ilustracion, existencialismo, fenomenologia, utilitarismo, pragmatismo, marxismo, positivismo, estructuralismo, postestructuralismo, posmodernidad, filosofia-analitica, hermeneutica, determinismo, libre-albedrio, alma, razon, virtud, silogismo, a-priori, a-posteriori, sustancia, esencia, dualismo, monismo, teologia, nihilismo, contrato-social, feminismo, deconstruccion, teoria-critica, sofista, mayeutica, tabula-rasa, imperativo-categorico, ideas-platon, dios-filosofos, capitalismo, ideologia, conciencia, sujeto, razon-pura, dogma, paradoja, atomo, infinito`

Para todas las demás claves que uses, entrega:

### `out/glosario-N.json`

```json
[{"clave": "teodicea", "termino": "Teodicea", "def": "Intentar explicar por qué existe el mal si Dios es bueno y todopoderoso. Por ejemplo: ¿por qué hay terremotos si Dios nos quiere?"}]
```

- `def` tiene como máximo 40 palabras, en lenguaje de calle y con un ejemplo cotidiano si se puede. Nada de definir con otras palabras difíciles.
- Comprueba que **todas** las claves que usas están en la lista común o en tu glosario.

## Al terminar

1. Valida los dos JSON con `python3 -m json.tool` y comprueba que cada `[[...|clave]]` existe en la lista común o en tu glosario.
2. Responde en tu informe final con: cuántas fichas has hecho, cuántas entradas tiene tu glosario, cuántos enlaces extra has verificado y las dudas o datos que no has podido confirmar.

No toques nada fuera de este directorio.
