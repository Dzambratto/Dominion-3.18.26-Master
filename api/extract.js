/**
 * /api/extract
 *
 * AI document extraction endpoint. Accepts a base64-encoded document (image or PDF)
 * and returns structured financial data.
 *
 * FIX (Claude audit): PDFs are now sent to Claude via native base64 document blocks.
 * Claude reads PDFs natively — no more sending 500 chars of garbled base64 to GPT-4o.
 * Images continue to use GPT-4o vision. Falls back gracefully if only one key is set.
 *
 * Required env vars (add to Vercel):
 *   ANTHROPIC_API_KEY — for PDF extraction (Claude claude-3-5-sonnet)
 *   OPENAI_API_KEY    — for image extraction (GPT-4o vision)
 */
import { requireAuth } from './_middleware.js';

const EXTRACTION_PROMPT = `You are a financial document extraction AI for Dominion, an AP automation platform.
Extract ALL financial data from the document provided. Be precise and thorough.

Return ONLY a valid JSON object with this exact structure:
{
  "type": "invoice" | "contract" | "insurance" | "receipt" | "purchase_order" | "other",
  "vendor": "Company name that sent this document",
  "vendorEmail": "vendor email if visible",
  "vendorPhone": "vendor phone if visible",
  "vendorAddress": "vendor address if visible",
  "amount": 1234.56,
  "currency": "USD",
  "invoiceNumber": "INV-12345",
  "invoiceDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "paymentTerms": "Net 30",
  "lineItems": [
    {
      "description": "Service description",
      "quantity": 1,
      "unitPrice": 500.00,
      "total": 500.00
    }
  ],
  "subtotal": 1000.00,
  "tax": 100.00,
  "discount": 0,
  "totalAmount": 1100.00,
  "notes": "any special notes or payment instructions",
  "confidence": 0.95,
  "flags": [],
  "rawText": "key text extracted from document"
}
For "flags", include any of these if detected:
- "duplicate_suspected"
- "price_unusually_high"
- "missing_invoice_number"
- "missing_due_date"
- "vague_line_items"
- "round_number_amount"
If a field is not found, use null. Dates must be in YYYY-MM-DD format. Return ONLY the JSON object, no markdown, no explanation.`;

async function extractWithOpenAI(openaiKey, userContent) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: userContent },
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI API error ${res.status}: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '{}';
}

async function extractWithClaude(anthropicKey, base64Data, mimeType, contextText) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            ...(contextText ? [{ type: 'text', text: contextText }] : []),
            {
              type: 'document',
              source: { type: 'base64', media_type: mimeType, data: base64Data },
            },
            { type: 'text', text: 'Extract all financial data from this document and return as JSON per the system instructions.' },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Anthropic API error ${res.status}: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '{}';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify the caller is authenticated
  const authUser = await requireAuth(req, res);
  if (!authUser) return;

  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!openaiKey && !anthropicKey) {
    return res.status(500).json({
      error: 'No AI API key configured. Add OPENAI_API_KEY (images) and/or ANTHROPIC_API_KEY (PDFs) to Vercel environment variables.',
    });
  }

  const { data, mimeType, filename, emailSubject, emailFrom, emailDate } = req.body || {};
  if (!data) return res.status(400).json({ error: 'data (base64 document) is required' });

  const isImage = mimeType && mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const contextText = (emailSubject || emailFrom)
    ? `Email context:\n- Subject: ${emailSubject || 'N/A'}\n- From: ${emailFrom || 'N/A'}\n- Date: ${emailDate || 'N/A'}\n- Filename: ${filename || 'N/A'}\n\nExtract all financial data from the document below:`
    : null;

  let rawContent;
  try {
    if (isPdf) {
      if (anthropicKey) {
        // Claude reads PDFs natively via base64 document blocks — correct approach
        rawContent = await extractWithClaude(anthropicKey, data, 'application/pdf', contextText);
      } else {
        // No Anthropic key — OpenAI cannot read PDFs. Extract from context only.
        const userContent = [
          { type: 'text', text: `${contextText || ''}\n\n[PDF: ${filename || 'document.pdf'}]\nNote: Add ANTHROPIC_API_KEY to Vercel for full PDF extraction.` },
        ];
        rawContent = await extractWithOpenAI(openaiKey, userContent);
      }
    } else if (isImage) {
      if (openaiKey) {
        const userContent = [
          ...(contextText ? [{ type: 'text', text: contextText }] : []),
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}`, detail: 'high' } },
        ];
        rawContent = await extractWithOpenAI(openaiKey, userContent);
      } else if (anthropicKey) {
        // Claude vision fallback for images
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            system: EXTRACTION_PROMPT,
            messages: [{
              role: 'user',
              content: [
                ...(contextText ? [{ type: 'text', text: contextText }] : []),
                { type: 'image', source: { type: 'base64', media_type: mimeType, data } },
                { type: 'text', text: 'Extract all financial data and return as JSON.' },
              ],
            }],
          }),
        });
        if (!r.ok) throw new Error(`Anthropic image error ${r.status}`);
        const d = await r.json();
        rawContent = d.content?.[0]?.text || '{}';
      }
    } else {
      const userContent = [
        { type: 'text', text: `${contextText || ''}\nFilename: ${filename}\nType: ${mimeType}\nExtract financial data from context.` },
      ];
      rawContent = openaiKey
        ? await extractWithOpenAI(openaiKey, userContent)
        : JSON.stringify({ type: 'other', confidence: 0.1, flags: ['unknown_format'] });
    }
  } catch (err) {
    console.error('AI extraction error:', err);
    return res.status(500).json({ error: 'extraction_failed', message: err.message });
  }

  // Parse JSON — strip markdown code fences if Claude wrapped output
  let extracted;
  try {
    const cleaned = (rawContent || '{}').replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    extracted = JSON.parse(cleaned);
  } catch {
    console.error('JSON parse error, raw:', rawContent?.slice(0, 200));
    return res.status(500).json({ error: 'parse_error', message: 'AI returned invalid JSON' });
  }

  extracted.extractedAt = new Date().toISOString();
  extracted.sourceFilename = filename;
  extracted.sourceEmail = emailFrom;
  extracted.sourceSubject = emailSubject;
  extracted.sourceDate = emailDate;

  return res.status(200).json(extracted);
}
