export const views = [
  { id: 'dashboard', label: 'Dashboard general' },
  { id: 'series', label: 'Series BCRA' },
  { id: 'comparator', label: 'Comparador' },
  { id: 'modules', label: 'Módulos temáticos' },
];

export const prioritizedSeries = [
  { id: 1, key: 'reservas', name: 'Reservas Internacionales', unit: 'USD millones' },
  { id: 4, key: 'base_monetaria', name: 'Base Monetaria', unit: 'ARS millones' },
  { id: 31, key: 'pasivos_remunerados', name: 'Pasivos remunerados BCRA', unit: 'ARS millones' },
  { id: 5, key: 'tc_mayorista', name: 'Tipo de cambio mayorista', unit: 'ARS/USD' },
  { id: 40, key: 'tasa_politica', name: 'Tasa de política monetaria', unit: '% TNA' },
  { id: 27, key: 'depositos_priv', name: 'Depósitos sector privado', unit: 'ARS millones' },
  { id: 28, key: 'prestamos_priv', name: 'Préstamos sector privado', unit: 'ARS millones' },
  { id: 26, key: 'depositos_usd', name: 'Depósitos en USD sector privado', unit: 'USD millones' },
  { id: 1, key: 'reservas', name: 'Reservas Internacionales' },
  { id: 4, key: 'base_monetaria', name: 'Base Monetaria' },
  { id: 31, key: 'pasivos_remunerados', name: 'Pasivos remunerados BCRA' },
  { id: 5, key: 'tc_mayorista', name: 'Tipo de cambio mayorista' },
  { id: 40, key: 'tasa_politica', name: 'Tasa de política monetaria' },
  { id: 27, key: 'depositos_priv', name: 'Depósitos sector privado' },
  { id: 28, key: 'prestamos_priv', name: 'Préstamos sector privado' },
  { id: 26, key: 'depositos_usd', name: 'Depósitos en USD sector privado' },
];

export const moduleGroups = {
  Reservas: ['reservas', 'depositos_usd'],
  Monetario: ['base_monetaria', 'pasivos_remunerados'],
  Tasas: ['tasa_politica'],
  'Tipo de cambio': ['tc_mayorista'],
  'Depósitos y crédito': ['depositos_priv', 'prestamos_priv'],
  'Liquidez / Esterilización': ['pasivos_remunerados', 'base_monetaria'],
};
