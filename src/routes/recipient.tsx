import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KeepPlayer, memoryImages } from "@/components/keep-player";

export const Route = createFileRoute("/recipient")({
  head: () => ({ meta: [
    { title: "A Keep for Hanna — KEEP" },
    { name: "description", content: "A private memory made for Hanna by Alex." },
    { property: "og:title", content: "A Keep for Hanna — KEEP" },
    { property: "og:description", content: "A private memory made for Hanna by Alex." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Recipient,
});

function Recipient() {
  const [opened, setOpened] = useState(false);
  return <main className="app-shell">{opened ? <KeepPlayer name="HANNA" from="Alex" year="2026" recipient onExit={() => setOpened(false)} /> : <div className="relative flex h-dvh min-h-[600px] flex-col overflow-hidden"><img src={memoryImages[0]} alt="Couple at the coast, illustrative prototype photograph" className="absolute inset-0 h-full w-full object-cover opacity-45" /><div className="absolute inset-0 photo-shade" /><div className="relative z-10 flex h-full flex-col items-center justify-between px-7 pb-[max(45px,env(safe-area-inset-bottom))] pt-[max(38px,env(safe-area-inset-top))] text-center"><span className="brand">KEEP</span><div><div className="eyebrow mb-6 text-foreground">A KEEP FOR</div><h1 className="display text-7xl">HANNA</h1><p className="mt-5 text-sm">from Alex · 2026</p></div><div className="w-full"><Radio className="mx-auto mb-6 size-5 text-accent" /><Button variant="keep" size="touch" className="w-full" onClick={() => setOpened(true)}>Open Your Keep <ArrowRight /></Button></div></div></div>}</main>;
}