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
    const status = result.data.length ? 200 : 502;
    return json(res, status, result);
  }

  return serveFile(url.pathname, res);
}).listen(PORT, () => {
  console.log(`Server ready on http://localhost:${PORT}`);
});
