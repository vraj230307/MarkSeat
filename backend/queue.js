const express = require('express');
const crypto = require('crypto');
const { db, logEvent, now, HttpError } = require('./db');
const { auth, requireAdmin } = require('./auth');
const { riskGate } = require('./riskGate');

const router = express.Router();
const BATCH = +process.env.QUEUE_BATCH || 50;               // max users admitted at once
const ADMISSION_SECONDS = +process.env.ADMISSION_SECONDS || 600;
const BYPASS = process.env.BYPASS_QUEUE === '1';
const wrap = fn => (req, res, next) => { try { fn(req, res, next); } catch (e) { next(e); } };

function shuffle(a) {                                        // Fisher-Yates with crypto RNG
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const admitNext = eventId => db.transaction(() => {
  const t = now();
  db.prepare(`UPDATE queue_entries SET status='expired' WHERE event_id=? AND status='admitted' AND admission_expires_at<=?`)
    .run(eventId, t);
  const active = db.prepare(`SELECT COUNT(*) c FROM queue_entries WHERE event_id=? AND status='admitted'`).get(eventId).c;
  const slots = BATCH - active;
  if (slots <= 0) return 0;
  const next = db.prepare(`SELECT id,user_id FROM queue_entries WHERE event_id=? AND status='waiting' AND position IS NOT NULL
                           ORDER BY position LIMIT ?`).all(eventId, slots);
  const up = db.prepare(`UPDATE queue_entries SET status='admitted', admitted_at=?, admission_expires_at=? WHERE id=?`);
  for (const e of next) {
    up.run(t, t + ADMISSION_SECONDS, e.id);
    logEvent('QUEUE_ADMITTED', { userId: e.user_id, eventId });
  }
  return next.length;
})();

function isAdmitted(eventId, userId) {
  if (BYPASS) return true;
  const e = db.prepare(`SELECT 1 FROM queue_entries WHERE event_id=? AND user_id=? AND status='admitted' AND admission_expires_at>?`)
    .get(eventId, userId, now());
  return !!e;
}

function markDone(eventId, userId) {
  db.prepare(`UPDATE queue_entries SET status='done' WHERE event_id=? AND user_id=? AND status='admitted'`).run(eventId, userId);
}

function sweepQueues() {
  for (const e of db.prepare(`SELECT id FROM events WHERE queue_state='drawn'`).all()) admitNext(e.id);
}

function statusFor(eventId, userId) {
  const ev = db.prepare('SELECT queue_state FROM events WHERE id=?').get(eventId);
  const q = db.prepare('SELECT * FROM queue_entries WHERE event_id=? AND user_id=?').get(eventId, userId);
  if (!q) return null;
  const out = { event_id: eventId, status: q.status, queue_state: ev.queue_state, position: q.position };
  if (q.status === 'waiting' && q.position)
    out.ahead = db.prepare(`SELECT COUNT(*) c FROM queue_entries WHERE event_id=? AND status='waiting' AND position<?`).get(eventId, q.position).c;
  if (q.status === 'admitted') out.admission_expires_at = q.admission_expires_at;
  if (ev.queue_state === 'open') out.message = 'Waiting for the draw. Joining early gives no advantage.';
  return out;
}

router.post('/events/:id/queue/join', auth, riskGate, wrap((req, res) => {
  const eventId = +req.params.id, uid = req.user.id;
  const ev = db.prepare('SELECT * FROM events WHERE id=?').get(eventId);
  if (!ev) throw new HttpError(404, 'Event not found');
  db.transaction(() => {
    const cur = db.prepare('SELECT * FROM queue_entries WHERE event_id=? AND user_id=?').get(eventId, uid);
    const nextPos = () => db.prepare('SELECT COALESCE(MAX(position),0)+1 p FROM queue_entries WHERE event_id=?').get(eventId).p;
    if (!cur) {
      db.prepare('INSERT INTO queue_entries (event_id,user_id,position) VALUES (?,?,?)')
        .run(eventId, uid, ev.queue_state === 'drawn' ? nextPos() : null);
      logEvent('QUEUE_JOINED', { userId: uid, eventId });
    } else if (cur.status === 'expired' && ev.queue_state === 'drawn') {
      db.prepare(`UPDATE queue_entries SET status='waiting', position=? WHERE id=?`).run(nextPos(), cur.id);
      logEvent('QUEUE_REJOINED', { userId: uid, eventId });
    }
  })();
  if (ev.queue_state === 'drawn') admitNext(eventId);
  res.status(201).json(statusFor(eventId, uid));
}));

router.get('/events/:id/queue/status', auth, wrap((req, res) => {
  const s = statusFor(+req.params.id, req.user.id);
  if (!s) return res.status(404).json({ error: 'You have not joined this queue' });
  res.json(s);
}));

// Admin: close the join window, shuffle everyone fairly, start admitting.
router.post('/events/:id/queue/draw', requireAdmin, wrap((req, res) => {
  const eventId = +req.params.id;
  const count = db.transaction(() => {
    const ev = db.prepare('SELECT * FROM events WHERE id=?').get(eventId);
    if (!ev) throw new HttpError(404, 'Event not found');
    if (ev.queue_state === 'drawn') throw new HttpError(409, 'Queue already drawn');
    const ids = shuffle(db.prepare(`SELECT id FROM queue_entries WHERE event_id=? AND status='waiting'`).all(eventId).map(r => r.id));
    const up = db.prepare('UPDATE queue_entries SET position=? WHERE id=?');
    ids.forEach((id, i) => up.run(i + 1, id));
    db.prepare(`UPDATE events SET queue_state='drawn' WHERE id=?`).run(eventId);
    logEvent('QUEUE_DRAWN', { eventId, payload: { participants: ids.length } });
    return ids.length;
  })();
  const admitted = admitNext(eventId);
  res.json({ participants: count, admitted });
}));

module.exports = { router, admitNext, isAdmitted, markDone, sweepQueues };
