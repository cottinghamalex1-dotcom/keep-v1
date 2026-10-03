import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "requesting" | "recording" | "paused" | "denied" | "error";
export type RecordingResult = { blob: Blob; durationSec: number; mimeType: string };

function pickMime() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  for (const t of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"]) {
    try { if (MediaRecorder.isTypeSupported(t)) return t; } catch { /* ignore */ }
  }
  return "";
}

/** Microphone recording via getUserMedia + MediaRecorder, with feature detection. */
export function useRecorder() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [canPause, setCanPause] = useState(false);
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const acc = useRef(0);
  const since = useRef<number | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const ok = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
    setSupported(ok);
    setCanPause(ok && typeof MediaRecorder.prototype.pause === "function" && typeof MediaRecorder.prototype.resume === "function");
  }, []);

  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const current = () => (acc.current + (since.current !== null ? now() - since.current : 0)) / 1000;

  const teardown = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    rec.current = null;
  }, []);

  useEffect(() => () => { try { rec.current?.state !== "inactive" && rec.current?.stop(); } catch { /* ignore */ } teardown(); }, [teardown]);

  const start = useCallback(async () => {
    if (!supported) return false;
    setStatus("requesting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (e) {
      const name = (e as { name?: string })?.name;
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
      return false;
    }
    try {
      const mime = pickMime();
      const r = mime ? new MediaRecorder(stream.current, { mimeType: mime }) : new MediaRecorder(stream.current);
      chunks.current = [];
      r.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.current.push(ev.data); };
      r.start(1000);
      rec.current = r;
      acc.current = 0;
      since.current = now();
      setElapsed(0);
      timer.current = window.setInterval(() => setElapsed(current()), 250);
      setStatus("recording");
      return true;
    } catch {
      teardown();
      setStatus("error");
      return false;
    }
  }, [supported, teardown]);

  const pause = useCallback(() => {
    const r = rec.current;
    if (!r || r.state !== "recording" || !canPause) return;
    r.pause();
    acc.current += since.current !== null ? now() - since.current : 0;
    since.current = null;
    setStatus("paused");
  }, [canPause]);

  const resume = useCallback(() => {
    const r = rec.current;
    if (!r || r.state !== "paused") return;
    r.resume();
    since.current = now();
    setStatus("recording");
  }, []);

  const stop = useCallback(
    () =>
      new Promise<RecordingResult | null>((resolve) => {
        const r = rec.current;
        if (!r) return resolve(null);
        const durationSec = current();
        since.current = null;
        r.onstop = () => {
          const type = r.mimeType || pickMime() || "audio/webm";
          const blob = new Blob(chunks.current, { type });
          teardown();
          setStatus("idle");
          resolve(blob.size ? { blob, durationSec, mimeType: type } : null);
        };
        try { r.stop(); } catch { teardown(); setStatus("idle"); resolve(null); }
      }),
    [teardown],
  );

  const cancel = useCallback(() => {
    const r = rec.current;
    if (r) { r.onstop = null; try { if (r.state !== "inactive") r.stop(); } catch { /* ignore */ } }
    since.current = null;
    teardown();
    setStatus((s) => (s === "recording" || s === "paused" || s === "requesting" ? "idle" : s));
  }, [teardown]);

  return { supported, canPause, status, elapsed, start, pause, resume, stop, cancel };
}
