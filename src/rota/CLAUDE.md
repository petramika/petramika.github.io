# ROTA · Esto es sentir

Ensayo visual: una experiencia de scroll con fotografía a sangre, escenas animadas y modo negativo. Es un proyecto artístico: el diseño es libre y cada escena puede inventar su propio lenguaje. Las reglas generales están en el `CLAUDE.md` de la raíz; la estructura, en la sección ROTA del `README.md`.

## Patrones que se mantienen

### Claro y oscuro: el modo negativo

- **ROTA no usa el tema común:** usa su propio modo negativo. `html.negative-mode` invierte toda la página con `filter: invert(1)`. La página arranca en negativo y la elección se guarda en `rota_negative_mode`.
- **Lo que tiene que conservar sus colores reales se vuelve a invertir:** fotos, canvas, el daruma, el velo de carga y las bolas de papel. Cada elemento nuevo de ese tipo se añade a esa lista de `index.css`.
- **El tratamiento de las fotos va en la clase `.photo-treatment`** de `index.css`, y no en clases de Tailwind, para que sea idéntico en los dos modos.
- **Cada escena se revisa en positivo y en negativo.**

### Color y tipografía

- **Blanco y negro:** papel `#fbfbfb` y tinta `#141518`.
- **El único color es la rueda de 12 tonos** de `data/wheel.ts`, y el amanecer. No se añaden colores sueltos.
- **Las fuentes son variables de `index.css`** (`--font-display`, `--font-sans`, `--font-mono`, `--font-broken` para las palabras que caen y se rompen, `--font-hand` para lo escrito a mano). Para cambiar una fuente, se cambia la variable.

### Textos

- **Todos los textos están en `data/texts.json`, la única fuente.** Los rótulos de los márgenes son plantillas con `{clave}` (`data/labels.ts`).
- **El título, la descripción y la frase de portada están también en `rota/index.html`,** porque los buscadores leen el HTML antes de que corra nada. Si cambian en `texts.json`, se cambian allí también.

### Fotos y privacidad

- **Las fotos están en `assets/anne/`,** por nombre (`1.JPG` … `7.JPG`; el capítulo IV usa `4-1`, `4-2` y `4-3`).
- **En `assets/anne/m/` está la versión de 2000 px,** que es la que usan móviles y tablets (≤ 1024 px): las de 3400 px atascan iOS. Cada foto nueva va en las dos carpetas.
- **Las fotos no se indexan:** `noimageindex` y tarjeta para compartir sin imagen. No se añade `og:image`.

### Animación y rendimiento

- **Cada escena animada se pausa cuando no se ve:** usa `hooks/useOnScreen.ts`, y su bucle sale en la primera línea si no está en pantalla.
- **Canvas con `canvasDpr()`** (`data/device.ts`): resolución completa en un navegador normal, 1:1 dentro de otras apps.
- **Dentro de Instagram, TikTok y otras apps** (`IN_APP`, o `?inapp` para probarlo) la página va más ligera: sin polvo y con aviso para abrirla en el navegador (`InAppGate`).
- **Toda animación respeta `prefers-reduced-motion`.**
- **Una escena nueva se prueba en el móvil:** que se vea fluida y que nada se corte.

### Código

- Los comentarios de este proyecto están en inglés, a diferencia del resto de la web.
- El pie común está al final, en `Epilogue.tsx`.
