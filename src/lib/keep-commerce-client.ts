import { activeKeepSession, type KeepSession } from "@/lib/keep-cloud";

const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
export const activeOrderStatuses = new Set(["paid", "reserved", "approved", "in_production", "shipped"]);

export type Purchase = {
  id: string;
  shopify_order_id: string;
  purchaser_email: string;
  keep_id: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export type Fulfillment = {
  purchase_id: string;
  order_reference: string;
  package_tier: "basic" | "signature" | "deluxe";
  card_count: number;
  engraving_1: string; engraving_2: string;
  recipient_name: string | null;
  shipping_name: string | null;
  shipping_email: string | null;
  shipping_address1: string | null;
  shipping_address2: string | null;
  shipping_city: string | null;
  shipping_region: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  engraving_approved: boolean;
  engraved: boolean; nfc_written: boolean; nfc_tested: boolean;
  packed: boolean; shipped: boolean; issue_flag: boolean;
  shipping_carrier: string | null; tracking_number: string | null;
  card_url: string | null;
  admin_notes: string;
  updated_at: string;
  created_at: string;
};

export type SupportTicket = {
  id: string; owner_id: string;
  purchase_id: string | null;
  subject: string; description: string;
  status: "open" | "in_progress" | "resolved";
  priority: "normal" | "urgent";
  admin_notes: string;
  created_at: string;
};

export async function keepCommerceRequest<T>(
  path: string,
  session: KeepSession,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint + path, {
    ...options,
    headers: {
      apikey: publicKey,
      Authorization: "Bearer " + session.access_token,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    let message = "Request failed";
    try {
      const error = await response.json();
      message = error.message || error.error_description || error.error || message;
    } catch { /* Keep the fallback error. */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function currentKeepUser(): Promise<KeepSession | null> {
  return activeKeepSession();
}

export async function claimAndListPurchases(session: KeepSession): Promise<Purchase[]> {
  // Can only claim records created by verified, server-side payment processing.
  await keepCommerceRequest<number>("/rest/v1/rpc/keep_claim_purchases", session, {
    method: "POST", body: "{}",
  });
  return keepCommerceRequest<Purchase[]>(
    "/rest/v1/keep_purchases?select=id,shopify_order_id,purchaser_email,keep_id,status,paid_at,created_at&order=created_at.desc",
    session
  );
}

export async function isKeepAdmin(session: KeepSession): Promise<boolean> {
  return keepCommerceRequest<boolean>("/rest/v1/rpc/keep_is_admin", session, {
    method: "POST", body: "{}",
  });
}
