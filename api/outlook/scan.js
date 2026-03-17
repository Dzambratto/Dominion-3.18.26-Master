/**
 * /api/outlook/scan
 *
 * Scans the user's Outlook/Office 365 inbox via Microsoft Graph API.
 * Finds emails with PDF/image attachments that look like financial documents.
 * Returns a list of { messageId, subject, from, date, attachments[] } for extraction.
 */

const FINANCIAL_KEYWORDS = [
  'invoice', 'bill', 'receipt', 'statement', 'payment', 'purchase order',
  'po #', 'order confirmation', 'estimate', 'quote', 'proposal', 'contract',
  'renewal', 'subscription', 'due', 'overdue', 'remittance', 'ach', 'wire',
];

function looksFinancial(subject = '', bodyPreview = '') {
  const text = `${subject} ${bodyPreview}`.toLowerCase();
  return FINANCIAL_KEYWORDS.some(kw => text.includes(kw));
}

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Microsoft OAuth not configured' });
  }

  // Get tokens from cookie
  let tokenData = getTokensFromCookie(req.headers.cookie, userId);
  if (!tokenData) {
    return res.status(401).json({ error: 'not_connected', message: 'Outlook not connected for this user' });
  }

  // Refresh token if expired
  if (Date.now() >= tokenData.expiry - 60000 && tokenData.refresh_token) {
    const refreshed = await refreshAccessToken(tokenData.refresh_token, clientId, clientSecret, tenantId);
    if (refreshed.access_token) {
      tokenData.access_token = refreshed.access_token;
      if (refreshed.refresh_token) tokenData.refresh_token = refreshed.refresh_token;
      tokenData.expiry = Date.now() + (refreshed.expires_in || 3600) * 1000;
    }
  }

  const accessToken = tokenData.access_token;

  try {
    // Fetch messages from last 90 days with attachments
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const filter = encodeURIComponent(`hasAttachments eq true and receivedDateTime ge ${since}`);
    const select = 'id,subject,from,receivedDateTime,bodyPreview,hasAttachments';
    const url = `https://graph.microsoft.com/v1.0/me/messages?$filter=${filter}&$select=${select}&$top=50&$orderby=receivedDateTime desc`;

    const msgsRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const msgsData = await msgsRes.json();

    if (msgsData.error) {
      return res.status(401).json({ error: msgsData.error.code, message: msgsData.error.message });
    }

    const messages = msgsData.value || [];

    // FIX (Claude audit): Use Promise.all for parallel attachment fetching instead of sequential
    // await-in-loop. This avoids slow sequential calls and reduces latency significantly.
    const financialMsgs = messages.filter(msg => looksFinancial(msg.subject, msg.bodyPreview));

    const results = await Promise.all(
      financialMsgs.map(async (msg) => {
        try {
          const attRes = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${msg.id}/attachments?$select=id,name,contentType,size`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const attData = await attRes.json();
          const attachments = (attData.value || []).filter(a => {
            const ct = (a.contentType || '').toLowerCase();
            const name = (a.name || '').toLowerCase();
            return (
              ct.includes('pdf') ||
              ct.includes('image/') ||
              name.endsWith('.pdf') ||
              name.endsWith('.png') ||
              name.endsWith('.jpg') ||
              name.endsWith('.jpeg')
            );
          });
          if (attachments.length === 0) return null;
          return {
            messageId: msg.id,
            subject: msg.subject,
            from: msg.from?.emailAddress?.address || '',
            date: msg.receivedDateTime,
            attachments: attachments.map(a => ({ id: a.id, name: a.name, contentType: a.contentType })),
          };
        } catch {
          return null;
        }
      })
    );

    const financialMessages = results.filter(Boolean);

    return res.status(200).json({
      scanned: messages.length,
      financial: financialMessages.length,
      messages: financialMessages,
    });
  } catch (err) {
    console.error('Outlook scan error:', err);
    return res.status(500).json({ error: 'scan_failed', message: err.message });
  }
}
