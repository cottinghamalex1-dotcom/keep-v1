/**
 * Unified route/loading state. Never describe a user's personal Keep as
 * opening unless the navigation is actually fetching a recipient film.
 */
export type KeepLoadingContext = "app" | "keep";

export function KeepLoadingScreen({
  context = "app",
  compact = false,
}: {
  context?: KeepLoadingContext;
  compact?: boolean;
}) {
  const viewingKeep = context === "keep";
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label={viewingKeep ? "Getting your Keep ready" : "Opening Keep"}
      className={`flex flex-col items-center justify-center bg-[#F7F5F2] px-7 text-center text-[#2D2520] ${compact ? "min-h-[48vh] py-12" : "min-h-dvh py-[max(48px,env(safe-area-inset-top))]"}`}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col items-center">
        <span className="keep-wordmark !text-[48px]">Keep</span>
        <div className="mt-12 flex size-16 items-center justify-center rounded-full border border-[#D9CABC] bg-[#F1EAE2]">
          <div
            aria-hidden="true"
            className="size-7 animate-spin rounded-full border-[2.5px] border-[#D4C1B0] border-t-[#856F59] motion-reduce:animate-pulse"
          />
        </div>
        <h1 className="mt-9 font-display text-[clamp(32px,8vw,41px)] leading-[1.16]">
          {viewingKeep ? "Getting your Keep ready." : "Opening Keep."}
        </h1>
        <p className="mt-4 max-w-[30ch] text-[14px] leading-6 text-[#796B60]">
          {viewingKeep ? "Gathering the moments in your story…" : "Just a moment…"}
        </p>
      </div>
    </main>
  );
}
