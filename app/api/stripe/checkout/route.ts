import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

// Creates a Stripe Checkout Session for a Premium subscription.
// The price ID is resolved server-side from the plan name so the
// client never handles raw price IDs.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { priceId?: string; plan?: "monthly" | "annual" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const priceId =
    body.plan === "annual"
      ? process.env.STRIPE_ANNUAL_PRICE_ID
      : body.plan === "monthly"
        ? process.env.STRIPE_MONTHLY_PRICE_ID
        : body.priceId;

  if (!priceId) {
    return NextResponse.json(
      { error: "Price not configured — set STRIPE_MONTHLY_PRICE_ID / STRIPE_ANNUAL_PRICE_ID" },
      { status: 503 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is not configured" },
      { status: 503 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?upgraded=true`,
      cancel_url: `${appUrl}/pricing`,
      customer_email: user.email,
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] failed to create session:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
