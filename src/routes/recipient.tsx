import { createFileRoute } from "@tanstack/react-router";
import { KeepRecipientExperience } from "@/components/keep-recipient-experience";

export const Route = createFileRoute("/recipient")({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search["name"] === "string" ? search["name"].slice(0, 50) : "Hanna",
    from: typeof search["from"] === "string" ? search["from"].slice(0, 50) : "Alex",
    year: typeof search["year"] === "string" ? search["year"].slice(0, 4) : "2026",
  }),
  head: () => ({ meta: [
    { title: "A private Keep — KEEP" },
    { name: "description", content: "Something meaningful was kept for you." },
    { property: "og:title", content: "A private Keep — KEEP" },
    { property: "og:description", content: "Something meaningful was kept for you." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Recipient,
});

function Recipient() {
  const { name, from, year } = Route.useSearch();
  return <KeepRecipientExperience name={name} from={from} year={year} />;
}
