import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY || "your_stripe_secret_key_here";
    _stripe = new Stripe(key, {
      apiVersion: "2026-05-27.dahlia" as unknown as Stripe.LatestApiVersion,
    });
  }
  return _stripe;
}

export const stripe = {
  get paymentIntents() { return getStripe().paymentIntents; },
  get checkout() { return getStripe().checkout; },
  get webhooks() { return getStripe().webhooks; },
  get refunds() { return getStripe().refunds; },
  get subscriptions() { return getStripe().subscriptions; },
  get customers() { return getStripe().customers; },
} as unknown as Stripe;

export async function createPaymentIntent(
  amount: number,
  currency: string,
  metadata: Record<string, string>
) {
  if (amount <= 0) {
    throw new Error("Cannot create payment intent for amount <= 0");
  }
  return getStripe().paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),
    metadata,
  });
}

export async function createRefund(
  paymentIntentId: string,
  amountInUnits?: number,
  reason?: Stripe.RefundCreateParams.Reason
) {
  const params: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };
  if (amountInUnits !== undefined && amountInUnits > 0) {
    params.amount = Math.round(amountInUnits * 100);
  }
  if (reason) {
    params.reason = reason;
  }
  return getStripe().refunds.create(params);
}
