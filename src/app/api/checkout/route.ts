import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { PRO_PRICE_ID, SITE_URL } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, subscription_tier")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as Record<string, unknown> | null;

  if ((profile?.subscription_tier as string) === "pro") {
    return NextResponse.redirect(new URL("/dashboard/billing", req.url));
  }

  const customerId = profile?.stripe_customer_id as string | undefined;

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId || undefined,
      customer_email: !customerId ? (user.email ?? undefined) : undefined,
      mode: "subscription",
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      metadata: { userId: user.id },
      success_url: `${SITE_URL}/dashboard/billing?success=true`,
      cancel_url: `${SITE_URL}/dashboard/billing?canceled=true`,
    });

    return NextResponse.redirect(session.url!);
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.redirect(new URL("/dashboard/billing?error=true", req.url));
  }
}
