export const uuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export type EmailState = "pending" | "sending" | "sent" | "failed" | "unknown" | "unconfigured";
export type DeliveryEvent = {
  purchase_id: string; keep_id: string; delivered_at: string;
  email_state: EmailState; email_sent_at?: string | null;
};
export type Shipment = {
  purchase_id: string; shipped: boolean; shipping_carrier?: string | null; tracking_number?: string | null;
};
export function canConfirmDelivery(shipment: Shipment | null | undefined, purchase: {status: string; keep_id?: string | null; owner_id?: string | null} | null | undefined) {
  return !!(shipment?.shipped && shipment.shipping_carrier?.trim() && shipment.tracking_number?.trim() &&
    purchase && ["paid","reserved","approved","in_production","shipped"].includes(purchase.status) && purchase.keep_id && purchase.owner_id);
}
export function validDeliveryDate(value: unknown, shippedAt?: string | null, now = Date.now()): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const time = Date.parse(value);
  const shipped = shippedAt ? Date.parse(shippedAt) : NaN;
  if (!Number.isFinite(time) || time > now + 60_000 || (Number.isFinite(shipped) && time < shipped)) return null;
  return new Date(time).toISOString();
}
export const emailRetryable = (state: EmailState) => ["pending","failed","unconfigured"].includes(state);
export function deliveryEmail(recipientName: string | null | undefined) {
  const safeName = (recipientName ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0,100);
  const forWhom = safeName ? " for " + safeName : "";
  return {
    subject: "Your Keep has been delivered",
    text: "Good news — the shipment containing your Keep" + forWhom + " has been confirmed delivered.\n\nYou poured something meaningful into this gift. You can check your Keep account to see when the viewing experience is first opened.\n\nhttps://keep-v1.vercel.app/my-keeps\n\nSome things are worth keeping.",
  };
}
