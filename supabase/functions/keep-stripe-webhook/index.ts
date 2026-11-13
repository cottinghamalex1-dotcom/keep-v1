import { createClient } from "@supabase/supabase-js";

/**
 * Stripe Payment Link -> Keep entitlement bridge.
 *
 * This function accepts server-to-server webhooks only. It NEVER trusts
 * the success-page URL, customer-provided checkout IDs, or client flags.
 * Configure its Stripe signing secret and all three exact Payment Link IDs privately.
 *
 * NOTE: Do not deploy until the additive Stripe migration has been applied.
 */
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const respond = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers });

type StripeAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};
type StripeShipping = { name?: string | null; address?: StripeAddress | null; phone?: string | null };
type StripeSession = {
  id?: string;
  mode?: string;
  payment_status?: string;
  payment_link?: string | null;
  payment_intent?: string | { id?: string } | null;
  amount_subtotal?: number | null;
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null };
  collected_information?: { shipping_details?: StripeShipping | null };
  shipping_details?: StripeShipping | null;
  total_details?: { amount_discount?: number; amount_shipping?: number };
};
type StripeEvent = {
  id?: string;
  type?: string;
  livemode?: boolean;
  created?: number;
  data?: { object?: Record<string, unknown> };
};

const cleanEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const intentId = (value: unknown) =>
  typeof value === "string" ? value : value && typeof value === "object" && "id" in value ? String(value.id) : "";

function secureEqual(left: Uint8Array, right: Uint8Array) {
  let difference = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return difference === 0;
}

async function verifyStripeSignature(payload: string, signature: string) {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret || !secret.startsWith("whsec_")) return false;
  const entries = signature.split(",").map(value => value.trim());
  const timestampPart = entries.find(value => value.startsWith("t="))?.slice(2) ?? "";
  const signedAt = Number(timestampPart);
  if (!Number.isSafeInteger(signedAt)) return false;
  // Stripe signs with a fresh timestamp for each delivery. Limit replay to 5 minutes.
  if (Math.abs(Math.floor(Date.now() / 1000) - signedAt) > 300) return false;
  const signatures = entries.filter(value => value.startsWith("v1="))
    .map(value => value.slice(3)).filter(value => /^[a-f0-9]{64}$/i.test(value));
  if (!signatures.length) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(timestampPart + "." + payload),
  ));
  for (const candidate of signatures) {
    const encoded = new Uint8Array(candidate.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    if (secureEqual(digest, encoded)) return true;
  }
  return false;
}

async function recordSale(session: StripeSession, event: StripeEvent) {
  // A signed Stripe event is not enough: only the three dedicated links below
  // may grant one digital Keep. The package determines the physical card count.
  const availableLinks = [
    { tier: "basic", link: Deno.env.get("KEEP_STRIPE_BASIC_PAYMENT_LINK_ID") ?? "", amount: 6900, cards: 1 },
    { tier: "signature", link: Deno.env.get("KEEP_STRIPE_SIGNATURE_PAYMENT_LINK_ID") ?? Deno.env.get("KEEP_STRIPE_PAYMENT_LINK_ID") ?? "", amount: 9900, cards: 1 },
    { tier: "deluxe", link: Deno.env.get("KEEP_STRIPE_DELUXE_PAYMENT_LINK_ID") ?? "", amount: 12900, cards: 2 },
  ] as const;
  if (!availableLinks.some(p => /^plink_[a-zA-Z0-9]+$/.test(p.link)))
    return respond({ error: "Stripe checkout not configured" }, 503);
  const packageChoice = availableLinks.find(p =>
    /^plink_[a-zA-Z0-9]+$/.test(p.link) && p.link === session.payment_link,
  );
  if (!packageChoice) return respond({ ignored: "unrecognized_payment_link" });
  if (!/^cs_(?:live|test)_[a-zA-Z0-9]+$/.test(session.id ?? "")) return respond({ error: "Missing Stripe session ID" }, 400);
  if (session.mode !== "payment" || session.payment_status !== "paid") return respond({ ignored: true });

  // Signature, exact tier-specific Payment Link ID and fixed product amount are all required.
  // Payment Link quantity adjustment and promotion codes MUST remain disabled.
  if (session.currency?.toLowerCase() !== "usd" ||
      session.amount_subtotal !== packageChoice.amount ||
      (session.amount_total ?? 0) < packageChoice.amount ||
      (session.total_details?.amount_discount ?? 0) !== 0 ||
      (session.total_details?.amount_shipping ?? 0) !== 0)
    return respond({ error: "Unexpected price, currency, discount or shipping" }, 422);

  const email = cleanEmail(session.customer_details?.email || session.customer_email);
  const shipping = session.collected_information?.shipping_details ?? session.shipping_details;
  const address = shipping?.address;
  // All three packages include US delivery; don't silently accept missing addresses.
  if (!email || !email.includes("@") || !address || address.country !== "US" ||
      !address.line1 || !address.city || !address.state || !address.postal_code)
    return respond({ error: "Verified purchaser email and US shipping address required" }, 422);

  const paymentIntentId = intentId(session.payment_intent);
  if (!/^pi_[a-zA-Z0-9]+$/.test(paymentIntentId)) return respond({ error: "Missing PaymentIntent" }, 422);
  const { data: reversal, error: reversalError } = await supabase
    .from("keep_stripe_reversals").select("reason").eq("payment_intent_id", paymentIntentId).maybeSingle();
  if (reversalError) return respond({ error: "Cannot verify payment reversal state" }, 503);
  if (reversal) return respond({ ignored: "already_refunded_or_disputed" });

  const { error } = await supabase.from("keep_purchases").upsert({
    payment_provider: "stripe",
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    stripe_payment_link_id: packageChoice.link,
    stripe_amount_total: session.amount_total,
    stripe_currency: "usd",
    package_tier: packageChoice.tier,
    included_card_count: packageChoice.cards,
    stripe_shipping_details: {
      name: shipping?.name?.slice(0, 180) ?? null,
      phone: shipping?.phone?.slice(0, 40) ?? null,
      address: {
        line1: address.line1.slice(0, 180),
        line2: address.line2?.slice(0, 180) ?? null,
        city: address.city.slice(0, 120),
        state: address.state.slice(0, 80),
        postal_code: address.postal_code.slice(0, 20),
        country: "US",
      },
    },
    purchaser_email: email,
    paid_at: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    status: "paid",
  }, { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true });
  if (error) {
    console.error("Stripe entitlement save failed", error.code);
    return respond({ error: "Could not record purchase; retry required" }, 503);
  }
  return respond({ accepted: true });
}

async function recordReversal(object: Record<string, unknown>, event: StripeEvent) {
  // Only full refunds revoke a Keep; partial refunds require manual operator review.
  const kind = event.type === "charge.dispute.created" ? "disputed" : "refunded";
  if (kind === "refunded" && object.refunded !== true) return respond({ ignored: "partial_refund" });
  const paymentIntentId = intentId(object.payment_intent);
  if (!/^pi_[a-zA-Z0-9]+$/.test(paymentIntentId)) return respond({ ignored: "missing_payment_intent" });
  const { error: ledgerError } = await supabase.from("keep_stripe_reversals").upsert({
    payment_intent_id: paymentIntentId, reason: kind, stripe_event_id: event.id,
  }, { onConflict: "payment_intent_id" });
  if (ledgerError) return respond({ error: "Could not record refund/dispute" }, 503);
  const { error } = await supabase.from("keep_purchases")
    .update({ status: kind === "refunded" ? "refunded" : "cancelled", updated_at: new Date().toISOString() })
    .eq("stripe_payment_intent_id", paymentIntentId).eq("payment_provider", "stripe")
    .in("status", ["paid", "reserved", "approved", "in_production"]);
  if (error) return respond({ error: "Could not revoke refunded purchase" }, 503);
  return respond({ accepted: true });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  try {
    const raw = await request.text();
    if (raw.length > 250_000) return respond({ error: "Payload too large" }, 413);
    if (!(await verifyStripeSignature(raw, request.headers.get("stripe-signature") ?? "")))
      return respond({ error: "Invalid signature" }, 401);
    const event = JSON.parse(raw) as StripeEvent;
    const expectedMode = Deno.env.get("KEEP_STRIPE_EXPECTED_MODE") ?? "live";
    if (event.livemode !== (expectedMode === "live")) return respond({ ignored: "wrong_mode" });
    const body = event.data?.object ?? {};
    if (event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded")
      return await recordSale(body as StripeSession, event);
    if (event.type === "charge.refunded" || event.type === "charge.dispute.created")
      return await recordReversal(body, event);
    return respond({ ignored: true });
  } catch (error) {
    console.error("Stripe webhook failed", error instanceof Error ? error.message : "Unknown error");
    return respond({ error: "Unable to process webhook" }, 500);
  }
});
