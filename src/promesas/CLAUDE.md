# España política en datos

Cuarenta años de política española con datos: quién gobernó, qué prometió y qué cumplió, y cómo cambiaron la economía, la vivienda, la inmigración, la sanidad, la violencia y los medios. Las reglas generales están en el `CLAUDE.md` de la raíz; la estructura de carpetas, en el `README.md`.

## Pestañas

Se registran en `estado.tsx` (`PESTANAS`, y `OCULTAS` para las escondidas) y en `App.tsx`. Orden: Global, Partidos y programas, Economía, Vivienda, Inmigración, Sanidad, Violencia y Medios. Los nombres de las pestañas son de una sola palabra cuando se puede.

- **Global y Partidos tienen su propio formato.**
  - Global: legislaturas, indicadores, promesas y acontecimientos de 1986 a hoy.
  - Partidos: elecciones, programas y propuestas.
- **El resto siguen siempre el mismo orden:**
  1. **Lo general:** una caja principal con línea del tiempo por años (▶ para verla año a año, pulsar un año para elegirlo). Solo la caja principal lleva línea del tiempo.
  2. **Las estadísticas:** mini gráficas de líneas (`Mini`) a lo largo de los años, comparando con la UE u otros países cuando haya datos. Nada de barras de un solo año: si hay serie, se pinta la serie.
  3. **Lo que dice la gente:** «Cuestiones frecuentes» (`Cuestiones` / `Cuestion`). Son frases que se oyen o preguntas que se hace la gente, con:
     - una pill de veredicto (tono `falso`, `matiz` o `cierto`);
     - «En resumen»;
     - lo positivo y lo negativo;
     - enlaces a las gráficas de la pestaña que lo respaldan.
- **«Lo que viene»** (`#futuro`, se abre pulsando el año final de la cabecera) es la pestaña personal de la autora. Tiene una sección «Tema por tema» con las categorías de Partidos (`componentes/iconos.ts`). Cada tema lleva:
  - una pill (Va a mejor, Va a peor o Mixto) y un resumen;
  - qué va a mejor, qué va a peor y qué se podría hacer;
  - sus gráficas.

  En «Qué se podría hacer» van varias soluciones con matices, nunca una sola. Por ejemplo, la tecnología también sustituye puestos, y formar mejor no es lo mismo que formar más.
- Al cambiar de pestaña se ve el esqueleto (`componentes/Esqueleto.tsx`), nunca la página en blanco.

## Datos

- **Solo fuentes oficiales para las cifras:** INE, Eurostat, OCDE, Banco de España, ministerios, BOE, CIS, Interior, Seguridad Social, AIReF… Nada de periódicos para los números. La prensa sirve como mucho para contexto, y los verificadores para contrastar.
- **Desde que empezó la democracia (1975–1977) cuando haya datos.** Si no, desde lo más antiguo que haya. Primero hay que buscar más años: no conformarse con el último dato.
- **En la (i) de cada gráfica:**
  - los cambios de método (series que se rompen) y los años que faltan;
  - los cálculos propios;
  - lo que está «sin verificar».
- **Página de fuentes al día:** cada dato nuevo añade o amplía su bloque en `datos/fuentes/fuentes.json` (sección de su pestaña), en el mismo cambio.
- **Un JSON por tema** en `datos/<pestaña>/`. Para actualizar las series con API: `scripts/politica/LEEME.md`; lo que se revisa a mano está en `scripts/politica/REVISAR.md`.

## Cómo se cuenta

- **Siempre las dos caras:** lo bueno y lo malo, sin tomar partido. Los datos dicen lo que dicen aunque no confirmen la idea de partida.
- **Las palabras raras, subrayadas con el glosario**, y lo largo, en la (i), que abre el panel lateral (`componentes/Info.tsx`).
- **Explicado fácil:** cuando un dato es difícil (deuda, índices, tasas), se explica qué significa en la vida real, y cómo se lee la gráfica («cuanto más baja, mejor»).

## Piezas que se reutilizan

| Pieza | Para qué |
| ----- | -------- |
| `componentes/graficas/Mini.tsx` | Gráfica de líneas por años con el fondo del partido que gobernaba (`series`, `x0`, `yMin`, `hitos`, `note`, `src`). |
| `componentes/graficas/Barras.tsx` | Comparar países o grupos cuando no hay serie por años. |
| `componentes/Info.tsx`, `Lateral.tsx` | La (i) y el panel lateral. |
| `componentes/Cuestiones.tsx` | Cuestiones frecuentes. |
| `componentes/Icono.tsx`, `iconos.ts` | Iconos de las categorías de Partidos. |
| Clases `tl-anios`, `tl-play`, `tl-linea` | Línea del tiempo de la caja principal. |
| Clases `stack tl-barra`, `statlegend` | Barra apilada con su leyenda (Vivienda, Violencia, Sanidad, Medios). |
| Clase `dl.cuenta` (`ok`, `ko`, `half`) | Tarjetas de conclusión debajo de la caja principal. |
| Clase `.era` | La sección negra (Medios). |
