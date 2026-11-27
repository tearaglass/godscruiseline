const {
  handlePreflight,
  serverError,
  createSessionCookie,
  clearSessionCookie,
  getSession,
  safeEqual
} = require('./_lib');

// Slows down repeated guessing. Not a full rate limit.
const FAILED_ATTEMPT_DELAY_MS = 600;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async function handler(req, res) {
  if (handlePreflight(req, res)) {
    return;
  }

  // GET reports the current server-verified session level (or null).
  if (req.method === 'GET') {
    const session = getSession(req);
    return res.status(200).json({ success: true, level: session ? session.level : null });
  }

  // DELETE ends the session.
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ success: true });
  }

  if (req.method === 'POST') {
    const { passphrase } = req.body || {};
    const value = typeof passphrase === 'string' ? passphrase.trim() : '';

    if (!value) {
      return res.status(400).json({ success: false, error: 'Passphrase required' });
    }

    const witnessPassphrase = process.env.WITNESS_PASSPHRASE || '';
    const adminPassphrase = process.env.ADMIN_PASSPHRASE || '';

    let level = null;
    if (adminPassphrase && safeEqual(value, adminPassphrase)) {
      level = 'admin';
    } else if (witnessPassphrase && safeEqual(value, witnessPassphrase)) {
      level = 'witness';
    }

    if (!level) {
      await wait(FAILED_ATTEMPT_DELAY_MS);
      return res.status(401).json({ success: false, level: null });
    }

    try {
      // The signed HttpOnly cookie is what the other APIs check.
      res.setHeader('Set-Cookie', createSessionCookie(level));
    } catch (error) {
      // SESSION_SECRET missing: fail closed rather than grant an unverifiable level.
      return serverError(res, error);
    }
    return res.status(200).json({ success: true, level });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
