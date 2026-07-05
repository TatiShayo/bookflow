import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-05-27.dahlia",
    });
  }
  return _stripe;
}

export const stripe = {
  get paymentIntents() { return getStripe().paymentIntents; },
  get checkout() { return getStripe().checkout; },
  get webhooks() { return getStripe().webhooks; },
} as unknown as Stripe;

export async function createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>) {
  return getStripe().paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),
    metadata,
  });
}
