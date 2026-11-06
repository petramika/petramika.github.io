/*
  Iconos de las areas (educacion, vivienda, sanidad...): nombre y trazo SVG
  de 24x24, y que icono lleva cada area de las promesas.
*/
export const ICONS: Record<string, [string, string]> = {
  edu: ["Educación", "M2 9l10-5 10 5-10 5z M6 11v5c3 2 9 2 12 0v-5"],
  viv: ["Vivienda", "M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6"],
  san: ["Sanidad", "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"],
  trab: ["Trabajo", "M3 8h18v12H3z M9 8V5h6v3 M3 13h18"],
  pen: ["Pensiones", "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 7v5l3 3"],
  imp: ["Economía e impuestos", "M18 6.2A7.5 7.5 0 1 0 18 17.8 M4 10h10 M4 14h10"],
  inst: ["Instituciones", "M3 10l9-6 9 6z M5 10v8 M9.5 10v8 M14.5 10v8 M19 10v8 M3 20h18"],
  aut: ["Autonomías", "M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z M12 7.5a2 2 0 1 0 0.01 0"],
  der: ["Derechos", "M12 4v16 M6 20h12 M4 7h16 M6 7l-3 6a3 3 0 0 0 6 0z M18 7l-3 6a3 3 0 0 0 6 0z"],
  eur: ["Europa y mundo", "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18"],
  infra: ["Infraestructuras", "M8 3L5 21 M16 3l3 18 M12 5v3 M12 11v3 M12 17v3"],
  def: ["Defensa", "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"],
  soc: ["Servicios sociales", "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M17 11a2.5 2.5 0 1 0 0-5 M16 14c2.8 0 5 2.2 5 5"],
  eco: ["Economía", "M3 20h18 M5 16l5-5 4 4 6-7"],
  seg: ["Seguridad", "M5 11h14v10H5z M8 11V8a4 4 0 0 1 8 0v3"],
  env: ["Medio ambiente", "M5 19c0-9 6-14 14-14 0 8-5 14-14 14z M5 19l7-7"],
};

export const AREA_ICON: Record<string, string> = {
  "Educación": "edu",
  "Vivienda": "viv",
  "Sanidad": "san",
  "Trabajo": "trab",
  "Pensiones": "pen",
  "Economía e impuestos": "imp",
  "Instituciones": "inst",
  "Autonomías": "aut",
  "Derechos y sociedad": "der",
  "Europa y exterior": "eur",
  "Infraestructuras": "infra",
  "Defensa": "def",
  "Servicios sociales": "soc",
  "Medio ambiente": "env",
};
