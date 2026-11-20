import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Film, LoaderCircle, PlayCircle, RefreshCw } from "lucide-react";
import { activeKeepSession } from "@/lib/keep-cloud";
import { KeepRenderedPlayer } from "@/components/keep-rendered-player";
import { beginKeepRender, recoverKeepRender, retryKeepRender, refreshKeepRender, shotstackRenderingEnabled, type KeepRenderStatus } from "@/lib/keep-render-client";

export const Route = createFileRoute("/render-test")({ component: RenderTest });

const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
type PublishedKeep = {
  id: string;
  recipient_name: string;
  published_at: string;
  published_project: { musicMood?: string; audioMix?: { musicMuted?: boolean } };
};
type StatusWithUrl = KeepRenderStatus & { videoUrl?: string };

function RenderTest() {
  const [keeps, setKeeps] = useState<PublishedKeep[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<PublishedKeep | null>(null);
  const [job, setJob] = useState<StatusWithUrl | null>(null);
  const [busy, setBusy] = useState(false);
  const [filmError, setFilmError] = useState("");
  const [watchingFilm, setWatchingFilm] = useState(false);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    if (!shotstackRenderingEnabled) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const session = await activeKeepSession();
        if (!session) return;
        setSignedIn(true);
        const query = new URLSearchParams({
          select: "id,recipient_name,published_at,published_project",
          owner_id: "eq." + session.user.id,
          published_at: "not.is.null",
          order: "published_at.desc",
          limit: "20",
        });
        const res = await fetch(endpoint + "/rest/v1/keeps?" + query, {
          headers: { apikey: publicKey, Authorization: "Bearer " + session.access_token },
        });
        if (!res.ok) throw new Error("Your saved Keeps couldn't be loaded.");
        const items = await res.json() as PublishedKeep[];
        if (activeRef.current) setKeeps(items);
      } catch (cause) {
        if (activeRef.current) setError(cause instanceof Error ? cause.message : "Unable to open the test.");
      } finally {
        if (activeRef.current) setLoading(false);
      }
    })();
    return () => { activeRef.current = false; };
  }, []);

  useEffect(() => {
    if (!selected || !job || job.status !== "rendering" && job.status !== "queued") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const status = await refreshKeepRender(selected.id);
        if (cancelled) return;
        setJob(status);
        if (status.status === "rendering" || status.status === "queued")
          timer = window.setTimeout(poll, 6500);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Unable to refresh render status.");
        timer = window.setTimeout(poll, 12000);
      }
    };
    timer = window.setTimeout(poll, 6000);
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [selected?.id, job?.status]);

  const select = async (keep: PublishedKeep) => {
    setSelected(keep);
    setJob(null);
    setError("");
    setFilmError("");
    setWatchingFilm(false);
    setBusy(true);
    try {
      const current = await refreshKeepRender(keep.id);
      setJob(current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load this Keep.");
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (!selected || busy || job?.status !== "not_started") return;
    setBusy(true);
    setError("");
    setFilmError("");
    try {
      setJob(await beginKeepRender(selected.id, selected.published_project.musicMood ?? "Warm + Nostalgic", !!selected.published_project.audioMix?.musicMuted));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit the test render.");
    } finally {
      setBusy(false);
    }
  };

  const recover = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try { setJob(await recoverKeepRender(selected.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to recover the existing video."); }
    finally { setBusy(false); }
  };

  const testMedium = async () => {
    if (!selected || busy || job?.status !== "failed") return;
    if (!window.confirm("Start a NEW Shotstack sandbox render at 1080p medium quality? This uses sandbox credits.")) return;
    setBusy(true);
    setError("");
    try { setJob(await retryKeepRender(selected.id, selected.published_project.musicMood ?? "Warm + Nostalgic", !!selected.published_project.audioMix?.musicMuted)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to start the 1080p test."); }
    finally { setBusy(false); }
  };

  const refresh = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      setJob(await refreshKeepRender(selected.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to refresh the test.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-dvh bg-[#F7F5F2] px-6 py-10 text-[#26201C]">
    <div className="mx-auto max-w-xl pb-16">
      <Link to="/app" className="mb-8 inline-flex items-center gap-2 text-sm text-[#6B5C50]">
        <ArrowLeft size={17} /> My Keeps
      </Link>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-[#93785F]">Keep film lab · sandbox only</p>
      <h1 className="font-display text-[clamp(36px,8vw,52px)] leading-tight">Test your rendered Keep</h1>
      <p className="mt-3 text-sm leading-6 text-[#655A52]">
        Choose a previously published Keep and create a watermarked Shotstack test MP4. Your original film, drafts and NFC link are never replaced by this test.
      </p>
      {!shotstackRenderingEnabled ? <p role="alert" className="mt-8 rounded-xl border border-[#D4BEAB] p-5 text-sm">
        This film lab isn't enabled on this deployment. Please use the authorized preview link.
      </p> : loading ? <p className="mt-8 flex items-center gap-2 text-sm"><LoaderCircle className="size-4 animate-spin" /> Loading your Keeps…</p> : !signedIn ?
        <div className="mt-8 rounded-2xl border border-[#D8CFC4] p-6">
          <h2 className="font-display text-2xl">Sign in to continue</h2>
          <p className="mt-3 text-sm leading-6">Sign in to your Keep account on this preview site, then return to the film lab.</p>
          <Link to="/app" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#211C18] px-6 text-sm text-white">Sign in at My Keeps</Link>
        </div>
      : <>
        <h2 className="mt-10 mb-4 font-display text-2xl">Your published Keeps</h2>
        {!keeps.length ? <p className="text-sm leading-6 text-[#655A52]">You don't have any published Keeps on this account yet. Finish a test Keep first, then return here.</p>
        : <div className="space-y-3">
          {keeps.map(keep => <button type="button" key={keep.id} onClick={() => void select(keep)} disabled={busy}
            className={"flex w-full items-center justify-between rounded-xl border px-5 py-4 text-left text-sm " +
              (selected?.id === keep.id ? "border-[#79614B] bg-[#E9DED1]" : "border-[#DFD6CA] bg-white")}>
            <span><span className="block font-medium">A Keep for {keep.recipient_name || "Someone special"}</span>
              <span className="mt-1 block text-xs text-[#8C7D70]">{new Date(keep.published_at).toLocaleDateString()}</span></span>
            <Film size={19} />
          </button>)}
        </div>}
        {selected && <section className="mt-8 rounded-2xl border border-[#D8CFC4] bg-white p-5">
          <h3 className="font-display text-2xl">A Keep for {selected.recipient_name}</h3>
          <p className="mt-2 text-xs leading-5 text-[#6C5C50]">The sandbox test uses the exact currently published photos, video clips and recorded voice.</p>
          {busy && <p role="status" className="mt-4 flex items-center gap-2 text-sm"><LoaderCircle className="size-4 animate-spin" /> Checking render status…</p>}
          {job?.status === "not_started" && <button type="button" onClick={() => void start()} disabled={busy}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#211C18] px-5 font-medium text-white">
            <PlayCircle size={18} /> Render sandbox MP4
          </button>}
          {(job?.status === "queued" || job?.status === "rendering") && <div className="mt-5">
            <p role="status" className="flex items-center gap-2 text-sm"><LoaderCircle className="size-4 animate-spin" /> Rendering your film…</p>
            <p className="mt-2 text-xs text-[#897566]">Actual provider status: {job.providerStatus || job.status}. You can leave and return to this page.</p>
          </div>}
          {job?.status === "ready" && <div className="mt-5">
            <p role="status" className="mb-4 flex items-center gap-2 text-sm text-[#526C4A]"><CheckCircle2 size={19} /> MP4 render complete</p>
            {job.videoUrl ? <button type="button" onClick={() => setWatchingFilm(true)}
              className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#211C18] px-6 text-sm font-semibold text-white">
              <PlayCircle size={21} /> Watch your Keep and explore the timeline
            </button>
            : <p className="text-sm text-[#806A53]">The video is saved but the playback link is unavailable. Refresh the status.</p>}
            {filmError && <p role="alert" className="mt-3 text-sm text-[#9E3328]">{filmError}</p>}
          </div>}
          {job?.status === "failed" && <div className="mt-4">
            <p role="alert" className="text-sm text-[#9E3328]">{job.error || "This test render didn't complete. Your original Keep is unchanged."}</p>
            <button type="button" disabled={busy} onClick={() => void recover()}
              className="mt-4 min-h-12 w-full rounded-lg bg-[#211C18] px-5 font-medium text-white">
              Retry saving existing MP4 (no new render)
            </button>
            <button type="button" disabled={busy} onClick={() => void testMedium()}
              className="mt-3 min-h-12 w-full rounded-lg border border-[#211C18] px-5 font-medium text-[#211C18]">
              Test new 1080p medium-quality render (uses sandbox credits)
            </button>
          </div>}
          {job && <button type="button" onClick={() => void refresh()} disabled={busy}
            className="mt-4 flex min-h-10 items-center gap-2 text-sm text-[#806A53]">
            <RefreshCw size={16} /> Refresh status
          </button>}
        </section>}
      </>}
      {error && <p role="alert" className="mt-6 rounded-xl border border-[#B77B72] px-4 py-3 text-sm text-[#963627]">{error}</p>}
      <p className="mt-10 text-xs leading-5 text-[#8B7C70]">
        Testing only. The Shotstack watermark is expected. Playback is private to the signed-in creator and the video link expires.
      </p>
      {watchingFilm && job?.status === "ready" && job.videoUrl && <div className="fixed inset-0 z-[100] bg-[#171311]" role="dialog" aria-modal="true" aria-label="Watch and scrub your finished Keep">
        <KeepRenderedPlayer key={job.videoUrl} videoUrl={job.videoUrl}
          onExit={() => setWatchingFilm(false)} onFinish={() => setWatchingFilm(false)}
          onOpeningFrameReady={() => {}} onPlaybackError={() => { setFilmError("The MP4 couldn't play on this device. Please report this error."); setWatchingFilm(false); }} />
      </div>}
    </div>
  </main>;
}
