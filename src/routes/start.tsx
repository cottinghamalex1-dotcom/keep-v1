import { KeepAccountButton } from "@/components/keep-account-button";
import { activeKeepSession } from "@/lib/keep-cloud";
import { purchaseStatus } from "@/lib/keep-commerce";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Gift, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/start")({
  head: () => ({ meta: [{ title: "Start Creating Your Keep" }, { name: "robots", content: "noindex" }] }),
  component: PurchasedKeepStart,
});

type State = "loading" | "signed-out" | "available" | "claimed" | "not-found" | "error";

function PurchasedKeepStart() {
  const [state, setState] = useState<State>("loading");
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await activeKeepSession();
        if (!active) return;
        if (!session) return setState("signed-out");
        const status = await purchaseStatus(session);
        if (!active) return;
        setState(status.canCreate ? "available" : status.reservedKeeps || status.awaitingApproval ? "claimed" : "not-found");
      } catch {
        if (active) setState("error");
      }
    })();
    return () => { active = false; };
  }, []);

  return <main className="min-h-dvh bg-background text-foreground">
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6 pb-16">
      <header className="flex items-center justify-between border-b border-border/80 py-6">
        <Link to="/shop" className="keep-wordmark">Keep</Link>
        <KeepAccountButton />
      </header>
      <section className="my-auto py-16 text-center">
        <div className="mx-auto mb-7 flex size-14 items-center justify-center rounded-full border border-[#CFC2B1] bg-[#EEE8E0]">
          {state === "available" ? <CheckCircle2 className="size-6 text-[#6A5849]" /> : <Gift className="size-6 text-[#6A5849]" />}
        </div>
        <p className="mb-4 text-xs uppercase tracking-[.22em] text-[#6A5849]">Some things are worth keeping.</p>
        <h1 className="keep-editorial-title">{state === "available" ? "Your Keep begins here." : state === "loading" ? "Finding your Keep…" : "Make it personal."}</h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-foreground/70">
          {state === "available" ? "Your purchase is confirmed. We'll guide you from your very first words through your finished gift." :
            state === "signed-out" ? "Sign in or create a Keep account with the same email you used at checkout. Your paid creation will appear automatically." :
            state === "claimed" ? "Your paid Keep has already been started. Pick up right where you left off in your account." :
            state === "not-found" ? "We haven't matched a paid Keep to this email yet. Please check that your account email is the same as your checkout email. Newly paid orders may need a moment to register." :
            state === "error" ? "We couldn't verify your order right now. Your purchase hasn't been lost. Please try from your account." :
            "Checking your account and purchase securely."}
        </p>
        <div className="mx-auto mt-10 max-w-md">
          {state === "available" ? <a href="/?create=1" className="keep-premium-action flex min-h-14 items-center justify-between rounded-xl px-6 py-4">Let's Create Your Keep <ArrowRight className="size-5" /></a> :
            state === "signed-out" ? <Link to="/app" className="keep-premium-action flex min-h-14 items-center justify-between rounded-xl px-6 py-4">Sign In to Continue <ArrowRight className="size-5" /></Link> :
            state === "claimed" ? <Link to="/app" className="keep-premium-action flex min-h-14 items-center justify-between rounded-xl px-6 py-4">Continue Editing <ArrowRight className="size-5" /></Link> :
            state !== "loading" ? <div className="flex flex-col gap-3">
              <Link to="/app" className="keep-premium-action flex min-h-14 items-center justify-between rounded-xl px-6 py-4">Go to My Keeps <ArrowRight className="size-5" /></Link>
              <Link to="/shop" className="text-sm text-[#6A5849] underline underline-offset-4">Return to the Keep shop</Link>
            </div> : null}
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-4" /> The creator opens only after payment is verified.</p>
      </section>
    </div>
  </main>;
}
