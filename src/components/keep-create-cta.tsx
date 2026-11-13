import { ArrowUpRight } from "lucide-react";

/** The singular primary action on the signed-in Keep home page. */
export function KeepCreateCTA() {
  return (
    <a href="/?create=1" className="keep-home-create-cta group relative z-10 mx-auto mt-9 flex w-full items-center justify-between gap-4 overflow-hidden rounded-[20px] px-6 py-6 text-left text-[#FAF6F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#AD9275] sm:px-8" aria-label="Create a Keep — start your story">
      <span className="relative z-10 block min-w-0 flex-1">
        <span className="mb-2 block text-[10px] font-medium uppercase tracking-[.19em] text-[#C1AC94]">Something worth keeping</span>
        <strong className="block font-display text-[clamp(30px,7.5vw,42px)] font-normal leading-[1.08] tracking-[-.035em] text-[#FFFAF3]">Create a Keep</strong>
        <span className="mt-2 block text-[12px] leading-5 text-[#D0C4B6]">Your story begins here.</span>
      </span>
      <span className="keep-home-create-cta__arrow relative z-10 flex size-[54px] shrink-0 items-center justify-center rounded-full border border-[#8B765F] bg-white/[.07] text-[#F7EDE1] transition-colors group-hover:border-[#CAB49D] group-hover:bg-white/[.13]" aria-hidden="true">
        <ArrowUpRight className="size-6" strokeWidth={1.5} />
      </span>
    </a>
  );
}
