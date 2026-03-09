const API_BASES = [
  'https://api.bcra.gob.ar/estadisticas/v4.0',
  'https://api.bcra.gob.ar/estadisticas/v3.0',
];

function toObservations(payload) {
  const raw = payload?.results ?? payload?.Results ?? payload?.datos ?? [];
  return raw
    .map((d) => ({
      date: d.fecha || d.Fecha || d.d,
      value: Number(d.valor ?? d.Valor ?? d.v),
    }))
    .filter((d) => d.date && Number.isFinite(d.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchSeriesFromBcra(id) {
  const traces = [];
  for (const base of API_BASES) {
    for (const endpoint of [`/Monetarias/${id}`, `/principalesvariables/${id}`]) {
      const url = `${base}${endpoint}`;
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'BCRA-Macro-Intelligence/1.0',
            Accept: 'application/json',
          },
        });
        traces.push(`${url} -> ${response.status}`);
        if (!response.ok) continue;

        const payload = await response.json();
        const data = toObservations(payload);
        if (data.length) {
          return { data, source: url, traces };
        }
      } catch (error) {
        traces.push(`${url} -> ${error.message}`);
      }
    }
  }

  return { data: [], source: null, traces };
}

module.exports = {
  fetchSeriesFromBcra,
};
