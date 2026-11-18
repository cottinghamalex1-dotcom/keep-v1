import { createClient } from "npm:@supabase/supabase-js@2.57.0";

/**
 * KEEP Stripe commerce endpoint.
 * POST {action:"checkout", tier, voiceCount, extraCards, extraCardStyle, engravingUpgrade}
 * POST {action:"status", sessionId} with the purchaser's Supabase JWT
 * Stripe webhooks are authenticated using their raw-body Stripe-Signature header.
 *
 * No successful response or checkout redirect grants an entitlement. Only a
 * paid session independently retrieved and reconciled against Stripe prices does.
 */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SITE_URL = (Deno.env.get("KEEP_SITE_URL") ?? "https://keep-v1.vercel.app").replace(/\/$/, "");
const allow = new Set([SITE_URL, "https://keep-v1-keep23.vercel.app", "http://localhost:3000", "http://localhost:5173"]);
const allowedOrigin = (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  return allow.has(origin) ? origin : SITE_URL;
};
const headers = (req: Request) => ({
  "Access-Control-Allow-Origin": allowedOrigin(req),
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Cache-Control": "no-store",
});
const reply = (req: Request, data: unknown, status = 200) => Response.json(data, { status, headers: headers(req) });
const admin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;
const uuid = (v: unknown): v is string => typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const nonnegative = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const livePrices = {
  basic: "price_1Ud7cMB5i8TaAgYDiHS6FTDB",
  signature: "price_1UbLcIB5i8TaAgYDZIWzpiYJ",
  voice: "price_1Ud7cOB5i8TaAgYDrZlbxBwO",
  engraving: "price_1Ud7cPB5i8TaAgYD25IenYbo",
  logoCard: "price_1Uc7dXB5i8TaAgYDPQCWADAu",
  engravedCard: "price_1Ud7crB5i8TaAgYDT1qDTuB3",
};
const priceValues = { basic: 7900, signature: 9900, voice: 1900, engraving: 900, logoCard: 3900, engravedCard: 4900 } as const;
type PriceKey = keyof typeof livePrices;
type Cart = {
  tier: "basic" | "signature"; voiceCount: number;
  extraCards: number; extraCardStyle: "classic" | "engraved";
  engravingUpgrade: boolean;
};
function prices() {
  // A test API key must NEVER reuse live price IDs. Explicit test prices are required.
  const test = STRIPE_SECRET_KEY.startsWith("sk_test_");
  const names: Record<PriceKey, string> = {
    basic: "STRIPE_PRICE_BASIC", signature: "STRIPE_PRICE_SIGNATURE",
    voice: "STRIPE_PRICE_EXTRA_VOICE", engraving: "STRIPE_PRICE_BASIC_ENGRAVING",
    logoCard: "STRIPE_PRICE_EXTRA_CARD", engravedCard: "STRIPE_PRICE_EXTRA_ENGRAVED_CARD",
  };
  return Object.fromEntries((Object.keys(livePrices) as PriceKey[]).map(k => [
    k, Deno.env.get(names[k]) || (test ? "" : livePrices[k]),
  ])) as Record<PriceKey, string>;
}
function cartFrom(value: Record<string, unknown>): Cart | null {
  const tier = value.tier;
  const voiceCount = value.voiceCount;
  const extraCards = value.extraCards;
  const extraCardStyle = value.extraCardStyle ?? "classic";
  const engravingUpgrade = value.engravingUpgrade === true;
  if ((tier !== "basic" && tier !== "signature") || !Number.isSafeInteger(voiceCount) ||
      Number(voiceCount) < 1 || !nonnegative(extraCards) ||
      (extraCardStyle !== "classic" && extraCardStyle !== "engraved") ||
      (value.engravingUpgrade !== true && value.engravingUpgrade !== false)) return null;
  // Stripe has finite per-session amount/quantity limits; a very large wholesale
  // request needs separate sessions, not silent quantity truncation.
  if (Number(voiceCount) > 10000 || Number(extraCards) > 10000) return null;
  return {
    tier, voiceCount: Number(voiceCount), extraCards: Number(extraCards),
    extraCardStyle, engravingUpgrade: tier === "basic" && engravingUpgrade,
  };
}
function cartItems(cart: Cart): Array<{ key: PriceKey; quantity: number }> {
  const includedVoices = cart.tier === "signature" ? 2 : 1;
  const additionalVoices = Math.max(0, cart.voiceCount - includedVoices);
  return [
    { key: cart.tier, quantity: 1 },
    ...(additionalVoices ? [{ key: "voice" as const, quantity: additionalVoices }] : []),
    ...(cart.engravingUpgrade ? [{ key: "engraving" as const, quantity: 1 }] : []),
    ...(cart.extraCards ? [{ key: (cart.extraCardStyle === "engraved" ? "engravedCard" : "logoCard") as PriceKey, quantity: cart.extraCards }] : []),
  ];
}
function subtotal(cart: Cart) {
  return cartItems(cart).reduce((total, item) => total + priceValues[item.key] * item.quantity, 0);
}
async function stripe(path: string, init: RequestInit = {}) {
  if (!/^sk_(test|live)_/.test(STRIPE_SECRET_KEY)) throw new Error("Stripe checkout is not yet configured.");
  const res = await fetch("https://api.stripe.com/v1" + path, {
    ...init, headers: { Authorization: "Bearer " + STRIPE_SECRET_KEY, ...(init.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error("Stripe request failed: " + (json.error?.code ?? res.status));
  return json;
}
async function signedInUser(req: Request) {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ") || !admin) return null;
  const { data, error } = await admin.auth.getUser(authorization.slice(7));
  return error ? null : data.user;
}
async function createCheckout(req: Request, body: Record<string, unknown>) {
  if (!admin) return reply(req, { error: "Checkout service unavailable." }, 503);
  if (!/^sk_(test|live)_/.test(STRIPE_SECRET_KEY)) return reply(req, { error: "Secure checkout is being finalized." }, 503);
  const cart = cartFrom(body);
  if (!cart) return reply(req, { error: "Please review your package, voices and card quantities." }, 400);
  const configured = prices();
  const items = cartItems(cart);
  if (items.some(item => !configured[item.key])) return reply(req, { error: "Stripe price configuration is incomplete." }, 503);
  const user = await signedInUser(req);
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("customer_creation", "always");
  form.set("automatic_tax[enabled]", "true");
  form.set("billing_address_collection", "auto");
  form.set("shipping_address_collection[allowed_countries][0]", "US");
  form.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  form.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", "0");
  form.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
  form.set("shipping_options[0][shipping_rate_data][display_name]", "Standard U.S. shipping — included");
  form.set("allow_promotion_codes", "false");
  form.set("success_url", SITE_URL + (body.source === "editor" ? "/?resume=1&payment=success" : "/app?payment=success") + "&session_id={CHECKOUT_SESSION_ID}");
  form.set("cancel_url", SITE_URL + (body.source === "editor" ? "/?resume=1&payment=cancelled" : "/shop?payment=cancelled"));
  if (user?.email && user.email_confirmed_at) form.set("customer_email", user.email);
  if (user?.id) form.set("client_reference_id", user.id);
  items.forEach(({ key, quantity }, i) => {
    form.set("line_items[" + i + "][price]", configured[key]);
    form.set("line_items[" + i + "][quantity]", String(quantity));
  });
  const metadata: Record<string, string> = {
    keep_source: "keep-v1", pricing_version: "2026-11-18",
    tier: cart.tier, voice_count: String(cart.voiceCount),
    extra_cards: String(cart.extraCards), extra_card_style: cart.extraCardStyle,
    engraving_upgrade: String(cart.engravingUpgrade),
    expected_subtotal_cents: String(subtotal(cart)),
  };
  Object.entries(metadata).forEach(([key, value]) => form.set("metadata[" + key + "]", value));
  const checkoutId = uuid(body.checkoutIntentId) ? body.checkoutIntentId : crypto.randomUUID();
  // Retries with the same intent do not create extra checkout sessions.
  const session = await stripe("/checkout/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": "keep-" + checkoutId },
    body: form.toString(),
  });
  if (!session.url || !/^https:\/\/checkout\.stripe\.com\//.test(session.url))
    return reply(req, { error: "Stripe did not return a secure checkout address." }, 502);
  return reply(req, { url: session.url, sessionId: session.id, estimatedSubtotalCents: subtotal(cart) });
}
async function validatedPaidSession(sessionId: string) {
  if (!/^cs_(test_|live_)[A-Za-z0-9]+$/.test(sessionId)) throw new Error("Invalid Stripe session.");
  const session = await stripe("/checkout/sessions/" + encodeURIComponent(sessionId));
  if (session.payment_status !== "paid" || session.mode !== "payment" ||
      session.metadata?.keep_source !== "keep-v1") return null;
  const metadata = session.metadata ?? {};
  const cart = cartFrom({
    tier: metadata.tier,
    voiceCount: Number(metadata.voice_count),
    extraCards: Number(metadata.extra_cards),
    extraCardStyle: metadata.extra_card_style,
    engravingUpgrade: metadata.engraving_upgrade === "true",
  });
  if (!cart || Number(metadata.expected_subtotal_cents) !== subtotal(cart) ||
      session.currency !== "usd" || Number(session.amount_subtotal) !== subtotal(cart)) {
    throw new Error("Keep cart reconciliation failed.");
  }
  const expected = cartItems(cart).map(x => ({ id: prices()[x.key], quantity: x.quantity }));
  if (expected.some(x => !x.id)) throw new Error("Keep prices aren't configured.");
  const lineItems = await stripe("/checkout/sessions/" + encodeURIComponent(session.id) + "/line_items?limit=100");
  const actual = (lineItems.data ?? []).map((line: any) => ({ id: line.price?.id, quantity: line.quantity }));
  if (lineItems.has_more || actual.length !== expected.length ||
      expected.some(e => !actual.some(a => a.id === e.id && a.quantity === e.quantity))) {
    throw new Error("Stripe checkout line items do not match the Keep cart.");
  }
  const email = String(session.customer_details?.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Customer email missing from paid session.");
  return { session, cart, email };
}
async function recordVerifiedPayment(verified: NonNullable<Awaited<ReturnType<typeof validatedPaidSession>>>) {
  if (!admin) throw new Error("Order database unavailable.");
  const { session, cart, email } = verified;
  const shipping = session.collected_information?.shipping_details ?? session.shipping_details ?? {};
  const entries = {
    shopify_order_id: "stripe:" + session.id, // legacy non-null identity columns; Stripe ID also stored below
    shopify_line_item_id: "base",
    shopify_variant_id: "stripe:" + (cart.tier === "basic" ? prices().basic : prices().signature),
    unit_index: 0, purchaser_email: email, paid_at: new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    status: "paid", stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    package_tier: cart.tier, included_card_count: 1 + cart.extraCards,
    stripe_shipping_details: shipping,
    voice_count: cart.voiceCount, extra_logo_cards: cart.extraCardStyle === "classic" ? cart.extraCards : 0,
    extra_engraved_cards: cart.extraCardStyle === "engraved" ? cart.extraCards : 0,
    basic_engraving_upgrade: cart.engravingUpgrade,
    stripe_subtotal_cents: Number(session.amount_subtotal),
    stripe_total_cents: Number(session.amount_total),
    stripe_tax_cents: Number(session.total_details?.amount_tax ?? 0),
  };
  // Idempotent even if the webhook and the customer's status lookup race.
  // Never overwrite reservations, approvals, refunds, shipping progress or engraving.
  const { error } = await admin.from("keep_purchases").upsert(entries, {
    onConflict: "shopify_order_id,shopify_line_item_id,unit_index", ignoreDuplicates: true,
  });
  if (error) throw new Error("Could not persist verified Stripe payment.");
}
async function checkoutStatus(req: Request, body: Record<string, unknown>) {
  const user = await signedInUser(req);
  if (!user?.email_confirmed_at || !user.email) return reply(req, { error: "Sign in with your verified checkout email." }, 401);
  const id = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!id.startsWith("cs_")) return reply(req, { error: "Missing checkout session." }, 400);
  const paid = await validatedPaidSession(id);
  if (!paid) return reply(req, { paid: false });
  if (paid.email !== user.email.toLowerCase()) return reply(req, { error: "Sign in using the email on your Stripe receipt." }, 403);
  await recordVerifiedPayment(paid);
  return reply(req, { paid: true, cart: paid.cart, totalCards: paid.cart.extraCards + 1 });
}
async function reserveVerifiedKeep(req: Request, body: Record<string, unknown>) {
  if (!admin || !uuid(body.keepId)) return reply(req, { error: "Invalid Keep reservation." }, 400);
  const user = await signedInUser(req);
  if (!user?.email_confirmed_at || !user.email) return reply(req, { error: "Sign in using your verified Stripe receipt email." }, 401);
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const verified = await validatedPaidSession(sessionId);
  if (!verified || verified.email !== user.email.toLowerCase()) return reply(req, { error: "No matching verified payment." }, 402);
  await recordVerifiedPayment(verified);
  const { data: purchase, error: purchaseError } = await admin.from("keep_purchases")
    .select("id,owner_id,keep_id,status").eq("stripe_checkout_session_id", sessionId).maybeSingle();
  if (purchaseError || !purchase) return reply(req, { error: "Purchase record not found." }, 503);
  if (purchase.keep_id === body.keepId && purchase.owner_id === user.id &&
      ["reserved", "approved", "in_production", "shipped"].includes(purchase.status))
    return reply(req, { reserved: true });
  if (purchase.status !== "paid" || purchase.keep_id || purchase.owner_id)
    return reply(req, { error: "This purchase is already associated with another Keep." }, 409);
  const { data: existing, error: keepError } = await admin.from("keeps")
    .select("id,owner_id,status").eq("id", body.keepId).maybeSingle();
  if (keepError) return reply(req, { error: "Could not validate your Keep." }, 503);
  if (existing && (existing.owner_id !== user.id || existing.status !== "draft"))
    return reply(req, { error: "This Keep cannot accept a new purchase." }, 409);
  if (!existing) {
    const { error: createError } = await admin.from("keeps").insert({
      id: body.keepId, owner_id: user.id, recipient_name: "", status: "draft",
    });
    if (createError) return reply(req, { error: "Could not initialize your Keep." }, 409);
  }
  const { data, error } = await admin.from("keep_purchases")
    .update({ owner_id: user.id, keep_id: body.keepId, status: "reserved", updated_at: new Date().toISOString() })
    .eq("id", purchase.id).eq("status", "paid").is("owner_id", null).is("keep_id", null)
    .select("id").maybeSingle();
  if (error || !data) return reply(req, { error: "The payment couldn't be reserved. Please retry." }, 409);
  return reply(req, { reserved: true });
}
async function approvePaidKeep(req: Request, body: Record<string, unknown>) {
  if (!admin || !uuid(body.keepId)) return reply(req, { error: "Invalid Keep approval." }, 400);
  const user = await signedInUser(req);
  if (!user?.email_confirmed_at || !user.email) return reply(req, { error: "Sign in to approve your Keep." }, 401);
  const { data: keep, error: keepError } = await admin.from("keeps")
    .select("id,owner_id,status,published_at,published_project")
    .eq("id", body.keepId).eq("owner_id", user.id).maybeSingle();
  if (keepError || !keep || keep.status !== "ready" || !keep.published_at)
    return reply(req, { error: "Finish and publish your Keep before approving production." }, 409);
  const { data: paid, error: purchaseError } = await admin.from("keep_purchases")
    .select("id,status,package_tier,voice_count,extra_logo_cards,extra_engraved_cards,basic_engraving_upgrade,purchaser_email")
    .eq("keep_id", keep.id).eq("owner_id", user.id).not("stripe_checkout_session_id", "is", null).maybeSingle();
  if (purchaseError || !paid || paid.purchaser_email !== user.email.toLowerCase() ||
      !["reserved", "approved"].includes(paid.status))
    return reply(req, { error: "Your verified payment couldn't be matched to this Keep." }, 402);
  const project = keep.published_project ?? {};
  const order = project.keepOrder ?? {};
  const voices = project.voiceMode === "together" ? (project.contributors?.length ?? 2) : 1;
  const extraCards = Number(order.extraCards ?? 0);
  const engravedExtras = order.extraCardStyle === "engraved" ? extraCards : 0;
  const logoExtras = extraCards - engravedExtras;
  if (order.tier !== paid.package_tier || voices > paid.voice_count ||
      engravedExtras > paid.extra_engraved_cards || logoExtras > paid.extra_logo_cards ||
      (order.tier === "basic" && !!order.engravingUpgrade && !paid.basic_engraving_upgrade))
    return reply(req, { error: "The finished Keep includes upgrades not covered by your payment." }, 409);
  if (paid.status === "reserved") {
    const { error: approvalError } = await admin.from("keep_purchases")
      .update({ status: "approved", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", paid.id).eq("status", "reserved");
    if (approvalError) return reply(req, { error: "Couldn't approve production." }, 503);
  }
  const { error: fulfillmentError } = await admin.from("keep_fulfillment")
    .update({ engraving_approved: true, updated_at: new Date().toISOString() }).eq("purchase_id", paid.id);
  if (fulfillmentError) return reply(req, { error: "Couldn't approve fulfillment." }, 503);
  return reply(req, { approved: true });
}
async function signatureIsValid(raw: string, header: string) {
  if (!STRIPE_WEBHOOK_SECRET || !header) return false;
  const parts = Object.fromEntries(header.split(",").map(x => x.split("=", 2)));
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300 || !parts.v1) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key,
    new TextEncoder().encode(String(timestamp) + "." + raw)));
  const hex = Array.from(signed, b => b.toString(16).padStart(2, "0")).join("");
  // Compare fixed-length hex bytes without early termination.
  const a = new TextEncoder().encode(hex);
  const b = new TextEncoder().encode(parts.v1);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
async function receiveWebhook(req: Request) {
  if (!STRIPE_WEBHOOK_SECRET || !admin) return reply(req, { error: "Webhook not configured." }, 503);
  const raw = await req.text();
  if (raw.length > 500_000) return reply(req, { error: "Webhook too large." }, 413);
  if (!(await signatureIsValid(raw, req.headers.get("stripe-signature") ?? "")))
    return reply(req, { error: "Invalid webhook signature." }, 400);
  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const sessionId = event.data?.object?.id;
    const paid = await validatedPaidSession(sessionId);
    if (paid) await recordVerifiedPayment(paid);
  } else if (event.type === "charge.refunded" && event.data?.object?.refunded === true) {
    const paymentIntent = event.data?.object?.payment_intent;
    if (typeof paymentIntent === "string") {
      const { error } = await admin.from("keep_purchases").update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("stripe_payment_intent_id", paymentIntent).in("status", ["paid", "reserved", "approved", "in_production"]);
      if (error) throw new Error("Could not update refunded order.");
    }
  }
  return reply(req, { received: true });
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: headers(req) });
  if (req.method !== "POST") return reply(req, { error: "Method not allowed." }, 405);
  try {
    if (req.headers.has("stripe-signature")) return await receiveWebhook(req);
    // Reject browsers from unknown origins; server calls still require an authenticated action.
    const origin = req.headers.get("origin");
    if (origin && !allow.has(origin)) return reply(req, { error: "Invalid checkout origin." }, 403);
    const body = await req.json();
    if (body?.action === "checkout") return await createCheckout(req, body);
    if (body?.action === "status") return await checkoutStatus(req, body);
    if (body?.action === "reserve") return await reserveVerifiedKeep(req, body);
    if (body?.action === "approve") return await approvePaidKeep(req, body);
    return reply(req, { error: "Invalid checkout action." }, 400);
  } catch (e) {
    console.error("Keep Stripe commerce error:", e instanceof Error ? e.message : "unknown");
    return reply(req, { error: "We couldn't verify or initiate this payment. Please try again." }, 503);
  }
});
