/**
 * /api/gmail/scan
 *
 * Reads the user's Gmail inbox, finds emails with financial document attachments
 * (invoices, receipts, contracts, insurance docs), and returns them for AI extraction.
 *
 * Query params:
 *   userId  — the Dominion user ID (used to look up the token cookie)
 *   days    — how many days back to scan (default: 90)
 *   maxResults — max emails to process (default: 50)
 */
import { requireAuth } from '../_middleware.js';

const FINANCIAL_KEYWORDS = [
  'invoice', 'receipt', 'statement', 'bill', 'payment', 'quote', 'estimate',
  'purchase order', 'work order', 'contract', 'agreement', 'insurance',
  'policy', 'renewal', 'premium', 'due', 'amount due', 'balance due',
];

const ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function getTokensFromCookie(req, userId) {
  const cookieHeader = req.headers.cookie || '';
  const cookieKey = `gmail_tokens_${(userId || 'anon').replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 64);
  const match = cookieHeader.split(';').find(c => c.trim().startsWith(`${cookieKey}=`));
  if (!match) return null;
  try {
    const encoded = match.trim().slice(cookieKey.length + 1);
    return JSON.parse(Buffer.from(encoded, 'base64').toString());
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  return res.json();
}

async function gmailGet(path, accessToken) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gmail API error ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

function isFinancialEmail(subject, snippet) {
  const text = `${subject} ${snippet}`.toLowerCase();
  return FINANCIAL_KEYWORDS.some(kw => text.includes(kw));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify the caller is authenticated and owns this userId
  const authUser = await requireAuth(req, res);
  if (!authUser) return; // requireAuth already sent 401/403
  const userId = authUser.id;
  const days = parseInt(req.query.days || '90', 10);
  const maxResults = Math.min(parseInt(req.query.maxResults || '50', 10), 100);

  // Get tokens from cookie
  let tokens = getTokensFromCookie(req, userId);
  if (!tokens) {
    return res.status(401).json({ error: 'no_tokens', message: 'Gmail not connected. Please connect Gmail first.' });
  }

  // Refresh token if expired
  if (Date.now() > tokens.expiry - 60000) {
    if (!tokens.refresh_token) {
      return res.status(401).json({ error: 'token_expired', message: 'Gmail token expired. Please reconnect Gmail.' });
    }
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    if (refreshed.error) {
      return res.status(401).json({ error: 'refresh_failed', message: 'Failed to refresh Gmail token. Please reconnect.' });
    }
    tokens.access_token = refreshed.access_token;
    tokens.expiry = Date.now() + (refreshed.expires_in || 3600) * 1000;
  }

  const accessToken = tokens.access_token;

  try {
    // Build Gmail search query for financial emails with attachments
    const afterDate = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
    // FIX (Claude audit): Use all financial keywords, not just first 8.
    // Gmail query has a length limit so we use the most important terms.
    const queryKeywords = ['invoice', 'receipt', 'statement', 'bill', 'payment', 'quote', 'contract', 'insurance', 'renewal', 'purchase order'];
    const query = `has:attachment (${queryKeywords.join(' OR ')}) after:${afterDate}`;

    // List matching messages
    const listRes = await gmailGet(
      `/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
      accessToken
    );

    const messages = listRes.messages || [];
    if (messages.length === 0) {
      return res.status(200).json({ emails: [], count: 0, message: 'No financial emails found in the specified period.' });
    }

    // Fetch message details in parallel (batched to avoid rate limits)
    const BATCH_SIZE = 10;
    const emails = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const details = await Promise.all(
        batch.map(m => gmailGet(`/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, accessToken).catch(() => null))
      );

      for (const msg of details) {
        if (!msg) continue;

        const headers = msg.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';

        // Check if it looks like a financial email
        if (!isFinancialEmail(subject, msg.snippet || '')) continue;

        // Find attachments
        const parts = msg.payload?.parts || [];
        const attachments = parts
          .filter(p => p.filename && ATTACHMENT_MIME_TYPES.includes(p.mimeType))
          .map(p => ({
            attachmentId: p.body?.attachmentId,
            filename: p.filename,
            mimeType: p.mimeType,
            size: p.body?.size || 0,
          }));

        if (attachments.length === 0) continue;

        emails.push({
          messageId: msg.id,
          threadId: msg.threadId,
          subject,
          from,
          date,
          snippet: msg.snippet || '',
          attachments,
        });
      }
    }

    return res.status(200).json({
      emails,
      count: emails.length,
      scannedCount: messages.length,
      connectedEmail: tokens.email,
    });
  } catch (err) {
    console.error('Gmail scan error:', err);
    return res.status(500).json({ error: 'scan_failed', message: err.message });
  }
}
