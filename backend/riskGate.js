// Stub for the Risk Engine. Replace the body with a call to the risk service.
// Must return { decision: 'allow' | 'challenge' | 'block', reason? }
function evaluate(req) { return { decision: 'allow' }; }

function riskGate(req, res, next) {
  const r = evaluate(req);
  if (r.decision === 'block') return res.status(403).json({ error: 'Blocked by risk engine', reason: r.reason });
  if (r.decision === 'challenge') return res.status(428).json({ error: 'Challenge required', reason: r.reason });
  next();
}
module.exports = { riskGate, evaluate };
