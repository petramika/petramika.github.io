# petramika.github.io

Web personal: un índice en la raíz, al estilo de los «Index of /» de Apache, y
un proyecto por carpeta. Un solo proyecto de Vite construye todas las páginas
y GitHub Actions publica `dist/` en cada push a `main`.

| Ruta         | Qué es                     | Código                                  |
| ------------ | -------------------------- | --------------------------------------- |
| `/`          | Índice de proyectos        | `index.html` + `src/indice/`            |
| `/rota/`     | ROTA, ensayo visual        | `rota/index.html` + `src/rota/`         |
| `/espana-politica-datos/` | España política en datos | `espana-politica-datos/*.html` + `src/promesas/` |
| `/historia-filosofia-tldr/` | Filosofía comprimida | `historia-filosofia-tldr/index.html` + `src/filosofia/` |
| `/promesas/` | Redirección a `/espana-politica-datos/` (nombre antiguo) | `promesas/*.html` |

`public/` se copia tal cual a la raíz: favicons y `robots.txt`.

## España política en datos

Antes «Cuarenta años de promesas»; el código sigue en `src/promesas/`.
Tres páginas (`espana-politica-datos/index.html`, `fuentes.html`, `sobre-la-autora.html`),
cada una con su entrada en `src/promesas/`:

```
src/promesas/
├── main.tsx, App.tsx    Cabecera, pestañas y pie
├── estado.tsx           Pestaña y legislatura elegidas (viven en la URL: #economia, #l2004…)
├── promesas.css         Estilos de la página
├── datos/               Un JSON por tema, por carpetas: comun/, global/, partidos/,
│                        economia/, vivienda/, inmigracion/, medios/, fuentes/, autora/
│   └── index.ts         Los reexporta (los de partidos van aparte: se cargan con su pestaña)
├── lib/                 Funciones puras: formato de números y fechas, series, constantes
├── componentes/         Lo común: (i), etiqueta flotante, punto de fuente, iconos,
│   └── graficas/        Grafico (indicador 1986–2026), Mini (líneas o barras), Teselas
├── pestanas/            Una carpeta por pestaña, un fichero por sección
├── fuentes/             Página de fuentes, con buscador
└── autora/              Sobre la autora (textos en datos/autora/textos.json)
```

Para cambiar una cifra o un texto, se edita su JSON en `datos/`. Para añadir
una nota (i) a un indicador, basta con su campo `note` en
`datos/comun/indicadores.json`.

### Añadir un proyecto

1. Crear la carpeta con su `index.html` (por ejemplo `nuevo/index.html`).
2. Añadirla a `paginas` en `vite.config.ts`.
3. Añadir su entrada en `src/indice/proyectos.ts`: ruta, nombre y de qué va.
4. Si no tiene icono propio, crear su avatar con
   `node scripts/avatar.mjs "Nombre del proyecto" carpeta` y enlazarlo en su
   `<head>`: `<link rel="icon" type="image/svg+xml" href="/avatares/carpeta.svg">`.
   Son las iniciales (máximo dos) en un círculo de color, como los de Google.
5. Cerrar la página con el pie común: `<Pie marca="Nombre" />` de `src/comun/Pie.tsx`.
   Todas las webs llevan el mismo pie en blanco y negro (marca, ©, autora con
   GitHub y carpeta al índice, «¿Dudas o ideas? Abre un ticket» y la fecha de
   actualización). El resto del diseño de cada web es libre.

## ROTA — Una autopsia del silencio

Manifiesto editorial y diario visual: una experiencia de scroll con transiciones
fluidas, fotografía a sangre y modo negativo conmutable.

### Requisitos

Node.js 18+

### Puesta en marcha

```bash
npm install
npm run dev
```

La app queda en http://localhost:3000

### Scripts

| Script            | Qué hace                                  |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Servidor de desarrollo con hot reloading  |
| `npm run build`   | Build de producción en `dist/`            |
| `npm run preview` | Sirve el build de producción              |
| `npm run lint`    | Comprobación de tipos (`tsc --noEmit`)    |

### Estructura

```
src/rota/
├── App.tsx                 Composición de la página
├── index.css               Tailwind 4 + modo negativo + tratamiento de foto
├── types.ts
├── components/
│   ├── Navigation.tsx      Cabecera fija: daruma + toggle +/-
│   ├── Daruma.tsx          Daruma faux-3D que se mece con el scroll
│   ├── HeroSection.tsx     Portada ROTA + primera diapositiva de texto
│   ├── PaperDispersion.tsx Bolas de papel que se dispersan al hacer scroll
│   ├── StorySlide.tsx      Diapositiva de foto + bloque de texto por capítulo
│   ├── ImageSequenceSlide.tsx  Secuencia flash del capítulo IV
│   ├── DustParticles.tsx   Polvo en suspensión en canvas, repelido por el cursor
│   ├── ScrollProgress.tsx
│   └── Epilogue.tsx
├── data/
│   ├── texts.json          Todos los textos editoriales (única fuente)
│   └── defaultItems.ts     Empareja los capítulos con las fotos de assets/anne
└── assets/
    ├── anne/               Fotografías del ensayo
    └── images/             Bolas de papel arrugado (PNG transparente)
```

### Editar el contenido

Los textos viven todos en `src/rota/data/texts.json`. Las fotografías se cargan desde
`src/rota/assets/anne/` por nombre de archivo (`1.JPG`, `2.JPG`, … `7.JPG`; el
capítulo IV usa `4-1`, `4-2`, `4-3`). Cualquier archivo que falte cae en una
imagen de Unsplash de reserva definida en `src/rota/data/defaultItems.ts`.

### Modo negativo

`html.negative-mode` invierte la página entera con un `filter`. Las imágenes,
el canvas y el daruma se re-invierten para conservar sus colores reales. El
tratamiento fotográfico (contraste/brillo) está en la clase `.photo-treatment`
de `index.css`, no en las clases de Tailwind, para que sea idéntico en ambos
modos — ver el comentario del archivo.
