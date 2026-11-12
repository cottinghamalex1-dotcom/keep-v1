import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gift, Heart, Images, MessageCircle, Music2, Smartphone, Sparkles } from "lucide-react";
import { KeepAccountButton } from "@/components/keep-account-button";

export const Route = createFileRoute("/about")({ component: AboutKeep });

const ideas = [
  { category: "For the people you love", items: ["A letter to your spouse", "A thank-you to Mom or Dad", "Your child's voice for a grandparent", "A message for your best friend"] },
  { category: "For life's milestones", items: ["Weddings and anniversaries", "A new baby or growing family", "Graduations and birthdays", "Retirements and farewells"] },
  { category: "For the moments worth remembering", items: ["Family vacations and adventures", "A year in review", "Christmas and holiday traditions", "Mother's Day and Father's Day"] },
  { category: "For the words that matter most", items: ["An apology or a thank-you", "Encouragement for a hard season", "Stories passed down through generations", "A tribute to someone you miss"] },
];

function AboutKeep() {
  return <main className="min-h-dvh bg-background text-foreground">
    <div className="mx-auto max-w-[720px] px-6 pb-24">
      <header className="flex items-center justify-between border-b border-border/80 py-7"><Link to="/" className="keep-wordmark">Keep</Link><KeepAccountButton /></header>
      <section className="pb-16 pt-20">
        <p className="mb-5 text-[11px] uppercase tracking-[.24em] text-[#6A5849]">Some things are worth keeping</p>
        <h1 className="keep-editorial-title !text-[clamp(46px,10vw,76px)]">Give them something they'll never forget.</h1>
        <p className="mt-8 max-w-xl text-base leading-8 text-foreground/75">The words you've always wanted to say. The photos that bring it all back. The voice they know by heart. Keep brings them together in a personal memory film, connected to a beautiful physical keepsake.</p>
        <a href="/shop" className="keep-premium-action mt-10 px-6 py-4">Choose a Keep <ArrowRight className="size-4" /></a>
      </section>
      <section className="border-t border-border/80 py-16">
        <p className="mb-5 text-xs uppercase tracking-[.2em] text-[#6A5849]">Our mission</p>
        <h2 className="keep-section-title">Make it easier to say what matters — and impossible to forget.</h2>
        <p className="mt-6 max-w-xl text-sm leading-7 text-foreground/75">We believe the most meaningful gifts aren't things. They're the love, gratitude, stories, and moments we share with each other. Our mission is to help people turn those feelings into something lasting.</p>
        <p className="mt-8 text-xs uppercase tracking-[.2em] text-[#6A5849]">Our vision</p>
        <p className="mt-4 max-w-xl text-sm leading-7 text-foreground/75">A world where the most important words don't go unsaid, and the memories behind them can be revisited for generations.</p>
      </section>
      <section className="border-t border-border/80 py-16">
        <p className="mb-4 text-xs uppercase tracking-[.2em] text-[#6A5849]">The possibilities</p>
        <h2 className="keep-section-title">One Keep. So many reasons.</h2>
        <p className="mt-4 text-sm leading-7 text-foreground/75">You don't need a big occasion. Sometimes an ordinary Tuesday is the perfect time to remind someone what they mean to you.</p>
        <div className="mt-9 grid gap-4 sm:grid-cols-2">{ideas.map((group) => <article key={group.category} className="keep-editorial-surface p-6"><h3 className="mb-5 font-display text-2xl text-foreground">{group.category}</h3><ul className="space-y-3">{group.items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-foreground/75"><Heart className="mt-1 size-3 shrink-0 text-[#6A5849]" />{item}</li>)}</ul></article>)}</div>
      </section>
      <section className="border-t border-border/80 py-16">
        <p className="mb-4 text-xs uppercase tracking-[.2em] text-[#6A5849]">How it works</p>
        <h2 className="keep-section-title">A meaningful gift, made simple.</h2>
        <div className="mt-10 space-y-8">{[
          { n:"01", title:"Choose and purchase your Keep", description:"Pick your physical card and complete secure checkout before creating.", Icon:Gift },
          { n:"02", title:"Find the words", description:"After your purchase, speak from the heart, write a message, or let Keep guide you with thoughtful prompts.", Icon:MessageCircle },
          { n:"03", title:"Bring the story to life", description:"Add favorite photos and videos, then personalize the voice, captions, music, and feel.", Icon:Images },
          { n:"04", title:"Approve and give", description:"Preview and approve your completed creation. We prepare and ship your card; they tap to experience it.", Icon:Smartphone },
        ].map(({n,title,description,Icon})=><div key={n} className="flex gap-5"><span className="pt-1 text-xs text-[#6A5849]">{n}</span><div className="flex-1 border-b border-border/80 pb-7"><Icon className="mb-3 size-5 text-[#6A5849]" /><h3 className="font-display text-2xl">{title}</h3><p className="mt-2 text-sm leading-7 text-foreground/75">{description}</p></div></div>)}</div>
        <p className="mt-6 text-xs leading-6 text-muted-foreground">The card is prepared and shipped only after you finish and approve your creation. Checkout is being finalized for launch.</p>
      </section>
      <section className="border-t border-border/80 py-16 text-center"><Sparkles className="mx-auto mb-6 size-6 text-[#6A5849]" /><h2 className="keep-editorial-title">Say what matters. Keep it forever.</h2><p className="mx-auto mt-5 max-w-sm text-sm leading-7 text-foreground/75">It doesn't have to be perfect. It just has to be yours.</p><a href="/shop" className="keep-premium-action mt-9 px-7 py-4">Choose a Keep <ArrowRight className="size-4" /></a></section>
    </div>
  </main>;
}
