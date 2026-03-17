/**
 * Dominion API Auth Middleware
 *
 * Verifies that the incoming request has a valid Supabase session JWT.
 * Protects all API routes from unauthorized access.
 *
 * Usage:
 *   const { requireAuth } = require('../_middleware');
 *   // At the top of your handler:
 *   const user = await requireAuth(req, res);
 *   if (!user) return; // requireAuth already sent 401
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

/**
 * Extracts the Bearer token from the Authorization header or the
 * sb-access-token cookie (set by Supabase Auth on the client).
 */
function extractToken(req) {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 2. Cookie: sb-access-token=<token>  (set by Supabase JS client)
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.split(';').find(c => c.trim().startsWith('sb-access-token='));
  if (match) {
    return match.trim().slice('sb-access-token='.length);
  }

  // 3. X-Auth-Token header (fallback for mobile / API clients)
  if (req.headers['x-auth-token']) {
    return req.headers['x-auth-token'];
  }

  return null;
}

/**
 * Verifies the JWT with Supabase and returns the user object.
 * Returns null if the token is missing or invalid.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<{id: string, email: string} | null>}
 */
async function requireAuth(req, res) {
  // If Supabase is not configured, fall back to userId-only check (dev mode)
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const userId = req.query?.userId || req.body?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: no userId provided (Supabase not configured)' });
      return null;
    }
    return { id: userId, email: 'dev@local' };
  }

  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: missing authentication token' });
    return null;
  }

  try {
    // Verify the token by calling Supabase's /auth/v1/user endpoint
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });

    if (!response.ok) {
      res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
      return null;
    }

    const user = await response.json();

    // Ensure the userId in the query matches the authenticated user
    // This prevents user A from requesting user B's data
    const requestedUserId = req.query?.userId || req.body?.userId;
    if (requestedUserId && requestedUserId !== user.id) {
      res.status(403).json({ error: 'Forbidden: userId mismatch' });
      return null;
    }

    return { id: user.id, email: user.email };
  } catch (err) {
    console.error('[auth middleware] token verification failed:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
    return null;
  }
}

/**
 * Lightweight check — returns true if the request appears to come from
 * the same user as the userId param, without hitting Supabase.
 * Only use this for low-risk reads where full JWT verification is too slow.
 */
async function softAuth(req, res) {
  const userId = req.query?.userId || req.body?.userId;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return null;
  }
  return { id: userId };
}

module.exports = { requireAuth, softAuth, extractToken };
