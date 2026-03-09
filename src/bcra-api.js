const API_TIMEOUT_MS = 15000;

export async function fetchSeries(id) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(`/api/series/${id}`, { signal: controller.signal });
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      const traces = Array.isArray(payload?.traces)
        ? payload.traces.slice(0, 2).join(' | ')
        : '';
      throw new Error(traces || `HTTP ${res.status}`);
    }

    return payload.data || [];
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Timeout ${API_TIMEOUT_MS}ms en /api/series/${id}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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
