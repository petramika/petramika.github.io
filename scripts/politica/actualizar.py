#!/usr/bin/env python3
"""Refresca las series automaticas de «España política en datos».

Descarga cada serie de su fuente oficial (INE, Eurostat, Banco de España, OCDE, REE),
la compara con lo guardado en src/promesas/datos/**/*.json y muestra un informe.

    python3 scripts/politica/actualizar.py                 # solo informe, no escribe nada
    python3 scripts/politica/actualizar.py --escribir      # guarda los cambios en los JSON
    python3 scripts/politica/actualizar.py --solo paro,vivienda.json
    python3 scripts/politica/actualizar.py --cache         # reutiliza las descargas de hoy
    python3 scripts/politica/actualizar.py --datos /tmp/copia-de-datos --escribir
    python3 scripts/politica/actualizar.py --revisar       # regenera scripts/politica/REVISAR.md

Reglas de escritura:
  * nunca se borra ni se renombra una clave;
  * se corrigen los valores de los años de la ventana (por defecto, los 6 últimos) y se
    añaden los años nuevos detrás del último; nunca se rellenan huecos;
  * el año en curso (media parcial) se recalcula siempre;
  * se conserva el formato de cada fichero (sangría, orden de claves, ASCII o no) y los
    decimales de cada serie;
  * los duplicados se mantienen iguales; si ya no lo estaban, se avisa y no se tocan.

Solo usa la librería estándar de Python 3.
"""
import argparse
import copy
import csv
import datetime
import hashlib
import io
import itertools
import json
import os
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from decimal import ROUND_HALF_UP, Decimal

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
DATOS_REPO = os.path.join(REPO, 'src', 'promesas', 'datos')

HOY = datetime.date.today()
ANIO = HOY.year
VENTANA = 6  # años hacia atrás que se comparan y se pueden corregir

INE = 'https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/'
EUROSTAT = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/'
BDE = 'https://www.bde.es/webbe/es/estadisticas/compartido/datos/csv/'
OCDE = 'https://sdmx.oecd.org/public/rest/data/OECD.CTP.TPS,DSD_REV_COMP_OECD@DF_RSOECD,/ESP......'
REE = 'https://apidatos.ree.es/es/datos/generacion/evolucion-renovable-no-renovable'

# ---------------------------------------------------------------------------
# Tabla de series automáticas
# ---------------------------------------------------------------------------
# Campos:
#   nombre          etiqueta del informe (y lo que filtra --solo, junto con archivo y ruta)
#   archivo, ruta   fichero bajo src/promesas/datos y ruta dentro del JSON ('a.b'; '.' = raíz)
#   fuente          INE | Eurostat | BdE | OCDE | REE
#   series          {variable: id}. INE: código de serie. BdE: código de serie del CSV.
#                   Eurostat: filtro de dimensiones (se suma a 'filtro'; puede llevar 'dataset').
#                   OCDE: filtro de columnas del CSV SDMX. REE: tipo («Renovable»).
#   dataset, filtro Eurostat: dataset y dimensiones comunes. BdE: 'fichero'.
#   transformacion  anual | trimestre (+ 'trimestre': n) | media_trimestral | mes (+ 'mes': n)
#                   | suma_meses | media_meses       (se aplica a cada variable)
#   formula         expresión con las variables (por defecto 'x'), p. ej. 'a - b', 'x / 1000'
#   rebase          año base = 100 (después de la fórmula)
#   decimales       decimales con los que se guarda (los que ya usa la serie)
#   redondeo        'python' (por defecto) o 'decimal' (ver redondear())
#   frecuencia      frecuencia de la fuente (informativo)
#   desde           primer año que se compara (por defecto, el año actual - VENTANA)
#   nota            aclaración que sale en el informe
# Las entradas con 'especial' usan una función propia (fotos de un periodo, desgloses por país…).

SERIES = [
    # ----------------------------------------------------------------- comun/series-anuales.json
    {'nombre': 'paro', 'archivo': 'comun/series-anuales.json', 'ruta': 'paro',
     'fuente': 'INE', 'series': {'x': 'EPA452434'}, 'transformacion': 'media_trimestral',
     'frecuencia': 'trimestral', 'decimales': 1,
     'nota': 'EPA, media de los trimestres; el año en curso es la media de los publicados'},
    {'nombre': 'deuda', 'archivo': 'comun/series-anuales.json', 'ruta': 'deuda',
     'fuente': 'BdE', 'fichero': 'be1107.csv', 'series': {'x': 'DTNPDE2010_P0000P_PS_APU'},
     'transformacion': 'trimestre', 'trimestre': 4, 'frecuencia': 'trimestral', 'decimales': 1,
     'nota': 'deuda PDE en % del PIB a diciembre'},
    {'nombre': 'precio', 'archivo': 'comun/series-anuales.json', 'ruta': 'precio',
     'fuente': 'BdE', 'fichero': 'si_1_5.csv', 'series': {'x': 'DHIVTNOAPLPMMUVT_RLI.T'},
     'transformacion': 'media_trimestral', 'frecuencia': 'trimestral', 'decimales': 1, 'redondeo': 'decimal',
     'nota': 'valor tasado medio de la vivienda libre (MIVAU), media de los trimestres'},
    {'nombre': 'gasto', 'archivo': 'comun/series-anuales.json', 'ruta': 'gasto',
     'fuente': 'Eurostat', 'dataset': 'gov_10a_main',
     'filtro': {'geo': 'ES', 'unit': 'MIO_EUR', 'sector': 'S13'}, 'series': {'x': {'na_item': 'TE'}},
     'transformacion': 'anual', 'formula': 'x / 1000', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'ingr', 'archivo': 'comun/series-anuales.json', 'ruta': 'ingr',
     'fuente': 'Eurostat', 'dataset': 'gov_10a_main',
     'filtro': {'geo': 'ES', 'unit': 'MIO_EUR', 'sector': 'S13'}, 'series': {'x': {'na_item': 'TR'}},
     'transformacion': 'anual', 'formula': 'x / 1000', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'impcot', 'archivo': 'comun/series-anuales.json', 'ruta': 'impcot',
     'fuente': 'Eurostat', 'dataset': 'gov_10a_main',
     'filtro': {'geo': 'ES', 'unit': 'MIO_EUR', 'sector': 'S13'},
     'series': {'d2': {'na_item': 'D2REC'}, 'd5': {'na_item': 'D5REC'},
                'd91': {'na_item': 'D91REC'}, 'd61': {'na_item': 'D61REC'}},
     'transformacion': 'anual', 'formula': '(d2 + d5 + d91 + d61) / 1000', 'frecuencia': 'anual',
     'decimales': 1, 'nota': 'D2REC+D5REC+D91REC+D61REC de gov_10a_main (no gov_10a_taxag)'},
    {'nombre': 'pf', 'archivo': 'comun/series-anuales.json', 'ruta': 'pf',
     'fuente': 'OCDE', 'series': {'x': {'MEASURE': 'TAX_REV', 'SECTOR': 'S13',
                                        'STANDARD_REVENUE': '_T', 'UNIT_MEASURE': 'PT_B1GQ'}},
     'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1,
     'nota': 'presión fiscal OCDE (Revenue Statistics)'},
    # ----------------------------------------------------------------- economia
    {'nombre': 'cofog', 'archivo': 'economia/cofog.json', 'ruta': '.', 'especial': 'cofog',
     'fuente': 'Eurostat', 'dataset': 'gov_10a_exp', 'frecuencia': 'anual', 'decimales': 1,
     'nota': 'gasto por función; solo años de elección + el último (los años nuevos se añaden a mano)'},
    {'nombre': 'presionFiscalEurostat.espana', 'archivo': 'economia/cuestiones.json',
     'ruta': 'presionFiscalEurostat.espana', 'fuente': 'Eurostat', 'dataset': 'gov_10a_taxag',
     'filtro': {'geo': 'ES', 'unit': 'PC_GDP', 'sector': 'S13_S212', 'na_item': 'D2_D5_D91_D61_M_D995'},
     'series': {'x': {}}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'presionFiscalEurostat.ue27', 'archivo': 'economia/cuestiones.json',
     'ruta': 'presionFiscalEurostat.ue27', 'fuente': 'Eurostat', 'dataset': 'gov_10a_taxag',
     'filtro': {'geo': 'EU27_2020', 'unit': 'PC_GDP', 'sector': 'S13_S212', 'na_item': 'D2_D5_D91_D61_M_D995'},
     'series': {'x': {}}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'gobiernoParlamentosHaciendaExteriores', 'archivo': 'economia/cuestiones.json',
     'ruta': 'gobiernoParlamentosHaciendaExteriores', 'especial': 'cofog_gf0101',
     'fuente': 'Eurostat', 'dataset': 'gov_10a_exp', 'frecuencia': 'anual', 'decimales': 0,
     'nota': 'COFOG GF0101 y TOTAL en millones; se actualiza el año y las dos cifras a la vez'},
    {'nombre': 'ipc diciembre', 'archivo': 'economia/ipc.json', 'ruta': 'diciembre',
     'fuente': 'INE', 'series': {'x': 'IPC290750'}, 'transformacion': 'mes', 'mes': 12,
     'frecuencia': 'mensual', 'decimales': 1, 'nota': 'variación anual del IPC en diciembre'},
    # ----------------------------------------------------------------- global
    {'nombre': 'empleo hombres', 'archivo': 'global/empleo-genero.json', 'ruta': 'h',
     'fuente': 'INE', 'series': {'x': 'EPA441277'}, 'transformacion': 'media_trimestral',
     'frecuencia': 'trimestral', 'decimales': 2},
    {'nombre': 'empleo mujeres', 'archivo': 'global/empleo-genero.json', 'ruta': 'm',
     'fuente': 'INE', 'series': {'x': 'EPA441297'}, 'transformacion': 'media_trimestral',
     'frecuencia': 'trimestral', 'decimales': 2},
    {'nombre': 'gasto medio ambiente', 'archivo': 'global/medioambiente.json', 'ruta': 'gasto',
     'fuente': 'Eurostat', 'dataset': 'gov_10a_exp',
     'filtro': {'geo': 'ES', 'unit': 'MIO_EUR', 'sector': 'S13', 'na_item': 'TE', 'cofog99': 'GF05'},
     'series': {'x': {}}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0},
    {'nombre': 'gasto medio ambiente % PIB', 'archivo': 'global/medioambiente.json', 'ruta': 'gastoPct',
     'fuente': 'Eurostat',
     'series': {'g': {'dataset': 'gov_10a_exp', 'geo': 'ES', 'unit': 'MIO_EUR', 'sector': 'S13',
                      'na_item': 'TE', 'cofog99': 'GF05'},
                'pib': {'dataset': 'nama_10_gdp', 'geo': 'ES', 'unit': 'CP_MEUR', 'na_item': 'B1GQ'}},
     'transformacion': 'anual', 'formula': 'g / pib * 100', 'frecuencia': 'anual', 'decimales': 2,
     'nota': 'GF05 / PIB nominal (nama_10_gdp); el PC_GDP de Eurostat solo trae 1 decimal'},
    {'nombre': 'electricidad renovable', 'archivo': 'global/medioambiente.json', 'ruta': 'renREE',
     'fuente': 'REE', 'series': {'x': 'Renovable'}, 'transformacion': 'anual', 'formula': 'x * 100',
     'frecuencia': 'diaria (año en curso hasta hoy)', 'decimales': 1,
     'nota': 'el año en curso llega hasta ayer: cambia el texto «hasta el …» de Graficos.tsx'},
    {'nombre': 'gases de efecto invernadero', 'archivo': 'global/medioambiente.json', 'ruta': 'gei',
     'fuente': 'Eurostat', 'dataset': 'env_air_gge',
     'filtro': {'geo': 'ES', 'unit': 'MIO_T', 'airpol': 'GHG', 'src_crf': 'TOTX4_MEMO'},
     'series': {'x': {}}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1,
     'nota': 'el último año suele ser el avance del MITECO (Eurostat va un año por detrás)'},
    {'nombre': 'violencia de género (víctimas)', 'archivo': 'global/violencia.json', 'ruta': 'vgMuj',
     'fuente': 'INE', 'series': {'x': 'VGD25'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0},
    {'nombre': 'violencia doméstica (mujeres)', 'archivo': 'global/violencia.json', 'ruta': 'vdMuj',
     'fuente': 'INE', 'series': {'x': 'VGD59'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0},
    {'nombre': 'violencia doméstica (hombres)', 'archivo': 'global/violencia.json', 'ruta': 'vdHom',
     'fuente': 'INE', 'series': {'x': 'VGD60'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0},
    # ----------------------------------------------------------------- vivienda
    {'nombre': 'IPVA variación', 'archivo': 'vivienda/vivienda.json', 'ruta': 'ipvaVar',
     'fuente': 'INE', 'series': {'x': 'IPVA5016'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'IPVA índice', 'archivo': 'vivienda/vivienda.json', 'ruta': 'idxAlq',
     'fuente': 'INE', 'series': {'x': 'IPVA4962'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'IPC alquiler (2015=100)', 'archivo': 'vivienda/vivienda.json', 'ruta': 'idxAlqIpc',
     'fuente': 'INE', 'series': {'x': 'IPC292307'}, 'transformacion': 'media_meses', 'rebase': 2015,
     'frecuencia': 'mensual', 'decimales': 1,
     'nota': 'media anual de la rúbrica «alquiler de vivienda», rebasada a 2015=100; solo años completos'},
    {'nombre': 'precio compra (2015=100)', 'archivo': 'vivienda/vivienda.json', 'ruta': 'idxCompra',
     'fuente': 'BdE', 'fichero': 'si_1_5.csv', 'series': {'x': 'DHIVTNOAPLPMMUVT_RLI.T'},
     'transformacion': 'media_trimestral', 'rebase': 2015, 'frecuencia': 'trimestral', 'decimales': 1,
     'nota': 'mismo dato que series-anuales.precio, rebasado a 2015=100'},
    {'nombre': 'años de sueldo para comprar', 'archivo': 'vivienda/vivienda.json', 'ruta': 'anios',
     'fuente': 'BdE', 'fichero': 'si_1_5.csv', 'series': {'x': 'D_TKB57110_IPV'},
     'transformacion': 'media_trimestral', 'frecuencia': 'trimestral', 'decimales': 2},
    {'nombre': 'esfuerzo de compra', 'archivo': 'vivienda/vivienda.json', 'ruta': 'esfuerzo',
     'fuente': 'BdE', 'fichero': 'si_1_5.csv', 'series': {'x': 'D_TKB57210_IPV'},
     'transformacion': 'media_trimestral', 'frecuencia': 'trimestral', 'decimales': 1},
    {'nombre': 'compraventas', 'archivo': 'vivienda/vivienda.json', 'ruta': 'compra',
     'fuente': 'INE', 'series': {'x': 'ETDP1826'}, 'transformacion': 'suma_meses',
     'frecuencia': 'mensual', 'decimales': 0, 'nota': 'suma de los 12 meses; solo años completos'},
    {'nombre': 'hipotecas', 'archivo': 'vivienda/vivienda.json', 'ruta': 'hipo',
     'fuente': 'INE', 'series': {'x': 'HPT34618'}, 'transformacion': 'suma_meses',
     'frecuencia': 'mensual', 'decimales': 0, 'nota': 'suma de los 12 meses; solo años completos'},
    {'nombre': 'edad de emancipación', 'archivo': 'vivienda/vivienda.json', 'ruta': 'edad',
     'fuente': 'Eurostat', 'dataset': 'yth_demo_030', 'filtro': {'geo': 'ES', 'sex': 'T'},
     'series': {'x': {}}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'viviendas turísticas', 'archivo': 'vivienda/vivienda.json', 'ruta': 'turis',
     'fuente': 'INE', 'series': {'x': 'VTE71'}, 'transformacion': 'mes', 'mes': 5,
     'frecuencia': 'semestral', 'decimales': 0, 'desde': 2025,
     'nota': 'dato de mayo desde 2025 (hasta 2024 era agosto: no se toca)'},
    {'nombre': 'tenencia: propiedad', 'archivo': 'vivienda/tenencia.json', 'ruta': 'propiedad',
     'fuente': 'INE', 'series': {'x': 'ECV2564'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'tenencia: alquiler', 'archivo': 'vivienda/tenencia.json', 'ruta': 'alquiler',
     'fuente': 'INE', 'series': {'a': 'ECV2563', 'b': 'ECV2562'}, 'transformacion': 'anual',
     'formula': 'a + b', 'frecuencia': 'anual', 'decimales': 1, 'nota': 'mercado + inferior al de mercado'},
    {'nombre': 'tenencia: alquiler de mercado', 'archivo': 'vivienda/tenencia.json', 'ruta': 'alquilerMercado',
     'fuente': 'INE', 'series': {'x': 'ECV2563'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'tenencia: alquiler reducido', 'archivo': 'vivienda/tenencia.json', 'ruta': 'alquilerReducido',
     'fuente': 'INE', 'series': {'x': 'ECV2562'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'tenencia: cesión', 'archivo': 'vivienda/tenencia.json', 'ruta': 'cesion',
     'fuente': 'INE', 'series': {'x': 'ECV2561'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'hay casas: hoy', 'archivo': 'vivienda/hay-casas.json', 'ruta': 'hoy', 'especial': 'hay_casas',
     'fuente': 'INE', 'frecuencia': 'trimestral (ECP)', 'decimales': 2,
     'series': {'personas': 'ECP329608', 'hogares': 'ECP355533', 'unipersonales': 'ECP355532',
                # menores: personas en viviendas familiares de 0 a 17 años (tabla 60124)
                'menores': ['ECP329605', 'ECP329602', 'ECP329599', 'ECP329596', 'ECP329593', 'ECP329590',
                            'ECP329587', 'ECP329584', 'ECP329581', 'ECP329578', 'ECP329575', 'ECP329572',
                            'ECP329569', 'ECP329566', 'ECP329563', 'ECP329560', 'ECP329557', 'ECP329554']},
     'nota': 'foto del último trimestre de la ECP'},
    # ----------------------------------------------------------------- inmigracion (ECP, 1 de enero)
    {'nombre': 'nacidos fuera', 'archivo': 'inmigracion/poblacion.json', 'ruta': 'nacidosFueraN',
     'fuente': 'INE', 'series': {'x': 'ECP239561'}, 'transformacion': 'trimestre', 'trimestre': 1,
     'frecuencia': 'trimestral (1 de enero)', 'decimales': 0},
    {'nombre': 'extranjeros', 'archivo': 'inmigracion/poblacion.json', 'ruta': 'extranjerosN',
     'fuente': 'INE', 'series': {'x': 'ECP239404'}, 'transformacion': 'trimestre', 'trimestre': 1,
     'frecuencia': 'trimestral (1 de enero)', 'decimales': 0},
    {'nombre': 'nacidos fuera españoles', 'archivo': 'inmigracion/poblacion.json', 'ruta': 'nacidosFueraEspanolesN',
     'fuente': 'INE', 'series': {'x': 'ECP239548'}, 'transformacion': 'trimestre', 'trimestre': 1,
     'frecuencia': 'trimestral (1 de enero)', 'decimales': 0},
    {'nombre': '% nacidos fuera', 'archivo': 'inmigracion/poblacion.json', 'ruta': 'nacidosFueraPct',
     'fuente': 'INE', 'series': {'nf': 'ECP239561', 'tot': 'ECP239573'}, 'transformacion': 'trimestre',
     'trimestre': 1, 'formula': 'nf / tot * 100', 'frecuencia': 'trimestral (1 de enero)', 'decimales': 2},
    {'nombre': '% extranjeros', 'archivo': 'inmigracion/poblacion.json', 'ruta': 'extranjerosPct',
     'fuente': 'INE', 'series': {'ext': 'ECP239404', 'tot': 'ECP239573'}, 'transformacion': 'trimestre',
     'trimestre': 1, 'formula': 'ext / tot * 100', 'frecuencia': 'trimestral (1 de enero)', 'decimales': 2},
    {'nombre': '% de nacidos fuera que son españoles', 'archivo': 'inmigracion/poblacion.json',
     'ruta': 'pctNacidosFueraEspanoles', 'fuente': 'INE', 'series': {'esp': 'ECP239548', 'nf': 'ECP239561'},
     'transformacion': 'trimestre', 'trimestre': 1, 'formula': 'esp / nf * 100',
     'frecuencia': 'trimestral (1 de enero)', 'decimales': 1},
    {'nombre': 'población: último dato', 'archivo': 'inmigracion/poblacion.json', 'ruta': 'ultimoDato',
     'especial': 'ultimo_dato_poblacion', 'fuente': 'INE', 'frecuencia': 'trimestral (ECP)', 'decimales': 2,
     'series': {'total': 'ECP239573', 'nacidosFuera': 'ECP239561', 'extranjeros': 'ECP239404',
                'nacidosFueraConNacionalidadEspanola': 'ECP239548', 'nacidosFueraExtranjeros': 'ECP239392',
                'nacidosEnEspanaExtranjeros': 'ECP239403'}},
    {'nombre': 'población por país (censo anual)', 'archivo': 'inmigracion/poblacion.json', 'ruta': 'porPais',
     'especial': 'por_pais_censo', 'fuente': 'INE', 'frecuencia': 'anual (1 de enero)', 'decimales': 2,
     # tabla 68525: [total, con nacionalidad española] por país de nacimiento
     'series': {'Total': ['CENSO23059999', 'CENSO23060099'], 'España': ['CENSO23060069', 'CENSO23060169'],
                'Marruecos': ['CENSO23060025', 'CENSO23060125'], 'Colombia': ['CENSO23060040', 'CENSO23060140'],
                'Venezuela': ['CENSO23059973', 'CENSO23060073'], 'Rumanía': ['CENSO23060001', 'CENSO23060101'],
                'Ecuador': ['CENSO23060042', 'CENSO23060142'], 'Argentina': ['CENSO23059994', 'CENSO23060094'],
                'Perú': ['CENSO23060044', 'CENSO23060144'], 'Reino Unido': ['CENSO23059985', 'CENSO23060085'],
                'Cuba': ['CENSO23060032', 'CENSO23060132'], 'Honduras': ['CENSO23060035', 'CENSO23060135'],
                'Francia': ['CENSO23059979', 'CENSO23060079'], 'Ucrania': ['CENSO23060007', 'CENSO23060107'],
                'Suiza': ['CENSO23059991', 'CENSO23060091'], 'Alemania': ['CENSO23059974', 'CENSO23060074'],
                'Uruguay': ['CENSO23060045', 'CENSO23060145'],
                'República Dominicana': ['CENSO23060038', 'CENSO23060138'],
                'Bolivia': ['CENSO23060039', 'CENSO23060139'], 'México': ['CENSO23059971', 'CENSO23060071'],
                'Andorra': ['CENSO90237906', 'CENSO90237905'], 'Bélgica': ['CENSO23059976', 'CENSO23060076'],
                'China': ['CENSO23060047', 'CENSO23060147']}},
    {'nombre': 'dónde nacieron (por país)', 'archivo': 'inmigracion/donde-nacieron.json', 'ruta': '.',
     'especial': 'donde_nacieron', 'fuente': 'INE', 'frecuencia': 'anual (1 de enero)', 'decimales': 0,
     # tabla 56937 «Total Nacional. <País>. Todas las edades. Total.»
     'series': {'Marruecos': 'ECP7241', 'Colombia': 'ECP6221', 'Venezuela': 'ECP5861', 'Rumanía': 'ECP8321',
                'Ecuador': 'ECP6101', 'Argentina': 'ECP6401', 'Perú': 'ECP5981', 'Reino Unido': 'ECP8081',
                'Cuba': 'ECP6701', 'Honduras': 'ECP6641', 'Francia': 'ECP8741', 'China': 'ECP5681',
                'Bolivia': 'ECP6341', 'Alemania': 'ECP8381', 'Portugal': 'ECP8441',
                'nacidosFuera': 'ECP5381', 'totalPoblacion': 'ECP320', 'totalPoblacion2': 'ECP239573'},
     'nota': 'porPais, nacidosFuera, totalPoblacion y anios a la vez; totalPoblacion: ECP320 '
             '(tabla 56934, llega a 2025) y después ECP239573 (79273)'},
    {'nombre': 'tasa de infracciones', 'archivo': 'inmigracion/delincuencia.json', 'ruta': 'tasaInfracciones',
     'fuente': 'INE', 'series': {'x': 'ICV3410'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'infracciones (millones)', 'archivo': 'inmigracion/delincuencia.json', 'ruta': 'infracciones',
     'fuente': 'INE', 'series': {'x': 'ICV3439'}, 'transformacion': 'anual', 'formula': 'x / 1000',
     'frecuencia': 'anual', 'decimales': 3, 'nota': 'la serie viene en miles'},
    {'nombre': 'nacionalizaciones (INE)', 'archivo': 'inmigracion/nacionalizaciones.json', 'ruta': 'ine',
     'fuente': 'INE', 'series': {'x': 'ANES5115'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0},
    {'nombre': 'nacionalizaciones por país', 'archivo': 'inmigracion/nacionalizaciones.json', 'ruta': 'porPais',
     'especial': 'nacionalizaciones', 'fuente': 'INE', 'frecuencia': 'anual', 'decimales': 1,
     # tabla 15071 «Total. Total Nacional. Dato base. <País>.»
     'series': {'Total': 'ANES3445', 'Marruecos': 'ANES3413', 'Colombia': 'ANES3394', 'Venezuela': 'ANES3388',
                'Honduras': 'ANES3402', 'Perú': 'ANES3390', 'Cuba': 'ANES3403', 'Ecuador': 'ANES3392',
                'Argentina': 'ANES3397', 'República Dominicana': 'ANES3400', 'Nicaragua': 'ANES3401',
                'Bolivia': 'ANES3396', 'Rumanía': 'ANES3431', 'Pakistán': 'ANES3381', 'Brasil': 'ANES3395'},
     'nota': 'porPais (último año) y porPaisAcumulado (desde 2013)'},
    {'nombre': 'nacimientos de madre española', 'archivo': 'inmigracion/natalidad.json',
     'ruta': 'nacimientosMadreEspanola', 'fuente': 'INE', 'series': {'x': 'MNP80475152'},
     'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0},
    {'nombre': 'nacimientos de madre extranjera', 'archivo': 'inmigracion/natalidad.json',
     'ruta': 'nacimientosMadreExtranjera', 'fuente': 'INE', 'series': {'x': 'MNP80475151'},
     'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0},
    {'nombre': '% nacimientos de madre extranjera', 'archivo': 'inmigracion/natalidad.json',
     'ruta': 'pctMadreExtranjera', 'fuente': 'INE', 'series': {'ext': 'MNP80475151', 'esp': 'MNP80475152'},
     'transformacion': 'anual', 'formula': 'ext / (esp + ext) * 100', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'fecundidad españolas', 'archivo': 'inmigracion/natalidad.json', 'ruta': 'fecundidadEspanolas',
     'fuente': 'INE', 'series': {'x': 'IDB72161'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 2},
    {'nombre': 'fecundidad extranjeras', 'archivo': 'inmigracion/natalidad.json', 'ruta': 'fecundidadExtranjeras',
     'fuente': 'INE', 'series': {'x': 'IDB72162'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 2},
    {'nombre': 'nacimientos', 'archivo': 'inmigracion/natalidad.json', 'ruta': 'nacimientosTotal',
     'fuente': 'INE', 'series': {'x': 'MNP17544'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0,
     'nota': 'el último año suele ser el provisional del MNP, que esta tabla aún no trae'},
    {'nombre': 'defunciones', 'archivo': 'inmigracion/natalidad.json', 'ruta': 'defuncionesTotal',
     'fuente': 'INE', 'series': {'x': 'MNP17542'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0,
     'nota': 'el último año suele ser el provisional del MNP, que esta tabla aún no trae'},
    {'nombre': 'paro españoles', 'archivo': 'inmigracion/trabajo.json', 'ruta': 'paroEspanoles',
     'fuente': 'INE', 'series': {'x': 'EPA668192'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1,
     'nota': 'medias anuales; el año en curso (último trimestre) se pone a mano'},
    {'nombre': 'paro extranjeros', 'archivo': 'inmigracion/trabajo.json', 'ruta': 'paroExtranjeros',
     'fuente': 'INE', 'series': {'x': 'EPA668193'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1,
     'nota': 'medias anuales; el año en curso (último trimestre) se pone a mano'},
    {'nombre': 'pobreza extranjeros', 'archivo': 'inmigracion/paguitas.json', 'ruta': 'pobrezaExtranjeros',
     'fuente': 'Eurostat', 'dataset': 'ilc_li31',
     'filtro': {'geo': 'ES', 'citizen': 'FOR', 'age': 'Y_GE18', 'sex': 'T', 'unit': 'PC'},
     'series': {'x': {}}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'pobreza españoles', 'archivo': 'inmigracion/paguitas.json', 'ruta': 'pobrezaEspanoles',
     'fuente': 'Eurostat', 'dataset': 'ilc_li31',
     'filtro': {'geo': 'ES', 'citizen': 'NAT', 'age': 'Y_GE18', 'sex': 'T', 'unit': 'PC'},
     'series': {'x': {}}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 1},
    # migraciones: desde 2021 (estadística EMCR; 2008-2020 es otra fuente y no se toca)
    {'nombre': 'inmigraciones españoles', 'archivo': 'inmigracion/migraciones.json', 'ruta': 'inmigracionesEspanoles',
     'fuente': 'INE', 'series': {'x': 'EM1770161'}, 'transformacion': 'anual', 'frecuencia': 'anual',
     'decimales': 0, 'desde': 2021},
    {'nombre': 'emigraciones españoles', 'archivo': 'inmigracion/migraciones.json', 'ruta': 'emigracionesEspanoles',
     'fuente': 'INE', 'series': {'x': 'EM1848362'}, 'transformacion': 'anual', 'frecuencia': 'anual',
     'decimales': 0, 'desde': 2021},
    {'nombre': 'inmigraciones extranjeros', 'archivo': 'inmigracion/migraciones.json',
     'ruta': 'inmigracionesExtranjeros', 'fuente': 'INE', 'series': {'tot': 'EM1770185', 'esp': 'EM1770161'},
     'transformacion': 'anual', 'formula': 'tot - esp', 'frecuencia': 'anual', 'decimales': 0, 'desde': 2021},
    {'nombre': 'emigraciones extranjeros', 'archivo': 'inmigracion/migraciones.json',
     'ruta': 'emigracionesExtranjeros', 'fuente': 'INE', 'series': {'tot': 'EM1848386', 'esp': 'EM1848362'},
     'transformacion': 'anual', 'formula': 'tot - esp', 'frecuencia': 'anual', 'decimales': 0, 'desde': 2021},
    {'nombre': 'saldo migratorio españoles', 'archivo': 'inmigracion/migraciones.json', 'ruta': 'saldoEspanoles',
     'fuente': 'INE', 'series': {'x': 'EM2258869'}, 'transformacion': 'anual', 'frecuencia': 'anual',
     'decimales': 0, 'desde': 2021},
    {'nombre': 'saldo migratorio extranjeros', 'archivo': 'inmigracion/migraciones.json', 'ruta': 'saldoExtranjeros',
     'fuente': 'INE', 'series': {'tot': 'EM2258842', 'esp': 'EM2258869'}, 'transformacion': 'anual',
     'formula': 'tot - esp', 'frecuencia': 'anual', 'decimales': 0, 'desde': 2021},
    {'nombre': 'inmigraciones españoles nacidos en España', 'archivo': 'inmigracion/migraciones.json',
     'ruta': 'inmigracionesEspanolesNacidosEspana', 'fuente': 'INE', 'series': {'x': 'EM1768505'},
     'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0, 'desde': 2021},
    {'nombre': 'españoles en el exterior', 'archivo': 'inmigracion/migraciones.json', 'ruta': 'espanolesExterior',
     'fuente': 'INE', 'series': {'x': 'PERE218171'}, 'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0},
    {'nombre': 'españoles en el exterior nacidos en España', 'archivo': 'inmigracion/migraciones.json',
     'ruta': 'espanolesExteriorNacidosEspana', 'fuente': 'INE', 'series': {'x': 'PERE218170'},
     'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0},
    {'nombre': 'menores condenados extranjeros', 'archivo': 'inmigracion/menores.json',
     'ruta': 'condenadosExtranjeros', 'fuente': 'INE', 'series': {'tot': 'CON21545', 'esp': 'CON38612'},
     'transformacion': 'anual', 'formula': 'tot - esp', 'frecuencia': 'anual', 'decimales': 0},
    {'nombre': '% extranjeros entre menores condenados', 'archivo': 'inmigracion/menores.json',
     'ruta': 'pctExtranjerosCondenados', 'fuente': 'INE', 'series': {'tot': 'CON21545', 'esp': 'CON38612'},
     'transformacion': 'anual', 'formula': '(tot - esp) / tot * 100', 'frecuencia': 'anual', 'decimales': 1},
    {'nombre': 'remesas enviadas', 'archivo': 'inmigracion/remesas.json', 'ruta': 'salidasMEur',
     'fuente': 'BdE', 'fichero': 'be176a.csv', 'series': {'x': 'DEEA.N.ES.W1.S1W.S1.T.D.D752W._Z._Z._Z.EUR._T._X.N.ALL'},
     'transformacion': 'anual', 'frecuencia': 'anual', 'decimales': 0},
    {'nombre': 'remesas 2025 por destino', 'archivo': 'inmigracion/remesas.json',
     'ruta': 'otros.remesasPorDestino2025MEur_BdE', 'especial': 'foto_anio_fijo', 'anio': 2025,
     'fuente': 'BdE', 'fichero': 'be176a.csv', 'frecuencia': 'anual', 'decimales': 0,
     'series': {'America': 'BE_17_6A.8', 'Colombia': 'BE_17_6A.10', 'Africa': 'BE_17_6A.5',
                'Marruecos': 'BE_17_6A.6', 'Asia': 'BE_17_6A.17', 'UE27': 'BE_17_6A.3'},
     'nota': 'la clave lleva el año: si sale un año nuevo, se avisa (renombrar a mano con su componente)'},
]

# Duplicados que tienen que valer lo mismo. Se sincronizan después de actualizar el origen.
ESPEJOS = [
    {'nombre': 'fiscal.json = series-anuales gasto/ingr/impcot', 'tipo': 'filas',
     'destino': ('economia/fiscal.json', '.'),
     'origen': [('comun/series-anuales.json', 'gasto'), ('comun/series-anuales.json', 'ingr'),
                ('comun/series-anuales.json', 'impcot')]},
    {'nombre': 'presion-fiscal.json = series-anuales.pf', 'tipo': 'serie',
     'destino': ('economia/presion-fiscal.json', '.'), 'origen': ('comun/series-anuales.json', 'pf')},
    {'nombre': 'paguitas.poblacionExtranjeraPct = poblacion.extranjerosPct', 'tipo': 'serie',
     'destino': ('inmigracion/paguitas.json', 'poblacionExtranjeraPct'),
     'origen': ('inmigracion/poblacion.json', 'extranjerosPct')},
    {'nombre': 'hay-casas.viviendas = series-sueltas.viv × 1e6', 'tipo': 'viviendas',
     'destino': ('vivienda/hay-casas.json', 'viviendas'), 'origen': ('comun/series-sueltas.json', 'viv')},
    {'nombre': 'donde-nacieron.nacidosFuera = poblacion.porPais.total', 'tipo': 'comprobar_por_pais',
     'destino': ('inmigracion/donde-nacieron.json', 'nacidosFuera'), 'origen': ('inmigracion/poblacion.json', 'porPais')},
    {'nombre': 'fila «hoy» de en-cada-eleccion (+ -correcciones)', 'tipo': 'hoy'},
]

# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------


class ErrorDescarga(Exception):
    pass


def redondear(v, d, modo='python'):
    """modo 'python': round() sobre el valor binario (68,675 -> 68,67; 34,55 -> 34,5), que es como se
    calculó casi todo lo guardado. modo 'decimal': redondeo «comercial» sobre la cifra escrita
    (2335,35 -> 2335,4), que es como se calculó series-anuales.precio."""
    if modo == 'decimal':
        q = Decimal(1).scaleb(-d)
        return float(Decimal(repr(float(v))).quantize(q, rounding=ROUND_HALF_UP))
    return float(round(float(v), d))


def num(v, d=None):
    """Número en formato español: 1.234,5"""
    if v is None:
        return '—'
    if d is None:
        d = 0 if float(v).is_integer() else len(repr(float(v)).split('.')[1])
    s = f'{float(v):,.{d}f}'
    return s.replace(',', '_').replace('.', ',').replace('_', '.')


def iguales(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(float(a) - float(b)) < 1e-9
    return a == b


def es_periodo(k):
    return bool(re.match(r'^\d{4}', str(k)))


def estilo_numeros(serie):
    """'float' si la serie guarda los enteros como 123.0; si no, 'int'."""
    for v in (serie.values() if isinstance(serie, dict) else serie):
        if isinstance(v, float) and v.is_integer():
            return 'float'
    return 'int'


def valor_json(v, d, estilo='int', modo='python'):
    v = redondear(v, d, modo)
    if v.is_integer() and estilo == 'int':
        return int(v)
    return v


TRIM_FECHA = {1: ('1 de enero', '01-01', 'ene'), 2: ('1 de abril', '04-01', 'abr'),
              3: ('1 de julio', '07-01', 'jul'), 4: ('1 de octubre', '10-01', 'oct')}

# ---------------------------------------------------------------------------
# Descargas
# ---------------------------------------------------------------------------


class Descargador:
    def __init__(self, usar_cache):
        self.usar_cache = usar_cache
        self.dir = os.path.join(tempfile.gettempdir(), 'politica-actualizar', HOY.isoformat())
        os.makedirs(self.dir, exist_ok=True)
        self.memoria = {}
        self.peticiones = 0
        self.caidos = set()

    def get(self, url, accept=None, reintentar_400=False):
        clave = hashlib.sha1((url + '|' + (accept or '')).encode()).hexdigest()
        if clave in self.memoria:
            return self.memoria[clave]
        ruta = os.path.join(self.dir, clave)
        if self.usar_cache and os.path.exists(ruta):
            with open(ruta, 'rb') as f:
                datos = f.read()
        else:
            datos = self._bajar(url, accept, reintentar_400)
            with open(ruta, 'wb') as f:
                f.write(datos)
        self.memoria[clave] = datos
        return datos

    def _bajar(self, url, accept, reintentar_400):
        servidor = urllib.parse.urlparse(url).netloc
        if servidor in self.caidos:
            raise ErrorDescarga(f'{servidor} no responde (ya falló antes en esta ejecución)')
        cab = {'User-Agent': 'espana-politica-datos/actualizar.py (python urllib)'}
        if accept:
            cab['Accept'] = accept
        ultimo, de_red = None, False
        for intento in range(4):
            try:
                self.peticiones += 1
                with urllib.request.urlopen(urllib.request.Request(url, headers=cab), timeout=90) as r:
                    return r.read()
            except urllib.error.HTTPError as e:
                ultimo, de_red = f'HTTP {e.code}', False
                if e.code == 404 or (e.code == 400 and not reintentar_400):
                    break
            except Exception as e:  # red, timeout…
                ultimo, de_red = f'{type(e).__name__}: {e}', True
            if intento < 3:
                time.sleep(2 * (intento + 1))
        if de_red:
            self.caidos.add(servidor)
        raise ErrorDescarga(f'{ultimo} en {url}')


D = None  # Descargador global (se crea en main)


def _sub_ine(p):
    if p == 28:
        return None
    if 19 <= p <= 22:
        return f'T{p - 18}'
    if 1 <= p <= 12:
        return f'M{p:02d}'
    return f'P{p}'


def ine(cod, nult):
    """{(año, sub): valor}; sub = None (anual), 'T1'..'T4', 'M01'..'M12'."""
    url = f'{INE}{cod}?nult={nult}'
    try:
        d = json.loads(D.get(url))
    except ValueError:
        raise ErrorDescarga(f'respuesta no JSON del INE para {cod}')
    if not isinstance(d, dict) or 'Data' not in d:
        raise ErrorDescarga(f'el INE no reconoce la serie {cod}')
    out = {}
    for x in d['Data']:
        if x.get('Valor') is None or x.get('Secreto'):
            continue
        out[(int(x['Anyo']), _sub_ine(int(x['FK_Periodo'])))] = float(x['Valor'])
    return out


def eurostat(dataset, filtro, desde):
    pares = [(k, v) for k, vs in filtro.items() for v in (vs if isinstance(vs, list) else [vs])]
    pares.append(('sinceTimePeriod', str(desde)))
    url = f'{EUROSTAT}{dataset}?{urllib.parse.urlencode(pares)}'
    d = json.loads(D.get(url))
    if 'id' not in d:
        raise ErrorDescarga(f'Eurostat sin datos para {dataset} {filtro}')
    ids = d['id']
    cats = []
    for dim in ids:
        idx = d['dimension'][dim]['category']['index']
        cats.append(sorted(idx, key=idx.get) if isinstance(idx, dict) else list(idx))
    vals = d.get('value', {})
    filas = []
    for n, combo in enumerate(itertools.product(*cats)):
        v = vals.get(str(n)) if isinstance(vals, dict) else (vals[n] if n < len(vals) else None)
        if v is not None:
            filas.append((dict(zip(ids, combo)), float(v)))
    return filas


def eurostat_serie(dataset, filtro, desde):
    """{(año, None): valor} de una sola combinación de dimensiones."""
    filas = eurostat(dataset, filtro, desde)
    out = {}
    for dims, v in filas:
        clave = (int(dims['time'][:4]), None)
        if clave in out:
            raise ErrorDescarga(f'el filtro de {dataset} no es único: {filtro}')
        out[clave] = v
    return out


MESES_BDE = {m: i + 1 for i, m in enumerate('ENE FEB MAR ABR MAY JUN JUL AGO SEP OCT NOV DIC'.split())}


def bde(fichero):
    """{código o alias: {(año, sub): valor}} de un CSV del Banco de España."""
    texto = D.get(BDE + fichero).decode('latin-1')
    filas = list(csv.reader(io.StringIO(texto)))
    codigos, alias, frec = filas[0][1:], filas[2][1:], filas[5][1:]
    out = {}
    for c, a in zip(codigos, alias):
        out[c] = out[a] = {}
    for fila in filas[6:]:
        if not fila:
            continue
        m = re.match(r'^(?:([A-Z]{3}) )?(\d{4})$', fila[0].strip())
        if not m:
            continue
        anio, mes = int(m.group(2)), MESES_BDE.get(m.group(1)) if m.group(1) else None
        for c, f, v in zip(codigos, frec, fila[1:]):
            v = v.strip()
            if v in ('', '_'):
                continue
            if mes is None:
                sub = None
            elif f.startswith('TRIM'):
                sub = f'T{(mes - 1) // 3 + 1}'
            else:
                sub = f'M{mes:02d}'
            out[c][(anio, sub)] = float(v)
    return out


def ocde(filtro, desde):
    texto = D.get(f'{OCDE}?startPeriod={desde}', accept='application/vnd.sdmx.data+csv; charset=utf-8')
    out = {}
    for fila in csv.DictReader(io.StringIO(texto.decode('utf-8-sig'))):
        if all(fila.get(k) == v for k, v in filtro.items()) and fila.get('OBS_VALUE'):
            clave = (int(fila['TIME_PERIOD'][:4]), None)
            if clave in out:
                raise ErrorDescarga(f'el filtro de la OCDE no es único: {filtro}')
            out[clave] = float(fila['OBS_VALUE'])
    return out


def ree(tipo, desde):
    # REE devuelve 400 («datos no disponibles») si el rango es largo: se pide en tramos de 3 años
    out = {}
    for ini in range(desde, ANIO + 1, 3):
        fin = min(ini + 2, ANIO)
        url = f'{REE}?start_date={ini}-01-01T00:00&end_date={fin}-12-31T23:59&time_trunc=year'
        d = json.loads(D.get(url, reintentar_400=True))
        tramo = None
        for inc in d.get('included', []):
            if inc.get('type') == tipo or inc.get('attributes', {}).get('title') == tipo:
                tramo = {(int(v['datetime'][:4]), None): float(v['percentage']) for v in inc['attributes']['values']}
        if tramo is None:
            raise ErrorDescarga(f'REE no trae «{tipo}» para {ini}-{fin}')
        out.update(tramo)
    return out


# ---------------------------------------------------------------------------
# Transformaciones
# ---------------------------------------------------------------------------


def nult_para(spec, desde):
    primero = min(desde, spec.get('rebase', desde)) - 1
    anios = ANIO - primero + 1
    t = spec.get('transformacion', 'anual')
    if t in ('media_trimestral', 'trimestre'):
        return anios * 4 + 4
    if t in ('mes', 'suma_meses', 'media_meses'):
        return anios * 12 + 12
    return anios + 2


def obtener_variable(spec, var, ident, desde):
    f = spec['fuente']
    if f == 'INE':
        return ine(ident, nult_para(spec, desde))
    if f == 'Eurostat':
        filtro = dict(spec.get('filtro', {}))
        filtro.update({k: v for k, v in ident.items() if k != 'dataset'})
        ds = ident.get('dataset', spec.get('dataset'))
        return eurostat_serie(ds, filtro, min(desde, spec.get('rebase', desde)) - 1)
    if f == 'BdE':
        tabla = bde(spec['fichero'])
        if ident not in tabla:
            raise ErrorDescarga(f'{spec["fichero"]} ya no trae la serie {ident}')
        return tabla[ident]
    if f == 'OCDE':
        return ocde(ident, desde - 1)
    if f == 'REE':
        return ree(ident, desde)
    raise ValueError(f)


def transformar(spec, obs):
    """obs {(año, sub): v} -> ({año: v}, {año: nota de año incompleto})."""
    t = spec.get('transformacion', 'anual')
    por_anio = {}
    for (a, sub), v in obs.items():
        por_anio.setdefault(a, {})[sub] = v
    out, parcial = {}, {}
    ultimo = max(por_anio) if por_anio else None
    for a in sorted(por_anio):
        p = por_anio[a]
        if t == 'anual':
            if None in p:
                out[a] = p[None]
        elif t == 'trimestre':
            k = f'T{spec["trimestre"]}'
            if k in p:
                out[a] = p[k]
        elif t == 'mes':
            k = f'M{spec["mes"]:02d}'
            if k in p:
                out[a] = p[k]
        elif t == 'media_trimestral':
            q = [p[k] for k in ('T1', 'T2', 'T3', 'T4') if k in p]
            if len(q) == 4 or (q and a == ultimo and all(f'T{i + 1}' in p for i in range(len(q)))):
                out[a] = sum(q) / len(q)
                if len(q) < 4:
                    parcial[a] = f'media de {len(q)} trimestre{"s" if len(q) > 1 else ""}'
        elif t in ('suma_meses', 'media_meses'):
            m = [p[f'M{i:02d}'] for i in range(1, 13) if f'M{i:02d}' in p]
            if len(m) == 12:
                out[a] = sum(m) if t == 'suma_meses' else sum(m) / 12
        else:
            raise ValueError(t)
    return out, parcial


def calcular(spec, desde):
    """Devuelve ({año(str): valor sin redondear}, {año: nota})."""
    variables, notas = {}, {}
    for var, ident in spec['series'].items():
        obs = obtener_variable(spec, var, ident, desde)
        variables[var], p = transformar(spec, obs)
        for a, n in p.items():
            notas[a] = n
    comunes = set.intersection(*(set(v) for v in variables.values()))
    formula = spec.get('formula', 'x' if list(spec['series']) == ['x'] else None)
    out = {}
    for a in sorted(comunes):
        ctx = {k: v[a] for k, v in variables.items()}
        out[a] = eval(formula, {'__builtins__': {}}, ctx) if formula else ctx['x']
    if spec.get('rebase'):
        base = out.get(spec['rebase'])
        if base is None:
            raise ErrorDescarga(f'falta el año base {spec["rebase"]} para rebasar')
        out = {a: v / base * 100 for a, v in out.items()}
    if spec['fuente'] == 'REE':
        notas[ANIO] = f'año en curso, datos hasta el {HOY.strftime("%d-%m-%Y")}'
    return ({str(a): v for a, v in out.items() if a >= desde},
            {str(a): n for a, n in notas.items()})


# ---------------------------------------------------------------------------
# Datos (JSON del repo)
# ---------------------------------------------------------------------------


class Datos:
    def __init__(self, raiz):
        self.raiz = raiz
        self.docs, self.orig, self.formato = {}, {}, {}

    def doc(self, archivo):
        if archivo not in self.docs:
            with open(os.path.join(self.raiz, archivo), encoding='utf-8') as f:
                texto = f.read()
            obj = json.loads(texto)
            self.docs[archivo] = obj
            self.orig[archivo] = copy.deepcopy(obj)
            self.formato[archivo] = None
            for ind in (2, 1, 4, None):
                for asc in (False, True):
                    s = json.dumps(obj, indent=ind, ensure_ascii=asc)
                    for fin in ('\n', ''):
                        if self.formato[archivo] is None and s + fin == texto:
                            self.formato[archivo] = (ind, asc, fin)
        return self.docs[archivo]

    @staticmethod
    def _camino(ruta):
        return [] if ruta in ('.', '') else ruta.split('.')

    def get(self, archivo, ruta, original=False):
        self.doc(archivo)
        o = (self.orig if original else self.docs)[archivo]
        for k in self._camino(ruta):
            o = o[k]
        return o

    def escribible(self, archivo):
        self.doc(archivo)
        return self.formato[archivo] is not None

    def modificados(self):
        return [a for a in self.docs if self.docs[a] != self.orig[a] or
                json.dumps(self.docs[a]) != json.dumps(self.orig[a])]

    def guardar(self):
        escritos = []
        for a in self.modificados():
            ind, asc, fin = self.formato[a]
            tmp = os.path.join(self.raiz, a + '.tmp')
            with open(tmp, 'w', encoding='utf-8') as f:
                f.write(json.dumps(self.docs[a], indent=ind, ensure_ascii=asc) + fin)
            os.replace(tmp, os.path.join(self.raiz, a))
            escritos.append(a)
        return escritos


# ---------------------------------------------------------------------------
# Informe
# ---------------------------------------------------------------------------


class Resultado:
    def __init__(self, spec):
        self.spec = spec
        self.cambios = []  # textos
        self.info = []
        self.avisos = []
        self.error = None
        self.ultimo = None

    @property
    def titulo(self):
        s = self.spec
        return f'{s["nombre"]} ({s["archivo"]}: {s["ruta"]})'


def aplicar_serie(datos, spec, nuevos, notas, res, desde):
    """Compara {año: valor} con la serie guardada y la actualiza en memoria."""
    serie = datos.get(spec['archivo'], spec['ruta'])
    d = spec['decimales']
    estilo = estilo_numeros(serie)
    claves = [k for k in serie if es_periodo(k)]
    ultima = max(claves) if claves else None
    for a, v in sorted(nuevos.items()):
        nv = valor_json(v, d, estilo, spec.get('redondeo', 'python'))
        nota = f' ({notas[a]})' if a in notas else ''
        if a in serie:
            viejo = serie[a]
            if not iguales(viejo, nv):
                prov = ' provisional' if (a == ultima and (a in notas or str(ANIO) == a)) else ''
                res.cambios.append(f'{a}{prov} {num(viejo, d)} → {num(nv, d)}{nota}')
                serie[a] = nv
        elif ultima is None or a > ultima:
            res.cambios.append(f'nuevo {a} = {num(nv, d)}{nota}')
            serie[a] = nv
            ultima = a
        # huecos dentro de la serie: no se rellenan
    faltan = [k for k in claves if k >= str(desde) and k not in nuevos]
    if faltan:
        res.info.append(f'{", ".join(faltan)} no está en la fuente: se deja como está')
    if serie:
        k = max(k for k in serie if es_periodo(k))
        res.ultimo = f'{k} = {num(serie[k], d)}' + (f' ({notas[k]})' if k in notas else '')


def cambiar_campo(obj, campo, nuevo, d, res, etiqueta=None, estilo='int'):
    if isinstance(nuevo, (int, float)) and not isinstance(nuevo, bool):
        nuevo = valor_json(nuevo, d, estilo)
    viejo = obj.get(campo)
    if not iguales(viejo, nuevo):
        fmt = (lambda x: num(x, d)) if isinstance(nuevo, (int, float)) and not isinstance(nuevo, bool) else repr
        if campo in ('anio', 'hasta', 'desde'):
            fmt = str
        res.cambios.append(f'{etiqueta or campo} {fmt(viejo) if viejo is not None else "(nuevo)"} → {fmt(nuevo)}')
        obj[campo] = nuevo


# ---------------------------------------------------------------------------
# Series especiales
# ---------------------------------------------------------------------------


def ultimo_periodo_comun(series_obs):
    comunes = set.intersection(*(set(o) for o in series_obs))
    if not comunes:
        raise ErrorDescarga('las series no tienen ningún periodo común')
    return max(comunes)


def esp_hay_casas(datos, spec, res, desde):
    s = spec['series']
    obs = {'personas': ine(s['personas'], 8), 'hogares': ine(s['hogares'], 8),
           'unipersonales': ine(s['unipersonales'], 8)}
    menores = [ine(c, 8) for c in s['menores']]
    per = ultimo_periodo_comun(list(obs.values()) + menores)
    personas, hogares = obs['personas'][per], obs['hogares'][per]
    nmen = sum(m[per] for m in menores)
    hoy = datos.get(spec['archivo'], spec['ruta'])
    fecha = f'{TRIM_FECHA[int(per[1][1])][0]} de {per[0]}'
    if hoy.get('fecha') != fecha:
        res.avisos.append(f'nuevo periodo {fecha}: revisa «provisional» y el _nota de hay-casas.json, '
                          'y los textos de Casas.tsx / CuestionesVivienda.tsx / indicadores.json')
    cambiar_campo(hoy, 'fecha', fecha, 0, res)
    cambiar_campo(hoy, 'personasEnViviendas', personas, 0, res)
    cambiar_campo(hoy, 'menores', nmen, 0, res)
    cambiar_campo(hoy, 'adultos', personas - nmen, 0, res)
    cambiar_campo(hoy, 'hogares', hogares, 0, res)
    cambiar_campo(hoy, 'hogaresUnipersonales', obs['unipersonales'][per], 0, res)
    cambiar_campo(hoy, 'tamanoMedioHogar', personas / hogares, 2, res)
    res.ultimo = fecha


def esp_ultimo_dato_poblacion(datos, spec, res, desde):
    obs = {k: ine(c, 8) for k, c in spec['series'].items()}
    per = ultimo_periodo_comun(list(obs.values()))
    v = {k: o[per] for k, o in obs.items()}
    u = datos.get(spec['archivo'], spec['ruta'])
    texto, mmdd, mes3 = TRIM_FECHA[int(per[1][1])]
    fecha = f'{per[0]}-{mmdd}'
    if u.get('fecha') != fecha:
        nueva = f'ECP 1 {mes3} {per[0]}, PROVISIONAL'
        res.avisos.append(f'nuevo periodo {fecha}: «fuente» pasa a «{nueva}» (añade la fecha de la nota de prensa); '
                          'revisa Poblacion.tsx («en julio de …», «516.590 extranjeros…») y Bulos.tsx')
        cambiar_campo(u, 'fuente', nueva, 0, res)
    cambiar_campo(u, 'fecha', fecha, 0, res)
    cambiar_campo(u, 'total', v['total'], 0, res)
    cambiar_campo(u, 'nacidosFuera', v['nacidosFuera'], 0, res)
    cambiar_campo(u, 'nacidosFueraPct', v['nacidosFuera'] / v['total'] * 100, 2, res)
    cambiar_campo(u, 'extranjeros', v['extranjeros'], 0, res)
    cambiar_campo(u, 'extranjerosPct', v['extranjeros'] / v['total'] * 100, 2, res)
    for k in ('nacidosFueraConNacionalidadEspanola', 'nacidosFueraExtranjeros', 'nacidosEnEspanaExtranjeros'):
        cambiar_campo(u, k, v[k], 0, res)
    res.ultimo = fecha


def _pais(fila, n, esp, res, et):
    cambiar_campo(fila, 'n', n, 0, res, f'{et}.n')
    if esp is not None:
        cambiar_campo(fila, 'espanoles', esp, 0, res, f'{et}.espanoles')
        cambiar_campo(fila, 'extranjeros', n - esp, 0, res, f'{et}.extranjeros')
        cambiar_campo(fila, 'pctEspanoles', esp / n * 100, 2, res, f'{et}.pctEspanoles')


def esp_por_pais_censo(datos, spec, res, desde):
    obs = {p: (ine(t, 6), ine(e, 6)) for p, (t, e) in spec['series'].items()}
    anios = set.intersection(*(set(a for (a, s) in o) for par in obs.values() for o in par))
    ultimo = max(anios)
    pp = datos.get(spec['archivo'], spec['ruta'])
    anio_guardado = int(pp['fecha'][:4])
    if ultimo < anio_guardado:
        raise ErrorDescarga(f'la tabla 68525 llega a {ultimo} y el JSON tiene {anio_guardado}')
    v = {p: (o[0][(ultimo, None)], o[1][(ultimo, None)]) for p, o in obs.items()}
    if ultimo > anio_guardado:
        res.avisos.append(f'desglose por país de 1-1-{ultimo} publicado: se actualiza; reescribe a mano '
                          f'porPais.aviso y los «(2025)» de Poblacion.tsx; revisa si cambia el orden de países')
        cambiar_campo(pp, 'fecha', f'{ultimo}-01-01', 0, res)
    tot = v['Total'][0] - v['España'][0]
    esp = v['Total'][1] - v['España'][1]
    cambiar_campo(pp, 'total', tot, 0, res)
    cambiar_campo(pp, 'espanoles', esp, 0, res)
    cambiar_campo(pp, 'extranjeros', tot - esp, 0, res)
    cambiar_campo(pp, 'pctEspanoles', esp / tot * 100, 2, res)
    suma_n = suma_e = 0
    for fila in pp['paises']:
        if fila['pais'] == 'Resto':
            continue
        n, e = v[fila['pais']]
        suma_n += n
        suma_e += e
        _pais(fila, n, e, res, fila['pais'])
    for fila in pp['paises']:
        if fila['pais'] == 'Resto':
            _pais(fila, tot - suma_n, esp - suma_e, res, 'Resto')
    for fila in pp['destacados']:
        n, e = v[fila['pais']]
        _pais(fila, n, e, res, f'destacados.{fila["pais"]}')
    orden = [f['n'] for f in pp['paises'] if f['pais'] != 'Resto']
    if orden != sorted(orden, reverse=True):
        res.avisos.append('el orden de porPais.paises ya no va de mayor a menor')
    res.ultimo = pp['fecha']


def esp_donde_nacieron(datos, spec, res, desde):
    d = datos.get(spec['archivo'], '.')
    s = spec['series']
    obs = {k: transformar({'transformacion': 'trimestre', 'trimestre': 1}, ine(c, (ANIO - desde + 2) * 4))[0]
           for k, c in s.items()}
    # totalPoblacion: ECP320 mientras exista; después ECP239573, si coinciden en los años comunes
    tp, tp2 = obs.pop('totalPoblacion'), obs.pop('totalPoblacion2')
    solape = [a for a in tp if a in tp2]
    if any(abs(tp[a] - tp2[a]) > 0.5 for a in solape):
        res.avisos.append('ECP320 y ECP239573 no coinciden en los años comunes: totalPoblacion solo con ECP320')
        total = tp
    else:
        total = dict(tp2)
        total.update(tp)
    paises = [p for p in d['paises']]
    anios_ok = set(obs['nacidosFuera']) & set(total)
    for p in paises:
        anios_ok &= set(obs[p])
    ultima = max(d['anios'])
    for a in sorted(x for x in anios_ok if x >= desde):
        clave = str(a)
        r = res
        if a > ultima:
            res.cambios.append(f'nuevo {a} = {num(obs["nacidosFuera"][a])} nacidos fuera de {num(total[a])} '
                               f'(y los {len(paises)} países)')
            d['anios'].append(a)
            ultima = a
            r = Resultado({'nombre': '', 'archivo': '', 'ruta': ''})  # no repetir campo a campo
        elif clave not in d['totalPoblacion']:
            continue
        for p in paises:
            et = f'porPais.{p}[{a}]'
            cambiar_campo(d['porPais'][p], clave, obs[p][a], 0, r, et, estilo_numeros(d['porPais'][p]))
        cambiar_campo(d['nacidosFuera'], clave, obs['nacidosFuera'][a], 0, r, f'nacidosFuera[{a}]',
                      estilo_numeros(d['nacidosFuera']))
        cambiar_campo(d['totalPoblacion'], clave, total[a], 0, r, f'totalPoblacion[{a}]',
                      estilo_numeros(d['totalPoblacion']))
    if max(obs['nacidosFuera']) < ANIO and ultima < ANIO:
        res.info.append(f'la tabla 56937 llega a 1-1-{max(obs["nacidosFuera"])}')
    res.ultimo = str(max(d['anios']))


def esp_nacionalizaciones(datos, spec, res, desde):
    obs = {p: transformar({'transformacion': 'anual'}, ine(c, ANIO - 2013 + 3))[0]
           for p, c in spec['series'].items()}
    anios = set.intersection(*(set(o) for o in obs.values()))
    ultimo = max(anios)
    doc = datos.get(spec['archivo'], '.')
    pp, ac = doc['porPais'], doc['porPaisAcumulado']
    if ultimo < pp['anio']:
        raise ErrorDescarga(f'la tabla 15071 llega a {ultimo} y el JSON tiene {pp["anio"]}')
    if ultimo > pp['anio']:
        res.avisos.append(f'año nuevo {ultimo}: revisa los porcentajes escritos a mano en Nacionalizaciones.tsx '
                          '(líneas 70-77) y PestanaInmigracion.tsx 33-34; la lista de países no se reordena sola')
    cambiar_campo(pp, 'anio', ultimo, 0, res, 'porPais.anio')
    tot = obs['Total'][ultimo]
    cambiar_campo(pp, 'total', tot, 0, res, 'porPais.total')
    suma = 0
    for f in pp['paises']:
        if f['pais'] == 'Resto':
            continue
        n = obs[f['pais']][ultimo]
        suma += n
        cambiar_campo(f, 'n', n, 0, res, f'porPais.{f["pais"]}.n')
        cambiar_campo(f, 'pct', n / tot * 100, 1, res, f'porPais.{f["pais"]}.pct', estilo_numeros([f['pct']]))
    for f in pp['paises']:
        if f['pais'] == 'Resto':
            cambiar_campo(f, 'n', tot - suma, 0, res, 'porPais.Resto.n')
            cambiar_campo(f, 'pct', (tot - suma) / tot * 100, 1, res, 'porPais.Resto.pct', estilo_numeros([f['pct']]))
    # acumulado
    rango = [a for a in range(ac['desde'], ultimo + 1)]
    if any(a not in obs['Total'] for a in rango):
        res.avisos.append('faltan años en la tabla 15071 para el acumulado: no se toca porPaisAcumulado')
    else:
        if ultimo != ac['hasta']:
            cambiar_campo(ac, 'hasta', ultimo, 0, res, 'porPaisAcumulado.hasta')
            cambiar_campo(ac, 'fuente', re.sub(r'\d{4}-\d{4}', f'{ac["desde"]}-{ultimo}', ac['fuente']), 0, res,
                          'porPaisAcumulado.fuente')
        # 2013-2016 vienen con decimales (datos elevados): se redondea cada año y luego se suma
        tot = sum(round(obs['Total'][a]) for a in rango)
        cambiar_campo(ac, 'total', tot, 0, res, 'porPaisAcumulado.total')
        suma = 0
        for f in ac['paises']:
            if f['pais'] == 'Resto':
                continue
            n = sum(round(obs[f['pais']][a]) for a in rango)
            suma += n
            cambiar_campo(f, 'n', n, 0, res, f'porPaisAcumulado.{f["pais"]}.n')
            cambiar_campo(f, 'pct', n / tot * 100, 1, res, f'porPaisAcumulado.{f["pais"]}.pct', estilo_numeros([f['pct']]))
        for f in ac['paises']:
            if f['pais'] == 'Resto':
                cambiar_campo(f, 'n', tot - suma, 0, res, 'porPaisAcumulado.Resto.n')
                cambiar_campo(f, 'pct', (tot - suma) / tot * 100, 1, res, 'porPaisAcumulado.Resto.pct',
                              estilo_numeros([f['pct']]))
    res.ultimo = str(pp['anio'])


COFOG_CATS = {
    'total': ('TOTAL',), 'pens': ('GF1002',), 'prot': ('GF10', '-GF1002'), 'san': ('GF07',), 'edu': ('GF09',),
    'int': ('GF0107',), 'gen': ('GF01', '-GF0107'), 'eco': ('GF04',), 'seg': ('GF02', 'GF03'),
    'otr': ('GF05', 'GF06', 'GF08'),
}


def esp_cofog(datos, spec, res, desde):
    codigos = sorted({c.lstrip('-') for cs in COFOG_CATS.values() for c in cs})
    filas = eurostat(spec['dataset'], {'geo': 'ES', 'unit': ['MIO_EUR', 'PC_GDP'], 'sector': 'S13',
                                       'na_item': 'TE', 'cofog99': codigos}, desde)
    val = {(f['unit'], f['cofog99'], int(f['time'][:4])): v for f, v in filas}
    doc = datos.get(spec['archivo'], '.')
    anios_fuente = sorted({a for (_, c, a) in val if c == 'TOTAL'})
    for clave in [k for k in doc if es_periodo(k) and int(k) >= desde]:
        a = int(clave)
        if ('MIO_EUR', 'TOTAL', a) not in val:
            res.info.append(f'{a} no está en la fuente: se deja como está')
            continue
        for cat, cs in COFOG_CATS.items():
            # cada función se pasa a miles de M€ con 1 decimal y luego se suma/resta (así está guardado)
            mio = sum((-1 if c[0] == '-' else 1) * round(val[('MIO_EUR', c.lstrip('-'), a)] / 1000, 1) for c in cs)
            pct = sum((-1 if c[0] == '-' else 1) * val[('PC_GDP', c.lstrip('-'), a)] for c in cs)
            par = doc[clave][cat]
            nuevo = [valor_json(mio, 1), valor_json(pct, 1)]
            if not (iguales(par[0], nuevo[0]) and iguales(par[1], nuevo[1])):
                res.cambios.append(f'{a} {cat} [{num(par[0], 1)}, {num(par[1], 1)}] → [{num(nuevo[0], 1)}, {num(nuevo[1], 1)}]')
                par[0], par[1] = nuevo
    ultimo_json = max(int(k) for k in doc if es_periodo(k))
    nuevos = [a for a in anios_fuente if a > ultimo_json]
    if nuevos:
        res.avisos.append(f'Eurostat ya tiene COFOG {", ".join(map(str, nuevos))}: añádelo a mano (el fichero solo guarda '
                          f'años de elección + el último; Cofog.tsx marca «{ultimo_json}» como provisional)')
    res.ultimo = str(ultimo_json)


def esp_cofog_gf0101(datos, spec, res, desde):
    filas = eurostat(spec['dataset'], {'geo': 'ES', 'unit': 'MIO_EUR', 'sector': 'S13', 'na_item': 'TE',
                                       'cofog99': ['GF0101', 'TOTAL']}, desde)
    val = {(f['cofog99'], int(f['time'][:4])): v for f, v in filas}
    anios = [a for (c, a) in val if c == 'GF0101' and ('TOTAL', a) in val]
    ultimo = max(anios)
    o = datos.get(spec['archivo'], spec['ruta'])
    if ultimo < int(o['anio']):
        raise ErrorDescarga(f'Eurostat llega a {ultimo} y el JSON tiene {o["anio"]}')
    if ultimo > int(o['anio']):
        res.avisos.append(f'año nuevo {ultimo}: revisa el _nota de cuestiones.json («2024 provisional, actualizado…»)')
    cambiar_campo(o, 'anio', str(ultimo), 0, res)
    cambiar_campo(o, 'millones', val[('GF0101', ultimo)], 0, res)
    cambiar_campo(o, 'gastoTotalMillones', val[('TOTAL', ultimo)], 0, res)
    res.ultimo = o['anio']


def esp_foto_anio_fijo(datos, spec, res, desde):
    tabla = bde(spec['fichero'])
    o = datos.get(spec['archivo'], spec['ruta'])
    a = spec['anio']
    for k, alias in spec['series'].items():
        if alias not in tabla:
            raise ErrorDescarga(f'{spec["fichero"]} ya no trae {alias}')
        if (a, None) in tabla[alias]:
            cambiar_campo(o, k, tabla[alias][(a, None)], 0, res)
    ultimo = max(x for (x, s) in tabla[spec['series']['America']] if s is None)
    if ultimo > a:
        res.avisos.append(f'el BdE ya tiene {ultimo}: la clave lleva «{a}» en el nombre; '
                          'crea la nueva a mano junto con Bulos.tsx (línea ~658)')
    res.ultimo = str(a)


ESPECIALES = {
    'hay_casas': esp_hay_casas, 'ultimo_dato_poblacion': esp_ultimo_dato_poblacion,
    'por_pais_censo': esp_por_pais_censo, 'donde_nacieron': esp_donde_nacieron,
    'nacionalizaciones': esp_nacionalizaciones, 'cofog': esp_cofog, 'cofog_gf0101': esp_cofog_gf0101,
    'foto_anio_fijo': esp_foto_anio_fijo,
}

# ---------------------------------------------------------------------------
# Duplicados
# ---------------------------------------------------------------------------


def espejo_serie(datos, e, res):
    (fd, rd), (fo, ro) = e['destino'], e['origen']
    dest, dest0 = datos.get(fd, rd), datos.get(fd, rd, original=True)
    ori, ori0 = datos.get(fo, ro), datos.get(fo, ro, original=True)
    distintos = [k for k in dest0 if k in ori0 and not iguales(dest0[k], ori0[k])]
    if distintos:
        res.avisos.append(f'ya no coincidían antes de actualizar ({", ".join(distintos[:6])}): no se toca {fd}')
        return
    estilo = estilo_numeros(dest)
    ultima = max(dest)
    for k, v in ori.items():
        if k in dest:
            if not iguales(dest[k], v):
                res.cambios.append(f'{fd}: {k} {num(dest[k])} → {num(v)}')
                dest[k] = float(v) if estilo == 'float' else v
        elif k > ultima:
            res.cambios.append(f'{fd}: nuevo {k} = {num(v)}')
            dest[k] = float(v) if estilo == 'float' else v
            ultima = k


def espejo_filas(datos, e, res):
    fd, rd = e['destino']
    dest, dest0 = datos.get(fd, rd), datos.get(fd, rd, original=True)
    oris = [datos.get(f, r) for f, r in e['origen']]
    oris0 = [datos.get(f, r, original=True) for f, r in e['origen']]
    distintos = [k for k in dest0 if all(k in o for o in oris0) and
                 not all(iguales(x, o[k]) for x, o in zip(dest0[k], oris0))]
    if distintos:
        res.avisos.append(f'ya no coincidían antes de actualizar ({", ".join(distintos[:6])}): no se toca {fd}')
        return
    ultima = max(dest)
    for k in sorted(set.intersection(*(set(o) for o in oris))):
        fila = [o[k] for o in oris]
        if k in dest:
            if not all(iguales(x, y) for x, y in zip(dest[k], fila)):
                res.cambios.append(f'{fd}: {k} {dest[k]} → {fila}')
                dest[k] = fila
        elif k > ultima:
            res.cambios.append(f'{fd}: nuevo {k} = {fila}')
            dest[k] = fila
            ultima = k


def espejo_viviendas(datos, e, res):
    (fd, rd), (fo, ro) = e['destino'], e['origen']
    dest, viv0, viv = datos.get(fd, rd), datos.get(fo, ro, original=True), datos.get(fo, ro)
    if str(dest['anio']) not in viv0 or round(viv0[str(dest['anio'])] * 1e6) != dest['total']:
        res.avisos.append('hay-casas.viviendas no coincidía con series-sueltas.viv: no se toca')
        return
    ult = max(viv)
    cambiar_campo(dest, 'anio', int(ult), 0, res, f'{fd} viviendas.anio')
    cambiar_campo(dest, 'total', round(viv[ult] * 1e6), 0, res, f'{fd} viviendas.total')
    if res.cambios:
        res.avisos.append('cambia el parque de viviendas: revisa el _nota de hay-casas.json y la nota de «pop» '
                          'en indicadores.json')


def espejo_comprobar_por_pais(datos, e, res):
    (fd, rd), (fo, ro) = e['destino'], e['origen']
    nf, pp = datos.get(fd, rd), datos.get(fo, ro)
    a = pp['fecha'][:4]
    if a in nf and not iguales(nf[a], pp['total']):
        res.avisos.append(f'donde-nacieron.nacidosFuera[{a}] = {num(nf[a])} y poblacion.porPais.total = '
                          f'{num(pp["total"])}: no coinciden (revisar a mano)')


def espejo_hoy(datos, e, res, fuentes_hoy):
    """Fila «hoy» de en-cada-eleccion.json y en-cada-eleccion-correcciones.json."""
    f1, f2 = 'comun/en-cada-eleccion.json', 'comun/en-cada-eleccion-correcciones.json'
    hoy, hoy0 = datos.get(f1, 'hoy'), datos.get(f1, 'hoy', original=True)
    cor, cor0 = datos.get(f2, 'hoy'), datos.get(f2, 'hoy', original=True)
    sa = lambda r: datos.get('comun/series-anuales.json', r)
    ult = lambda s: s[max(k for k in s if es_periodo(k))]
    nuevos = {}
    for k in ('deuda', 'gasto', 'ingr', 'impcot', 'pf', 'smi'):
        nuevos[k] = ult(sa(k))
    nuevos['viv'] = ult(datos.get('comun/series-sueltas.json', 'viv'))
    esc = datos.get('comun/series-escalonadas.json', '.')
    nuevos['iva'] = esc['iva'][-1][1]
    nuevos['irpf'] = esc['irpf'][-1][1]
    # Tabla «De un vistazo»: edad de emancipación = último año de vivienda.json (edad, Eurostat)
    nuevos['edad'] = ult(datos.get('vivienda/vivienda.json', 'edad'))
    nuevos.update(fuentes_hoy)
    sin_dato = [k for k in ('paro', 'pop', 'esp', 'precio', 'ipc', 'anios') if k not in fuentes_hoy]
    if sin_dato:
        res.avisos.append(f'sin dato nuevo para hoy.{", hoy.".join(sin_dato)} (falló la descarga o se filtró con --solo)')
    comunes = [k for k in cor0 if k in hoy0]
    cor_ok = all(iguales(cor0[k], hoy0[k]) for k in comunes)
    if not cor_ok:
        res.avisos.append(f'{f2} (hoy) ya no coincidía con {f1}: no se toca')
    for k, v in nuevos.items():
        if k not in hoy:
            continue
        d = {'pop': 2, 'anios': 2, 'ipc': 3}.get(k, 1)
        cambiar_campo(hoy, k, v, d, res, f'hoy.{k}')
        if cor_ok and k in cor:
            cambiar_campo(cor, k, hoy[k], d, res, f'-correcciones hoy.{k}')
    m = re.search(r'\((\d{4})\)', hoy.get('lab', ''))
    if m and int(m.group(1)) != ANIO:
        res.avisos.append(f'hoy.lab dice «{hoy["lab"]}»: cámbialo a mano, y también en-cada-eleccion-fecha.json '
                          'y en-cada-eleccion-anio.json (hoy)')


def datos_para_hoy(desde):
    """paro (último trimestre), precio (último trimestre), pop y esp (1 de enero del último año),
    ipc (índice general del último mes, base 2025) y anios (años de renta para comprar, último trimestre)."""
    out = {}
    paro = ine('EPA452434', 12)
    out['paro'] = paro[max(k for k in paro if k[1])]
    precio = bde('si_1_5.csv')['DHIVTNOAPLPMMUVT_RLI.T']
    out['precio'] = precio[max(k for k in precio if k[1])]
    ipc = ine('IPC290751', 12)
    out['ipc'] = ipc[max(k for k in ipc if k[1])]
    anios = bde('si_1_5.csv')['D_TKB57110_IPV']
    out['anios'] = anios[max(k for k in anios if k[1])]
    tot, ext = ine('ECP239573', 12), ine('ECP239404', 12)
    a = max(x for (x, s) in tot if s == 'T1' and (x, 'T1') in ext)
    out['pop'] = tot[(a, 'T1')] / 1e6
    out['esp'] = (tot[(a, 'T1')] - ext[(a, 'T1')]) / tot[(a, 'T1')] * 100
    return out


# ---------------------------------------------------------------------------
# REVISAR.md
# ---------------------------------------------------------------------------

# Series semi (fichero que cambia en cada publicación) y manuales vivas.
# (archivo, ruta, tipo, qué es, fuente, url, qué mirar)
PENDIENTES = [
    # --- economía
    ('comun/series-anuales.json', 'smi', 'manual', 'Salario mínimo vigente el 1 de enero (€/mes, 14 pagas)',
     'BOE, real decreto anual del SMI', 'https://www.boe.es/buscar/',
     'El RD del SMI suele salir entre enero y marzo (a veces con efecto retroactivo). CuestionesEconomia.tsx lee smi["2026"].'),
    ('comun/series-anuales.json', 'rec', 'semi', 'Recaudación tributaria total (AEAT)',
     'Agencia Tributaria, Informe anual de recaudación (Cuadro 0)',
     'https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/irecaudacion/home.html',
     'El informe anual sale en marzo-abril; la URL lleva el ejercicio (Ejercicio_AAAA). Ningún componente la usa.'),
    ('comun/series-escalonadas.json', 'iva', 'manual', 'Tipo general del IVA (escalones con fecha)',
     'BOE', 'https://www.boe.es/buscar/',
     'Solo cambia por ley (Presupuestos o decreto ley). Si cambia, añade el escalón y revisa impuestos-en-cada-eleccion.json (hoy).'),
    ('comun/series-escalonadas.json', 'irpf', 'manual', 'Tipo marginal máximo del IRPF',
     'BOE', 'https://www.boe.es/buscar/', 'Igual que el IVA: cambia por ley; mira los Presupuestos de cada año.'),
    ('comun/series-sueltas.json', 'viv', 'semi', 'Parque de viviendas a 31 de diciembre (millones)',
     'MIVAU, estimación del parque de viviendas', 'https://apps.fomento.gob.es/BoletinOnline2/sedal/33100500.XLS',
     'El XLS se actualiza hacia mayo-junio con el año anterior. Al cambiarlo, el script sincroniza hay-casas.viviendas y hoy.viv; revisa la nota de «pop» en indicadores.json.'),
    ('economia/ipc.json', 'estimado2026', 'manual', 'IPC estimado del año en curso (calculadora de pensiones)',
     'editorial', '',
     'Cuando el INE publique el IPC de diciembre (mediados de enero) el script añade diciembre[año]; entonces crea el estimado del año siguiente (y cambia el nombre en index.ts/IPC2026).'),
    ('economia/pensiones-revalorizacion.json', '.', 'manual', 'Subida efectiva de las pensiones cada año',
     'BOE, decretos de revalorización', 'https://www.boe.es/buscar/',
     'El real decreto de revalorización sale a finales de diciembre o en enero.'),
    ('economia/pensiones.json', 'media', 'semi', 'Pensión media de jubilación',
     'Seguridad Social (eSTADISS)', 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST23',
     'Dato de diciembre: sale a finales de enero. Hay huecos en 2022 y 2023.'),
    ('economia/pensiones.json', 'minima', 'manual', 'Pensión mínima de jubilación con cónyuge a cargo',
     'BOE, RD de revalorización', 'https://www.boe.es/buscar/', 'Con el decreto de revalorización (diciembre-enero).'),
    ('economia/pensiones.json', 'pnc', 'manual', 'Pensión no contributiva',
     'BOE, RD de revalorización', 'https://www.boe.es/buscar/', 'Con el decreto de revalorización (diciembre-enero).'),
    ('economia/pensiones.json', 'gastoPct', 'manual', 'Gasto en pensiones contributivas (% PIB)',
     'Seguridad Social y PIB del INE', 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas',
     'Cuando haya nómina de diciembre y PIB anual (marzo). Pensiones.tsx 63 y CuestionesEconomia.tsx 188 citan «182.683 millones» y «10,4 millones» a mano (cifrasAMano.ts).'),
    ('economia/autonomos.json', 'bajo', 'manual', 'Cuota de autónomos del tramo más bajo',
     'BOE (RDL 13/2022 y órdenes de cotización)', 'https://www.boe.es/eli/es/rdl/2022/07/26/13',
     'La orden de cotización sale a principios de año. Revisa TRAMOS_RETA en cifrasAMano.ts.'),
    ('economia/autonomos.json', 'alto', 'manual', 'Cuota de autónomos del tramo más alto',
     'BOE (RDL 13/2022 y órdenes de cotización)', 'https://www.boe.es/eli/es/rdl/2022/07/26/13', 'Igual que el tramo bajo.'),
    ('economia/autonomos.json', 'afil', 'semi', 'Afiliados medios al RETA',
     'Seguridad Social, afiliados medios (PX-Web)',
     'https://w6.seg-social.es/PXWeb/pxweb/es/Afiliados%20en%20alta%20laboral/Afiliados%20en%20alta%20laboral__Afiliados%20Medios/',
     'La media anual está en enero. Autonomos.tsx 41 cita «1,98 / 2,57 / 3,41 millones en 2025» a mano.'),
    ('economia/clases-renta.json', 'medianaEurosAnio', 'manual', 'Renta mediana y clases (baja, media, alta, pobreza, pobreza severa)',
     'INE, microdatos de la Encuesta de Condiciones de Vida (cálculo propio)',
     'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176807&menu=resultados&idp=1254735976608',
     'La ECV sale en abril-junio (microdatos poco después). Hay que repetir el cálculo; RentaYPobreza.tsx tiene const ultimo = "2025".'),
    ('economia/sin-hogar.json', 'personas', 'manual', 'Personas sin hogar atendidas (EPSH)',
     'INE, Encuesta a las personas sin hogar', 'https://www.ine.es/prensa/epsh_2022.pdf',
     'Encuesta irregular (2005, 2012, 2022). No hay que mirar hasta que el INE anuncie otra.'),
    ('economia/sin-hogar.json', 'alojadosMediaDiaria', 'semi', 'Plazas de alojamiento ocupadas, media diaria',
     'INE, Encuesta de centros y servicios para personas sin hogar',
     'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176925&menu=resultados&idp=1254735976608',
     'Bienal; la edición de 2026 saldrá hacia 2027 con otra tabla (el id cambia en cada edición).'),
    # --- global
    ('global/accidentes.json', 'total', 'semi', 'Accidentes de trabajo con baja (total, mortales e índice de incidencia)',
     'Ministerio de Trabajo, Estadística de Accidentes de Trabajo', 'https://www.mites.gob.es/es/estadisticas/condiciones_trabajo_relac_laborales/eat/welcome.htm',
     'El avance anual sale en primavera y el definitivo en verano. Graficos.tsx 108 y 119 citan cifras a mano.'),
    ('global/medioambiente.json', 'fv', 'semi', 'Potencia instalada fotovoltaica y eólica a 31 de diciembre (fv, eol)',
     'Red Eléctrica, Informe del Sistema Eléctrico', 'https://www.sistemaelectrico-ree.es/es/informe-del-sistema-electrico/potencia-instalada',
     'El avance del informe sale en enero-marzo. El endpoint de la API de REE para potencia daba error 500.'),
    ('global/medioambiente.json', 'gei', 'semi', 'Avance de emisiones del último año (gei, último año)',
     'MITECO, avance del Inventario de GEI', 'https://www.miteco.gob.es/es/calidad-y-evaluacion-ambiental/temas/sistema-espanol-de-inventario-sei-.html',
     'El MITECO publica el avance en primavera; Eurostat (automático) va un año por detrás y sustituye al avance cuando sale. Graficos.tsx 194 cita porcentajes a mano.'),
    ('global/violencia.json', 'mujMuertas', 'semi', 'Mujeres asesinadas por pareja o expareja',
     'Ministerio de Igualdad (DGVG)', 'https://violenciagenero.igualdad.gob.es/violenciaencifras/victimasmortales/fichamujeres/',
     'Cierre del año en enero. Pasa mujMuertas2026 a mujMuertas["2026"] y crea el provisional del año nuevo (Graficos.tsx 60 y 66).'),
    ('global/violencia.json', 'mujMuertas2026', 'semi', 'Mujeres asesinadas en el año en curso (provisional)',
     'Ministerio de Igualdad', 'https://violenciagenero.igualdad.gob.es/violenciaencifras/victimasmortales/fichamujeres/',
     'Se actualiza cada pocos días; la clave lleva el año en el nombre.'),
    ('global/violencia.json', 'otrasMuertes', 'manual', 'Resto de muertes en la pareja',
     'CGPJ, informe anual de muertes violentas', 'https://www.poderjudicial.es/cgpj/es/Temas/Violencia-domestica-y-de-genero/',
     'Informe anual (PDF) hacia final de año.'),
    # --- vivienda
    ('vivienda/vivienda.json', 'serpavi', 'semi', 'Alquiler medio SERPAVI', 'MIVAU, SERPAVI',
     'https://www.mivau.gob.es/vivienda/alquila-bien-es-tu-derecho/serpavi',
     'Edición anual (otoño) con dos años de retraso. Al salir 2024, quita serpaviEstimado y revisa SERPAVI_PISO en cuentas.ts.'),
    ('vivienda/vivienda.json', 'serpaviEstimado', 'manual', 'Alquiler estimado (SERPAVI × IPVA)', 'cálculo propio', '',
     'Recalcular o quitar cuando salga el SERPAVI siguiente.'),
    ('vivienda/vivienda.json', 'okupa', 'semi', 'Usurpación y allanamiento (hechos conocidos)',
     'Ministerio del Interior, Balance de Criminalidad / portal estadístico',
     'https://estadisticasdecriminalidad.ses.mir.es/', 'El balance del 4.º trimestre sale en marzo. GraficasVivienda.tsx 110 cita una cifra a mano.'),
    ('vivienda/vivienda.json', 'okupa10k', 'manual', 'Okupación por 10.000 viviendas', 'cálculo propio (okupa / viv)', '',
     'Recalcular cuando cambien okupa o viv.'),
    ('vivienda/vivienda.json', 'desTot', 'semi', 'Lanzamientos (total, hipotecarios y por alquiler: desTot, desHip, desAlq)',
     'CGPJ, Efecto de la crisis en los órganos judiciales',
     'https://www.poderjudicial.es/cgpj/es/Temas/Estadistica-Judicial/Estudios-e-Informes/Efecto-de-la-Crisis-en-los-organos-judiciales/',
     'Informe trimestral; el anual completo sale en marzo. DESAHUCIOS_AVANCE en cuentas.ts y CuestionesVivienda.tsx 234-245.'),
    ('vivienda/vivienda.json', 'vpo', 'semi', 'Viviendas protegidas terminadas', 'MIVAU (31306000.XLS)',
     'https://apps.fomento.gob.es/BoletinOnline2/sedal/31306000.XLS', 'Se actualiza hacia marzo-abril.'),
    ('vivienda/vivienda.json', 'emanc', 'semi', 'Jóvenes de 16-29 emancipados',
     'Consejo de la Juventud, Observatorio de Emancipación', 'https://www.cje.org/observatorio-de-emancipacion/',
     'Balance anual (PDF) hacia mayo-junio; la URL cambia en cada edición.'),
    ('vivienda/hay-casas.json', 'viviendas', 'semi', 'Parque de viviendas (duplicado de series-sueltas.viv)',
     'MIVAU', 'https://apps.fomento.gob.es/BoletinOnline2/sedal/33100500.XLS',
     'No lo toques a mano: el script lo copia de series-sueltas.viv.'),
    # --- inmigración
    ('inmigracion/inmigracion.json', 'permiso', 'semi', 'Extranjeros con documentación de residencia en vigor',
     'OPI, stock de documentación', 'https://www.inclusion.gob.es/web/opi/estadisticas/catalogo/stock_documentacion',
     'Semestral: 31-dic sale hacia abril-mayo. PestanaInmigracion.tsx 64 cita «7,9 millones» a mano.'),
    ('inmigracion/inmigracion.json', 'irrB', 'manual', 'Inmigrantes irregulares estimados',
     'Funcas, Nota de Coyuntura Social', 'https://www.funcas.es/', 'Funcas actualiza la estimación una vez al año (enero).'),
    ('inmigracion/inmigracion.json', 'regN', 'manual', 'Personas regularizadas cada año (y regPct)',
     'Ministerio de Inclusión, OPI', 'https://www.inclusion.gob.es/web/opi/estadisticas/catalogo/flujo_arraigo',
     'Balance anual; la regularización extraordinaria de 2026 aún no tiene cifra de concesiones (PestanaInmigracion.tsx 86).'),
    ('inmigracion/delincuencia.json', 'tasaCondenados', 'manual', 'Condenados por 1.000 adultos por nacionalidad (y estandarizada, porEdad2024, porContinente2024)',
     'INE, Estadística de Condenados (25704, 25645) + ECP 56938', 'https://www.ine.es/jaxiT3/Tabla.htm?t=25645',
     'La estadística de condenados sale en septiembre-octubre. Cálculo propio; las claves con año (porEdad2024…) se renombran a mano con su componente.'),
    ('inmigracion/delincuencia.json', 'espanolesAdultosNacidosFuera', 'semi', 'Adultos españoles nacidos fuera (1 de julio)',
     'INE, ECP tabla 56938', 'https://www.ine.es/jaxiT3/Tabla.htm?t=56938', 'Pedir las series concretas: la tabla entera no se descarga.'),
    ('inmigracion/delincuencia.json', 'prisiones', 'semi', 'Reclusos totales y extranjeros',
     'Instituciones Penitenciarias, estadística mensual', 'https://www.institucionpenitenciaria.es/es/web/home/fondo-documental/estadistica-penitenciaria',
     'Mensual. Delincuencia.tsx 90-91 repite el porcentaje y el mes a mano.'),
    ('inmigracion/nacionalizaciones.json', 'justicia', 'semi', 'Concesiones de nacionalidad por residencia',
     'OPI / Ministerio de Justicia', 'https://www.inclusion.gob.es/web/opi/estadisticas/catalogo/concesiones_nacionalidad',
     'Dato anual hacia mayo-junio.'),
    ('inmigracion/nacionalizaciones.json', 'leyMemoria', 'manual', 'Ley de nietos (acumulado)',
     'Ministerio de Exteriores / Justicia', 'https://www.exteriores.gob.es/', 'Balances esporádicos en prensa y respuestas parlamentarias.'),
    ('inmigracion/nacionalizaciones.json', 'sefardies', 'manual', 'Sefardíes: concesiones acumuladas',
     'Ministerio de Justicia (PDF)', 'https://www.mjusticia.gob.es/es/ciudadania/nacionalidad', 'PDF trimestral con la fecha en la URL.'),
    ('inmigracion/natalidad.json', 'pctAlMenosUnProgenitorExtranjero', 'semi', '% de nacimientos con algún progenitor extranjero',
     'INE, MNP (microdatos)', 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177007&menu=resultados&idp=1254735573002',
     'Con el MNP definitivo (diciembre). Bulos.tsx 374 cita «31,6 %» a mano.'),
    ('inmigracion/natalidad.json', 'nacimientosTotal', 'semi', 'Nacimientos y defunciones del último año (provisional)',
     'INE, MNP provisional', 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177007&menu=ultiDatos&idp=1254735573002',
     'El provisional sale en junio; el script corrige con el definitivo cuando la tabla 48861 lo trae.'),
    ('inmigracion/fecundidad-origen.json', 'enEspana', 'manual', 'Hijos por mujer según el país de nacimiento de la madre',
     'INE, microdatos de nacimientos + ECP tabla 56937 (cálculo propio); Banco Mundial SP.DYN.TFRT.IN',
     'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177007&menu=resultados&secc=1254736195442&idp=1254735573002',
     'Con los microdatos del MNP definitivo (noviembre-diciembre): rehacer el cálculo (fuentes.json lo explica) con la población a 1 de julio y comprobar que el total sale como la tabla 1407. enSuPais: nueva revisión de la ONU (WPP).'),
    ('inmigracion/trabajo.json', 'paroEspanoles', 'semi', 'Paro por nacionalidad del año en curso (último trimestre)',
     'INE, EPA', 'https://www.ine.es/jaxiT3/Tabla.htm?t=65952',
     'El script actualiza las medias anuales; el valor del año en curso (último trimestre) se pone a mano tras cada EPA (finales de enero, abril, julio y octubre).'),
    ('inmigracion/trabajo.json', 'empleo25a54', 'manual', 'Empleo 25-54 y paro2025 por nacionalidad (española, doble, extranjera)',
     'INE, EPA tablas 65963, 65946, 65955 (cálculo propio)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=65963',
     'Con la EPA del 4.º trimestre (finales de enero). paro2025 lleva el año en el nombre.'),
    ('inmigracion/trabajo.json', 'sectores', 'semi', 'Afiliados por sector, españoles y extranjeros (media anual)',
     'Seguridad Social vía datos.gob.es', 'https://datos.gob.es/es/catalogo?q=afiliados+extranjeros+cnae',
     'Dataset anual (el id lleva «hasta-dic-AA»): enero-febrero.'),
    ('inmigracion/trabajo.json', 'ocupacionesEPA', 'manual', 'Distribución por ocupación y nacionalidad',
     'INE, EPA (cálculo propio)', 'https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736176918',
     'Una vez al año con la EPA anual. No lleva año en el JSON.'),
    ('inmigracion/paguitas.json', 'afiliadosExtranjeros', 'semi', 'Afiliados extranjeros (media anual) y % sobre el total',
     'Ministerio de Trabajo, BEL (AEX-1, AFI-1)', 'https://www.mites.gob.es/estadisticas/bel/AEX/index.htm',
     'Mensual; el año en curso es media parcial: recalcular cada pocos meses.'),
    ('inmigracion/paguitas.json', 'afiliadosExtranjerosUltimoMes', 'semi', 'Afiliados extranjeros del último mes',
     'Seguridad Social, nota mensual de afiliación', 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST8',
     'Sale el segundo día hábil de cada mes.'),
    ('inmigracion/paguitas.json', 'imv', 'semi', 'Ingreso Mínimo Vital por nacionalidad',
     'Seguridad Social, dosier del IMV', 'https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas',
     'Mensual. Bulos.tsx 43 lee imv.serie["2026-09"] con clave fija: al añadir un mes, cambia el componente; comparativa.* lleva años en los nombres.'),
    ('inmigracion/paguitas.json', 'afiliadosPorPension', 'semi', 'Afiliados por pensión (total, españoles y último mes)',
     'Ministerio de Trabajo, BEL (AFI-1, PEN-1)', 'https://www.mites.gob.es/estadisticas/bel/AFI/index.htm',
     'Mensual; año en curso parcial. Bulos.tsx 414/444 cita «2,08 … 1,79 (2025)» a mano.'),
    ('inmigracion/menores.json', 'registrados', 'manual', 'Menores extranjeros no acompañados (registrados, pctMenores, pateras)',
     'Fiscalía General del Estado, memoria anual', 'https://www.fiscal.es/memorias-fiscalia',
     'La memoria sale en septiembre (con datos del año anterior).'),
    ('inmigracion/menores.json', 'tasaEspanoles', 'manual', 'Menores condenados por 1.000 (españoles, extranjeros, africanos, % extranjeros 14-17)',
     'INE 25721 + ECP 14-17 (cálculo propio)', 'https://www.ine.es/jaxiT3/Tabla.htm?t=25721',
     'Con la estadística de condenados menores (septiembre-octubre).'),
    ('inmigracion/menores.json', 'maxAtendidos', 'manual', 'Capacidad máxima de atención (contingencia migratoria)',
     'La Moncloa', 'https://www.lamoncloa.gob.es/', 'Solo si hay un nuevo acuerdo o decreto.'),
    ('inmigracion/remesas.json', 'pctPIB', 'manual', 'Remesas sobre PIB (y por residente, % sobre salarios)',
     'cálculo propio (BdE + PIB)', '', 'Recalcular cuando cambien salidasMEur o el PIB (marzo).'),
    ('inmigracion/remesas.json', 'salariosExtranjerosMEur', 'semi', 'Masa salarial de asalariados extranjeros',
     'Agencia Tributaria, Mercado de trabajo y pensiones en las fuentes tributarias',
     'https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/mercado/home.html',
     'Sale hacia septiembre con dos años de retraso; la URL lleva el año.'),
    ('inmigracion/remesas.json', 'otros.remesasTrimestralesMEur_2026', 'semi', 'Remesas trimestrales del año en curso',
     'Banco de España (BIEST)', 'https://app.bde.es/bie_www/', 'Trimestral; la clave lleva el año y las fechas son ISO.'),
    ('inmigracion/sanidad.json', 'indicadores', 'manual', 'Uso de servicios sanitarios por país de nacimiento',
     'INE, Encuesta de Salud de España', 'https://www.ine.es/dyngs/Prensa/es/ESdE2025.htm', 'Encuesta cada ~5 años.'),
    # --- medios
    ('medios/medios.json', 'egm', 'semi', 'Audiencia diaria (EGM)', 'AIMC, Marco General de los Medios',
     'https://www.aimc.es/egm/', 'El Marco General sale en febrero-marzo (PDF con el año en la URL).'),
    ('medios/medios.json', 'publi', 'manual', 'Inversión publicitaria por medio', 'InfoAdex', 'https://www.infoadex.es/',
     'InfoAdex publica su estudio anual en febrero/marzo. Medios.tsx 84-91 cita cifras a mano.'),
    ('medios/medios.json', 'fuente', 'manual', 'Fuentes de noticias, redes, confianza, preocupación y pago (Digital News Report)',
     'Reuters Institute DNR (Universidad de Navarra)', 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report',
     'El DNR sale cada junio. CuestionesMedios.tsx y Medios.tsx citan porcentajes a mano.'),
    ('medios/medios.json', 'difusion', 'manual', 'Difusión de diarios de pago', 'OJD / estudios', 'https://www.ojd.es/',
     'Años sueltos; solo si hay un dato nuevo publicado.'),
    ('medios/medios.json', 'publiInst', 'manual', 'Publicidad institucional de la AGE', 'La Moncloa, informe anual',
     'https://www.lamoncloa.gob.es/serviciosdeprensa/cpci/Paginas/PlanesEInformes.aspx',
     'El informe del año anterior sale hacia mayo. CuestionesMedios.tsx 12 lee publiInst["2025"].'),
    ('medios/medios.json', 'rsf', 'manual', 'Puesto de España en la clasificación de RSF', 'Reporteros Sin Fronteras',
     'https://rsf.org/es/clasificacion', 'Sale en mayo (3 de mayo, Día de la Libertad de Prensa).'),
    # --- comunes editoriales
    ('comun/acontecimientos.json', '.', 'manual', 'Grandes acontecimientos (líneas verticales)', 'editorial', '',
     'Añadir lo que pase. Textos con cifras (regularización, DANA) se quedan viejos.'),
    ('global/decretos-ley.json', 'porAnio', 'manual', 'Reales decretos-ley publicados en el BOE, por año y por legislatura (columna «Decretos-ley» de «De un vistazo»)',
     'BOE, buscador de legislación (rango «Real Decreto-ley»)',
     'https://www.boe.es/buscar/legislacion_ava.php?campo%5B0%5D=ID_SRC&dato%5B0%5D=1&operador%5B0%5D=and&campo%5B4%5D=ID_RNGS&dato%5B4%5D=1320&operador%5B4%5D=and&campo%5B11%5D=FPU&dato%5B11%5D%5B0%5D=2026-01-01&dato%5B11%5D%5B1%5D=2026-12-31&operador%5B11%5D=and&page_hits=2000&sort_field%5B0%5D=FPU&sort_order%5B0%5D=asc&accion=Buscar',
     'Con cada decreto-ley nuevo: suma 1 en porAnio[año de publicación] y en porLegislatura de la legislatura en curso (n, ultimo y hasta = fecha de consulta), y cambia fuente.consulta. El último número del año (n/AAAA) debe coincidir con porAnio. La API de legislación consolidada NO sirve: solo trae los consolidados.'),
    ('comun/en-cada-eleccion-anio.json', 'hoy', 'manual', 'Año de cierre usado para «hoy»', 'editorial', '',
     'Subirlo cuando haya cierre anual de deuda y gasto (marzo-abril). El script avisa si hoy.lab ya no dice el año en curso.'),
    ('comun/en-cada-eleccion-fecha.json', 'hoy', 'manual', 'Posición de «hoy» en el eje X', 'editorial', '',
     'Moverlo a la fecha del último dato.'),
    ('fuentes/fuentes.json', 'actualizado', 'manual', 'Fecha de actualización y detalle de cada bloque de fuentes', 'editorial', '',
     'Tras cada actualización: fecha «actualizado», textos «2026 = media del 1.º y 2.º trimestre» y URLs con el año.'),
]

ELECTORAL = """\
## Elecciones generales del 29 de noviembre de 2026

Nada de esto lo hace el script. Cuando el BOE publique los resultados oficiales (Junta Electoral Central, unas
semanas después del 29-N; antes, solo hay escrutinio provisional del Ministerio del Interior):

1. **`partidos/elecciones.json`**: la fila `["2026", "—", "29 nov 2026"]` pasa a `["2026", "XVI", "29 nov 2026"]`.
2. **`comun/participacion.json`**: añade `"2026": [censo, votantes]` (Cuadro I del BOE; incluye CERA).
3. **`partidos/blanco-nulo.json`**: añade `datos["2026"] = [blancos, nulos, válidos, votantes]` y la URL del BOE en `fuentes["2026"]`. Ojo: este fichero va con arrays en una línea; edítalo a mano, sin reformatear.
4. **`partidos/partidos.json`**: en cada partido, la elección `"2026"` lleva hoy la estimación del CIS (`cis`); pon `seats` y `vote` reales. Revisa partidos pequeños que entren o salgan.
5. **`comun/legislaturas.json`**: la XV deja de ser `current` (fecha `b` = 29-N o constitución de las Cortes, `ended`, `res`), y se abre la XVI cuando haya investidura (`num`, `gov`, `pres`, `form`).
6. **`comun/gobiernos.json`**: el último tramo acaba el 2026-11-03 (disolución); tras la investidura, añade el nuevo gobierno.
7. **`comun/en-cada-eleccion.json`, `-correcciones.json`, `-anio.json`, `-fecha.json` e `impuestos-en-cada-eleccion.json`**: añade la elección `"2026"` (con `lab` «nov 2026», paro del 4.º trimestre o del 3.º, población, etc.) además de `hoy`; incluye `ipc` (índice del mes de la elección, IPC290751), `anios` (D_TKB57110_IPV del trimestre) y `edad` (vivienda.json `edad` del año de `-anio.json`).
   **`global/decretos-ley.json`**: cierra la XV en `porLegislatura["2023"]` (`hasta` = 2026-11-29) y abre `porLegislatura["2026"]` con los decretos-ley publicados desde el 29-N.
8. **Componentes**: `pestanas/partidos/CuestionesPartidos.tsx` filtra `id !== '2026'` (línea ~52) y muchos textos dicen que la última elección es la de 2023 (líneas ~287, 322, 331, 358); `VotoBlanco.tsx` (subvenciones por voto y por diputado, cambian con cada convocatoria); `l.current ? 2026` en Vistazo, Detalle, Balance y Grafico.
9. **`fuentes/fuentes.json`** y la nota de `part` en `comun/indicadores.json` («En 2023 votaron 66,6…»).
10. Después: `python3 scripts/politica/actualizar.py` (la fila `hoy` no cambia con esto), `npm run build` y revisa la pestaña Partidos y Global.
"""


def resumen_ultimo(datos, archivo, ruta):
    try:
        o = datos.get(archivo, ruta)
    except Exception:
        return '(no encontrado)'
    if isinstance(o, dict):
        claves = [k for k in o if es_periodo(k)]
        if claves and len(claves) >= len(o) * 0.6:
            k = max(claves)
            v = o[k]
            return f'{k}: {num(v) if isinstance(v, (int, float)) else json.dumps(v, ensure_ascii=False)[:60]}'
        for campo in ('fecha', 'mes', 'anio', 'actualizado'):
            if campo in o:
                return f'{campo} = {o[campo]}'
        periodos = []

        def buscar(x, prof):
            if isinstance(x, dict) and prof < 4:
                periodos.extend(k for k in x if es_periodo(k))
                for v in x.values():
                    buscar(v, prof + 1)
        buscar(o, 0)
        if periodos:
            return f'último periodo: {max(periodos)}'
        return 'sin año en el JSON (mira la fuente o el texto del componente)'
    if isinstance(o, list):
        return f'{len(o)} elementos; último: {json.dumps(o[-1], ensure_ascii=False)[:70]}'
    return json.dumps(o, ensure_ascii=False)[:80]


def generar_revisar(datos):
    lin = ['# Qué revisar a mano', '',
           f'Generado por `scripts/politica/actualizar.py --revisar` el {HOY.strftime("%d-%m-%Y")}. '
           'Son las series que el script no puede actualizar solo: **semi** (la fuente publica un fichero nuevo, '
           'con otra URL o formato, cada vez) y **manual** (editorial, leyes, cálculos propios con varias fuentes). '
           'El «último dato» es lo que hay ahora en el JSON.', '',
           'Recuerda también: los textos de los componentes con cifras o años escritos a mano, los ejes `x1={…}` de las '
           'gráficas y `fuentes/fuentes.json` (fecha «actualizado» y detalles) se quedan viejos con cada dato nuevo.', '']
    lin.append(ELECTORAL)
    for tipo, titulo in (('semi', 'Series semi (fichero por publicación)'), ('manual', 'Series manuales')):
        lin += [f'## {titulo}', '', '| archivo · ruta | qué es | último dato | fuente | qué mirar |', '|---|---|---|---|---|']
        for archivo, ruta, t, que, fuente, url, mirar in PENDIENTES:
            if t != tipo:
                continue
            f = f'[{fuente}]({url})' if url else fuente
            ult = resumen_ultimo(datos, archivo, ruta).replace('|', '\\|')
            lin.append(f'| `{archivo}` · `{ruta}` | {que} | {ult} | {f} | {mirar} |')
        lin.append('')
    lin += ['## Electorales (resumen)', '', '| archivo | último dato |', '|---|---|']
    for archivo, ruta in (('partidos/elecciones.json', '.'), ('comun/participacion.json', '.'),
                          ('partidos/blanco-nulo.json', 'datos'), ('comun/gobiernos.json', '.'),
                          ('comun/en-cada-eleccion.json', '.'), ('comun/impuestos-en-cada-eleccion.json', '.')):
        lin.append(f'| `{archivo}` | {resumen_ultimo(datos, archivo, ruta).replace("|", "/")} |')
    lin.append('')
    return '\n'.join(lin)


# ---------------------------------------------------------------------------
# Programa
# ---------------------------------------------------------------------------


def coincide(spec, patrones):
    if not patrones:
        return True
    texto = f'{spec["nombre"]} {spec.get("archivo", "")} {spec.get("ruta", "")}'.lower()
    return any(p.lower() in texto for p in patrones)


def main():
    global D
    ap = argparse.ArgumentParser(description='Refresca las series automáticas de «España política en datos».')
    ap.add_argument('--escribir', action='store_true', help='guarda los cambios en los JSON (por defecto, solo informe)')
    ap.add_argument('--solo', default='', help='patrones separados por comas (nombre, archivo o ruta)')
    ap.add_argument('--cache', action='store_true', help='reutiliza las descargas hechas hoy')
    ap.add_argument('--datos', default=DATOS_REPO, help='carpeta de datos (por defecto, la del repo)')
    ap.add_argument('--desde', type=int, default=ANIO - VENTANA, help=f'primer año que se compara (por defecto {ANIO - VENTANA})')
    ap.add_argument('--revisar', nargs='?', const=os.path.join(AQUI, 'REVISAR.md'), metavar='FICHERO',
                    help='regenera scripts/politica/REVISAR.md (o el FICHERO indicado) y termina')
    args = ap.parse_args()

    datos = Datos(os.path.abspath(args.datos))
    if args.revisar:
        destino = args.revisar
        with open(destino, 'w', encoding='utf-8') as f:
            f.write(generar_revisar(datos))
        print(f'Escrito {os.path.abspath(destino)}')
        return 0

    D = Descargador(args.cache)
    patrones = [p.strip() for p in args.solo.split(',') if p.strip()]
    resultados = []
    print(f'Actualización de datos · {HOY.strftime("%d-%m-%Y")} · datos en {datos.raiz}')
    print(f'Se comparan los años desde {args.desde}' + (' · usando la caché de hoy' if args.cache else ''))
    print()
    for spec in SERIES:
        if not coincide(spec, patrones):
            continue
        res = Resultado(spec)
        resultados.append(res)
        desde = max(args.desde, spec.get('desde', args.desde))
        try:
            if not datos.escribible(spec['archivo']):
                res.avisos.append('el fichero no se puede reescribir conservando su formato: no se toca')
            if spec.get('especial'):
                ESPECIALES[spec['especial']](datos, spec, res, desde)
            else:
                nuevos, notas = calcular(spec, desde)
                if not nuevos:
                    raise ErrorDescarga('la fuente no devuelve ningún año de la ventana')
                aplicar_serie(datos, spec, nuevos, notas, res, desde)
        except ErrorDescarga as e:
            res.error = f'error al descargar: {e}'
        except Exception as e:  # que una serie rota no pare las demás
            res.error = f'error: {type(e).__name__}: {e}'
        print(linea(res), flush=True)

    # duplicados
    print()
    print('Duplicados')
    for e in ESPEJOS:  # siempre: solo copian lo que ya está en memoria
        res = Resultado({'nombre': e['nombre'], 'archivo': '', 'ruta': ''})
        try:
            if e['tipo'] == 'serie':
                espejo_serie(datos, e, res)
            elif e['tipo'] == 'filas':
                espejo_filas(datos, e, res)
            elif e['tipo'] == 'viviendas':
                espejo_viviendas(datos, e, res)
            elif e['tipo'] == 'comprobar_por_pais':
                espejo_comprobar_por_pais(datos, e, res)
            elif e['tipo'] == 'hoy':
                fuentes_hoy = {}
                try:
                    fuentes_hoy = datos_para_hoy(args.desde)
                except Exception as ex:
                    res.avisos.append(f'no se pudo calcular paro/precio/pop/esp de hoy: {ex}')
                espejo_hoy(datos, e, res, fuentes_hoy)
        except Exception as ex:
            res.error = f'error: {type(ex).__name__}: {ex}'
        resultados.append(res)
        print(linea(res, duplicado=True), flush=True)

    # resumen
    errores = [r for r in resultados if r.error]
    cambian = [r for r in resultados if r.cambios]
    avisos = [(r, a) for r in resultados for a in r.avisos]
    print()
    if avisos:
        print('Avisos (revisar a mano)')
        for r, a in avisos:
            print(f'  · {r.spec["nombre"]}: {a}')
        print()
    print(f'Resumen: {len(resultados)} comprobaciones · {len(cambian)} con cambios · '
          f'{len(resultados) - len(cambian) - len(errores)} sin cambios · {len(errores)} con error '
          f'· {D.peticiones} descargas')
    modificados = datos.modificados()
    no_escribibles = [a for a in modificados if not datos.escribible(a)]
    if args.escribir:
        for a in no_escribibles:
            datos.docs[a] = datos.orig[a]
            print(f'  no se escribe {a}: formato no reconocido')
        escritos = datos.guardar()
        print('Escritos: ' + (', '.join(escritos) if escritos else 'ninguno'))
        if escritos:
            print('Ahora: git diff src/promesas/datos, npm run build y mira la web antes de hacer commit.')
    else:
        if modificados:
            print('Cambiarían: ' + ', '.join(modificados))
            print('Modo informe: no se ha escrito nada. Repite con --escribir para guardar.')
        else:
            print('Modo informe: no hay nada que escribir.')
    return 1 if errores else 0


def linea(res, duplicado=False):
    titulo = res.spec['nombre'] if duplicado else res.titulo
    if res.error:
        return f'  ✗ {titulo}: {res.error}'
    partes = []
    if res.cambios:
        cuerpo = '; '.join(res.cambios)
        partes.append(cuerpo)
    else:
        partes.append('sin cambios' + (f' (último {res.ultimo})' if res.ultimo else ''))
    for i in res.info:
        partes.append(i)
    if (res.cambios or res.avisos) and res.spec.get('nota'):
        partes.append(f'nota: {res.spec["nota"]}')
    marca = '•' if res.cambios else ' '
    return f'  {marca} {titulo}: ' + ' · '.join(partes)


if __name__ == '__main__':
    sys.exit(main())
