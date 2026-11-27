import { createFileRoute, redirect } from "@tanstack/react-router";

// Our public story belongs exclusively to the official Keep website.
export const Route = createFileRoute("/about")({
  beforeLoad: () => {
    throw redirect({ href: "https://keep-official-review-nov9.candypesto.chatgpt.site/", statusCode: 301 });
  },
});
