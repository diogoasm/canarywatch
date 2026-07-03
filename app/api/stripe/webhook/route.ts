import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

// Stripe needs the raw request body for signature verification, so this
// route reads request.text() directly (App Router never parses it for us).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Plan updates happen outside any user session, so they go through the
// service-role client (bypasses RLS).
function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error("[stripe/webhook] SUPABASE_SERVICE_ROLE_KEY is not set");
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;

      if (!userId) {
        console.error("[stripe/webhook] checkout.session.completed without userId metadata");
        break;
      }

      const { error } = await admin
        .from("profiles")
        .update({ plan: "premium", stripe_customer_id: customerId })
        .eq("id", userId);
      if (error) {
        console.error("[stripe/webhook] failed to upgrade profile:", error);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }
      console.log(`[stripe/webhook] user ${userId} upgraded to premium`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const { error } = await admin
        .from("profiles")
        .update({ plan: "free" })
        .eq("stripe_customer_id", customerId);
      if (error) {
        console.error("[stripe/webhook] failed to downgrade profile:", error);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }
      console.log(`[stripe/webhook] customer ${customerId} downgraded to free`);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      let plan: "premium" | "free" | null = null;
      if (subscription.status === "active") plan = "premium";
      else if (
        subscription.status === "canceled" ||
        subscription.status === "past_due"
      ) {
        plan = "free";
      }

      if (plan) {
        const { error } = await admin
          .from("profiles")
          .update({ plan })
          .eq("stripe_customer_id", customerId);
        if (error) {
          console.error("[stripe/webhook] failed to update plan:", error);
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }
        console.log(`[stripe/webhook] customer ${customerId} set to ${plan}`);
      }
      break;
    }

    default:
      // Not an event we care about — acknowledge so Stripe stops retrying
      break;
  }

  return NextResponse.json({ received: true });
}
