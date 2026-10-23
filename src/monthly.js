// Splits consumption entries into calendar months.
// A month entry goes fully to that month; a year or date-range entry is spread
// across the months it covers, in proportion to the number of days in each.

const DAY = 24 * 60 * 60 * 1000;
const toUTC = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const key = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;

function splitByMonth(entry) {
  const start = toUTC(entry.start_date);
  const end = toUTC(entry.end_date);
  const totalDays = Math.round((end - start) / DAY) + 1;
  const parts = [];

  let cur = new Date(start);
  while (cur.getTime() <= end) {
    const y = cur.getUTCFullYear(), m = cur.getUTCMonth();
    const monthEnd = Date.UTC(y, m + 1, 0);
    const sliceEnd = Math.min(monthEnd, end);
    const days = Math.round((sliceEnd - cur.getTime()) / DAY) + 1;
    const share = days / totalDays;
    parts.push({ month: key(y, m), kwh: entry.kwh * share, paid: entry.amount_paid * share });
    cur = new Date(Date.UTC(y, m + 1, 1));
  }
  return parts;
}

// entries: [{ property_id, property_name, start_date, end_date, kwh, amount_paid }]
// returns { years: [...], byYear: { 2026: { labels, properties: [{name, kwh[12]}], paid[12] } } }
function buildMonthlyData(entries) {
  const byYear = {};
  for (const e of entries) {
    for (const p of splitByMonth(e)) {
      const [y, m] = p.month.split('-').map(Number);
      const yr = (byYear[y] ??= { properties: {}, paid: Array(12).fill(0), has: Array(12).fill(false) });
      yr.has[m - 1] = true;
      const prop = (yr.properties[e.property_id] ??= { name: e.property_name, kwh: Array(12).fill(0) });
      prop.kwh[m - 1] += p.kwh;
      yr.paid[m - 1] += p.paid;
    }
  }
  const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;
  const out = {};
  for (const [y, data] of Object.entries(byYear)) {
    out[y] = {
      properties: Object.values(data.properties).map(p => ({ name: p.name, kwh: p.kwh.map(v => round(v, 1)) })),
      paid: data.paid.map((v, i) => data.has[i] ? round(v, 2) : null), // null = no data, leaves a gap
    };
  }
  const years = Object.keys(out).map(Number).sort((a, b) => b - a);
  return { years, byYear: out };
}

module.exports = { buildMonthlyData, splitByMonth };
