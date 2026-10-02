const express = require('express');
const crypto = require('crypto');
const { db, logEvent, now, HttpError } = require('./db');
const { auth } = require('./auth');
const { riskGate } = require('./riskGate');
const { isAdmitted, admitNext, markDone } = require('./queue');

const router = express.Router();
const HOLD_SECONDS = +process.env.HOLD_SECONDS || 300;
const MAX_SEATS = +process.env.MAX_SEATS || 4;
const wrap = fn => (req, res, next) => { try { fn(req, res, next); } catch (e) { next(e); } };

// Release every seat still held for a booking and close the booking. Call inside a transaction.
function releaseBooking(bookingId, newStatus, reason) {
  const seats = db.prepare(`SELECT id,event_id,held_by FROM seats WHERE booking_id=? AND status='held'`).all(bookingId);
  db.prepare(`UPDATE seats SET status='available',held_by=NULL,hold_expires_at=NULL,booking_id=NULL
              WHERE booking_id=? AND status='held'`).run(bookingId);
  db.prepare(`UPDATE bookings SET status=? WHERE id=? AND status='pending'`).run(newStatus, bookingId);
  for (const s of seats)
    logEvent('HOLD_RELEASED', { userId: s.held_by, eventId: s.event_id, seatId: s.id, bookingId, payload: { reason } });
}

// Auto-release timer: runs on an interval from server.js.
function sweepExpiredHolds() {
  const expired = db.prepare(`SELECT id FROM bookings WHERE status='pending' AND expires_at<=?`).all(now());
  for (const b of expired) db.transaction(() => releaseBooking(b.id, 'expired', 'timeout'))();
}

// ---- Atomic hold: all requested seats or none. ----
router.post('/seats/hold', auth, riskGate, wrap((req, res) => {
  const eventId = +req.body.event_id;
  const seatIds = [...new Set(req.body.seat_ids)];
  if (!Number.isInteger(eventId) || !Array.isArray(req.body.seat_ids) || !seatIds.length || !seatIds.every(Number.isInteger))
    throw new HttpError(400, 'event_id and seat_ids[] required');
  if (seatIds.length > MAX_SEATS) throw new HttpError(400, `Max ${MAX_SEATS} seats per booking`);
  if (!isAdmitted(eventId, req.user.id)) throw new HttpError(403, 'You are not admitted from the queue for this event');

  const result = db.transaction(() => {
    const t = now(), exp = t + HOLD_SECONDS;
    const mine = db.prepare(`SELECT COUNT(*) c FROM seats WHERE event_id=? AND held_by=? AND status IN ('held','booked')
                             AND (status='booked' OR hold_expires_at>?)`).get(eventId, req.user.id, t).c;
    if (mine + seatIds.length > MAX_SEATS) throw new HttpError(409, `Limit of ${MAX_SEATS} seats per user for this event`);

    const b = db.prepare(`INSERT INTO bookings (user_id,event_id,seat_count,expires_at) VALUES (?,?,?,?)`)
      .run(req.user.id, eventId, seatIds.length, exp);
    const bookingId = b.lastInsertRowid;
    // The WHERE clause is the lock: it only matches if the seat is free (or its hold lapsed).
    const lock = db.prepare(`UPDATE seats SET status='held', held_by=?, hold_expires_at=?, booking_id=?
                             WHERE id=? AND event_id=? AND (status='available' OR (status='held' AND hold_expires_at<=?))`);
    let total = 0;
    for (const sid of seatIds) {
      if (lock.run(req.user.id, exp, bookingId, sid, eventId, t).changes === 0)
        throw new HttpError(409, `Seat ${sid} is not available`);          // rolls back everything
      total += db.prepare('SELECT price FROM seats WHERE id=?').get(sid).price;
      logEvent('SEAT_HELD', { userId: req.user.id, eventId, seatId: sid, bookingId, payload: { expires_at: exp } });
    }
    db.prepare('UPDATE bookings SET total=? WHERE id=?').run(total, bookingId);
    return { booking_id: bookingId, seat_ids: seatIds, total, hold_expires_at: exp };
  })();
  res.status(201).json(result);
}));

// ---- Mock payment ----
function mockCharge(body) {
  if (process.env.NODE_ENV !== 'production' && (body.simulate === 'success' || body.simulate === 'fail'))
    return body.simulate === 'success';
  return Math.random() < 0.9;
}

router.post('/bookings/:id/pay', auth, wrap((req, res) => {
  const out = db.transaction(() => {
    const b = db.prepare('SELECT * FROM bookings WHERE id=?').get(+req.params.id);
    if (!b || b.user_id !== req.user.id) throw new HttpError(404, 'Booking not found');
    if (b.status !== 'pending') throw new HttpError(409, `Booking is already ${b.status}`);
    const t = now();
    const owned = db.prepare(`SELECT id FROM seats WHERE booking_id=? AND status='held' AND held_by=? AND hold_expires_at>?`)
      .all(b.id, req.user.id, t);
    if (b.expires_at <= t || owned.length !== b.seat_count) {
      releaseBooking(b.id, 'expired', 'hold_expired_at_payment');
      return { code: 410, body: { error: 'Hold expired. Seats were released.' }, eventId: b.event_id };
    }
    if (!mockCharge(req.body || {})) {
      logEvent('PAYMENT_FAILED', { userId: b.user_id, eventId: b.event_id, bookingId: b.id, payload: { total: b.total } });
      releaseBooking(b.id, 'failed', 'payment_failed');
      return { code: 402, body: { error: 'Payment failed. Seats were released.' }, eventId: b.event_id };
    }
    const ref = 'PAY-' + crypto.randomBytes(6).toString('hex').toUpperCase();
    db.prepare(`UPDATE seats SET status='booked', hold_expires_at=NULL WHERE booking_id=? AND status='held'`).run(b.id);
    db.prepare(`UPDATE bookings SET status='paid', payment_ref=? WHERE id=?`).run(ref, b.id);
    logEvent('PAYMENT_OK', { userId: b.user_id, eventId: b.event_id, bookingId: b.id, payload: { total: b.total, ref } });
    const tickets = [];
    for (const s of owned) {
      const code = 'TKT-' + crypto.randomBytes(8).toString('hex').toUpperCase();
      const r = db.prepare('INSERT INTO tickets (booking_id,seat_id,user_id,code) VALUES (?,?,?,?)').run(b.id, s.id, b.user_id, code);
      logEvent('TICKET_ISSUED', { userId: b.user_id, eventId: b.event_id, seatId: s.id, bookingId: b.id, payload: { ticket_id: r.lastInsertRowid, code } });
      tickets.push({ id: r.lastInsertRowid, seat_id: s.id, code });
    }
    markDone(b.event_id, b.user_id);
    return { code: 200, body: { booking_id: b.id, status: 'paid', payment_ref: ref, total: b.total, tickets }, eventId: b.event_id };
  })();
  admitNext(out.eventId);                       // freed slot -> next person in line
  res.status(out.code).json(out.body);
}));

// ---- Cancel a hold manually ----
router.delete('/bookings/:id/hold', auth, wrap((req, res) => {
  db.transaction(() => {
    const b = db.prepare('SELECT * FROM bookings WHERE id=?').get(+req.params.id);
    if (!b || b.user_id !== req.user.id) throw new HttpError(404, 'Booking not found');
    if (b.status !== 'pending') throw new HttpError(409, `Booking is already ${b.status}`);
    releaseBooking(b.id, 'cancelled', 'user_cancelled');
  })();
  res.json({ message: 'Hold released' });
}));

// ---- Read endpoints ----
router.get('/bookings/:id', auth, wrap((req, res) => {
  const b = db.prepare('SELECT * FROM bookings WHERE id=? AND user_id=?').get(+req.params.id, req.user.id);
  if (!b) throw new HttpError(404, 'Booking not found');
  const seats = db.prepare('SELECT id,label,price FROM seats WHERE booking_id=?').all(b.id);
  const tickets = db.prepare('SELECT id,seat_id,code,status FROM tickets WHERE booking_id=?').all(b.id);
  res.json({ ...b, seats, tickets });
}));

router.get('/me/bookings', auth, wrap((req, res) => {
  res.json(db.prepare('SELECT * FROM bookings WHERE user_id=? ORDER BY id DESC').all(req.user.id));
}));

router.get('/me/tickets', auth, wrap((req, res) => {
  res.json(db.prepare(`SELECT t.id,t.code,t.status,t.version,e.title AS event,e.venue,e.starts_at,s.label AS seat
    FROM tickets t JOIN seats s ON s.id=t.seat_id JOIN events e ON e.id=s.event_id
    WHERE t.user_id=? ORDER BY t.id DESC`).all(req.user.id));
}));

module.exports = { router, sweepExpiredHolds };
