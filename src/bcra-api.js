const BASES = ['https://api.bcra.gob.ar/estadisticas/v4.0', 'https://api.bcra.gob.ar/estadisticas/v3.0'];

function normalizeObservations(payload) {
  const raw = payload?.results ?? payload?.Results ?? payload?.datos ?? [];
  return raw
    .map((d) => ({
      date: d.fecha || d.Fecha || d.d,
      value: Number(d.valor ?? d.Valor ?? d.v),
    }))
    .filter((d) => d.date && Number.isFinite(d.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchSeries(id) {
  const errors = [];
  for (const base of BASES) {
    for (const endpoint of [`/Monetarias/${id}`, `/principalesvariables/${id}`]) {
      try {
        const res = await fetch(`${base}${endpoint}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const data = normalizeObservations(json);
        if (data.length) return data;
      } catch (err) {
        errors.push(`${base}${endpoint} -> ${err.message}`);
      }
    }
  }
  throw new Error(errors.join(' | '));
}

export function calcVariations(series) {
  const n = series.length;
  if (n < 2) return null;
  const latest = series[n - 1].value;
  const prev = series[n - 2].value;
  const month = series[Math.max(0, n - 22)]?.value;
  const year = series[Math.max(0, n - 252)]?.value;
  const pct = (a, b) => (b ? ((a - b) / b) * 100 : null);
  return {
    latest,
    daily: pct(latest, prev),
    monthly: month ? pct(latest, month) : null,
    yearly: year ? pct(latest, year) : null,
  };
}
