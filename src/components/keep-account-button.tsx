import { Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { loadKeepDisplayName, readKeepSession } from "@/lib/keep-cloud";

export function KeepAccountButton() {
  const [initial, setInitial] = useState("");
  useEffect(() => {
    let cancelled = false;
    const session = readKeepSession();
    if (!session) return;
    const meta = session.user.user_metadata;
    const name = meta?.first_name || meta?.given_name || meta?.display_name || meta?.full_name || meta?.name || "";
    setInitial(Array.from(name.trim())[0]?.toUpperCase() || "");
    void loadKeepDisplayName(session).then((displayName) => {
      if (!cancelled && displayName) setInitial(Array.from(displayName)[0]!.toUpperCase());
    }).catch(() => { /* Keep the metadata initial if the profile is unavailable. */ });
    return () => { cancelled = true; };
  }, []);
  return <Link to="/app" aria-label="Open your Keep account and saved Keeps" title="Your account" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-medium text-foreground transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
    {initial || <UserRound className="size-4" aria-hidden="true" />}
  </Link>;
}
