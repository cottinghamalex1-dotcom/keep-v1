type Props = { engraving: readonly string[]; className?: string };

/** Front-only personalization for Keep's matte-black metal NFC card. */
export function KeepCardFront({ engraving, className = "" }: Props) {
  return <div className={`card-object relative aspect-[1.586] w-full overflow-hidden rounded-xl border border-white/15 bg-[#111111] text-[#F7F5F2] shadow-[0_22px_55px_rgba(0,0,0,.20)] ${className}`} aria-label="Preview of the front of your Keep card">
    <img src="/brand/keep-wordmark-ivory.svg" alt="Keep" className="absolute left-[8%] top-[11%] h-[26%] w-[30%] object-contain object-left" />
    <div className="absolute bottom-[11%] left-[8%] right-[8%] flex flex-col items-start gap-[4px] text-left text-[clamp(10px,2.7vw,13px)] font-normal leading-[1.4] tracking-[.20em] uppercase">
      {engraving[0]?.trim() && <span>{engraving[0]}</span>}
      {engraving[1]?.trim() && <span>{engraving[1]}</span>}
      {engraving[2]?.trim() && <span>{engraving[2]}</span>}
    </div>
  </div>;
}
