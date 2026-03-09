const { fetchSeriesFromBcra } = require('../_lib');

module.exports = async function handler(req, res) {
  const { id } = req.query;
  const seriesId = Number(id);
  if (!Number.isFinite(seriesId)) {
    return res.status(400).json({ error: 'invalid id' });
  }

  const result = await fetchSeriesFromBcra(seriesId);
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  return res.status(result.data.length ? 200 : 502).json(result);
};
