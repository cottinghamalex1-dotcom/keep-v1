import { activeKeepSession, type KeepSession } from "@/lib/keep-cloud";

const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co/functions/v1/keep-commerce";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";

export type PurchaseStatus = {
  canCreate: boolean;
  reservedKeeps: number;
  awaitingApproval: number;
};

async function commerceRequest<T>(session: KeepSession, action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { apikey: publicKey, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "We couldn't verify your Keep purchase. Please try again.");
  return data as T;
}

export async function purchaseStatus(session?: KeepSession | null): Promise<PurchaseStatus> {
  const current = session ?? await activeKeepSession();
  if (!current) return { canCreate: false, reservedKeeps: 0, awaitingApproval: 0 };
  return commerceRequest<PurchaseStatus>(current, "status");
}

export async function reservePaidKeep(keepId: string, session?: KeepSession | null): Promise<void> {
  const current = session ?? await activeKeepSession();
  if (!current) throw new Error("Sign in with the email used at checkout to begin creating.");
  await commerceRequest(current, "reserve", { keepId });
}
