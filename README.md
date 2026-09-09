# ROTA — Una autopsia del silencio

Manifiesto editorial y diario visual: una experiencia de scroll con transiciones
fluidas, fotografía a sangre y modo negativo conmutable.

## Requisitos

Node.js 18+

## Puesta en marcha

```bash
npm install
npm run dev
```

La app queda en http://localhost:3000

## Scripts

| Script            | Qué hace                                  |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Servidor de desarrollo con hot reloading  |
| `npm run build`   | Build de producción en `dist/`            |
| `npm run preview` | Sirve el build de producción              |
| `npm run lint`    | Comprobación de tipos (`tsc --noEmit`)    |

## Estructura

```
src/
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

## Editar el contenido

Los textos viven todos en `src/data/texts.json`. Las fotografías se cargan desde
`src/assets/anne/` por nombre de archivo (`1.JPG`, `2.JPG`, … `7.JPG`; el
capítulo IV usa `4-1`, `4-2`, `4-3`). Cualquier archivo que falte cae en una
imagen de Unsplash de reserva definida en `src/data/defaultItems.ts`.

## Modo negativo

`html.negative-mode` invierte la página entera con un `filter`. Las imágenes,
el canvas y el daruma se re-invierten para conservar sus colores reales. El
tratamiento fotográfico (contraste/brillo) está en la clase `.photo-treatment`
de `index.css`, no en las clases de Tailwind, para que sea idéntico en ambos
modos — ver el comentario del archivo.
