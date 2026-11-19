import { Loader2 } from "lucide-react";

/** Neutral navigation/loading state. Use Keep-specific copy only for an actual Keep viewer. */
export function KeepPageLoading({ message = "Opening your space…" }: { message?: string }) {
  return (
    <main role="status" aria-live="polite" className="flex min-h-dvh flex-col items-center justify-center bg-background px-7 text-center text-foreground">
      <span className="font-display text-5xl tracking-[-.04em]">Keep</span>
      <Loader2 className="mt-8 size-5 animate-spin text-[#826D5A]" aria-hidden="true" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
