# Filosofía comprimida

2.600 años de ideas en una línea del tiempo, de Tales a hoy, con la historia de cada época al lado. Las reglas generales están en el `CLAUDE.md` de la raíz.

## Cómo se cuenta

- **Para un chaval listo de 14 años o para tu abuela:** frases cortas, ejemplos de la vida diaria, cero jerga sin explicar y nada de tono de libro de texto.
- **Las palabras difíciles, subrayadas.** En los textos se marcan con `[[clave]]` o `[[texto visible|clave]]`, y al pasar el ratón o tocar sale su explicación. Va marcada toda palabra que no usarías hablando con tu abuela (ontología, dialéctica, a priori…).
  - Las claves comunes están en `scripts/filosofia/glosario-base.json`.
  - Cada definición tiene 40 palabras como máximo, en lenguaje de calle y con un ejemplo.
  - Toda clave usada tiene que existir en el glosario.
- **La (i) y el panel lateral** para lo que no cabe: la ficha de cada filósofo, las edades y los hechos de la cronología (`Lateral.tsx`).

## Datos

- **De fuentes originales:**
  - fechas, retratos y enlaces, de Wikidata;
  - lecturas, de la Stanford Encyclopedia, la IEP y Wikipedia;
  - los textos, gratis y legales en Wikisource, Gutenberg o archive.org.
- **Frases célebres solo si son auténticas,** con la obra de la que salen. Nada de frases apócrifas de internet.
- **Cada enlace comprobado:** tiene que devolver 200. Nada de tiendas.
- **No se editan a mano los JSON de `src/filosofia/datos/`:** los genera `scripts/filosofia/build.py`. Se cambian las fuentes en `scripts/filosofia/` y se vuelve a construir. El proceso está en `scripts/filosofia/LEEME.md`, y cómo se escriben las fichas, en `INSTRUCCIONES.md`.

## Categorías y avatares

- **Una lista cerrada de 12 categorías** en `config.ts` (`CATEGORIAS`), cada una con su color y su pregunta. Cada filósofo tiene de 1 a 4.
- **Las categorías se ven alrededor del avatar:** un anillo con un trozo de color por categoría (`Retrato.tsx`, `anillo()`). Si no hay foto, salen las iniciales.
- **Edades de la historia** (`ERAS` en `config.ts`): a cada filósofo se le asigna la edad en la que trabajó (nacimiento + 35 años).
