/**
 * Quality-first, on-device optimization of photos for a recipient's film.
 *
 * Originals remain in Keep's local/cloud draft. An optional, individually
 * evaluated derivative is used for editor playback and publication.
 *
 * No strict 350 KB cap: rich images may need substantially more data.
 */
export const KEEP_PHOTO_LONG_EDGE = 2560;
export const KEEP_PHOTO_ZOOM_LONG_EDGE = 3072;
export const KEEP_PHOTO_MIN_SOURCE_BYTES = 400 * 1024;
export const KEEP_PHOTO_MIN_SAVINGS = 0.12;
export const KEEP_PHOTO_QUALITY_LEVELS = [0.85, 0.89, 0.93, 0.96] as const;

export const keepOptimizedPhotoId = (originalId: string) => originalId + ":optimized-photo-v1";

/**
 * PNG transparencies are safe in WebP, but not JPEG. Animated GIFs must not
 * be flattened into a still image. Keep the source if decoding is unsupported.
 */
export function shouldOptimizeKeepPhoto(
  source: { size: number; type: string; name?: string },
): boolean {
  if (!Number.isFinite(source.size) || source.size < KEEP_PHOTO_MIN_SOURCE_BYTES) return false;
  const mime = (source.type || "").toLowerCase().split(";")[0]!;
  if (mime === "image/gif" || mime === "image/svg+xml" || mime === "image/avif") return false;
  if (/\.(gif|svg|avif)$/i.test(source.name ?? "")) return false;
  return mime === "" || /^image\/(jpeg|jpg|png|webp|heic|heif)$/.test(mime);
}

export function keepPhotoMaxEdge(zoom?: number): number {
  return typeof zoom === "number" && Number.isFinite(zoom) && zoom > 1.45
    ? KEEP_PHOTO_ZOOM_LONG_EDGE
    : KEEP_PHOTO_LONG_EDGE;
}

export function keepPhotoOutputSize(width: number, height: number, maxEdge = KEEP_PHOTO_LONG_EDGE) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    return null;
  const factor = Math.min(1, Math.max(1, maxEdge) / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * factor)), height: Math.max(1, Math.round(height * factor)) };
}

export function keepPhotoSavings(original: number, optimized: number): number {
  if (original <= 0 || optimized >= original) return 0;
  return Math.round(100 * (original - optimized) / original);
}

/**
 * Conservative perceptual guard at phone playback resolution. PSNR captures
 * fine pixel changes; the MAE cap avoids accepting widespread minor changes.
 * This is a heuristic, not a guarantee of mathematically lossless images.
 */
export function keepPhotoQualityAcceptable(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (!a.length || a.length !== b.length || a.length % 4 !== 0) return false;
  const pixels = a.length / 4;
  const step = Math.max(1, Math.ceil(pixels / 210_000));
  let squared = 0;
  let absolute = 0;
  let alpha = 0;
  let channels = 0;
  for (let pixel = 0; pixel < pixels; pixel += step) {
    const index = pixel * 4;
    for (let channel = 0; channel < 3; channel++) {
      const diff = a[index + channel]! - b[index + channel]!;
      squared += diff * diff;
      absolute += Math.abs(diff);
      channels++;
    }
    alpha += Math.abs(a[index + 3]! - b[index + 3]!);
  }
  const mse = squared / Math.max(1, channels);
  const mae = absolute / Math.max(1, channels);
  const meanAlphaError = alpha / Math.max(1, channels / 3);
  const psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
  return psnr >= 38 && mae <= 2.8 && meanAlphaError <= 0.8;
}

async function readBrowserImage(file: Blob): Promise<{ image: HTMLImageElement; release: () => void }> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        error ? reject(error) : resolve();
      };
      const timer = window.setTimeout(() => finish(new Error("Photo could not be decoded")), 20000);
      image.onload = () => finish();
      image.onerror = () => finish(new Error("Unsupported photo"));
      image.src = url;
      if (image.complete && image.naturalWidth) finish();
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Empty photo");
    return { image, release: () => { image.removeAttribute("src"); URL.revokeObjectURL(url); } };
  } catch (error) {
    image.removeAttribute("src");
    URL.revokeObjectURL(url);
    throw error;
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => {
    if (typeof canvas.toBlob !== "function") { resolve(null); return; }
    let finished = false;
    const finish = (blob: Blob | null) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      resolve(blob && blob.size && blob.type === type ? blob : null);
    };
    const timer = window.setTimeout(() => finish(null), 12000);
    try { canvas.toBlob(blob => finish(blob), type, quality); }
    catch { finish(null); }
  });
}

function analysisPixels(canvas: HTMLCanvasElement): Uint8ClampedArray | null {
  const size = keepPhotoOutputSize(canvas.width, canvas.height, 900);
  if (!size) return null;
  try {
    const check = document.createElement("canvas");
    check.width = size.width;
    check.height = size.height;
    const ctx = check.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(canvas, 0, 0, size.width, size.height);
    const pixels = ctx.getImageData(0, 0, size.width, size.height).data;
    check.width = check.height = 0;
    return pixels;
  } catch {
    return null;
  }
}

async function comparablePixels(encoded: Blob, width: number, height: number): Promise<Uint8ClampedArray | null> {
  const loaded = await readBrowserImage(encoded);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return null;
    ctx.drawImage(loaded.image, 0, 0, width, height);
    const pixels = analysisPixels(canvas);
    canvas.width = canvas.height = 0;
    return pixels;
  } finally {
    loaded.release();
  }
}

/**
 * Finds the smallest candidate that passes the quality guard.
 * Can return null if the image is already efficient, conversion isn't
 * supported, or its detail cannot be maintained at a useful saving.
 * NEVER changes or deletes the original Blob.
 */
export async function optimizeKeepPhoto(source: Blob, options?: { zoom?: number; name?: string }): Promise<Blob | null> {
  if (typeof document === "undefined" || !shouldOptimizeKeepPhoto({ size: source.size, type: source.type, name: options?.name }))
    return null;
  let original: { image: HTMLImageElement; release: () => void } | null = null;
  try {
    original = await readBrowserImage(source);
    const size = keepPhotoOutputSize(
      original.image.naturalWidth, original.image.naturalHeight, keepPhotoMaxEdge(options?.zoom),
    );
    if (!size) return null;
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    try {
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(original.image, 0, 0, size.width, size.height);
      original.release();
      original = null;

      const reference = analysisPixels(canvas);
      // If the browser cannot inspect actual pixels, don't guess about quality.
      if (!reference) return null;
      const target = keepPhotoOutputSize(size.width, size.height, 900)!;
      const formats = ["image/webp", ...(source.type === "image/png" ? [] : ["image/jpeg"])];
      let best: Blob | null = null;
      for (const format of formats) {
        for (const quality of KEEP_PHOTO_QUALITY_LEVELS) {
          const candidate = await encode(canvas, format, quality);
          if (!candidate || candidate.size > source.size * (1 - KEEP_PHOTO_MIN_SAVINGS)) continue;
          const inspected = await comparablePixels(candidate, target.width, target.height);
          if (!inspected || !keepPhotoQualityAcceptable(reference, inspected)) continue;
          if (!best || candidate.size < best.size) best = candidate;
          // An encoder's size grows with quality: first acceptable is enough.
          break;
        }
      }
      return best;
    } finally {
      // Release the full-size canvas promptly: an iPhone can have dozens of photos.
      canvas.width = canvas.height = 0;
    }
  } catch {
    // Preserve the original whenever Safari cannot decode/encode/inspect.
    return null;
  } finally {
    original?.release();
  }
}
