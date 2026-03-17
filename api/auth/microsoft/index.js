/**
 * FIX (Claude audit): Added CSRF nonce to state + signed HttpOnly cookie.
 */
import { randomBytes, createHmac } from 'crypto';

export default function handler(req, res) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  if (!clientId) {
    return res.status(500).json({ error: 'Microsoft OAuth not configured. Add MICROSOFT_CLIENT_ID to Vercel environment variables.' });
  }
  const userId = req.query.userId || '';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = `${proto}://${host}`;
  const redirectUri = `${origin}/api/auth/microsoft/callback`;

  // Generate CSRF nonce
  const nonce = randomBytes(32).toString('hex');
  const secret = process.env.OAUTH_STATE_SECRET || 'dominion-oauth-secret-change-in-prod';
  const nonceSig = createHmac('sha256', secret).update(nonce).digest('hex');

  // Encode userId + origin + nonce in state
  const state = Buffer.from(JSON.stringify({ userId, origin, nonce })).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadBasic',
    state,
    response_mode: 'query',
  });

  // Store signed nonce in HttpOnly cookie (5-minute expiry)
  res.setHeader('Set-Cookie', [
    `dominion_oauth_nonce=${nonceSig}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`,
  ]);

  return res.redirect(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`);
}
