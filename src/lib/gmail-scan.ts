/**
 * Gmail Scan Service
 *
 * Orchestrates the full pipeline:
 * 1. Call /api/gmail/scan to get financial emails
 * 2. For each email, download attachments via /api/gmail/attachment
 * 3. Send each attachment to /api/extract for AI extraction
 * 4. Return structured results to be added to the app store
 */

import type { Invoice, InboxAlert } from './types';
import { supabase } from './supabase';

const APP_URL = (import.meta.env.VITE_APP_URL as string) || window.location.origin;

/** Get the current Supabase access token for API auth */
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    // Fall through — API will use cookie or return 401
  }
  return {};
}

export interface ScanResult {
  invoices: Invoice[];
  alerts: InboxAlert[];
  scannedCount: number;
  extractedCount: number;
  errors: string[];
}

export interface ScanProgress {
  stage: 'scanning' | 'downloading' | 'extracting' | 'complete';
  current: number;
  total: number;
  message: string;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function buildInvoiceFromExtraction(extracted: Record<string, unknown>, emailFrom: string): Invoice {
  const now = new Date().toISOString();
  const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Parse amount
  const amount = typeof extracted.totalAmount === 'number'
    ? extracted.totalAmount
    : typeof extracted.amount === 'number'
      ? extracted.amount
      : 0;

  // Determine status based on flags
  const flags = (extracted.flags as string[]) || [];
  const hasFlags = flags.length > 0;

  // Map extracted line items to LineItem format
  const rawLineItems = (extracted.lineItems as Array<Record<string, unknown>>) || [];
  const lineItems = rawLineItems.map((li) => ({
    description: (li.description as string) || 'Service',
    quantity: (li.quantity as number) || 1,
    unitPrice: (li.unitPrice as number) || 0,
    total: (li.total as number) || 0,
    confidence: 0.8,
  }));

  // Map flags to Anomaly format
  const flagToAnomalyType = (f: string): import('./types').AnomalyType => {
    if (f.includes('duplicate')) return 'duplicate';
    if (f.includes('price') || f.includes('high')) return 'price_increase';
    if (f.includes('contract')) return 'contract_mismatch';
    if (f.includes('missing') || f.includes('vague')) return 'incomplete';
    return 'incomplete';
  };

  return {
    id,
    vendorName: (extracted.vendor as string) || extractVendorFromEmail(emailFrom) || 'Unknown Vendor',
    vendorEmail: (extracted.vendorEmail as string) || emailFrom,
    amount,
    invoiceNumber: (extracted.invoiceNumber as string) || `AUTO-${id.slice(-6).toUpperCase()}`,
    dueDate: (extracted.dueDate as string) || '',
    receivedDate: now.slice(0, 10),
    status: hasFlags ? 'flagged' : 'pending',
    source: 'gmail',
    extractionConfidence: (extracted.confidence as number) || 0.8,
    lineItems,
    anomalies: flags.map((f, i) => ({
      id: `anom_${id}_${i}`,
      type: flagToAnomalyType(f),
      description: f.replace(/_/g, ' '),
      severity: 'medium' as const,
      recommendation: 'Review before approving',
    })),
    notes: (extracted.notes as string) || (extracted.sourceSubject as string) || '',
  };
}

function extractVendorFromEmail(from: string): string {
  // "Company Name <email@domain.com>" → "Company Name"
  const nameMatch = from.match(/^([^<]+)</);
  if (nameMatch) return nameMatch[1].trim().replace(/"/g, '');
  // "email@domain.com" → "domain.com"
  const emailMatch = from.match(/@([^>]+)/);
  if (emailMatch) return emailMatch[1].split('.').slice(0, -1).join('.');
  return from;
}

function inferCategory(vendor: string, lineItems: unknown): string {
  const text = `${vendor || ''} ${JSON.stringify(lineItems || '')}`.toLowerCase();
  if (text.includes('snow') || text.includes('lawn') || text.includes('landscap')) return 'Landscaping';
  if (text.includes('hvac') || text.includes('heat') || text.includes('air condition')) return 'HVAC';
  if (text.includes('plumb')) return 'Plumbing';
  if (text.includes('electric')) return 'Electrical';
  if (text.includes('insurance') || text.includes('policy') || text.includes('premium')) return 'Insurance';
  if (text.includes('repair') || text.includes('maintenance')) return 'Maintenance';
  if (text.includes('clean')) return 'Cleaning';
  if (text.includes('software') || text.includes('saas') || text.includes('subscription')) return 'Software';
  return 'General';
}

function buildAlertFromInvoice(invoice: Invoice): InboxAlert | null {
  if (invoice.anomalies.length === 0) return null;

  const topAnomaly = invoice.anomalies[0];
  const vendor = invoice.vendorName;

  const flagMessages: Record<string, string> = {
    price_increase: `Amount of $${invoice.amount.toLocaleString()} appears unusually high for ${vendor}`,
    duplicate: `Possible duplicate invoice from ${vendor} — review before approving`,
    contract_mismatch: `Invoice from ${vendor} may not match contract terms`,
    incomplete: `Invoice from ${vendor} is missing required information`,
    service_mismatch: `Service on invoice from ${vendor} may not match what was ordered`,
    overpayment: `Potential overpayment risk on invoice from ${vendor}`,
  };

  const message = flagMessages[topAnomaly.type] || `Issue detected on invoice from ${vendor}`;

  return {
    id: `alert_${invoice.id}`,
    priority: topAnomaly.type === 'price_increase' || topAnomaly.type === 'duplicate' ? 'urgent' : 'review',
    title: `Invoice Flag: ${vendor}`,
    subtitle: message,
    amount: invoice.amount,
    invoiceId: invoice.id,
    actionLabel: 'Review Invoice',
    secondaryActionLabel: 'Dismiss',
    dismissed: false,
    createdAt: new Date().toISOString(),
  };
}

export async function runGmailScan(
  userId: string,
  onProgress?: (progress: ScanProgress) => void
): Promise<ScanResult> {
  const result: ScanResult = {
    invoices: [],
    alerts: [],
    scannedCount: 0,
    extractedCount: 0,
    errors: [],
  };

  onProgress?.({ stage: 'scanning', current: 0, total: 0, message: 'Scanning Gmail inbox for financial documents…' });

  // Step 1: Scan inbox
  let scanData: {
    emails?: Array<{
      messageId: string;
      from: string;
      subject: string;
      date: string;
      snippet: string;
      attachments: Array<{
        attachmentId: string;
        filename: string;
        mimeType: string;
        size: number;
      }>;
    }>;
    count?: number;
    scannedCount?: number;
    error?: string;
    message?: string;
  };
  const authHeaders = await getAuthHeaders();

  try {
    const scanRes = await fetchWithTimeout(
      `${APP_URL}/api/gmail/scan?userId=${encodeURIComponent(userId)}&days=90&maxResults=30`,
      { credentials: 'include', headers: authHeaders },
      20000
    );
    scanData = await scanRes.json();
    if (!scanRes.ok) {
      result.errors.push(scanData.error || 'Scan failed');
      return result;
    }
  } catch (err) {
    result.errors.push(`Scan request failed: ${(err as Error).message}`);
    return result;
  }

  const emails = scanData.emails || [];
  result.scannedCount = scanData.scannedCount || 0;

  if (emails.length === 0) {
    return result;
  }

  // Step 2 & 3: For each email, download attachments and extract
  const totalAttachments = emails.reduce((sum, e) => sum + e.attachments.length, 0);
  let processed = 0;

  for (const email of emails) {
    for (const attachment of email.attachments) {
      processed++;
      onProgress?.({
        stage: 'extracting',
        current: processed,
        total: totalAttachments,
        message: `Extracting data from ${attachment.filename} (${processed}/${totalAttachments})…`,
      });

      try {
        // Download attachment
        const attachRes = await fetchWithTimeout(
          `${APP_URL}/api/gmail/attachment?userId=${encodeURIComponent(userId)}&messageId=${email.messageId}&attachmentId=${attachment.attachmentId}`,
          { credentials: 'include', headers: authHeaders },
          15000
        );
        if (!attachRes.ok) {
          result.errors.push(`Failed to download ${attachment.filename}`);
          continue;
        }
        const attachData = await attachRes.json() as { data?: string };

        // Extract with AI
        const extractRes = await fetchWithTimeout(
          `${APP_URL}/api/extract`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({
              data: attachData.data,
              mimeType: attachment.mimeType,
              filename: attachment.filename,
              emailSubject: email.subject,
              emailFrom: email.from,
              emailDate: email.date,
            }),
          },
          30000
        );

        if (!extractRes.ok) {
          result.errors.push(`Extraction failed for ${attachment.filename}`);
          continue;
        }

        const extracted = await extractRes.json() as Record<string, unknown>;

        // Only add if it looks like a real financial document
        if (extracted.type !== 'other' || (extracted.amount && (extracted.amount as number) > 0)) {
          const invoice = buildInvoiceFromExtraction(extracted, email.from);
          result.invoices.push(invoice);
          result.extractedCount++;

          const alert = buildAlertFromInvoice(invoice);
          if (alert) result.alerts.push(alert);
        }
      } catch (err) {
        result.errors.push(`Error processing ${attachment.filename}: ${(err as Error).message}`);
      }
    }
  }

  onProgress?.({ stage: 'complete', current: processed, total: totalAttachments, message: `Scan complete — ${result.extractedCount} documents extracted` });

  return result;
}
