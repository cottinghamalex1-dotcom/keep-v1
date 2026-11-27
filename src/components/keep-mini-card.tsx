import { KeepTapPhoneIcon } from "@/components/keep-tap-phone-icon";

type KeepMiniCardProps = {
  variant: "basic" | "signature";
  className?: string;
};

/**
 * A deliberately compact, shared product preview for shopping surfaces.
 * Unlike the full-scale card editor, this keeps the Keep wordmark legible
 * even at the small size used inside the mobile navigation drawer.
 */
export function KeepMiniCard({ variant, className = "" }: KeepMiniCardProps) {
  const engraved = variant === "signature";

  return (
    <div
      role="img"
      aria-label={engraved ? "Matte-black Signature Keep card with personalized engraving and phone-tap icon" : "Matte-black Basic Keep card with Keep logo and phone-tap icon"}
      className={`relative aspect-[1.586] w-full overflow-hidden rounded-[8px] border border-[#6B6662]/70 bg-[#101010] shadow-[0_10px_24px_rgba(16,13,11,.22)] ${className}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(142deg,rgba(255,255,255,.10),transparent_28%,rgba(255,255,255,.015)_70%,rgba(255,255,255,.05))]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-[3px] rounded-[5px] border border-white/[.06]" />
      <img
        src="/brand/keep-wordmark-ivory.svg"
        alt=""
        aria-hidden="true"
        className="absolute left-[9%] top-[12%] h-[33%] w-[57%] object-contain object-left"
      />
      {engraved && (
        <span aria-hidden="true" className="absolute bottom-[14%] left-[9%] text-[6px] font-medium uppercase tracking-[.22em] text-[#D9CFC2] sm:text-[7px]">
          WITH LOVE
        </span>
      )}
      <KeepTapPhoneIcon decorative className="pointer-events-none absolute bottom-[8%] right-[8%] w-[4.8%] text-[#D9CFC2]" />
    </div>
  );
}
