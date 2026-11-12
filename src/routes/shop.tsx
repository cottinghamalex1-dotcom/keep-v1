import { KeepAccountButton } from "@/components/keep-account-button";
import { KeepCardFront } from "@/components/keep-card-front";
import couple from "@/assets/memory-couple.jpg";
import home from "@/assets/memory-home.jpg";
import travel from "@/assets/memory-travel.jpg";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Gift, Heart, Images, LockKeyhole, PackageCheck, Smartphone, Volume2 } from "lucide-react";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Create a Keep — A gift worth keeping" },
      { name: "description", content: "Choose your Keep card, then create a personal memory experience with your words, voice, photos and music. We prepare and ship it after your approval." },
    ],
  }),
  component: ShopKeep,
});

const checkoutUrl = (import.meta.env["VITE_KEEP_SHOPIFY_PRODUCT_URL"] as string | undefined)?.trim() ?? "";
const checkoutReady = /^https:\/\/[a-z0-9.-]+\/(products|cart)\//i.test(checkoutUrl);

const steps = [
  { number: "01", Icon: Gift, title: "Choose your Keep", copy: "Purchase your beautiful physical card with secure checkout." },
  { number: "02", Icon: Images, title: "Make it personal", copy: "Follow a simple, guided process to bring your voice, photos and memories together." },
  { number: "03", Icon: PackageCheck, title: "Approve. We'll ship.", copy: "Watch the finished experience, approve it, and we'll prepare, test and send your card." },
];

function PurchaseButton({ className = "" }: { className?: string }) {
  if (!checkoutReady) return <div className={className}>
    <span className="flex min-h-14 items-center justify-center rounded-xl border border-border bg-secondary/50 px-6 py-4 text-center text-sm text-foreground/75">Checkout opening soon</span>
    <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">We're finalizing secure checkout and fulfillment. No payment is being collected yet.</p>
  </div>;
  return <a className={`keep-premium-action flex min-h-14 items-center justify-between px-6 py-4 ${className}`} href={checkoutUrl} rel="noopener noreferrer">
    Purchase Your Keep <ArrowRight className="size-5" />
  </a>;
}

function ShopKeep() {
  return <main className="min-h-dvh bg-background text-foreground">
    <div className="mx-auto max-w-5xl px-6 pb-24">
      <header className="flex items-center justify-between border-b border-border/80 py-6">
        <Link to="/shop" className="keep-wordmark" aria-label="Keep shop">Keep</Link>
        <div className="flex items-center gap-4">
          <Link to="/about" className="hidden text-sm text-foreground/70 sm:inline">How it works</Link>
          <KeepAccountButton />
        </div>
      </header>

      <section className="grid items-center gap-12 border-b border-border/80 py-14 md:grid-cols-2 md:py-24">
        <div>
          <p className="mb-5 text-[11px] uppercase tracking-[.22em] text-[#6A5849]">Some things are worth keeping.</p>
          <h1 className="keep-editorial-title !text-[clamp(42px,6vw,76px)]">Give them words they'll never forget.</h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-foreground/75">Keep turns your words, your voice and your favorite moments into a beautiful, personal memory experience — connected to a physical card they can hold onto.</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-[#6A5849]">
            <span className="inline-flex items-center gap-2"><Check className="size-4" /> No design skills needed</span>
            <span className="inline-flex items-center gap-2"><Check className="size-4" /> Create after purchase</span>
          </div>
          <PurchaseButton className="mt-8 max-w-md" />
          <p className="mt-5 text-xs leading-6 text-muted-foreground">Already purchased? <Link to="/app" className="font-medium text-[#6A5849] underline underline-offset-4">Sign in and create your Keep</Link>.</p>
        </div>
        <div className="rounded-3xl bg-[#E8E0D6] p-6 sm:p-9">
          <div className="mx-auto max-w-sm rounded-2xl bg-[#F7F3EF] p-6 shadow-xl">
            <KeepCardFront engraving={["MOM", "FROM US", "2026"]} />
            <p className="mt-5 text-center text-[11px] uppercase tracking-[.18em] text-[#6A5849]">A real gift. A lasting message.</p>
          </div>
        </div>
      </section>

      <section className="border-b border-border/80 py-16 md:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="mb-4 text-xs uppercase tracking-[.2em] text-[#6A5849]">The experience inside</p>
          <h2 className="keep-section-title">Every word. Every memory. All in one place.</h2>
          <p className="mt-5 text-sm leading-7 text-foreground/75">The person receiving your card taps it with their phone to open a personal film of the moments and words you've chosen. No app download required.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-5">
          {[{ src: couple, alt: "A couple together" }, { src: travel, alt: "A moment from a trip" }, { src: home, alt: "A treasured moment at home" }].map(({src, alt}) =>
            <div key={alt} className="overflow-hidden rounded-xl bg-secondary"><img src={src} alt={alt} className="aspect-[3/4] w-full object-cover" /></div>
          )}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <p className="flex items-center gap-2 text-sm text-foreground/75"><Volume2 className="size-4 text-[#6A5849]" /> Your own voice and favorite music</p>
          <p className="flex items-center gap-2 text-sm text-foreground/75"><Images className="size-4 text-[#6A5849]" /> Photos, short videos and captions</p>
          <p className="flex items-center gap-2 text-sm text-foreground/75"><Smartphone className="size-4 text-[#6A5849]" /> A private tap-to-watch experience</p>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">Illustrative memories shown. An actual narrated sample film will be added before launch.</p>
      </section>

      <section className="border-b border-border/80 py-16 md:py-20">
        <p className="mb-4 text-xs uppercase tracking-[.2em] text-[#6A5849]">The journey</p>
        <h2 className="keep-section-title">A meaningful gift, made simple.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map(({ number, Icon, title, copy }) => <article key={number} className="keep-editorial-surface p-6">
            <span className="text-xs tracking-[.2em] text-[#6A5849]">{number}</span>
            <Icon className="mb-5 mt-8 size-6 text-[#6A5849]" />
            <h3 className="font-display text-[27px]">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-foreground/70">{copy}</p>
          </article>)}
        </div>
      </section>

      <section className="mx-auto max-w-2xl py-16 text-center md:py-20">
        <Heart className="mx-auto mb-5 size-6 text-[#6A5849]" />
        <h2 className="keep-section-title">A gift that means more every time they revisit it.</h2>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-foreground/75">You don't have to know exactly what to say. Keep will help you find the words and put everything together after your purchase.</p>
        <PurchaseButton className="mx-auto mt-9 max-w-md" />
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-4" /> Your recordings and memories stay private.</div>
      </section>
    </div>
  </main>;
}
