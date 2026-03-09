export function drawLineChart(canvas, series, { color = '#8ba4c2', label = '' } = {}) {
  const ctx = canvas.getContext('2d');
  const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
  const h = (canvas.height = canvas.clientHeight * devicePixelRatio);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, w, h);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const pad = { l: 55, r: 18, t: 18, b: 32 };
  const vals = series.map((s) => s.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const x = (i) => pad.l + (i / (series.length - 1 || 1)) * (width - pad.l - pad.r);
  const y = (v) => pad.t + ((max - v) / (max - min || 1)) * (height - pad.t - pad.b);
  ctx.strokeStyle = '#243141';
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, height-pad.b); ctx.lineTo(width-pad.r, height-pad.b); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath();
  series.forEach((p, i) => i ? ctx.lineTo(x(i), y(p.value)) : ctx.moveTo(x(i), y(p.value)));
  ctx.stroke();
  ctx.fillStyle = '#9eabb9'; ctx.font = '12px Inter';
  ctx.fillText(label, pad.l, 12);
  ctx.fillText(max.toLocaleString('es-AR'), 6, pad.t + 2);
  ctx.fillText(min.toLocaleString('es-AR'), 6, height - pad.b);
}
