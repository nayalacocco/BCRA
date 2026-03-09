import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { statSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT || 4173);
const ROOT = process.cwd();
const API_BASES = [
  'https://api.bcra.gob.ar/estadisticas/v4.0',
  'https://api.bcra.gob.ar/estadisticas/v3.0',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function json(res, code, body) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function pickDate(row) {
  return row.fecha || row.Fecha || row.date || row.Date || row.d || row.f || row.periodo || null;
}

function pickValue(row) {
  const candidates = [row.valor, row.Valor, row.value, row.Value, row.v, row.importe, row.Importe, row.monto, row.Monto];
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
    .map((row) => ({ date: pickDate(row), value: pickValue(row) }))
    .filter((d) => d.date && d.value !== null)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function toObservations(payload) {
  const arrays = collectObservationArrays(payload);
  if (!arrays.length) return [];
  const normalized = arrays.map(normalizeFromRows).filter((arr) => arr.length).sort((a, b) => b.length - a.length);
  return normalized[0] || [];
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
        const r = await fetch(url, {
          headers: {
            'User-Agent': 'BCRA-Macro-Intelligence/1.0',
            'Accept': 'application/json',
          },
        });
        traces.push(`${url} -> ${r.status}`);
        if (!r.ok) continue;
        const payload = await r.json();
        const data = toObservations(payload);
        if (data.length) {
          return { data, source: url, traces };
        }
      } catch (error) {
        traces.push(`${url} -> ${error.message}`);
      } catch (e) {
        traces.push(`${url} -> ${e.message}`);
      }
    }
  }
  return { data: [], source: null, traces };
}

async function serveFile(reqPath, res) {
  let filePath = normalize(join(ROOT, reqPath === '/' ? '/index.html' : reqPath));
  if (!filePath.startsWith(ROOT)) return json(res, 403, { error: 'forbidden' });
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(ROOT, 'index.html');
  }
  const ext = extname(filePath);
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/health') {
    return json(res, 200, { ok: true, service: 'bcra-macro-intelligence' });
  }

  if (url.pathname.startsWith('/api/series/')) {
    const id = Number(url.pathname.split('/').pop());
    if (!Number.isFinite(id)) return json(res, 400, { error: 'invalid id' });
    const result = await fetchSeriesFromBcra(id);
    return json(res, result.data.length ? 200 : 502, result);
    const status = result.data.length ? 200 : 502;
    return json(res, status, result);
  }

  return serveFile(url.pathname, res);
}).listen(PORT, () => {
  console.log(`Server ready on http://localhost:${PORT}`);
});
