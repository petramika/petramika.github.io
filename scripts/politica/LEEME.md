# Actualizar los datos de «España política en datos»

`actualizar.py` descarga de las fuentes oficiales (INE, Eurostat, Banco de España, OCDE y Red Eléctrica) las
series que tienen API estable, las compara con los JSON de `src/promesas/datos/` y dice qué ha cambiado.
Solo usa Python 3, sin instalar nada. Tarda un minuto.

## Cómo se usa

```sh
python3 scripts/politica/actualizar.py              # informe: no escribe nada
python3 scripts/politica/actualizar.py --escribir   # guarda los cambios en los JSON
```

Opciones:

- `--solo paro,vivienda.json` limita a las series cuyo nombre, fichero o ruta contenga alguno de esos textos.
- `--cache` reutiliza las descargas hechas hoy (para repetir el informe sin volver a bajar nada).
- `--desde 2015` compara desde ese año (por defecto, los 6 últimos años).
- `--datos <carpeta>` trabaja sobre otra copia de `src/promesas/datos` (para probar).
- `--revisar` regenera `REVISAR.md`, la lista de lo que hay que actualizar a mano.

Qué hace al escribir: corrige valores revisados, añade años nuevos al final y recalcula el año en curso.
Nunca borra ni renombra claves, conserva el formato de cada fichero y mantiene iguales los duplicados
(`fiscal.json`, `presion-fiscal.json`, `paguitas.poblacionExtranjeraPct`, `hay-casas.viviendas`, la fila
`hoy` de `en-cada-eleccion*.json`). Si un duplicado ya no coincidía, avisa y no lo toca.

## Cada cuánto

Cada tres meses va bien; mejor justo después de la EPA (finales de enero, abril, julio y octubre). Además,
en marzo-abril (cierre de deuda y gasto de Eurostat) y en diciembre (censo anual y MNP del INE).

## Después de ejecutarlo

1. Lee los **avisos** del informe: textos y claves con año que hay que cambiar a mano.
2. `git diff src/promesas/datos` y comprueba que los cambios tienen sentido.
3. Repasa `REVISAR.md` (`--revisar` para regenerarlo) por si toca alguna serie manual.
4. `npm run build`, mira la web en local (las pestañas afectadas) y actualiza la fecha de `fuentes/fuentes.json`.
5. Solo entonces, commit.
