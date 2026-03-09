const API_BASES = [
  'https://api.bcra.gob.ar/estadisticas/v4.0',
  'https://api.bcra.gob.ar/estadisticas/v3.0',
];

function pickDate(row) {
  return row.fecha || row.Fecha || row.date || row.Date || row.d || row.f || row.periodo || null;
}

function pickValue(row) {
  const candidates = [
    row.valor,
    row.Valor,
    row.value,
    row.Value,
    row.v,
    row.importe,
    row.Importe,
    row.monto,
    row.Monto,
  ];
  const chosen = candidates.find((v) => v !== undefined && v !== null && v !== '');
  const n = Number(chosen);
  return Number.isFinite(n) ? n : null;
}

function looksLikeObservation(row) {
  return row && typeof row === 'object' && !Array.isArray(row) && pickDate(row) && pickValue(row) !== null;
}

function collectObservationArrays(node, out = [], depth = 0) {
  if (!node || depth > 6) return out;

  if (Array.isArray(node)) {
    if (node.length && node.every(looksLikeObservation)) {
      out.push(node);
      return out;
    }
    node.forEach((item) => collectObservationArrays(item, out, depth + 1));
    return out;
  }

  if (typeof node === 'object') {
    Object.values(node).forEach((value) => collectObservationArrays(value, out, depth + 1));
  }

  return out;
}

function normalizeFromRows(rows) {
  return rows
    .map((row) => ({
      date: pickDate(row),
      value: pickValue(row),
    }))
    .filter((d) => d.date && d.value !== null)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function toObservations(payload) {
  const arrays = collectObservationArrays(payload);
  if (!arrays.length) return [];

  const normalizedCandidates = arrays
    .map(normalizeFromRows)
    .filter((arr) => arr.length)
    .sort((a, b) => b.length - a.length);

  return normalizedCandidates[0] || [];
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
