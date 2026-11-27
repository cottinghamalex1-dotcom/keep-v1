import { activeKeepSession } from "@/lib/keep-cloud";
import { defaultKeepOrder, keepOrderQuote, normalizeExtraCards, type KeepOrderSelection } from "@/lib/keep-pricing";

const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";

export const keepCheckoutPath = (keepId: string) => "/checkout?keep=" + encodeURIComponent(keepId);

export type CheckoutKeep = {
  id: string;
  recipient_name: string;
  recipient_token: string;
  published_project: {
    musicMood: string;
    audioMix?: { musicMuted?: boolean };
    voiceMode?: string;
    contributors?: unknown[];
    openingMessage?: string;
  };
};

/** Load the saved snapshot, not an editable local draft. Never start a render
 * from an arbitrary link or using somebody else's Keep ID. */
export async function loadCheckoutKeep(keepId: string, signal?: AbortSignal): Promise<CheckoutKeep> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(keepId))
    throw new Error("Choose a saved Keep in your account.");
  const session = await activeKeepSession();
  if (!session) throw new Error("Sign in to finish your Keep.");
  const params = new URLSearchParams({
    select: "id,recipient_name,recipient_token,published_project",
    id: "eq." + keepId,
    owner_id: "eq." + session.user.id,
    status: "eq.ready",
    published_at: "not.is.null",
    limit: "1",
  });
  const res = await fetch(endpoint + "/rest/v1/keeps?" + params, {
    signal: signal ?? null, cache: "no-store", headers: { apikey: publicKey, Authorization: "Bearer " + session.access_token },
  });
  if (!res.ok) throw new Error("Couldn't load your saved Keep. Please try again.");
  const rows = await res.json();
  const keep = rows[0] as CheckoutKeep | undefined;
  if (!keep?.id || !keep.recipient_token || !keep.published_project?.musicMood)
    throw new Error("This Keep hasn't been saved yet. Return to the editor and save it first.");
  return keep;
}

export function checkoutVoiceCount(keep: CheckoutKeep): number {
  return keep.published_project.voiceMode === "together" ? Math.max(2, keep.published_project.contributors?.length ?? 2) : 1;
}

/** Price selections are display-only while verified checkout is disabled.
 * Never store card/payment data, or imply that an order has been placed. */
export function saveCheckoutSelection(keepId: string, selection: KeepOrderSelection) {
  try { sessionStorage.setItem("keep-checkout:" + keepId, JSON.stringify(selection)); } catch { /* optional UI convenience */ }
}

export function loadCheckoutSelection(keepId: string, voices: number): KeepOrderSelection {
  const fallback: KeepOrderSelection = { ...defaultKeepOrder(), tier: voices > 1 ? "signature" : "basic" };
  try {
    const saved = JSON.parse(sessionStorage.getItem("keep-checkout:" + keepId) || "null");
    if (!saved || (saved.tier !== "basic" && saved.tier !== "signature")) return fallback;
    const selection: KeepOrderSelection = {
      ...fallback, tier: saved.tier,
      engravingUpgrade: saved.engravingUpgrade === true,
      extraCards: normalizeExtraCards(saved.extraCards),
      extraCardStyle: saved.extraCardStyle === "classic" || saved.extraCardStyle === "engraved" ? saved.extraCardStyle : undefined,
    };
    const quote = keepOrderQuote(selection, voices);
    return { ...selection, tier: quote.tier, engravingUpgrade: false, extraCardStyle: quote.extraCardStyle };
  } catch { return fallback; }
}

