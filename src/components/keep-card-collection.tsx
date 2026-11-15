import { ArrowLeft, ArrowRight, ArrowUpRight, CreditCard, Gift, Heart, LockKeyhole, Sparkles } from "lucide-react";
import { viewingLink } from "@/lib/keep-publish";

export type CollectionCard = {
  id: string;
  card_code: string;
  recipient_label: string | null;
  status: string;
  creator_id: string | null;
  recipient_id: string | null;
  keep_id: string | null;
};

type LinkedKeep = {
  id: string;
  status: string;
  recipient_token: string;
  published_at: string | null;
};

type Props = {
  kind: "given" | "received";
  cards: readonly CollectionCard[];
  keeps: readonly LinkedKeep[];
  onBack: () => void;
};

const humanStatus = (status: string) => {
  const label = status.replace(/[_-]+/g, " ").trim();
  return label ? label.charAt(0).toUpperCase() + label.slice(1).toLowerCase() : "Card connected";
};

/**
 * The collections show only account-linked physical cards. A recipient's
 * private viewing token isn't present in the card record; don't imply one is
 * accessible or invent a playback link for it.
 */
export function KeepCardCollection({ kind, cards, keeps, onBack }: Props) {
  const given = kind === "given";
  const number = cards.length;
  const publishedKeeps = new Map(keeps.filter(keep =>
    keep.status === "ready" && !!keep.published_at && !!keep.recipient_token
  ).map(keep => [keep.id, keep]));

  return (
    <section aria-labelledby="keep-collection-heading" className="keep-collection-page pb-10">
      <button type="button" onClick={onBack}
        className="mb-5 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-[#776451] transition-colors hover:text-[#2C221A] focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AA8D70]">
        <ArrowLeft className="size-4" strokeWidth={1.6} aria-hidden="true" />
        Back to home
      </button>

      <div className="keep-creations-frame relative isolate overflow-hidden rounded-[24px] p-6 text-[#FCF7EF] sm:p-8">
        <div className="relative z-10 flex items-center justify-between gap-4">
          <span className="text-[10px] font-medium uppercase tracking-[.2em] text-[#CFB99E]">
            Your Keep collection
          </span>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#8C765F]/80 bg-white/[.05] text-[#E2CEB6]" aria-hidden="true">
            {given ? <Gift className="size-[19px]" strokeWidth={1.4} /> : <Heart className="size-[19px]" strokeWidth={1.4} />}
          </span>
        </div>
        <div className="relative z-10 mt-8 max-w-sm">
          <h1 id="keep-collection-heading" className="font-display text-[clamp(36px,9vw,49px)] font-normal leading-[1.1] tracking-[-.045em]">
            {given ? <>The Keeps <span className="italic text-[#E4D1BA]">you’ve given.</span></>
              : <>The Keeps <span className="italic text-[#E4D1BA]">you’ve received.</span></>}
          </h1>
          <p className="mt-4 max-w-[310px] text-[13px] leading-[1.8] text-[#D2C6B9]">
            {given
              ? "A little record of the love you’ve put into someone else’s hands."
              : "Words and moments shared with you. A collection worth holding close."}
          </p>
        </div>
        <div className="relative z-10 mt-8 flex items-end justify-between gap-4 border-t border-[#CBB59A]/25 pt-5">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[47px] leading-none tabular-nums tracking-[-.04em] text-[#FFF8EB]">{number}</span>
            <span className="pb-1 text-[11px] leading-5 text-[#CBB69F]">{number === 1 ? "card connected" : "cards connected"}</span>
          </div>
          <span className="pb-1 text-[9px] font-medium uppercase tracking-[.15em] text-[#BDAB95]">
            {given ? "Given with love" : "Held with love"}
          </span>
        </div>
      </div>

      <div className="mb-4 mt-9 flex items-end justify-between gap-3 border-b border-[#DED2C4] pb-4">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[.19em] text-[#9A8268]">
            {given ? "Shared by you" : "Shared with you"}
          </p>
          <h2 className="mt-1 font-display text-[29px] leading-[1.16] tracking-[-.035em] text-[#2B231E]">
            {given ? "Your gifts" : "Your keepsakes"}
          </h2>
        </div>
        {number > 0 && <span className="text-[11px] tabular-nums text-[#78695A]">{number} {number === 1 ? "Keep" : "Keeps"}</span>}
      </div>

      {number ? (
        <div className="space-y-3">
          {cards.map(card => {
            const linked = card.keep_id ? publishedKeeps.get(card.keep_id) : undefined;
            return (
              <article key={card.id} className="keep-collection-item overflow-hidden rounded-[20px] border border-[#E0D5C8] bg-[#FFFCF8] p-4 shadow-[0_6px_22px_rgba(56,39,23,.045)] sm:p-5">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-[116px] w-[91px] shrink-0 items-center justify-center rounded-[14px] border border-[#E2D7CB] bg-[radial-gradient(ellipse_at_35%_35%,#F7F0E7,#E8DDD0)] p-2.5 sm:h-[125px] sm:w-[100px]">
                    <div className="relative flex aspect-[1.586] w-[90px] items-center justify-center overflow-hidden rounded-[5px] border border-[#50443B] bg-[linear-gradient(145deg,#25221F,#11100F_68%,#26211D)] shadow-[0_8px_18px_rgba(32,23,17,.21)]">
                      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(113deg,transparent_36%,rgba(255,255,255,.07)_54%,transparent_71%)]" aria-hidden="true" />
                      <img src="/brand/keep-wordmark-ivory.svg" alt="" className="relative w-[53%] opacity-95" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#917A62]">
                      {given ? "A gift from you" : "A gift to you"}
                    </p>
                    <h3 className="mt-1.5 break-words font-display text-[clamp(23px,6vw,29px)] font-normal leading-[1.14] tracking-[-.025em] text-[#2B231D]">
                      {given
                        ? card.recipient_label?.trim() || "A thoughtful Keep"
                        : card.recipient_label?.trim() || "A Keep for you"}
                    </h3>
                    <p className="mt-2 text-[11px] text-[#756453]">{humanStatus(card.status)}</p>
                    <p className="mt-1.5 text-[10px] tracking-[.06em] text-[#948574]">
                      Card ending {card.card_code.slice(-4) || "—"}
                    </p>
                  </div>
                </div>
                {linked ? (
                  <a href={viewingLink(linked.recipient_token)} target="_blank" rel="noopener noreferrer"
                    className="mt-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-[#2B2521] bg-[#211C19] px-4 text-[12px] font-medium text-[#FAF4ED] transition-colors hover:bg-[#3A3029] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C745B]">
                    View this Keep <ArrowUpRight className="size-4" aria-hidden="true" />
                  </a>
                ) : (
                  <div className="mt-4 flex items-start gap-2 border-t border-[#E6DCD1] pt-3.5 text-[11px] leading-5 text-[#786D60]">
                    <LockKeyhole className="mt-[2px] size-3.5 shrink-0 text-[#987F66]" strokeWidth={1.6} aria-hidden="true" />
                    <span>Tap the physical card with your phone to open its private Keep.</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[22px] border border-[#E0D4C7] bg-[#FFFCF8] px-6 pb-8 pt-9 text-center shadow-[0_8px_28px_rgba(56,39,23,.04)]">
          <div className="mx-auto flex size-[70px] items-center justify-center rounded-full border border-[#E6D8C7] bg-[#F5EDE4] text-[#8C735B]">
            {given ? <Gift className="size-7" strokeWidth={1.3} /> : <Heart className="size-7" strokeWidth={1.3} />}
          </div>
          <h3 className="mx-auto mt-5 max-w-[290px] font-display text-[29px] leading-[1.18] tracking-[-.035em] text-[#29211D]">
            {given ? "A meaningful gift begins here." : "Something special belongs here."}
          </h3>
          <p className="mx-auto mt-3 max-w-[285px] text-[12px] leading-[1.8] text-[#72665A]">
            {given
              ? "Physical Keep cards connected to your account will appear here as you share them."
              : "When a received card is connected to your account, you’ll find it here. You can also experience a Keep by tapping its physical card."}
          </p>
          {given ? <a href="/?create=1" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#211B17] px-4 text-[13px] font-medium text-[#FFF9F1] hover:bg-[#3B3028]">
            Create a Keep <ArrowRight className="size-4" aria-hidden="true" />
          </a> : <button type="button" onClick={onBack} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 px-5 text-[12px] font-medium text-[#755E48] hover:text-[#30251B]">
            Back to home <ArrowRight className="size-4" aria-hidden="true" />
          </button>}
        </div>
      )}

      <div className="mt-7 border-t border-[#DCD0C3] pt-6">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#E0D5C8] bg-[#EFE8DF] text-[#836B54]">
            {given ? <Sparkles className="size-4" strokeWidth={1.5} aria-hidden="true" /> : <CreditCard className="size-4" strokeWidth={1.5} aria-hidden="true" />}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-[#493A2D]">{given ? "Looking for a Keep you’re creating?" : "Made to be held onto."}</p>
            <p className="mt-1 text-[11px] leading-5 text-[#786B5C]">
              {given
                ? "Your digital creations live in My Keeps, even before they’re connected to physical cards."
                : "This collection shows physical Keep cards connected to your account."}
            </p>
            {given && <a href="/my-keeps" className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-[11px] font-semibold text-[#70543B] hover:underline">
              See all my Keeps <ArrowRight className="size-3.5" aria-hidden="true" />
            </a>}
          </div>
        </div>
      </div>
    </section>
  );
}
