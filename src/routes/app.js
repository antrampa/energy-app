const router = require('express').Router();
const db = require('../db');
const { ensureAuth } = require('../auth');

router.use(ensureAuth);

// ---------- Profile ----------
router.get('/profile', (req, res) => res.render('profile'));
router.post('/profile', (req, res) => {
  const { full_name, phone, country, currency } = req.body;
  db.prepare('UPDATE users SET full_name=?, phone=?, country=?, currency=? WHERE id=?')
    .run(full_name, phone, country, currency || 'EUR', req.user.id);
  req.flash('success', 'Profile saved');
  res.redirect('/dashboard');
});

// ---------- Dashboard ----------
router.get('/dashboard', (req, res) => {
  const properties = db.prepare(`
    SELECT p.*, COUNT(c.id) AS entries, IFNULL(SUM(c.kwh),0) AS total_kwh, IFNULL(SUM(c.amount_paid),0) AS total_paid
    FROM properties p LEFT JOIN consumptions c ON c.property_id = p.id
    WHERE p.user_id = ? GROUP BY p.id ORDER BY p.name`).all(req.user.id);
  res.render('dashboard', { properties });
});

// ---------- Properties ----------
const getProperty = (id, userId) =>
  db.prepare('SELECT * FROM properties WHERE id = ? AND user_id = ?').get(id, userId);

router.get('/properties/new', (req, res) => res.render('property-form', { property: {} }));
router.post('/properties', (req, res) => {
  const { name, address, residents, devices, notes } = req.body;
  if (!name?.trim()) { req.flash('error', 'Property name is required'); return res.redirect('/properties/new'); }
  const info = db.prepare('INSERT INTO properties (user_id,name,address,residents,devices,notes) VALUES (?,?,?,?,?,?)')
    .run(req.user.id, name.trim(), address, parseInt(residents) || 1, devices, notes);
  res.redirect(`/properties/${info.lastInsertRowid}`);
});

router.get('/properties/:id', (req, res) => {
  const property = getProperty(req.params.id, req.user.id);
  if (!property) return res.status(404).send('Not found');
  const entries = db.prepare('SELECT * FROM consumptions WHERE property_id = ? ORDER BY start_date DESC').all(property.id);
  res.render('property', { property, entries });
});

router.get('/properties/:id/edit', (req, res) => {
  const property = getProperty(req.params.id, req.user.id);
  if (!property) return res.status(404).send('Not found');
  res.render('property-form', { property });
});
router.post('/properties/:id', (req, res) => {
  const property = getProperty(req.params.id, req.user.id);
  if (!property) return res.status(404).send('Not found');
  const { name, address, residents, devices, notes } = req.body;
  db.prepare('UPDATE properties SET name=?,address=?,residents=?,devices=?,notes=? WHERE id=?')
    .run(name.trim(), address, parseInt(residents) || 1, devices, notes, property.id);
  res.redirect(`/properties/${property.id}`);
});
router.post('/properties/:id/delete', (req, res) => {
  db.prepare('DELETE FROM properties WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.redirect('/dashboard');
});

// ---------- Consumption ----------
// Turns the form input into a start/end date pair
function resolvePeriod({ period_type, start_date, end_date, month, year }) {
  const pad = n => String(n).padStart(2, '0');
  if (period_type === 'month' && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(last)}` };
  }
  if (period_type === 'year' && /^\d{4}$/.test(year)) return { start: `${year}-01-01`, end: `${year}-12-31` };
  if (period_type === 'range' && start_date && end_date && start_date <= end_date) return { start: start_date, end: end_date };
  return null;
}

router.post('/properties/:id/consumptions', (req, res) => {
  const property = getProperty(req.params.id, req.user.id);
  if (!property) return res.status(404).send('Not found');
  const period = resolvePeriod(req.body);
  const kwh = parseFloat(req.body.kwh), amount = parseFloat(req.body.amount_paid);
  if (!period) { req.flash('error', 'Please choose a valid period'); return res.redirect(`/properties/${property.id}`); }
  if (!(kwh >= 0) || !(amount >= 0)) { req.flash('error', 'kWh and amount must be positive numbers'); return res.redirect(`/properties/${property.id}`); }
  db.prepare(`INSERT INTO consumptions (property_id,period_type,start_date,end_date,kwh,amount_paid,notes)
              VALUES (?,?,?,?,?,?,?)`)
    .run(property.id, req.body.period_type, period.start, period.end, kwh, amount, req.body.notes);
  req.flash('success', 'Consumption added');
  res.redirect(`/properties/${property.id}`);
});

router.post('/consumptions/:id/delete', (req, res) => {
  const row = db.prepare(`SELECT c.property_id FROM consumptions c JOIN properties p ON p.id = c.property_id
                          WHERE c.id = ? AND p.user_id = ?`).get(req.params.id, req.user.id);
  if (!row) return res.status(404).send('Not found');
  db.prepare('DELETE FROM consumptions WHERE id = ?').run(req.params.id);
  res.redirect(`/properties/${row.property_id}`);
});

module.exports = router;
