/**
 * /api/stripe/webhook
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Updates the user's subscription status in Supabase when Stripe events occur.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY         — Stripe secret key
 *   STRIPE_WEBHOOK_SECRET     — Stripe webhook signing secret (from Stripe dashboard)
 *   VITE_SUPABASE_URL         — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (for admin writes)
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
  }

  // Get raw body for signature verification
  const rawBody = await getRawBody(req);
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    if (STRIPE_WEBHOOK_SECRET && signature) {
      event = await verifyStripeWebhook(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(rawBody.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_email || session.customer_details?.email;
        const planId = session.subscription_data?.metadata?.planId || 'starter';
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (customerEmail && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
          await updateUserSubscription(customerEmail, {
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: planId,
            status: 'trialing',
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const status = sub.status; // active, trialing, past_due, canceled, unpaid
        const planId = sub.metadata?.planId || sub.items?.data?.[0]?.price?.metadata?.planId;

        if (customerId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
          await updateUserSubscriptionByCustomerId(customerId, {
            stripe_subscription_id: sub.id,
            plan: planId,
            status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = sub.customer;

        if (customerId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
          await updateUserSubscriptionByCustomerId(customerId, {
            status: 'canceled',
            plan: 'free',
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        if (customerId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
          await updateUserSubscriptionByCustomerId(customerId, {
            status: 'past_due',
          });
        }
        break;
      }

      default:
        // Ignore unhandled events
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook processing failed', message: err.message });
  }
}

async function updateUserSubscription(email, data) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Supabase update failed: ${err}`);
  }
}

async function updateUserSubscriptionByCustomerId(customerId, data) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.${encodeURIComponent(customerId)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Supabase update by customer ID failed: ${err}`);
  }
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function verifyStripeWebhook(rawBody, signature, secret) {
  // Manual HMAC-SHA256 verification (no stripe-node dependency needed)
  const crypto = await import('crypto');
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const v1 = parts.find(p => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !v1) throw new Error('Invalid signature format');

  const tolerance = 300; // 5 minutes
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > tolerance) {
    throw new Error('Webhook timestamp too old');
  }

  const payload = `${timestamp}.${rawBody.toString()}`;
  const expected = crypto.default
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  if (expected !== v1) throw new Error('Signature mismatch');

  return JSON.parse(rawBody.toString());
}
