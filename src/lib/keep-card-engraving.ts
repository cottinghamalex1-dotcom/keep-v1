/** Keep the original To/From/Date positions stable for existing films and links.
 * The optional layout adds a title and controls only the physical card order. */
export const engravingFields = ["title", "to", "from", "date"] as const;
export type EngravingField = typeof engravingFields[number];
export type CardEngravingLayout = { title: string; order: EngravingField[] };

export const engravingFieldDetails: Record<EngravingField, { label: string; placeholder: string }> = {
  title: { label: "Title", placeholder: "HAPPY BIRTHDAY" },
  to: { label: "To", placeholder: "HANNAH" },
  from: { label: "From", placeholder: "FROM ALEX" },
  date: { label: "Date", placeholder: "NOVEMBER 27, 2026" },
};

export function engravingLayout(layout?: CardEngravingLayout): CardEngravingLayout {
  const order = Array.isArray(layout?.order)
    ? [...new Set(layout.order.filter(field => engravingFields.includes(field)))]
    : [];
  return { title: typeof layout?.title === "string" ? layout.title : "", order: [...order, ...engravingFields.filter(field => !order.includes(field))] };
}

export function engravingValues(engraving: readonly string[], layout?: CardEngravingLayout): Record<EngravingField, string> {
  return { title: engravingLayout(layout).title, to: engraving[0] ?? "", from: engraving[1] ?? "", date: engraving[2] ?? "" };
}

export function orderedEngravingLines(engraving: readonly string[], layout?: CardEngravingLayout): string[] {
  const values = engravingValues(engraving, layout);
  return engravingLayout(layout).order.map(field => values[field].trim()).filter(Boolean);
}
