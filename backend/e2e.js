// Run: node test/e2e.js   (spawns its own server on :3999 with a temp DB)
const { spawn } = require('child_process');
const fs = require('fs');
const PORT = 3999, BASE = `http://localhost:${PORT}`, DB = '/tmp/e2e-test.db';
for (const f of [DB, DB + '-wal', DB + '-shm']) fs.rmSync(f, { force: true });

const server = spawn('node', ['server.js'], {
  env: { ...process.env, PORT, DB_FILE: DB, DEV_OTP: '1', BCRYPT_ROUNDS: '4', HOLD_SECONDS: '2',
         SWEEP_MS: '500', QUEUE_BATCH: '100', ADMIN_EMAILS: 'admin@test.com' },
  stdio: ['ignore', 'ignore', 'inherit'],
});

let passed = 0, failed = 0;
const check = (name, cond, extra = '') => {
  cond ? passed++ : failed++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${cond ? '' : extra}`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(method, path, body, token) {
  const r = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
async function mkUser(email) {
  const r = await api('POST', '/auth/register', { name: email.split('@')[0], email, password: 'password123' });
  const v = await api('POST', '/auth/verify-otp', { email, otp: r.data.dev_otp });
  return v.data.token;
}

(async () => {
  try {
    for (let i = 0; i < 30 && !(await fetch(BASE + '/health').catch(() => null)); i++) await sleep(200);

    // Auth
    const reg = await api('POST', '/auth/register', { name: 'x', email: 'x@test.com', password: 'password123' });
    const login0 = await api('POST', '/auth/login', { email: 'x@test.com', password: 'password123' });
    check('login blocked before OTP verify', login0.status === 403);
    const badOtp = await api('POST', '/auth/verify-otp', { email: 'x@test.com', otp: '000000' });
    check('wrong OTP rejected', badOtp.status === 400);
    const ver = await api('POST', '/auth/verify-otp', { email: 'x@test.com', otp: reg.data.dev_otp });
    check('OTP verify returns JWT', ver.status === 200 && !!ver.data.token);
    const login1 = await api('POST', '/auth/login', { email: 'x@test.com', password: 'password123' });
    check('login after verify works', login1.status === 200);
    check('wrong password rejected', (await api('POST', '/auth/login', { email: 'x@test.com', password: 'nope12345' })).status === 401);
    await api('POST', '/auth/logout', {}, login1.data.token);
    check('revoked session rejected', (await api('GET', '/auth/me', null, login1.data.token)).status === 401);

    // Admin + event
    const admin = await mkUser('admin@test.com');
    check('non-admin cannot create event', (await api('POST', '/events', { title: 'a', venue: 'b', starts_at: 'c' }, ver.data.token)).status === 403);
    const ev = await api('POST', '/events', { title: 'Show', venue: 'Arena', starts_at: '2026-12-01T19:00', base_price: 100 }, admin);
    await api('POST', `/events/${ev.data.id}/seats/generate`, { rows: 1, cols: 6 }, admin);
    const seats = (await api('GET', `/events/${ev.data.id}/seats`)).data;
    const E = ev.data.id;
    check('6 seats generated', seats.length === 6);

    // Queue
    const users = await Promise.all(Array.from({ length: 50 }, (_, i) => mkUser(`u${i}@test.com`)));
    const outsider = await mkUser('outsider@test.com');
    await Promise.all(users.map(t => api('POST', `/events/${E}/queue/join`, null, t)));
    check('hold blocked before queue draw', (await api('POST', '/seats/hold', { event_id: E, seat_ids: [seats[0].id] }, users[0])).status === 403);
    const draw = await api('POST', `/events/${E}/queue/draw`, null, admin);
    check('draw admits all 50', draw.data.participants === 50 && draw.data.admitted === 50);
    const pos = (await Promise.all(users.slice(0, 5).map(t => api('GET', `/events/${E}/queue/status`, null, t)))).map(r => r.data.position);
    console.log('      first 5 users got positions (random):', pos.join(','));
    check('queue status shows admitted', (await api('GET', `/events/${E}/queue/status`, null, users[0])).data.status === 'admitted');
    check('non-queued user cannot hold', (await api('POST', '/seats/hold', { event_id: E, seat_ids: [seats[0].id] }, outsider)).status === 403);
    check('unauthenticated hold -> 401', (await api('POST', '/seats/hold', { event_id: E, seat_ids: [seats[0].id] })).status === 401);

    // Race condition: 50 users, 1 seat
    const race = await Promise.all(users.map(t => api('POST', '/seats/hold', { event_id: E, seat_ids: [seats[0].id] }, t)));
    const winners = race.filter(r => r.status === 201);
    check('exactly 1 of 50 concurrent holds wins', winners.length === 1 && race.filter(r => r.status === 409).length === 49,
      `winners=${winners.length}`);
    const winnerIdx = race.findIndex(r => r.status === 201);
    const bid = winners[0].data.booking_id;

    // All-or-nothing multi-seat hold
    const multi = await api('POST', '/seats/hold', { event_id: E, seat_ids: [seats[1].id, seats[0].id] }, users[(winnerIdx + 1) % 50]);
    const s1 = (await api('GET', `/events/${E}/seats`)).data.find(s => s.id === seats[1].id);
    check('multi-seat hold rolls back fully on conflict', multi.status === 409 && s1.status === 'available');

    // Payment
    const pay = await api('POST', `/bookings/${bid}/pay`, { simulate: 'success' }, users[winnerIdx]);
    check('payment success issues ticket', pay.status === 200 && pay.data.tickets.length === 1);
    check('double pay rejected', (await api('POST', `/bookings/${bid}/pay`, { simulate: 'success' }, users[winnerIdx])).status === 409);
    check('seat now booked', (await api('GET', `/events/${E}/seats`)).data[0].status === 'booked');
    check('/me/tickets lists ticket', (await api('GET', '/me/tickets', null, users[winnerIdx])).data.length === 1);

    const others = users.filter((_, i) => i !== winnerIdx);   // winner is 'done' in the queue after paying
    // Failed payment releases seat
    const h2 = await api('POST', '/seats/hold', { event_id: E, seat_ids: [seats[2].id] }, others[0]);
    const fail = await api('POST', `/bookings/${h2.data.booking_id}/pay`, { simulate: 'fail' }, others[0]);
    check('failed payment -> 402 and seat released', fail.status === 402 &&
      (await api('GET', `/events/${E}/seats`)).data[2].status === 'available');

    // Auto-release after timeout
    const h3 = await api('POST', '/seats/hold', { event_id: E, seat_ids: [seats[3].id] }, others[1]);
    check('hold shows as held', (await api('GET', `/events/${E}/seats`)).data[3].status === 'held');
    await sleep(3500);
    check('hold auto-released after timeout', (await api('GET', `/events/${E}/seats`)).data[3].status === 'available');
    const late = await api('POST', `/bookings/${h3.data.booking_id}/pay`, { simulate: 'success' }, others[1]);
    check('paying an expired hold is refused', late.status === 409 || late.status === 410);
    const again = await api('POST', '/seats/hold', { event_id: E, seat_ids: [seats[3].id] }, others[2]);
    check('released seat can be held by someone else', again.status === 201);

    // Manual cancel + log
    const c = await api('DELETE', `/bookings/${again.data.booking_id}/hold`, null, others[2]);
    check('manual hold cancel works', c.status === 200);
    const log = (await api('GET', '/admin/booking-log', null, admin)).data;
    const types = new Set(log.map(l => l.event_type));
    check('booking_log has all event types', ['QUEUE_JOINED', 'QUEUE_DRAWN', 'SEAT_HELD', 'HOLD_RELEASED', 'PAYMENT_OK', 'PAYMENT_FAILED', 'TICKET_ISSUED']
      .every(t => types.has(t)), [...types].join(','));
    const heldLogs = log.filter(l => l.event_type === 'SEAT_HELD' && l.seat_id === seats[0].id).length;
    check('losing racers were not logged as holds', heldLogs === 1, `heldLogs=${heldLogs}`);
  } catch (e) { failed++; console.error('TEST CRASH', e); }
  console.log(`\n${passed} passed, ${failed} failed`);
  server.kill();
  process.exit(failed ? 1 : 0);
})();
