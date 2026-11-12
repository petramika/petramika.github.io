# petramika.github.io

Web personal: un índice en la raíz y un proyecto por carpeta. Estructura, rutas y cómo añadir un proyecto: `README.md`.

Cada proyecto tiene además su propio CLAUDE.md con sus reglas:

| Proyecto | Código | Reglas |
| -------- | ------ | ------ |
| España política en datos | `src/promesas/` | `src/promesas/CLAUDE.md` |
| Filosofía comprimida | `src/filosofia/` | `src/filosofia/CLAUDE.md` |

## Reglas para todos los proyectos

### Técnica

- **Vite + React + TypeScript.** Todo es un único proyecto de Vite con varias páginas: cada proyecto es una carpeta con su `index.html` y su código en `src/<proyecto>/`. Un proyecto nuevo sigue los pasos de «Añadir un proyecto» del README: `vite.config.ts`, `src/indice/proyectos.ts`, avatar y pie.
- **Los datos van en JSON, no en el código.** Las cifras de los textos se calculan desde los JSON, para que se actualicen solas cuando cambie el dato.
- **Comprobar antes de dar algo por terminado:** `npm run lint`, y mirarlo en el navegador (`npm run dev`, puerto 3000) sin errores en la consola.

### Diseño

- **Modo claro y oscuro, siempre los dos.** Cada color es una variable CSS definida para los dos modos, con el patrón de `src/comun/tema.tsx`. Cada cambio visual se revisa en claro y en oscuro.
- **El pie común en todas las páginas:** `<Pie marca="…" />` de `src/comun/Pie.tsx`. Es el mismo en blanco y negro en toda la web; el resto del diseño de cada proyecto es libre.
- **Responsive y bien en el móvil.** Revisar a 390 px de ancho:
  - sin scroll horizontal y sin textos ni ejes cortados;
  - nada que dependa de pasar el ratón: en el móvil se toca;
  - las explicaciones largas, en un panel lateral y no en una ventanita que no cabe.
- **Palabras difíciles, subrayadas:** el glosario común de `src/comun/Glosario.tsx` (`<T k="clave">` o `[[clave]]` / `[[texto|clave]]`). Al pasar el ratón o tocar sale una explicación fácil.
- **La (i) para dar más información:** lo que no cabe en la página (definiciones, cómo se ha calculado, cambios de método, huecos, fuentes) va en la (i), no en el texto principal.

### Contenido

- **Para gente sin formación:** español claro, frases cortas, ejemplos de la vida diaria y nada de jerga sin explicar.
- **Todo tiene que ser cierto.** Nada de inventar cifras, fechas, frases ni enlaces. Si un dato no se ha podido comprobar en la fuente original, se dice («sin verificar») o no se pone.
- **Fuentes originales u oficiales, con su enlace.** Cada proyecto concreta cuáles.

### Git

- Commit a medida que se avanza, con mensajes concretos: qué cambia y con qué cifras.
- Los commits van con la identidad del repo (`petramika <6030217+petramika@users.noreply.github.com>`), nunca con un correo personal.
- **Push solo cuando la autora lo pida.** Cada push a `main` publica la web (GitHub Actions → Pages).
