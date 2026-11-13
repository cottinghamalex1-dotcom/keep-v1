import { KeepAccountButton } from "@/components/keep-account-button";
import { KeepCardFront } from "@/components/keep-card-front";
import couple from "@/assets/memory-couple.jpg";
import wedding from "@/assets/memory-wedding.jpg";
import home from "@/assets/memory-home.jpg";
import travel from "@/assets/memory-travel.jpg";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Check, CheckCircle2, Heart, Images, LockKeyhole, PackageCheck, Play, Smartphone, Sparkles, Volume2 } from "lucide-react";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Keep — Some things are worth keeping" },
      { name: "description", content: "A meaningful metal keepsake card in three options: Basic $69, Signature $99 and Deluxe $129. Standard U.S. shipping included." },
    ],
  }),
  component: ShopKeep,
});

// Stripe-hosted links stay disabled until each tier's webhook, engraving and fulfillment are tested.
type KeepTier = "basic" | "signature" | "deluxe";
const checkoutUrls: Record<KeepTier, string> = {
  basic: (import.meta.env["VITE_KEEP_STRIPE_BASIC_PAYMENT_LINK_URL"] as string | undefined)?.trim() ?? "",
  signature: (import.meta.env["VITE_KEEP_STRIPE_PAYMENT_LINK_URL"] as string | undefined)?.trim() ?? "",
  deluxe: (import.meta.env["VITE_KEEP_STRIPE_DELUXE_PAYMENT_LINK_URL"] as string | undefined)?.trim() ?? "",
};
const checkoutEnabled = import.meta.env["VITE_KEEP_STRIPE_CHECKOUT_READY"] === "true";
const validatedCheckout = (tier: KeepTier) =>
  checkoutEnabled && /^https:\/\/buy\.stripe\.com\/[a-zA-Z0-9_]+(?:\?.*)?$/.test(checkoutUrls[tier]);

const packageChoices: Array<{
  tier: KeepTier; name: string; price: string; cards: string; engraving: string; message: string; points: string[]; featured: boolean;
}> = [
  { tier: "basic", name: "Basic", price: "$69", cards: "1 card", engraving: "Keep logo only",
    message: "Beautifully simple. Everything that matters, without the extra engraving.",
    points: ["One matte-black metal NFC card", "Official Keep logo", "No personalized engraving", "One private digital Keep experience"], featured: false },
  { tier: "signature", name: "Signature", price: "$99", cards: "1 card", engraving: "Personalized engraving",
    message: "Make it unmistakably theirs with your words engraved on the front.",
    points: ["One matte-black metal NFC card", "Keep logo + custom front message", "Laser engraving included", "One private digital Keep experience"], featured: true },
  { tier: "deluxe", name: "Deluxe", price: "$129", cards: "2 cards", engraving: "Two custom engravings",
    message: "Two meaningful cards. Two ways to keep your story close.",
    points: ["Two matte-black metal NFC cards", "Keep logo on both cards", "Custom front engraving on each", "One private digital Keep experience"], featured: false },
];

const journey = [
  { number: "01", title: "Choose your Keep", copy: "Choose Basic, Signature or Deluxe. Every package includes your own personal Keep experience.", icon: "card" },
  { number: "02", title: "Make it personal", copy: "Share your words, add your favorite photos and videos, and find the perfect music. Keep guides you along the way.", icon: "story" },
  { number: "03", title: "Preview & approve", copy: "Watch your finished Keep, make it just right, then approve it for production.", icon: "play" },
  { number: "04", title: "We make it yours", copy: "We prepare, test and ship your card. They simply tap with their phone to relive it.", icon: "gift" },
];

const questions = [
  { q: "What exactly am I purchasing?", a: "Choose Basic for a logo-only card, Signature for one personally engraved card, or Deluxe for two engraved cards. Each includes one private digital Keep experience made from your voice, words, photos, short videos and music." },
  { q: "Do I need to know how to edit videos?", a: "Not at all. Keep guides you step by step. You can write or record a message yourself, or use Keep AI to help find the words." },
  { q: "When will my Keep ship?", a: "After you've created, previewed and approved your finished Keep, we'll prepare the physical card for shipping. The timeline starts after your approval, not at checkout." },
  { q: "Is standard shipping included?", a: "Yes. Standard shipping to U.S. addresses is included in all three package prices. International shipping is not available at launch. Applicable sales tax is additional." },
  { q: "Does the recipient need an app?", a: "No app is needed. With a compatible NFC-enabled smartphone, they can tap their Keep card to open their private viewing link." },
];

function BrandMark({ light = false }: { light?: boolean }) {
  return <img src={light ? "/brand/keep-wordmark-ivory.svg" : "/brand/keep-wordmark.svg"} alt="Keep" width={106} height={54} className="h-12 w-[106px] object-contain object-left" />;
}

function PurchaseAction({ tier = "signature", smaller = false }: { tier?: KeepTier; smaller?: boolean }) {
  const packageName = packageChoices.find(p => p.tier === tier)!;
  if (!validatedCheckout(tier)) return <div className="w-full">
    <span aria-disabled="true" className="flex min-h-12 items-center justify-between gap-4 rounded-sm border border-[#0B0B0B] bg-[#0B0B0B] px-5 py-3 text-xs font-medium text-[#F7F5F2] opacity-60">
      Checkout opening soon <ArrowRight className="size-4 shrink-0" />
    </span>
    {smaller ? <p className="mt-2 text-[10px] leading-4 text-[#74695E]">We’re finishing secure payment verification before opening orders.</p> : null}
  </div>;
  return <a href={checkoutUrls[tier]} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-sm border border-[#0B0B0B] bg-[#0B0B0B] px-5 py-3 text-xs font-medium text-[#F7F5F2] transition-colors hover:bg-[#302923]">
    Choose {packageName.name} — {packageName.price} <ArrowRight className="size-4 shrink-0" />
  </a>;
}

function ExplorePackagesAction() {
  return <a href="#packages" className="flex min-h-14 w-full max-w-[380px] items-center justify-between gap-4 rounded-sm border border-[#0B0B0B] bg-[#0B0B0B] px-6 py-4 text-sm font-medium text-[#F7F5F2] transition-colors hover:bg-[#302923]">
    Explore the Keep collection <ArrowRight className="size-4 shrink-0" />
  </a>;
}

function PhotoPhone() {
  return <div className="relative mx-auto w-[177px] overflow-hidden rounded-[29px] border-[6px] border-[#141414] bg-[#111] p-1 shadow-[0_28px_75px_rgba(0,0,0,.30)] sm:w-[205px]" aria-label="Illustration of a personal Keep playing on a phone">
    <div className="absolute left-1/2 top-[10px] z-10 h-[9px] w-16 -translate-x-1/2 rounded-full bg-[#141414]" />
    <div className="relative aspect-[9/18.5] overflow-hidden rounded-[19px] bg-[#131313]">
      <img src={couple} alt="Memory slideshow on a phone" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      <img src="/brand/keep-wordmark-ivory.svg" alt="" className="absolute left-4 top-4 w-11 object-contain" />
      <div className="absolute inset-x-3 bottom-8 text-center text-[#fffdf9]">
        <span className="font-display text-[26px] leading-tight">For you, always.</span>
        <span className="mt-2 block text-[9px] tracking-[.14em] text-[#fffdf9]/80">A STORY WORTH KEEPING</span>
      </div>
    </div>
  </div>;
}

function ShopKeep() {
  return <main className="min-h-dvh bg-[#F7F5F2] text-[#161412]">
    <div className="bg-[#161412] px-6 py-[11px] text-center text-[10px] font-medium tracking-[.19em] text-[#EEE5DA]">SOME THINGS ARE WORTH KEEPING</div>
    <header className="sticky top-0 z-40 border-b border-[#D8D0C7]/80 bg-[#F7F5F2]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link to="/shop" aria-label="Keep home"><BrandMark /></Link>
        <nav className="hidden items-center gap-9 text-[12px] font-medium text-[#4A4138] md:flex" aria-label="Shop navigation">
          <a href="#experience" className="hover:text-black">The experience</a>
          <a href="#how-it-works" className="hover:text-black">How it works</a>
          <a href="#packages" className="hover:text-black">Packages</a>
          <Link to="/about" className="hover:text-black">Our story</Link>
        </nav>
        <div className="flex items-center gap-3">
          <a href="#packages" className="hidden min-h-10 items-center gap-2 rounded-sm bg-[#151312] px-5 text-[12px] font-medium text-[#F7F5F2] sm:flex">Explore Keep <ArrowRight className="size-3.5" /></a>
          <KeepAccountButton />
        </div>
      </div>
    </header>

    <section className="relative overflow-hidden border-b border-[#D8D0C7]/75">
      <div className="mx-auto grid min-h-[750px] max-w-[1240px] items-center gap-8 px-6 pb-16 pt-14 lg:grid-cols-[1.03fr_.97fr] lg:gap-8 lg:px-10 lg:py-20">
        <div className="relative z-10 max-w-[650px]">
          <div className="mb-9 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.19em] text-[#6A5849]"><span className="h-px w-8 bg-[#B8A999]" /> A more meaningful way to give</div>
          <h1 className="font-display text-[clamp(49px,5.7vw,83px)] font-normal leading-[1.085] tracking-[-.048em]">Some things are <em className="text-[#8C7766]">worth keeping.</em></h1>
          <p className="mt-7 max-w-[530px] font-display text-[clamp(23px,2.6vw,32px)] leading-snug tracking-[-.023em]">Give them words they'll never forget.</p>
          <p className="mt-5 max-w-[475px] text-[15px] leading-[1.95] text-[#5F5850]">A beautiful metal card that opens an extraordinary personal gift: your voice, your photographs and the words that mean the most. Made by you. Kept by them.</p>
          <div className="mt-9"><ExplorePackagesAction /></div>
          <a href="#experience" className="mt-7 inline-flex items-center gap-3 text-[12px] font-medium text-[#6A5849] hover:text-black">Discover the experience <ArrowDown className="size-4" /></a>
        </div>

        <div className="relative mx-auto flex w-full max-w-[620px] items-center justify-center py-6 lg:min-h-[630px]">
          <div className="absolute inset-[2%] rounded-[50%] bg-[#EEE8E1] blur-[2px]" />
          <div className="absolute right-[4%] top-[4%] size-[37%] rounded-full border border-[#D7CABB]/70" />
          <div className="absolute bottom-[8%] left-[3%] size-[42%] rounded-full border border-[#D7CABB]/60" />
          <div className="relative z-10 w-[83%] max-w-[485px] -translate-x-[8%] rotate-[-8deg]">
            <KeepCardFront engraving={["FOR MOM", "WITH LOVE", "2026"]} className="!rounded-[12px] !shadow-[0_35px_75px_rgba(12,10,8,.25)]" />
          </div>
          <div className="absolute bottom-[1%] right-[0%] z-20 w-[40%] rotate-[7deg] sm:right-[3%] sm:w-[41%]">
            <PhotoPhone />
          </div>
          <div className="absolute left-[4%] top-[13%] z-20 hidden max-w-[115px] border-l border-[#B8A999] pl-3 text-[10px] leading-5 tracking-[.08em] text-[#6A5849] sm:block">ONE BEAUTIFUL CARD. A THOUSAND FEELINGS.</div>
        </div>
      </div>
      <div className="border-t border-[#D8D0C7]/75 bg-[#F0EBE5]">
        <div className="mx-auto grid max-w-[1240px] grid-cols-3 divide-x divide-[#D8D0C7] px-4 py-5 text-center text-[10px] font-medium leading-5 tracking-[.04em] text-[#6A5849] sm:text-xs">
          <span>Made with your voice</span><span>Personal from start to finish</span><span>One tap to relive it</span>
        </div>
      </div>
    </section>

    <section id="experience" className="scroll-mt-24 overflow-hidden bg-[#171514] text-[#F7F5F2]">
      <div className="mx-auto grid max-w-[1240px] items-center gap-14 px-6 py-20 md:grid-cols-[.94fr_1.06fr] md:gap-16 md:px-10 md:py-28">
        <div className="relative">
          <div className="grid grid-cols-[1fr_.73fr] items-end gap-3">
            <div className="overflow-hidden"><img src={wedding} alt="A meaningful wedding memory" className="aspect-[4/5] w-full object-cover" /></div>
            <div className="mb-10 overflow-hidden"><img src={home} alt="A cherished moment at home" className="aspect-[4/5] w-full object-cover" /></div>
          </div>
          <div className="absolute bottom-[-30px] left-[6%] rounded-sm border border-[#574F48] bg-[#27221F] px-5 py-4 text-[11px] leading-5 text-[#E8DFD6] shadow-xl">The moments you don't want to lose.<span className="block text-[#C6B49A]">The words you don't want to leave unsaid.</span></div>
        </div>
        <div className="max-w-[510px]">
          <p className="text-[10px] uppercase tracking-[.2em] text-[#C6B49A]">More than a gift</p>
          <h2 className="mt-7 font-display text-[clamp(41px,4.8vw,69px)] leading-[1.16] tracking-[-.035em]">They can hold the card. <em className="text-[#C6B49A]">And feel everything inside it.</em></h2>
          <p className="mt-7 text-[14px] leading-8 text-[#CCC5BF]">Some gifts are opened once. Keep is different. Your message comes alive through familiar photographs, a favorite soundtrack and the voice they know by heart.</p>
          <p className="mt-5 text-[14px] leading-8 text-[#CCC5BF]">Every time they tap the card, they return to something that was made just for them.</p>
          <a href="#how-it-works" className="mt-8 inline-flex min-h-11 items-center gap-3 border-b border-[#C6B49A] pb-2 text-[13px] text-[#F7F5F2]">See how Keep works <ArrowRight className="size-4" /></a>
        </div>
      </div>
    </section>

    <section id="how-it-works" className="scroll-mt-24 border-b border-[#D8D0C7]">
      <div className="mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-[690px] text-center">
          <p className="text-[10px] uppercase tracking-[.2em] text-[#6A5849]">The simple part</p>
          <h2 className="mt-5 font-display text-[clamp(39px,4.4vw,63px)] leading-tight tracking-[-.035em]">A meaningful gift, made simple.</h2>
          <p className="mx-auto mt-5 max-w-[530px] text-[14px] leading-8 text-[#665D55]">No editing experience, perfect words or elaborate plan required. You bring the memories. We'll help you bring them together.</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {journey.map(({number,title,copy,icon})=><article key={number} className="flex min-h-[275px] flex-col border border-[#DDD4C9] bg-[#FBF9F6] p-7">
            <div className="flex items-start justify-between text-[#8E7868]"><span className="font-display text-[31px]">{number}</span>{icon==="card"?<Images className="size-5" />:icon==="story"?<Sparkles className="size-5" />:icon==="play"?<Play className="size-5" />:<PackageCheck className="size-5" />}</div>
            <h3 className="mt-9 font-display text-[26px] leading-tight">{title}</h3>
            <p className="mt-3 text-[12px] leading-[1.9] text-[#665D55]">{copy}</p>
          </article>)}
        </div>
      </div>
    </section>

    <section id="packages" className="scroll-mt-24 border-t border-[#D8D0C7] bg-[#F7F5F2]">
      <div className="mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-[670px] text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#6A5849]">The Keep collection</p>
          <h2 className="mt-5 font-display text-[clamp(41px,4.7vw,67px)] leading-[1.15] tracking-[-.036em]">Every story deserves to be kept.</h2>
          <p className="mx-auto mt-5 max-w-[525px] text-sm leading-8 text-[#665D55]">Three thoughtful ways to give. Each package includes the same deeply personal digital Keep experience.</p>
        </div>
        <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
          {packageChoices.map(p => <article key={p.tier} className={`relative flex flex-col overflow-hidden rounded-sm border p-7 sm:p-8 ${p.featured ? "border-[#171514] bg-[#EDE7E0] shadow-[0_18px_50px_rgba(20,16,13,.09)]" : "border-[#D8D0C7] bg-[#FBF9F6]"}`}>
            {p.featured ? <div className="mb-5 inline-flex self-start items-center bg-[#171514] px-3 py-2 text-[10px] font-medium uppercase tracking-[.14em] text-[#F7F5F2]">The signature choice</div> : <div className="mb-5 h-[28px]" />}
            <p className="text-[10px] font-medium uppercase tracking-[.17em] text-[#786859]">{p.cards} · {p.engraving}</p>
            <h3 className="mt-4 font-display text-[35px] tracking-[-.035em]">{p.name}</h3>
            <p className="mt-2 font-display text-[48px] leading-none tracking-[-.04em]">{p.price}</p>
            <p className="mt-5 min-h-16 text-[13px] leading-7 text-[#665D55]">{p.message}</p>
            <div className="my-7 border-t border-[#D5CBBF]" />
            <ul className="mb-8 flex-1 space-y-4 text-[12px] leading-6 text-[#4C453E]">
              {p.points.map(point => <li key={point} className="flex items-start gap-3"><Check className="mt-1 size-4 shrink-0 text-[#796757]"/>{point}</li>)}
              <li className="flex items-start gap-3"><Check className="mt-1 size-4 shrink-0 text-[#796757]"/>Standard U.S. shipping included</li>
            </ul>
            <PurchaseAction tier={p.tier} smaller />
          </article>)}
        </div>
        <p className="mx-auto mt-8 max-w-[680px] text-center text-xs leading-6 text-[#665D55]">Deluxe includes two cards at $129. Additional cards are not included in that price. Every package includes one digital Keep; all physical cards are prepared after final approval. Applicable taxes may be added.</p>
      </div>
    </section>

    <section id="the-card" className="scroll-mt-24 bg-[#EDE7E0]">
      <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-6 py-20 md:grid-cols-2 md:gap-16 md:px-10 md:py-28">
        <div className="relative flex min-h-[400px] items-center justify-center overflow-hidden bg-[#DDD3C7] p-10 sm:min-h-[530px]">
          <div className="absolute inset-x-[15%] top-1/2 h-28 -translate-y-1/2 rounded-full bg-[#998979]/40 blur-3xl" />
          <div className="relative w-[96%] max-w-[465px] rotate-[-7deg]"><KeepCardFront engraving={["SOMEONE SPECIAL", "FROM YOU", "2026"]}/></div>
          <span className="absolute bottom-5 left-5 text-[10px] tracking-[.18em] text-[#6A5849]">SIGNATURE KEEP / PRODUCT PREVIEW</span>
        </div>
        <div className="max-w-[520px]">
          <p className="text-[10px] font-medium uppercase tracking-[.18em] text-[#6A5849]">The signature gift</p>
          <h2 className="mt-4 font-display text-[clamp(42px,4.6vw,68px)] leading-[1.1] tracking-[-.035em]">One card. One unforgettable story.</h2>
          <div className="mt-7 flex items-baseline gap-4 border-b border-[#CBBFB2] pb-6"><strong className="font-display text-[46px] font-normal">$99</strong><span className="text-[12px] text-[#665D55]">Standard U.S. shipping included</span></div>
          <ul className="my-8 space-y-4 text-[13px] leading-6 text-[#514A43]">
            {["One matte-black metal NFC Keep card","Keep logo + your personal message laser-engraved on the front","One private, personalized memory experience","Your voice, photos, short videos, music and captions","Guided Keep AI tools to help find the words","Preview and approve before we prepare your card"].map(item=><li key={item} className="flex gap-3"><Check className="mt-[3px] size-4 shrink-0 text-[#6A5849]"/>{item}</li>)}
          </ul>
          <PurchaseAction />
          <p className="mt-5 text-[11px] leading-6 text-[#665D55]">Cards are prepared after the creator approves their finished Keep. U.S. delivery only at launch. Taxes may apply at checkout.</p>
          
        </div>
      </div>
    </section>

    <section className="border-b border-[#D8D0C7]">
      <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-6 py-20 md:grid-cols-2 md:gap-24 md:px-10 md:py-28">
        <div className="relative overflow-hidden">
          <img src={travel} alt="Memorable moments deserve a place to live" className="aspect-[4/5] w-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent p-7 text-[#FCF8F4]"><p className="max-w-[290px] font-display text-[clamp(27px,3vw,39px)] leading-tight">The moments you remember. The words they'll keep.</p></div>
        </div>
        <div className="max-w-[510px]">
          <p className="text-[10px] uppercase tracking-[.19em] text-[#6A5849]">Made by you. Kept by them.</p>
          <h2 className="mt-5 font-display text-[clamp(39px,4.3vw,61px)] leading-[1.15] tracking-[-.04em]">You don't have to find the perfect words alone.</h2>
          <p className="mt-6 text-[14px] leading-8 text-[#665D55]">Tell Keep who the gift is for and what you want them to remember. Write your own message, record it in your voice, or let Keep AI guide you with thoughtful questions. Add your favorite moments and make something that could only come from you.</p>
          <div className="mt-9 grid grid-cols-3 gap-3 border-t border-[#DDD4C9] pt-7">
            <div><Volume2 className="mb-3 size-5 text-[#6A5849]"/><p className="text-xs font-medium">Your voice</p></div>
            <div><Images className="mb-3 size-5 text-[#6A5849]"/><p className="text-xs font-medium">Your memories</p></div>
            <div><Heart className="mb-3 size-5 text-[#6A5849]"/><p className="text-xs font-medium">Your meaning</p></div>
          </div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[900px] px-6 py-20 md:py-28">
      <p className="text-center text-[10px] uppercase tracking-[.2em] text-[#6A5849]">Good to know</p>
      <h2 className="mt-5 text-center font-display text-[clamp(39px,4.4vw,59px)] tracking-[-.035em]">A few thoughtful answers.</h2>
      <div className="mt-12 border-t border-[#D8D0C7]">
        {questions.map(({q,a})=><details key={q} className="group border-b border-[#D8D0C7]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[14px] font-medium marker:hidden [&::-webkit-details-marker]:hidden">{q}<span className="text-xl font-normal text-[#8C7766] transition-transform group-open:rotate-45">+</span></summary>
          <p className="max-w-[690px] pb-7 text-[13px] leading-7 text-[#665D55]">{a}</p>
        </details>)}
      </div>
    </section>

    <section className="bg-[#171514] px-6 py-20 text-center text-[#F7F5F2] md:py-28">
      <p className="text-[10px] uppercase tracking-[.2em] text-[#C6B49A]">For the people who matter most</p>
      <h2 className="mx-auto mt-6 max-w-[830px] font-display text-[clamp(45px,6vw,79px)] leading-[1.12] tracking-[-.042em]">Some words deserve to last forever.</h2>
      <p className="mx-auto mt-6 max-w-[510px] text-[14px] leading-8 text-[#D3C9C0]">For the thank-yous, the I-love-yous and the moments you never want them to forget.</p>
      <div className="mx-auto mt-9 max-w-[380px]"><ExplorePackagesAction /></div>
      <div className="mx-auto mt-10 flex items-center justify-center gap-2 text-[11px] text-[#D4C9BF]"><LockKeyhole className="size-4"/> Private memories. Made to be shared with someone special.</div>
    </section>

    <footer className="bg-[#131110] px-6 py-9 text-[#D2C7BF]">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-6 border-t border-[#332D29] pt-8 md:flex-row">
        <BrandMark light />
        <p className="text-[11px]">Some things are worth keeping.</p>
        <div className="flex gap-6 text-[11px]"><Link to="/about">Our story</Link><Link to="/app">My Keeps</Link><a href="#packages">Packages</a></div>
      </div>
    </footer>
  </main>;
}
