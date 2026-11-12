import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const originHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
const respond = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...originHeaders, "Content-Type": "application/json" } });
const uuid = (value: unknown): value is string =>
  typeof value === "string" && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
const emailOf = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";

async function shopifySignatureValid(raw: string, header: string) {
  const secret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET") ?? "";
  if (!secret || !header) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const encoded = btoa(String.fromCharCode(...digest));
  const a = new TextEncoder().encode(encoded);
  const b = new TextEncoder().encode(header);
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0;
}

type ShopifyOrder = {
  id?: number | string;
  email?: string;
  contact_email?: string;
  financial_status?: string;
  processed_at?: string;
  line_items?: Array<{ id?: number | string; variant_id?: number | string; quantity?: number }>;
};
async function webhook(req: Request) {
  const raw = await req.text();
  if (raw.length > 250_000) return respond({ error: "Payload too large" }, 413);
  if (!(await shopifySignatureValid(raw, req.headers.get("x-shopify-hmac-sha256") ?? "")))
    return respond({ error: "Invalid Shopify signature" }, 401);
  const shop = req.headers.get("x-shopify-shop-domain") ?? "";
  const expectedShop = Deno.env.get("KEEP_SHOPIFY_SHOP_DOMAIN") ?? "";
  if (!expectedShop || shop.toLowerCase() !== expectedShop.toLowerCase())
    return respond({ error: "Unrecognized store" }, 403);
  const topic = req.headers.get("x-shopify-topic") ?? "";
  const order = JSON.parse(raw) as ShopifyOrder & { order_id?: number | string };
  const orderId = String(order.order_id ?? order.id ?? "");
  if (!/^\d+$/.test(orderId)) return respond({ error: "Invalid order ID" }, 400);

  if (topic === "orders/paid") {
    if (order.financial_status !== "paid") return respond({ ignored: true });
    const email = emailOf(order.email || order.contact_email);
    const variant = Deno.env.get("KEEP_SHOPIFY_VARIANT_ID") ?? "";
    if (!email || !/^\d+$/.test(variant)) return respond({ error: "Purchase configuration missing" }, 503);
    const entries = (order.line_items ?? []).flatMap(line => {
      if (String(line.variant_id ?? "") !== variant || !/^\d+$/.test(String(line.id ?? ""))) return [];
      const quantity = Number(line.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 25) return [];
      return Array.from({ length: quantity }, (_, index) => ({
        shopify_order_id: orderId,
        shopify_line_item_id: String(line.id),
        unit_index: index,
        shopify_variant_id: variant,
        purchaser_email: email,
        paid_at: order.processed_at ?? new Date().toISOString(),
        status: "paid",
      }));
    });
    if (!entries.length) return respond({ ignored: true });
    // Ignore duplicate webhook deliveries: do not overwrite already reserved or approved Keeps.
    const { error } = await admin.from("keep_purchases").upsert(entries, {
      onConflict: "shopify_order_id,shopify_line_item_id,unit_index",
      ignoreDuplicates: true,
    });
    if (error) return respond({ error: "Could not record verified purchase" }, 503);
    return respond({ accepted: true });
  }

  if (topic === "orders/cancelled" || topic === "refunds/create") {
    const { error } = await admin.from("keep_purchases")
      .update({ status: topic === "orders/cancelled" ? "cancelled" : "refunded", updated_at: new Date().toISOString() })
      .eq("shopify_order_id", orderId)
      .in("status", ["paid", "reserved", "approved", "in_production"]);
    if (error) return respond({ error: "Unable to record order change" }, 503);
    return respond({ accepted: true });
  }
  return respond({ ignored: true });
}

async function authenticatedUser(req: Request) {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const { data: { user }, error } = await admin.auth.getUser(header.slice(7));
  if (error || !user?.email || !user.email_confirmed_at) return null;
  return user;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: originHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  try {
    if (req.headers.get("x-shopify-hmac-sha256")) return await webhook(req);
    const user = await authenticatedUser(req);
    if (!user) return respond({ error: "Sign in with your verified checkout email to create your Keep." }, 401);
    const body = await req.json();
    const email = emailOf(user.email);
    const { data: purchases, error } = await admin.from("keep_purchases")
      .select("id, owner_id, keep_id, status")
      .eq("purchaser_email", email)
      .or(`owner_id.is.null,owner_id.eq.${user.id}`)
      .order("paid_at", { ascending: true });
    if (error) return respond({ error: "Couldn't verify your purchase." }, 503);
    const visible = purchases ?? [];
    const unclaimed = visible.filter(p => p.status === "paid" && !p.keep_id);
    if (body.action === "status") {
      return respond({
        canCreate: unclaimed.length > 0,
        reservedKeeps: visible.filter(p => p.owner_id === user.id && p.status === "reserved").length,
        awaitingApproval: visible.filter(p => p.owner_id === user.id && p.status === "approved").length,
      });
    }
    if (body.action !== "reserve" || !uuid(body.keepId)) return respond({ error: "Invalid action or Keep ID." }, 400);
    // Retry after a lost response is safe; reserve never grants more than one creation per paid unit.
    const existing = visible.find(p => p.keep_id === body.keepId && p.owner_id === user.id && ["reserved", "approved"].includes(p.status));
    if (existing) return respond({ reserved: true });
    if (!unclaimed.length)
      return respond({ error: "This account has no unused paid Keep. Purchase another card to create a new one." }, 402);
    // Create the draft record first so the reservation's foreign key is valid.
    // Every attempt uses a fresh Keep ID, never overwrites an existing project.
    const { error: createError } = await admin.from("keeps").insert({
      id: body.keepId, owner_id: user.id, recipient_name: "", status: "draft",
    });
    if (createError) return respond({ error: "Couldn't initialize your Keep. Please try again." }, 409);
    const available = unclaimed[0];
    const { data, error: reserveError } = await admin.from("keep_purchases")
      .update({ owner_id: user.id, keep_id: body.keepId, status: "reserved", updated_at: new Date().toISOString() })
      .eq("id", available.id).is("keep_id", null).eq("status", "paid")
      .select("id").maybeSingle();
    if (reserveError || !data) {
      await admin.from("keeps").delete().eq("id", body.keepId).eq("owner_id", user.id).eq("status", "draft");
      return respond({ error: "Unable to reserve your purchased Keep. Please try again." }, 409);
    }
    return respond({ reserved: true });
  } catch (error) {
    console.error("Keep commerce request failed", error instanceof Error ? error.message : "Unknown error");
    return respond({ error: "Could not complete the request." }, 500);
  }
});
