import { createFileRoute, redirect } from "@tanstack/react-router";

// The OpenAI-hosted Keep website is the only storefront. Old links must
// redirect rather than serving a second, potentially outdated sales page.
export const Route = createFileRoute("/shop")({
  beforeLoad: () => {
    throw redirect({ href: "https://keep-official-review-nov9.candypesto.chatgpt.site/shop", statusCode: 301 });
  },
});
