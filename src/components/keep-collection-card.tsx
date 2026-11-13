import { ArrowUpRight, Gift, Heart } from "lucide-react";

type Props = {
  kind: "given" | "received";
  count: number;
  onClick: () => void;
};

/** Collection shortcuts use the same tactile matte-black treatment as the main CTA. */
export function KeepCollectionCard({ kind, count, onClick }: Props) {
  const isGiven = kind === "given";
  const title = isGiven ? "Given Keeps" : "Received Keeps";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${title.toLowerCase()}: ${count}`}
      className="keep-home-create-cta group relative flex min-h-[164px] w-full min-w-0 flex-col justify-between overflow-hidden rounded-[20px] px-4 py-5 text-left text-[#FAF6F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#AD9275] sm:px-5"
    >
      <span className="relative z-10 flex w-full items-start justify-between gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#8B765F] bg-white/[.06] text-[#CCB69D]" aria-hidden="true">
          {isGiven ? <Gift className="size-[18px]" strokeWidth={1.5} /> : <Heart className="size-[18px]" strokeWidth={1.5} />}
        </span>
        <span className="font-display text-[30px] leading-none tabular-nums tracking-[-.03em] text-[#EADCCB]" aria-label={`${count} Keeps`}>{count}</span>
      </span>
      <span className="relative z-10 mt-5 block w-full">
        <span className="block text-[9px] font-semibold uppercase tracking-[.15em] text-[#C1AC94]">{isGiven ? "Shared by you" : "Shared with you"}</span>
        <span className="mt-1.5 flex items-end justify-between gap-1">
          <strong className="min-w-0 font-display text-[clamp(22px,5.3vw,29px)] font-normal leading-[1.12] tracking-[-.025em] text-[#FFFAF3]">{title}</strong>
          <ArrowUpRight className="mb-0.5 size-[19px] shrink-0 text-[#C8B29A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
