import { useEffect, useState } from "react";
import { Check, Copy, Smartphone, X } from "lucide-react";

type KeepPhoneTipVariant = "intro" | "upload";

/** Show these optional nudges on desktops and tablets, never on phones. */
export function isNonPhoneDevice(
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
  smallCoarsePointer: boolean,
): boolean {
  const tablet = /iPad|Tablet/i.test(userAgent)
    || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))
    || (platform === "MacIntel" && maxTouchPoints > 1);
  const phone = !tablet && (
    /iPhone|iPod|Windows Phone|Android.*Mobile/i.test(userAgent)
    || smallCoarsePointer
  );
  return !phone;
}

/**
 * Two low-pressure tips at most per browser tab/session:
 * one near discovery/starting, and one when photos are added.
 */
export function KeepPhoneTip({ variant = "intro" }: { variant?: KeepPhoneTipVariant }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const isDesktopOrTablet = isNonPhoneDevice(
      navigator.userAgent,
      navigator.platform,
      navigator.maxTouchPoints,
      window.matchMedia("(pointer: coarse) and (max-width: 640px)").matches,
    );
    if (!isDesktopOrTablet) return;

    const key = "keep-phone-guidance:" + variant;
    try {
      if (window.sessionStorage.getItem(key) === "shown") return;
      window.sessionStorage.setItem(key, "shown");
    } catch {
      // A privacy-restricted browser can still show a helpful one-time tip.
    }
    setVisible(true);
  }, [variant]);

  const copyPhoneLink = async () => {
    const url = window.location.origin + "/app";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link and open it on your phone:", url);
    }
  };

  if (!visible) return null;

  return (
    <aside aria-label="A tip for creating your Keep" className="relative mx-auto my-6 w-full max-w-[720px] rounded-2xl border border-[#DAD0C4] bg-[#F3EDE5] px-4 py-4 text-left text-[#33291F] shadow-[0_8px_24px_rgba(56,42,28,.04)] sm:px-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E8DDD0] text-[#76604A]" aria-hidden="true">
          <Smartphone className="size-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#806A54]">A little Keep tip</p>
          <p className="mt-1 font-display text-[21px] leading-snug">
            {variant === "upload" ? "Your favorite moments may already be on your phone." : "Creating on your phone can be even easier."}
          </p>
          <p className="mt-2 text-[12px] leading-6 text-[#6F6255]">
            {variant === "upload"
              ? "Photos and videos are often easiest to add straight from your phone. You can also keep creating right here."
              : "Your memories are probably already there, and recording your message feels natural. A laptop or tablet works too."}
          </p>
          {variant === "upload" && (
            <p className="mt-2 text-[11px] leading-5 text-[#806F5F]">
              Already started? Let your files finish saving, then sign in with the same account on your phone and choose Continue Editing.
            </p>
          )}
          <button type="button" onClick={() => void copyPhoneLink()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#CBB9A5] bg-[#FFFAF4] px-3 py-2 text-[12px] font-medium text-[#51402F] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B7055]">
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "Link copied — send it to your phone" : "Copy link for your phone"}
          </button>
        </div>
        <button type="button" onClick={() => setVisible(false)} aria-label="Dismiss phone suggestion" className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#8B7969] transition-colors hover:bg-[#E7DCCF] hover:text-[#33291F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8B7055]">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
