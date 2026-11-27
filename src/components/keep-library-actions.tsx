import { useId, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Ellipsis,
  Gift,
  Heart,
  Link2,
  PenLine,
  Play,
  Trash2,
} from "lucide-react";
import { keepCheckoutPath } from "@/lib/keep-checkout";
import { viewingLink } from "@/lib/keep-publish";
import { KeepEditorCardPreview } from "@/components/keep-editor-card-preview";
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

const actionClass =
  "keep-library-secondary-action flex min-h-12 flex-col items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-[#594C40] transition-colors hover:bg-[#EEE7DD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#776451]";

/** Match unfinished Keeps to the signature View Keep treatment without exposing sharing. */
export function KeepDraftActions({
  editHref,
  deleting,
  onDelete,
  discloseDelete = true,
}: {
  editHref: string;
  deleting: boolean;
  onDelete: () => void;
  discloseDelete?: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();
  const showDelete = !discloseDelete || moreOpen;

  return (
    <div className="keep-draft-actions">
      <a
        href={editHref}
        className="keep-home-create-cta keep-library-view-button keep-library-edit-button"
      >
        <span className="keep-library-view-button__content">
          <span className="keep-library-edit-button__icon" aria-hidden="true">
            <PenLine className="size-3.5" strokeWidth={1.65} />
          </span>
          <span>Continue editing</span>
        </span>
      </a>
      <div className="keep-draft-actions__management">
        {discloseDelete && (
          <button
            type="button"
            className="keep-draft-actions__more"
            aria-expanded={moreOpen}
            aria-controls={moreOpen ? moreId : undefined}
            onClick={() => setMoreOpen((value) => !value)}
          >
            <span className="keep-draft-actions__more-content">
              <Ellipsis className="size-4" strokeWidth={1.8} aria-hidden="true" />
              <span>More</span>
              <ChevronDown
                className={`size-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </span>
          </button>
        )}
        {showDelete && (
          <div id={moreId} className={discloseDelete ? "keep-draft-actions__drawer" : undefined}>
            <button
              type="button"
              disabled={deleting}
              onClick={onDelete}
              className="keep-draft-actions__delete"
            >
              <span className="keep-draft-actions__delete-icon" aria-hidden="true">
                <Trash2 className="size-3.5" strokeWidth={1.7} />
              </span>
              <span>
                {deleting ? "Deleting…" : discloseDelete ? "Delete this Keep" : "Delete draft"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Same actions on the home gallery and the full creation archive. */
export function KeepLibraryActions({
  keep,
  published,
  copied,
  deleting,
  activity,
  activityFailed,
  onCopy,
  onDelete,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();
  const editHref = `/?edit=${encodeURIComponent(keep.id)}`;

  if (!published)
    return <KeepDraftActions editHref={editHref} deleting={deleting} onDelete={onDelete} />;

  return (
    <div className="space-y-2.5">
      <KeepGiftSummary activity={activity} failed={activityFailed} />
      <a
        href={viewingLink(keep.recipient_token)}
        target="_blank"
        rel="noopener noreferrer"
        className="keep-home-create-cta keep-library-view-button"
      >
        <span className="keep-library-view-button__content">
          <span className="keep-library-view-button__play" aria-hidden="true">
            <Play className="size-3.5 translate-x-px fill-current" strokeWidth={1.5} />
          </span>
          <span>View Keep</span>
        </span>
      </a>
      <div className="grid grid-cols-3 gap-1">
        <a href={editHref} className={actionClass}>
          <PenLine className="size-[17px]" strokeWidth={1.7} aria-hidden="true" /> <span>Edit</span>
        </a>
        <button type="button" onClick={onCopy} className={actionClass}>
          {copied ? (
            <Check className="size-[17px] text-[#526F54]" aria-hidden="true" />
          ) : (
            <Link2 className="size-[17px]" strokeWidth={1.7} aria-hidden="true" />
          )}
          <span aria-live="polite">{copied ? "Copied!" : "Copy link"}</span>
        </button>
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls={moreId}
          onClick={() => setMoreOpen((v) => !v)}
          className={`${actionClass} ${moreOpen ? "bg-[#EEE7DD]" : ""}`}
        >
          <Ellipsis className="size-[17px]" aria-hidden="true" /> <span>More</span>
        </button>
      </div>
      {moreOpen && (
        <div id={moreId} className="keep-library-more-panel">
          <KeepEditorCardPreview variant="library" project={{ ...keep.published_project, publicationToken: keep.recipient_token }} />
          <a href={keepCheckoutPath(keep.id)} className="keep-library-more-option">
            <span className="keep-library-more-icon" aria-hidden="true">
              <Gift className="size-4" strokeWidth={1.7} />
            </span>
            <span className="keep-library-more-label">Film &amp; card options</span>
            <ChevronRight className="keep-library-more-arrow" aria-hidden="true" />
          </a>
          {(activity || activityFailed) && (
            <details className="keep-library-more-details">
              <summary className="keep-library-more-option">
                <span className="keep-library-more-icon" aria-hidden="true">
                  <Heart className="size-4" strokeWidth={1.7} />
                </span>
                <span className="keep-library-more-label">Gift activity</span>
                <ChevronDown className="keep-library-more-arrow" aria-hidden="true" />
              </summary>
              <div className="keep-library-more-details__body">
                <KeepGiftTimeline activity={activity} failed={activityFailed} />
              </div>
            </details>
          )}
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="keep-library-more-option keep-library-more-option--danger"
          >
            <span className="keep-library-more-icon" aria-hidden="true">
              <Trash2 className="size-4" strokeWidth={1.7} />
            </span>
            <span className="keep-library-more-label">
              {deleting ? "Deleting…" : "Delete this Keep"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
