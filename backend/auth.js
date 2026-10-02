const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, now } = require('./db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ROUNDS = +process.env.BCRYPT_ROUNDS || 10;
const OTP_TTL = 300, SESSION_TTL = 2 * 3600, MAX_OTP_ATTEMPTS = 5, RESEND_COOLDOWN = 30;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const wrap = fn => (req, res, next) => { try { fn(req, res, next); } catch (e) { next(e); } };

function sendOtp(user) {
  const otp = String(crypto.randomInt(100000, 1000000));
  const t = now();
  db.prepare(`UPDATE users SET otp_hash=?, otp_expires_at=?, otp_sent_at=?, otp_attempts=0 WHERE id=?`)
    .run(sha(otp), t + OTP_TTL, t, user.id);
  console.log(`[OTP] ${user.email}: ${otp}`);   // swap for email/SMS provider
  return otp;
}

function issueToken(user) {
  const jti = crypto.randomUUID();
  db.prepare('INSERT INTO sessions (jti,user_id,expires_at) VALUES (?,?,?)').run(jti, user.id, now() + SESSION_TTL);
  return jwt.sign({ sub: user.id, role: user.role, jti }, JWT_SECRET, { expiresIn: SESSION_TTL });
}

const publicUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, verified: !!u.verified });
const devOtp = otp => (process.env.DEV_OTP === '0' ? {} : { dev_otp: otp });

router.post('/register', wrap((req, res) => {
  const { name, password } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'name and valid email required' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' });
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email))
    return res.status(409).json({ error: 'Email already registered' });
  const role = ADMIN_EMAILS.includes(email) ? 'admin' : 'user';
  const r = db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
    .run(name, email, bcrypt.hashSync(password, ROUNDS), role);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid);
  const otp = sendOtp(user);
  res.status(201).json({ message: 'Registered. Verify the OTP sent to you.', user: publicUser(user), ...devOtp(otp) });
}));

router.post('/resend-otp', wrap((req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || user.verified) return res.json({ message: 'If the account needs verification, an OTP was sent.' });
  if (user.otp_sent_at && now() - user.otp_sent_at < RESEND_COOLDOWN)
    return res.status(429).json({ error: `Wait ${RESEND_COOLDOWN}s before requesting another OTP` });
  const otp = sendOtp(user);
  res.json({ message: 'OTP sent', ...devOtp(otp) });
}));

router.post('/verify-otp', wrap((req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '');
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !user.otp_hash) return res.status(400).json({ error: 'Invalid or expired OTP' });
  if (user.otp_attempts >= MAX_OTP_ATTEMPTS) return res.status(429).json({ error: 'Too many attempts. Request a new OTP.' });
  if (now() > user.otp_expires_at) return res.status(400).json({ error: 'Invalid or expired OTP' });
  const ok = crypto.timingSafeEqual(Buffer.from(sha(otp)), Buffer.from(user.otp_hash));
  if (!ok) {
    db.prepare('UPDATE users SET otp_attempts=otp_attempts+1 WHERE id=?').run(user.id);
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }
  db.prepare('UPDATE users SET verified=1, otp_hash=NULL, otp_expires_at=NULL, otp_attempts=0 WHERE id=?').run(user.id);
  res.json({ token: issueToken(user), user: publicUser({ ...user, verified: 1 }) });
}));

router.post('/login', wrap((req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !bcrypt.compareSync(String(req.body.password || ''), user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.verified) return res.status(403).json({ error: 'Account not verified. Verify your OTP first.' });
  res.json({ token: issueToken(user), user: publicUser(user) });
}));

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    const p = jwt.verify(h.slice(7), JWT_SECRET);
    const s = db.prepare('SELECT revoked, expires_at FROM sessions WHERE jti=?').get(p.jti);
    if (!s || s.revoked || s.expires_at <= now()) return res.status(401).json({ error: 'Session expired or revoked' });
    req.user = { id: p.sub, role: p.role, jti: p.jti };
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function requireAdmin(req, res, next) {
  auth(req, res, () => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin only' }));
}

router.get('/me', auth, wrap((req, res) => {
  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)));
}));

router.post('/logout', auth, wrap((req, res) => {
  db.prepare('UPDATE sessions SET revoked=1 WHERE jti=?').run(req.user.jti);
  res.json({ message: 'Logged out' });
}));

module.exports = { router, auth, requireAdmin };
