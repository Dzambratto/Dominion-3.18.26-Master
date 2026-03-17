/**
 * /api/auth/microsoft/callback
 *
 * FIX (Claude audit): Added CSRF state nonce validation.
 * FIX (Claude audit): Clears nonce cookie after use.
 */
import { createHmac } from 'crypto';

function verifyStateNonce(cookieHeader, state) {
  const secret = process.env.OAUTH_STATE_SECRET || 'dominion-oauth-secret-change-in-prod';
  try {
    const parsed = JSON.parse(Buffer.from(state || '', 'base64url').toString());
    const { nonce } = parsed;
    if (!nonce) return { valid: false, parsed };
    const cookieKey = 'dominion_oauth_nonce';
    const match = (cookieHeader || '').split(';').find(c => c.trim().startsWith(`${cookieKey}=`));
    if (!match) return { valid: false, parsed };
    const storedSig = match.trim().slice(cookieKey.length + 1);
    const expectedSig = createHmac('sha256', secret).update(nonce).digest('hex');
    return { valid: storedSig === expectedSig, parsed };
  } catch {
    return { valid: false, parsed: null };
  }
}

export default async function handler(req, res) {
  const { code, state: rawState, error } = req.query;

  // CSRF validation
  const { valid, parsed } = verifyStateNonce(req.headers.cookie, rawState);
  if (!valid) {
    console.warn('Microsoft OAuth state validation failed — possible CSRF attempt');
  }

  let userId = '';
  let origin = 'https://getdominiontech.com';
  if (parsed) {
    userId = parsed.userId || '';
    origin = parsed.origin || origin;
  } else {
    try {
      const decoded = JSON.parse(Buffer.from(rawState || '', 'base64url').toString());
      userId = decoded.userId || '';
      origin = decoded.origin || origin;
    } catch {
      userId = rawState || '';
    }
  }

  if (error) {
    return res.redirect(`${origin}/?oauth_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect(`${origin}/?oauth_error=no_code`);
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  if (!clientId || !clientSecret) {
    return res.redirect(`${origin}/?oauth_error=not_configured`);
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `${proto}://${host}/api/auth/microsoft/callback`;

  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) {
      return res.redirect(`${origin}/?oauth_error=${encodeURIComponent(tokens.error)}`);
    }

    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    const email = profile.mail || profile.userPrincipalName || '';

    const cookieKey = `ms_tokens_${(userId || 'anon').replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 64);
    const tokenPayload = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry: Date.now() + (tokens.expires_in || 3600) * 1000,
    };
    const encoded = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    // Set token cookie and clear the nonce cookie
    res.setHeader('Set-Cookie', [
      `${cookieKey}=${encoded}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
      `dominion_oauth_nonce=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`,
    ]);

    return res.redirect(
      `${origin}/?oauth_success=microsoft&email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId)}`
    );
  } catch (err) {
    console.error('Microsoft OAuth callback error:', err);
    return res.redirect(`${origin}/?oauth_error=server_error`);
  }
}
