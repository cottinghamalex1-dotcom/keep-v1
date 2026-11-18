import { activeKeepSession } from "./keep-cloud";
import type { KeepTier } from "./keep-pricing";

const URL = "https://lwkzhpwugtosbidxvdcr.supabase.co/functions/v1/keep-stripe-commerce";
const COMMERCE = "https://lwkzhpwugtosbidxvdcr.supabase.co/functions/v1/keep-commerce";
const PUBLISHABLE = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";

/** Checkout is never silently enabled: webhook, tax, test purchases and secrets must all pass. */
export const keepStripeCheckoutReady = import.meta.env["VITE_KEEP_STRIPE_CHECKOUT_READY"] === "true";

export type KeepCheckoutCart = {
  tier: KeepTier;
  voiceCount: number;
  extraCards: number;
  extraCardStyle: "classic" | "engraved";
  engravingUpgrade: boolean;
};

export const keepCheckoutFingerprint = (c: KeepCheckoutCart) =>
  [c.tier, c.voiceCount, c.extraCards, c.extraCardStyle, c.tier === "basic" && c.engravingUpgrade ? 1 : 0].join(":");

async function call(endpoint: string, body: Record<string, unknown>) {
  const session = await activeKeepSession();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PUBLISHABLE,
      ...(session?.access_token ? { Authorization: "Bearer " + session.access_token } : {}),
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Secure checkout is temporarily unavailable.");
  return result;
}

/** Starts Stripe's hosted checkout; no card data ever reaches the Keep app. */
export async function beginKeepStripeCheckout(cart: KeepCheckoutCart, source: "shop" | "editor") {
  if (!keepStripeCheckoutReady) throw new Error("Secure checkout is not open yet.");
  const result = await call(URL, { action: "checkout", source, ...cart, checkoutIntentId: crypto.randomUUID() });
  if (typeof result.url !== "string" || !/^https:\/\/checkout\.stripe\.com\//.test(result.url))
    throw new Error("Stripe did not return a secure checkout page.");
  window.location.assign(result.url);
}

export async function verifyKeepStripeCheckout(sessionId: string): Promise<{ paid: boolean; cart?: KeepCheckoutCart }> {
  const result = await call(URL, { action: "status", sessionId });
  return { paid: result.paid === true, cart: result.cart };
}

/** A paid package grants exactly one creation, not one creation per extra card. */
export async function reservePaidKeep(keepId: string): Promise<void> {
  await call(COMMERCE, { action: "reserve", keepId });
}
