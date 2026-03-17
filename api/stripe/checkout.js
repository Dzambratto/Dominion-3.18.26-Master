/**
 * /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for a given plan.
 * Redirects the user to Stripe's hosted checkout page.
 *
 * POST body:
 *   planId  — 'starter' | 'operator' | 'controller'
 *   userId  — Supabase user ID (optional, used to pre-fill email)
 *   email   — user's email (optional)
 */
import { requireAuth } from '../_middleware.js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.VITE_APP_URL || 'https://www.getdominiontech.com';

// Stripe Price IDs — set these after creating products in your Stripe dashboard
// Go to: https://dashboard.stripe.com/products → Create product → Copy price ID
const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  operator: process.env.STRIPE_PRICE_OPERATOR,
  controller: process.env.STRIPE_PRICE_CONTROLLER,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', APP_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to Vercel environment variables.' });
  }

  // Auth is optional for checkout (user may not be signed in yet)
  // but we use it to pre-fill email if available
  let userEmail = req.body?.email || null;
  try {
    const authUser = await requireAuth(req, res);
    if (authUser) userEmail = authUser.email || userEmail;
  } catch {
    // Not authenticated — that's fine for checkout
  }

  const { planId } = req.body || {};
  if (!planId || !['starter', 'operator', 'controller'].includes(planId)) {
    return res.status(400).json({ error: 'Invalid planId. Must be starter, operator, or controller.' });
  }

  const priceId = PRICE_IDS[planId];
  if (!priceId) {
    return res.status(500).json({
      error: `Stripe price ID not configured for plan "${planId}". Add STRIPE_PRICE_${planId.toUpperCase()} to Vercel environment variables.`,
    });
  }

  try {
    const sessionPayload = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/dashboard?checkout=success&plan=${planId}`,
      cancel_url: `${APP_URL}/?checkout=cancelled#pricing`,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 14,
        metadata: { planId },
      },
    };

    if (userEmail) {
      sessionPayload.customer_email = userEmail;
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(flattenForStripe(sessionPayload)).toString(),
    });

    const session = await stripeRes.json();

    if (session.error) {
      console.error('Stripe error:', session.error);
      return res.status(400).json({ error: session.error.message });
    }

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session', message: err.message });
  }
}

/**
 * Flatten a nested object into Stripe's form-encoded format.
 * e.g. { line_items: [{ price: 'price_xxx', quantity: 1 }] }
 *   => { 'line_items[0][price]': 'price_xxx', 'line_items[0][quantity]': '1' }
 */
function flattenForStripe(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object') {
          Object.assign(result, flattenForStripe(item, `${fullKey}[${i}]`));
        } else {
          result[`${fullKey}[${i}]`] = String(item);
        }
      });
    } else if (typeof value === 'object') {
      Object.assign(result, flattenForStripe(value, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}
