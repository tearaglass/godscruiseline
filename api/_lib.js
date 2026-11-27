// Shared helpers for the API routes.
// Files starting with "_" inside api/ are not exposed as routes by Vercel.

const crypto = require('crypto');

const SESSION_COOKIE = 'gc_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

// ---------- Supabase ----------

function getSupabase() {
  // Required lazily so auth.js does not need the dependency loaded.
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment is not configured');
  }
  return createClient(url, key);
}

// ---------- Responses ----------

// No CORS headers on purpose: the site calls its own API from the same
// origin, so cross-origin access is not needed and stays blocked by default.
function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

// Log details on the server, return a generic message to the client.
function serverError(res, error) {
  console.error(error);
  return res.status(500).json({ success: false, error: 'Internal error' });
}

// ---------- Session cookie ----------
// Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)

function getSecret() {
  return process.env.SESSION_SECRET || '';
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function createSessionCookie(level) {
  const secret = getSecret();
  if (!secret) {
    throw new Error('SESSION_SECRET is not set');
  }
  const payload = Buffer.from(
    JSON.stringify({ level, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })
  ).toString('base64url');
  const token = `${payload}.${sign(payload, secret)}`;
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function readCookie(req, name) {
  const header = req.headers?.cookie || '';
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : '';
}

// Returns { level } for a valid, unexpired session, otherwise null.
function getSession(req) {
  const secret = getSecret();
  const token = readCookie(req, SESSION_COOKIE);
  if (!secret || !token) {
    return null;
  }
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { level: data.level };
  } catch (error) {
    return null;
  }
}

function isAdminRequest(req) {
  return getSession(req)?.level === 'admin';
}

// ---------- Validation ----------

const ALLOWED = {
  status: ['public', 'registered', 'authorized', 'restricted'],
  division: ['broadcast', 'works', 'research', 'narrative', 'exchange', 'access'],
  medium: ['text', 'audio', 'video', 'system', 'image', 'dataset', 'artifact'],
  archival_state: ['active', 'archived', 'decayed']
};

// Keep only known columns, so clients cannot set created_at, updated_at, etc.
function pickFields(body, fields) {
  const result = {};
  if (!body || typeof body !== 'object') {
    return result;
  }
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      result[field] = body[field];
    }
  });
  return result;
}

// Returns an error string, or null when the values are acceptable.
function checkEnums(data) {
  for (const [field, allowed] of Object.entries(ALLOWED)) {
    if (data[field] !== undefined && data[field] !== null && !allowed.includes(data[field])) {
      return `Invalid ${field}`;
    }
  }
  return null;
}

module.exports = {
  getSupabase,
  handlePreflight,
  serverError,
  createSessionCookie,
  clearSessionCookie,
  getSession,
  isAdminRequest,
  safeEqual,
  pickFields,
  checkEnums
};
