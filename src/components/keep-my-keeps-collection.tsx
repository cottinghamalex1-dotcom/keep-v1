import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronDown, ExternalLink, Gift, Heart, Link2, PenLine, Plus, Sparkles, Trash2 } from "lucide-react";
import { viewingLink } from "@/lib/keep-publish";
import type { KeepLibraryItem } from "@/components/keep-library-card";

type Props = {
  keeps: readonly KeepLibraryItem[];
  thumbnails: Readonly<Record<string, string>>;
  expandedId: string | null;
  copiedId: string | null;
  deletingId: string | null;
  onToggle: (id: string) => void;
  onCopy: (keep: KeepLibraryItem) => void;
  onDelete: (keep: KeepLibraryItem) => void;
};

const formatCreated = (date?: string | null) => {
  if (!date) return "Date not yet available";
  const value = new Date(date);
  return Number.isNaN(value.getTime())
    ? "Date not yet available"
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(value);
};

function CreationCard({
  keep, thumbnail, expanded, copied, deleting, onToggle, onCopy, onDelete,
}: {
  keep: KeepLibraryItem;
  thumbnail?: string;
  expanded: boolean;
  copied: boolean;
  deleting: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const published = keep.status === "ready" && !!keep.published_at && !!keep.recipient_token;
  const recipient = keep.recipient_name?.trim() || "someone special";
  const excerpt = keep.published_project?.openingMessage?.trim() ||
    keep.published_project?.messageParagraphs?.find(p => p.trim())?.trim().slice(0, 240);

  return <article className="overflow-hidden rounded-[20px] border border-[#DFD4C8] bg-[#FFFCF8] shadow-[0_7px_24px_rgba(51,35,20,.045)]">
    <button type="button" onClick={onToggle} aria-expanded={expanded}
      aria-label={`Options for ${recipient}`}
      className="group flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-[#F8F2EA]/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#977D62] sm:gap-5 sm:p-5">
      <span className="relative flex h-[125px] w-[93px] shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-[#DCD2C6] bg-[#EEE6DB] sm:h-[142px] sm:w-[108px]">
        {thumbnail
          ? <img src={thumbnail} alt={`Cover photo for ${recipient}`}
              className="h-full w-full object-cover" loading="lazy" />
          : <span className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(ellipse_at_32%_24%,#F6EDE2,#E4D6C5)] p-2.5">
              <span className="relative flex aspect-[1.586] w-full items-center justify-center overflow-hidden rounded-[5px] border border-[#50453E] bg-[linear-gradient(145deg,#292521,#131210_72%,#322B25)] shadow-[0_6px_17px_rgba(36,25,16,.22)]">
                <span className="absolute inset-0 bg-[linear-gradient(108deg,transparent_38%,rgba(255,255,255,.07)_55%,transparent_74%)]" />
                <img src="/brand/keep-wordmark-ivory.svg" alt="" aria-hidden="true" className="relative w-[54%]" />
              </span>
            </span>}
      </span>
      <span className="flex min-w-0 flex-1 flex-col self-stretch py-0.5">
        <span className="text-[9px] font-semibold uppercase tracking-[.17em] text-[#92795E]">Created for</span>
        <span className="mt-1.5 block break-words font-display text-[clamp(24px,6.2vw,32px)] leading-[1.11] tracking-[-.035em] text-[#2D241D]">
          {recipient}
        </span>
        <span className="mt-2.5 block break-words text-[12px] leading-5 text-[#706152]">{keep.occasion || "A personal Keep"}</span>
        <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2.5 text-[10px] leading-4 text-[#8D7A68]">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
          {formatCreated(keep.created_at || keep.published_at)}
        </span>
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#E3D8CB] bg-[#F7F0E7] text-[#73604E] transition-colors group-hover:bg-[#EFE3D4]" aria-hidden="true">
        <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} strokeWidth={1.7}/>
      </span>
    </button>

    <div className="flex items-center justify-between gap-2 border-t border-[#EAE0D5] px-4 py-2.5 sm:px-5">
      <span className="inline-flex items-center gap-2 text-[10px] font-medium tracking-[.025em] text-[#76624E]">
        <span className={`size-[6px] rounded-full ${published ? "bg-[#7F8263]" : "bg-[#B9A088]"}`} aria-hidden="true" />
        {published ? "Ready to share" : "In progress"}
      </span>
      <button type="button" onClick={onToggle} aria-expanded={expanded}
        aria-label={`${expanded ? "Hide" : "View"} details for ${recipient}`}
        className="inline-flex min-h-9 items-center gap-1.5 text-[11px] font-medium text-[#755A43] hover:text-[#38281E]">
        {expanded ? "Hide details" : "View details"}
        <ArrowRight className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
      </button>
    </div>

    {expanded && <div className="border-t border-[#E4D8CA] bg-[#F9F5EF] px-4 pb-5 pt-4 sm:px-5">
      {excerpt && <div className="mb-4 border-l-2 border-[#CBB295] pl-3.5">
        <p className="line-clamp-4 font-display text-[19px] leading-7 text-[#65503F]">{excerpt}</p>
      </div>}
      <div className="grid gap-2">
        <a href={`/?edit=${encodeURIComponent(keep.id)}`}
          className="flex min-h-[51px] items-center justify-center gap-2 rounded-xl bg-[#211B17] px-4 text-[13px] font-medium text-[#FFF8F0] transition-colors hover:bg-[#3B3028]">
          <PenLine className="size-4" aria-hidden="true" /> Continue editing
        </a>
        {published && <>
          <a href={viewingLink(keep.recipient_token)} target="_blank" rel="noopener noreferrer"
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#D6C6B7] bg-[#FFFDF9] px-4 text-[12px] font-medium text-[#4C3B2C] hover:bg-white">
            <ExternalLink className="size-4" aria-hidden="true" /> Open this Keep
          </a>
          <button type="button" onClick={onCopy}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#DDD0C1] px-4 text-[12px] font-medium text-[#6B533F] hover:bg-white">
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
            {copied ? "Link copied" : "Copy viewing link"}
          </button>
          <p className="px-1 pt-0.5 text-[10px] leading-[1.65] text-[#857463]">
            Your permanent viewing link remains the same when you edit this Keep.
          </p>
        </>}
      </div>
      <button type="button" disabled={deleting} onClick={onDelete}
        className="mt-4 inline-flex min-h-10 items-center gap-2 border-t border-[#E5D9CD] pt-3 text-[11px] text-[#966253] disabled:opacity-50">
        <Trash2 className="size-3.5" aria-hidden="true" /> {deleting ? "Deleting…" : "Delete this Keep"}
      </button>
    </div>}
  </article>;
}

/** Your Keeps is the digital-creation archive, not the physical-card collection.
 * Keep the design consistent with Given/Received without conflating their counts. */
export function KeepMyKeepsCollection({
  keeps, thumbnails, expandedId, copiedId, deletingId, onToggle, onCopy, onDelete,
}: Props) {
  const count = keeps.length;
  const ready = keeps.filter(keep => keep.status === "ready" && !!keep.published_at).length;

  return <section aria-labelledby="keep-my-keeps-heading" className="pb-10">
    <div className="keep-creations-frame relative isolate overflow-hidden rounded-[24px] p-6 text-[#FCF7EF] sm:p-8">
      <div className="relative z-10 flex items-center justify-between gap-4">
        <span className="text-[10px] font-medium uppercase tracking-[.2em] text-[#CFB99E]">Your personal collection</span>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#8C765F]/80 bg-white/[.05] text-[#E2CEB6]" aria-hidden="true">
          <BookOpen className="size-[20px]" strokeWidth={1.4} />
        </span>
      </div>
      <div className="relative z-10 mt-8 max-w-sm">
        <h1 id="keep-my-keeps-heading" className="font-display text-[clamp(37px,9vw,50px)] font-normal leading-[1.08] tracking-[-.045em]">
          The stories <span className="italic text-[#E4D1BA]">you’ve kept.</span>
        </h1>
        <p className="mt-4 max-w-[320px] text-[13px] leading-[1.8] text-[#D2C6B9]">
          Every word you’ve saved. Every moment worth returning to. All here, whenever you need them.
        </p>
      </div>
      <div className="relative z-10 mt-8 flex items-end justify-between gap-3 border-t border-[#CBB59A]/25 pt-5">
        <span className="flex items-baseline gap-3">
          <span className="font-display text-[47px] leading-none tabular-nums tracking-[-.04em] text-[#FFF8EB]">{count}</span>
          <span className="pb-1 text-[11px] leading-5 text-[#CBB69F]">{count === 1 ? "creation" : "creations"}</span>
        </span>
        <span className="pb-1 text-[10px] font-medium tracking-[.025em] text-[#CCB59B]">
          {ready} {ready === 1 ? "ready to share" : "ready to share"}
        </span>
      </div>
    </div>

    <div className="mb-4 mt-9 flex items-end justify-between gap-3 border-b border-[#DED2C4] pb-4">
      <div className="min-w-0">
        <p className="text-[9px] font-medium uppercase tracking-[.19em] text-[#9A8268]">Made by you, kept by them</p>
        <h2 className="mt-1 font-display text-[29px] leading-[1.16] tracking-[-.035em] text-[#2B231E]">Your creations</h2>
      </div>
      <a href="/?create=1" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-[11px] font-medium text-[#70553F] hover:text-[#32231A]">
        <Plus className="size-4" aria-hidden="true" /> Create a Keep
      </a>
    </div>

    {count ? <div className="space-y-3">
      {keeps.map(keep => <CreationCard
        key={keep.id} keep={keep} thumbnail={thumbnails[keep.id]}
        expanded={expandedId === keep.id} copied={copiedId === keep.id}
        deleting={deletingId === keep.id}
        onToggle={() => onToggle(keep.id)}
        onCopy={() => onCopy(keep)}
        onDelete={() => onDelete(keep)} />)}
    </div> : <div className="overflow-hidden rounded-[22px] border border-[#E0D4C7] bg-[#FFFCF8] px-6 pb-8 pt-9 text-center shadow-[0_8px_28px_rgba(56,39,23,.04)]">
      <span className="mx-auto flex size-[70px] items-center justify-center rounded-full border border-[#E6D8C7] bg-[#F5EDE4] text-[#8C735B]">
        <Heart className="size-7" strokeWidth={1.3} aria-hidden="true" />
      </span>
      <h3 className="mx-auto mt-5 max-w-[290px] font-display text-[29px] leading-[1.18] tracking-[-.035em] text-[#29211D]">
        Your first Keep starts here.
      </h3>
      <p className="mx-auto mt-3 max-w-[285px] text-[12px] leading-[1.8] text-[#72665A]">
        The most meaningful gifts begin with a few words from the heart.
      </p>
      <a href="/?create=1" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#211B17] px-4 text-[13px] font-medium text-[#FFF9F1] hover:bg-[#3B3028]">
        Create your first Keep <ArrowRight className="size-4" aria-hidden="true" />
      </a>
    </div>}

    <div className="mt-7 flex items-start gap-3 border-t border-[#DCD0C3] pt-6">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#E0D5C8] bg-[#EFE8DF] text-[#836B54]">
        <Sparkles className="size-4" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div>
        <p className="text-[12px] font-medium text-[#493A2D]">Some things are worth keeping.</p>
        <p className="mt-1 text-[11px] leading-5 text-[#786B5C]">
          Your creations stay here to revisit, refine, or share when the moment is right.
        </p>
      </div>
    </div>
  </section>;
}
