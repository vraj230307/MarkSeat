const express = require('express');
const cors = require('cors');
const { db } = require('./db');
const { router: authRouter, requireAdmin } = require('./auth');
const { router: queueRouter, sweepQueues } = require('./queue');
const { router: bookingRouter, sweepExpiredHolds } = require('./booking');

const app = express();
app.use(cors());
app.use(express.json());

const wrap = fn => (req, res, next) => {
  try { fn(req, res); }
  catch (e) { next(e); }
};

app.get('/health', (_, res) => res.json({ ok: true }));

// ---------- EVENTS ----------
app.get('/events', wrap((req, res) => {
  res.json(db.prepare(`
    SELECT e.*,
      (SELECT COUNT(*) FROM seats s WHERE s.event_id=e.id AND s.status='available') AS available_seats
    FROM events e ORDER BY starts_at`).all());
}));

app.get('/events/:id', wrap((req, res) => {
  const ev = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  res.json(ev);
}));

app.post('/events', requireAdmin, wrap((req, res) => {
  const { title, venue, starts_at, base_price = 0 } = req.body;
  if (!title || !venue || !starts_at)
    return res.status(400).json({ error: 'title, venue, starts_at required' });
  const r = db.prepare('INSERT INTO events (title,venue,starts_at,base_price) VALUES (?,?,?,?)')
    .run(title, venue, starts_at, base_price);
  res.status(201).json(db.prepare('SELECT * FROM events WHERE id=?').get(r.lastInsertRowid));
}));

app.put('/events/:id', requireAdmin, wrap((req, res) => {
  const cur = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if (!cur) return res.status(404).json({ error: 'Event not found' });
  const { title = cur.title, venue = cur.venue, starts_at = cur.starts_at,
          base_price = cur.base_price } = req.body;
  db.prepare('UPDATE events SET title=?,venue=?,starts_at=?,base_price=? WHERE id=?')
    .run(title, venue, starts_at, base_price, cur.id);
  res.json(db.prepare('SELECT * FROM events WHERE id=?').get(cur.id));
}));

app.delete('/events/:id', requireAdmin, wrap((req, res) => {
  const r = db.prepare('DELETE FROM events WHERE id=?').run(req.params.id);
  res.status(r.changes ? 204 : 404).end();
}));

// ---------- SEATS ----------
// Bulk-generate a grid: { rows: 5, cols: 10, price: 500 } -> A1..E10
app.post('/events/:id/seats/generate', requireAdmin, wrap((req, res) => {
  const ev = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  const { rows = 5, cols = 10, price = ev.base_price } = req.body;
  if (rows > 26 || rows < 1 || cols < 1 || cols > 100)
    return res.status(400).json({ error: 'rows 1-26, cols 1-100' });
  const ins = db.prepare('INSERT OR IGNORE INTO seats (event_id,label,price) VALUES (?,?,?)');
  const tx = db.transaction(() => {
    for (let r = 0; r < rows; r++)
      for (let c = 1; c <= cols; c++)
        ins.run(ev.id, String.fromCharCode(65 + r) + c, price);
  });
  tx();
  res.status(201).json({ created: rows * cols });
}));

app.get('/events/:id/seats', wrap((req, res) => {
  // Expired holds are treated as available when read (the sweeper cleans them up in Day 3).
  const now = Math.floor(Date.now() / 1000);
  const seats = db.prepare(`
    SELECT id,label,price,
      CASE WHEN status='held' AND hold_expires_at <= ? THEN 'available' ELSE status END AS status
    FROM seats WHERE event_id=? ORDER BY LENGTH(label), label`).all(now, req.params.id);
  res.json(seats);
}));

app.patch('/seats/:id', requireAdmin, wrap((req, res) => {
  const { price } = req.body;
  if (!Number.isInteger(price) || price < 0)
    return res.status(400).json({ error: 'price must be a non-negative integer' });
  const r = db.prepare('UPDATE seats SET price=? WHERE id=?').run(price, req.params.id);
  res.status(r.changes ? 200 : 404).json(r.changes ? { ok: true } : { error: 'Seat not found' });
}));

// Event log for Member 4's hash chain.
app.get('/admin/booking-log', requireAdmin, wrap((req, res) => {
  const after = +req.query.after || 0;
  res.json(db.prepare('SELECT * FROM booking_log WHERE id>? ORDER BY id LIMIT 1000').all(after));
}));

app.use('/auth', authRouter);
app.use(queueRouter);
app.use(bookingRouter);

app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

setInterval(() => {
  try { sweepExpiredHolds(); sweepQueues(); } catch (e) { console.error('sweep error', e); }
}, +process.env.SWEEP_MS || 5000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
