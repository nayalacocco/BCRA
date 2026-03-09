const API_BASES = [
  'https://api.bcra.gob.ar/estadisticas/v4.0',
  'https://api.bcra.gob.ar/estadisticas/v3.0',
];

const API_TIMEOUT_MS = 10000;

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

function parseDateToTimestamp(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const isoCandidate = raw.includes('T') ? raw : `${raw}T00:00:00`;
  const isoDate = new Date(isoCandidate);
  if (!Number.isNaN(isoDate.getTime())) return isoDate.getTime();

  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const fallback = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(fallback.getTime()) ? null : fallback.getTime();
}

function pickSeriesId(row) {
  const id = Number(row?.idVariable ?? row?.idvariable ?? row?.id_serie ?? row?.serie_id ?? row?.id);
  return Number.isFinite(id) ? id : null;
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


function collectPreferredArrays(payload) {
  if (!payload || typeof payload !== 'object') return [];

  const keys = ['results', 'resultado', 'datos', 'data', 'items', 'valores'];
  const out = [];

  keys.forEach((key) => {
    const value = payload[key];
    if (Array.isArray(value) && value.length && value.every(looksLikeObservation)) {
      out.push(value);
      return;
    }
    if (value && typeof value === 'object') {
      const nested = collectObservationArrays(value);
      out.push(...nested);
    }
  });

  return out;
}

function normalizeFromRows(rows, requestedId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows
    .map((row) => ({
      date: pickDate(row),
      value: pickValue(row),
      rowSeriesId: pickSeriesId(row),
    }))
    .map((point) => ({ ...point, ts: parseDateToTimestamp(point.date) }))
    .filter((point) => point.date && point.value !== null && point.ts !== null)
    .filter((point) => point.ts <= today.getTime())
    .filter((point) => requestedId == null || point.rowSeriesId == null || point.rowSeriesId === requestedId)
    .sort((a, b) => a.ts - b.ts)
    .map(({ date, value }) => ({ date, value }));
}

function toObservations(payload, requestedId) {
  const preferred = collectPreferredArrays(payload);
  const arrays = preferred.length ? preferred : collectObservationArrays(payload);
  if (!arrays.length) return [];

  const normalizedCandidates = arrays
    .map((rows) => normalizeFromRows(rows, requestedId))
    .filter((arr) => arr.length)
    .sort((a, b) => b.length - a.length);

  return normalizedCandidates[0] || [];
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BCRA-Macro-Intelligence/1.0',
        Accept: 'application/json',
      },
    });

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSeriesFromBcra(id) {
  const traces = [];
  for (const base of API_BASES) {
    for (const endpoint of [`/Monetarias/${id}`, `/principalesvariables/${id}`]) {
      const url = `${base}${endpoint}`;
      try {
        const response = await fetchJsonWithTimeout(url, API_TIMEOUT_MS);
        traces.push(`${url} -> ${response.status}`);
        if (!response.ok) continue;

        const payload = await response.json();
        const data = toObservations(payload, id);
        if (data.length) {
          return { data, source: url, traces };
        }
      } catch (error) {
        const reason = error.name === 'AbortError' ? `timeout ${API_TIMEOUT_MS}ms` : error.message;
        traces.push(`${url} -> ${reason}`);
      }
    }
  }

  return { data: [], source: null, traces };
}

module.exports = {
  fetchSeriesFromBcra,
};
