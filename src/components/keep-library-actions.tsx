import { useId, useState } from "react";
import { Check, ChevronDown, ChevronRight, Ellipsis, Gift, Link2, PenLine, Play, Trash2 } from "lucide-react";
import { keepCheckoutPath } from "@/lib/keep-checkout";
import { viewingLink } from "@/lib/keep-publish";
import { KeepGiftSummary, KeepGiftTimeline } from "@/components/keep-gift-activity";
import type { KeepLibraryItem } from "@/components/keep-library-card";
import type { GiftActivity } from "@/lib/keep-gift-activity";

type Props = {
  keep: KeepLibraryItem;
  published: boolean;
  copied: boolean;
  deleting: boolean;
  activity?: GiftActivity;
  activityFailed?: boolean;
  onCopy: () => void;
  onDelete: () => void;
};

const actionClass = "flex min-h-12 flex-col items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-xs font-medium leading-tight text-[#594C40] transition-colors hover:bg-[#EEE7DD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#776451]";
const optionClass = "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-[#F1EBE3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#776451]";

/** Same actions on the home gallery and the full creation archive. */
export function KeepLibraryActions({ keep, published, copied, deleting, activity, activityFailed, onCopy, onDelete }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();
  const editHref = `/?edit=${encodeURIComponent(keep.id)}`;

  return <div className="space-y-2.5">
    {published && <KeepGiftSummary activity={activity} failed={activityFailed} />}
    {published
      ? <a href={viewingLink(keep.recipient_token)} target="_blank" rel="noopener noreferrer"
          className="keep-premium-action flex min-h-12 w-full items-center justify-center gap-2.5 px-4 py-3 text-sm font-medium">
          <Play className="size-4" strokeWidth={1.8} aria-hidden="true" /> View Keep
        </a>
      : <a href={editHref} className="keep-premium-action flex min-h-12 w-full items-center justify-center gap-2.5 px-4 py-3 text-sm font-medium">
          <PenLine className="size-4" aria-hidden="true" /> Continue editing
        </a>}
    <div className={published ? "grid grid-cols-3 gap-1" : "flex justify-end"}>
      {published && <>
        <a href={editHref} className={actionClass}><PenLine className="size-[17px]" strokeWidth={1.7} aria-hidden="true" /> Edit</a>
        <button type="button" onClick={onCopy} className={actionClass}>
          {copied ? <Check className="size-[17px] text-[#526F54]" aria-hidden="true" /> : <Link2 className="size-[17px]" strokeWidth={1.7} aria-hidden="true" />}
          <span aria-live="polite">{copied ? "Copied!" : "Copy link"}</span>
        </button>
      </>}
      <button type="button" aria-expanded={moreOpen} aria-controls={moreId} onClick={() => setMoreOpen(v => !v)}
        className={`${actionClass} ${moreOpen ? "bg-[#EEE7DD]" : ""} ${!published ? "min-w-[82px] flex-row px-3" : ""}`}>
        <Ellipsis className="size-[17px]" aria-hidden="true" /> More
        {!published && <ChevronDown className={`size-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} aria-hidden="true" />}
      </button>
    </div>
    {moreOpen && <div id={moreId} className="rounded-xl border border-[#E1D8CF] bg-[#FFFCF8] p-1.5">
      {published && <>
        <a href={keepCheckoutPath(keep.id)} className={`${optionClass} text-[#44372D]`}>
          <Gift className="size-[17px] shrink-0" strokeWidth={1.7} aria-hidden="true" /> Film &amp; card options
          <ChevronRight className="ml-auto size-4 shrink-0 text-[#887868]" aria-hidden="true" />
        </a>
        {(activity || activityFailed) && <div className="my-1 border-t border-[#EAE1D7] px-2 pt-2">
          <details className="group">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-1 text-xs font-medium text-[#665747] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#776451] [&::-webkit-details-marker]:hidden">
              Gift activity <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <KeepGiftTimeline activity={activity} failed={activityFailed} />
          </details>
        </div>}
      </>}
      <button type="button" disabled={deleting} onClick={onDelete}
        className={`${optionClass} text-[#8C574C] disabled:opacity-50 ${published ? "border-t border-[#EAE1D7] rounded-t-none" : ""}`}>
        <Trash2 className="size-[17px] shrink-0" strokeWidth={1.7} aria-hidden="true" /> {deleting ? "Deleting…" : "Delete this Keep"}
      </button>
    </div>}
  </div>;
}
