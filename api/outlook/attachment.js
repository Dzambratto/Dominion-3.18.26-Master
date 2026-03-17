/**
 * /api/outlook/attachment
 *
 * Downloads a specific Outlook message attachment via Microsoft Graph API.
 * Returns the attachment as base64 for AI extraction.
 *
 * FIX (Claude audit): Added token refresh logic with persistence back to cookie.
 * Previously, expired tokens were used as-is causing silent failures.
 */
import { requireAuth } from '../_middleware.js';

function getTokensFromCookie(cookies, userId) {
  const cookieKey = `ms_tokens_${(userId || 'anon').replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 64);
  const cookieStr = cookies || '';
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${cookieKey}=([^;]+)`));
  if (!match) return null;
  try {
    return JSON.parse(Buffer.from(match[1], 'base64').toString());
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken, clientId, clientSecret, tenantId) {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadBasic offline_access',
    }),
  });
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authUser = await requireAuth(req, res);
  if (!authUser) return;
  const userId = authUser.id;
  const { messageId, attachmentId } = req.query;
  if (!messageId || !attachmentId) {
    return res.status(400).json({ error: 'messageId and attachmentId are required' });
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

  let tokenData = getTokensFromCookie(req.headers.cookie, userId);
  if (!tokenData) {
    return res.status(401).json({ error: 'not_connected' });
  }

  // FIX (Claude audit): Refresh expired token and persist back to cookie
  let tokenRefreshed = false;
  if (Date.now() >= (tokenData.expiry || 0) - 60000 && tokenData.refresh_token && clientId && clientSecret) {
    const refreshed = await refreshAccessToken(tokenData.refresh_token, clientId, clientSecret, tenantId);
    if (refreshed.access_token) {
      tokenData.access_token = refreshed.access_token;
      if (refreshed.refresh_token) tokenData.refresh_token = refreshed.refresh_token;
      tokenData.expiry = Date.now() + (refreshed.expires_in || 3600) * 1000;
      tokenRefreshed = true;
    }
  }

  try {
    const attRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const att = await attRes.json();

    if (att.error) {
      return res.status(400).json({ error: att.error.code, message: att.error.message });
    }

    // Persist refreshed token back to cookie
    if (tokenRefreshed) {
      const cookieKey = `ms_tokens_${(userId || 'anon').replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 64);
      const encoded = Buffer.from(JSON.stringify(tokenData)).toString('base64');
      res.setHeader('Set-Cookie', [
        `${cookieKey}=${encoded}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
      ]);
    }

    // contentBytes is already base64 in Graph API response
    return res.status(200).json({
      name: att.name,
      contentType: att.contentType,
      data: att.contentBytes,
    });
  } catch (err) {
    console.error('Outlook attachment error:', err);
    return res.status(500).json({ error: 'download_failed', message: err.message });
  }
}
