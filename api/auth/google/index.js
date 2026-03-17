/**
 * /api/auth/google
 *
 * FIX (Claude audit): Now generates a cryptographic nonce, stores it as a
 * signed HttpOnly cookie, and embeds it in the OAuth state parameter.
 * The callback verifies the nonce to prevent CSRF attacks.
 */
import { randomBytes, createHmac } from 'crypto';

export default function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID to Vercel environment variables.' });
  }

  const userId = req.query.userId || '';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'getdominiontech.com';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Generate CSRF nonce
  const nonce = randomBytes(32).toString('hex');
  const secret = process.env.OAUTH_STATE_SECRET || 'dominion-oauth-secret-change-in-prod';
  const nonceSig = createHmac('sha256', secret).update(nonce).digest('hex');

  // Encode userId + origin + nonce in state
  const state = Buffer.from(JSON.stringify({ userId, origin, nonce })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  // Store signed nonce in HttpOnly cookie (5-minute expiry)
  res.setHeader('Set-Cookie', [
    `dominion_oauth_nonce=${nonceSig}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`,
  ]);

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
