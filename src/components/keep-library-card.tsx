import { CalendarDays, ChevronDown, Gift } from "lucide-react";
import { FirstExperienceBadge } from "@/components/keep-gift-activity";
import { KeepLibraryActions } from "@/components/keep-library-actions";
import type { GiftActivity } from "@/lib/keep-gift-activity";

export type KeepLibraryItem = {
  id: string; recipient_name: string | null; occasion?: string | null;
  status: string; recipient_token: string; published_at: string | null;
  created_at?: string | null;
  published_project?: { openingMessage?: string; messageParagraphs?: string[] } | null;
};
type Props = {
  keep: KeepLibraryItem;
  thumbnail?: string;
  activity?: GiftActivity;
  activityFailed?: boolean;
  expanded: boolean;
  copied: boolean;
  deleting: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onDelete: () => void;
};
const dateLabel = (date?: string | null) => {
  if (!date) return "Not yet published";
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? "Date unavailable" :
    new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(value);
};

/** Identical creation cards on Home and My Keeps, with actions hidden under the arrow. */
export function KeepLibraryCard({ keep, thumbnail, expanded, copied, deleting, onToggle, onCopy, onDelete, activity, activityFailed }: Props) {
  const published=keep.status==="ready" && !!keep.published_at && !!keep.recipient_token;
  const excerpt=keep.published_project?.openingMessage?.trim() ||
    keep.published_project?.messageParagraphs?.[0]?.trim().slice(0,180);
  return <article className="keep-editorial-surface overflow-hidden border border-[#DED8D1]">
    <button type="button" onClick={onToggle} aria-expanded={expanded} aria-label={`Options for ${keep.recipient_name || "this Keep"}`}
      className="flex w-full items-center gap-4 px-4 py-5 text-left sm:p-5">
      <div className="flex h-24 w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-[#E8E0D5]">
        {thumbnail ? <img src={thumbnail} alt={`Cover photo for ${keep.recipient_name || "this Keep"}`} className="h-full w-full object-cover" loading="lazy" /> : <Gift className="size-6 text-[#7D6A56]/75" />}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-[clamp(26px,7vw,32px)] leading-tight text-[#2B241D]">For {keep.recipient_name || "someone special"}</h3>
        <p className="mt-1.5 truncate text-xs text-[#796957]">{keep.occasion || "A personal Keep"}</p>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"><CalendarDays className="size-3.5" />{dateLabel(keep.created_at || keep.published_at)}</p>
        {published && !expanded && <FirstExperienceBadge activity={activity} />}
      </div>
      <ChevronDown className={`size-5 shrink-0 text-[#685747] transition-transform ${expanded ? "rotate-180" : ""}`} />
    </button>
    {expanded && <div className="border-t border-[#E6DCD2] px-5 pb-5 pt-5">
      {excerpt && <p className="mb-4 line-clamp-3 font-display text-[18px] leading-7 text-[#665547]">{excerpt}</p>}
      <KeepLibraryActions keep={keep} published={published} copied={copied} deleting={deleting}
        activity={activity} activityFailed={activityFailed} onCopy={onCopy} onDelete={onDelete} />
    </div>}
  </article>;
}
