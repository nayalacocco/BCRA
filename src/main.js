import { views, prioritizedSeries, moduleGroups } from './config.js';
import { fetchSeries, calcVariations } from './bcra-api.js';
import { drawLineChart } from './chart.js';

const state = { current: 'dashboard', data: new Map(), errors: [] };
const nav = document.querySelector('#nav');
const root = document.querySelector('#view-root');
const title = document.querySelector('#view-title');
const apiStatus = document.querySelector('#api-status');

const formatN = (n) => (n == null ? '—' : n.toLocaleString('es-AR', { maximumFractionDigits: 2 }));
const formatPct = (n) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`);
const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(`${d}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('es-AR');
};

const toDayTimestamp = (value) => {
  if (!value) return null;
  const dt = new Date(`${value}T00:00:00`);
  if (!Number.isNaN(dt.getTime())) return dt.setHours(0, 0, 0, 0);
  const [d, m, y] = String(value).split(/[/-]/).map(Number);
  if (!d || !m || !y) return null;
  const fallback = new Date(y, m - 1, d);
  return Number.isNaN(fallback.getTime()) ? null : fallback.setHours(0, 0, 0, 0);
};

const seriesAtOrBefore = (series, targetDate) => {
  if (!targetDate || !series?.length) return [];
  const targetTs = toDayTimestamp(targetDate);
  if (targetTs == null) return [];
  return series.filter((point) => {
    const ts = toDayTimestamp(point.date);
    return ts != null && ts <= targetTs;
  });
};

function dashboardReferenceDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = prioritizedSeries.slice(0, 6)
    .map((s) => state.data.get(s.key)?.at(-1)?.date)
    .filter(Boolean)
    .map(toDayTimestamp)
    .filter((ts) => ts != null && ts <= today.getTime())
    .sort((a, b) => a - b);
  if (!dates.length) return null;
  return new Date(dates[0]).toISOString().slice(0, 10);
}

function setView(id) {
  state.current = id;
  title.textContent = views.find((v) => v.id === id).label;
  render();
  [...nav.children].forEach((btn) => btn.classList.toggle('active', btn.dataset.id === id));
}

function derivedIndicators(referenceDate = null) {
  const getLast = (key) => {
    const s = seriesAtOrBefore(state.data.get(key) || [], referenceDate);
    return s?.[s.length - 1]?.value;
  };
  const reservas = getLast('reservas');
  return [
    { name: 'Base monetaria / Reservas', value: getLast('base_monetaria') / reservas },
    { name: 'Pasivos remunerados / Reservas', value: getLast('pasivos_remunerados') / reservas },
    { name: 'Depósitos USD / Reservas', value: getLast('depositos_usd') / reservas },
  ].filter((x) => Number.isFinite(x.value));
}

function renderDashboard() {
  const referenceDate = dashboardReferenceDate();
  const cards = prioritizedSeries.slice(0, 6).map((s) => {
    const fullData = state.data.get(s.key) || [];
    const alignedData = seriesAtOrBefore(fullData, referenceDate);
    const vars = calcVariations(alignedData);
    const lastDate = alignedData.at(-1)?.date;
    return `<article class="card"><h3>${s.name}</h3><p class="kpi">${formatN(vars?.latest)}</p><p class="muted">Unidad: ${s.unit || '—'} · Dato al: ${formatDate(lastDate)}</p><p class="chg ${vars?.daily >= 0 ? 'pos':'neg'}">Diaria: ${formatPct(vars?.daily)}</p><p class="muted">Mensual: ${formatPct(vars?.monthly)} · Interanual: ${formatPct(vars?.yearly)}</p></article>`;
    const data = state.data.get(s.key) || [];
    const vars = calcVariations(data);
    const lastDate = data.at(-1)?.date;
    return `<article class="card"><h3>${s.name}</h3><p class="kpi">${formatN(vars?.latest)}</p><p class="muted">Dato al: ${formatDate(lastDate)}</p><p class="chg ${vars?.daily >= 0 ? 'pos':'neg'}">Diaria: ${formatPct(vars?.daily)}</p><p class="muted">Mensual: ${formatPct(vars?.monthly)} · Interanual: ${formatPct(vars?.yearly)}</p></article>`;
  }).join('');
  const derived = derivedIndicators(referenceDate).map((d)=>`<article class="card"><h3>${d.name}</h3><p class="kpi">${d.value.toFixed(2)}x</p></article>`).join('');
  const errBanner = state.errors.length ? `<div class="card" style="border-color:#5a3a3a;margin-bottom:1rem"><h3>Estado de ingestión</h3><p class="muted">No se pudieron cargar algunas series. Revisá conectividad del backend a api.bcra.gob.ar.</p><p class="muted">${state.errors.slice(0,2).join(' · ')}</p></div>` : '';
  root.innerHTML = `${errBanner}<p class="muted" style="margin-bottom:0.75rem">Fecha de corte usada para el dashboard: ${formatDate(referenceDate)}</p>
  const latestSnapshot = [...state.data.values()]
    .map((series) => series.at(-1)?.date)
    .filter(Boolean)
    .sort()
    .at(-1);
  root.innerHTML = `${errBanner}<p class="muted" style="margin-bottom:0.75rem">Última fecha disponible en el dashboard: ${formatDate(latestSnapshot)}</p>
    <p class="section-title">Visión ejecutiva</p>
    <div class="grid cards">${cards}</div>
    <p class="section-title" style="margin-top:1.2rem">Indicadores derivados</p>
    <div class="grid cards">${derived}</div>`;
}

function renderSeries() {
  const options = prioritizedSeries.map((s)=>`<option value="${s.key}">${s.name}</option>`).join('');
  root.innerHTML = `
    <div class="row"><input id="search" placeholder="Buscar series por nombre" />
      <select id="series-select">${options}</select>
      <button class="primary" id="load-series">Cargar serie</button>
    </div>
    <div style="margin-top:1rem"><canvas id="series-chart"></canvas></div>
    <div class="table-wrap" style="margin-top:1rem"><table><thead><tr><th>Fecha</th><th>Valor</th></tr></thead><tbody id="series-table"></tbody></table></div>`;
  const select = root.querySelector('#series-select');
  const table = root.querySelector('#series-table');
  const chart = root.querySelector('#series-chart');
  const paint = () => {
    const data = state.data.get(select.value) || [];
    table.innerHTML = data.slice(-40).reverse().map((r)=>`<tr><td>${r.date}</td><td>${formatN(r.value)}</td></tr>`).join('');
    drawLineChart(chart, data.slice(-220), { label: prioritizedSeries.find((s)=>s.key===select.value)?.name });
  };
  root.querySelector('#load-series').onclick = paint;
  root.querySelector('#search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    select.innerHTML = prioritizedSeries.filter((s)=>s.name.toLowerCase().includes(q)).map((s)=>`<option value="${s.key}">${s.name}</option>`).join('');
  };
  paint();
}

function renderComparator() {
  const opts = prioritizedSeries.map((s)=>`<option value="${s.key}">${s.name}</option>`).join('');
  root.innerHTML = `<div class="row"><select id="c1">${opts}</select><select id="c2">${opts}</select><button id="compare" class="primary">Comparar</button></div><div style="margin-top:1rem"><canvas id="cmp-chart"></canvas></div>`;
  root.querySelector('#c2').selectedIndex = 1;
  root.querySelector('#compare').onclick = () => {
    const a = state.data.get(root.querySelector('#c1').value) || [];
    const b = state.data.get(root.querySelector('#c2').value) || [];
    const normalize = (arr) => {
      const base = arr[0]?.value || 1;
      return arr.slice(-220).map((x) => ({ ...x, value: (x.value / base) * 100 }));
    };
    drawLineChart(root.querySelector('#cmp-chart'), normalize(a), { label: 'Índice base 100 (serie A)' });
    const over = document.createElement('p');
    over.className = 'muted';
    over.textContent = `Serie B (${root.querySelector('#c2').value}) último índice: ${formatN(normalize(b).at(-1)?.value)}`;
    root.appendChild(over);
  };
}

function renderModules() {
  root.innerHTML = '<div class="module-grid">' + Object.entries(moduleGroups).map(([mod, keys]) => {
    const rows = keys.map((k)=>{
      const m = prioritizedSeries.find((x)=>x.key===k);
      const v = calcVariations(state.data.get(k)||[]);
      return `<tr><td>${m?.name}</td><td>${formatN(v?.latest)}</td><td>${formatPct(v?.monthly)}</td></tr>`;
    }).join('');
    return `<article class="card"><div class="row" style="justify-content:space-between"><h3>${mod}</h3><span class="badge">Monitoreo temático</span></div><table><thead><tr><th>Variable</th><th>Nivel</th><th>Var. mensual</th></tr></thead><tbody>${rows}</tbody></table></article>`;
  }).join('') + '</div>';
}


function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout ${ms}ms en ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function checkApiHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch('/api/health', { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function render() {
  if (state.current === 'dashboard') return renderDashboard();
  if (state.current === 'series') return renderSeries();
  if (state.current === 'comparator') return renderComparator();
  renderModules();
}

async function bootstrap() {
  nav.innerHTML = views.map((v)=>`<button class="nav-btn ${v.id===state.current?'active':''}" data-id="${v.id}">${v.label}</button>`).join('');
  nav.onclick = (e) => e.target.dataset.id && setView(e.target.dataset.id);

  apiStatus.textContent = 'Verificando backend API…';
  const healthOk = await checkApiHealth();
  if (!healthOk) {
    apiStatus.textContent = 'Backend API no disponible (/api/health).';
  } else {
    apiStatus.textContent = 'Cargando series priorizadas…';
  }

  await Promise.all(prioritizedSeries.map(async (s) => {
    try {
      const data = await withTimeout(fetchSeries(s.id), 20000, `/api/series/${s.id}`);
      state.data.set(s.key, data);
    } catch (error) {
      state.data.set(s.key, []);
      state.errors.push(`${s.name}: ${error.message}`);
    }
  }));

  const loaded = [...state.data.values()].filter((x) => x.length).length;
  apiStatus.textContent = `Conexión lista · ${loaded}/${prioritizedSeries.length} series disponibles`;
  if (!loaded) {
    apiStatus.textContent = 'Sin datos: verificá /api/health y /api/series/1 en tu entorno';
  }
  render();
}


bootstrap();
