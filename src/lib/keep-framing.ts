import type { KeepProject, MediaItem } from "./keep-project";
import { cameraMotion } from "../../supabase/functions/keep-render/composition";

export type MomentFocus = { focusX: number; focusY: number };
type Size = { width: number; height: number };

const clamp = (n: number) => Math.min(100, Math.max(0, Number.isFinite(n) ? n : 50));
export function momentFocus(moment: Pick<MediaItem, "focusX" | "focusY">): MomentFocus {
  return { focusX: clamp(moment.focusX ?? 50), focusY: clamp(moment.focusY ?? 50) };
}

/** Largest actual film zoom: the important areas should be visible even at the
 * most tightly framed part of the scene. The preview uses the same cover
 * fitting and focus origin as the editor and final renderer. */
export function framingReviewScale(moment: MediaItem): number {
  const camera = cameraMotion(moment, 0);
  return Math.max(camera.from, camera.to);
}

/** Map fingertip movement to the available cropped pixels rather than screen
 * width. Dragging right reveals the left side of the source, and vice versa.
 * A cover-fitted image never exposes a blank edge at any valid focus. */
export function focusAfterDrag(start: MomentFocus, delta: { x: number; y: number },
  source: Size, frame: Size, scale: number): MomentFocus {
  if (!(source.width > 0 && source.height > 0 && frame.width > 0 && frame.height > 0))
    return start;
  const cover = Math.max(frame.width / source.width, frame.height / source.height);
  const extraX = Math.max(0, source.width * cover * scale - frame.width);
  const extraY = Math.max(0, source.height * cover * scale - frame.height);
  return {
    focusX: extraX > 0.001 ? clamp(start.focusX - delta.x / extraX * 100) : start.focusX,
    focusY: extraY > 0.001 ? clamp(start.focusY - delta.y / extraY * 100) : start.focusY,
  };
}

/** Write only the selected source by stable ID. Preserve timing, transitions,
 * order and all unrelated draft properties; selfie-mode base media and its
 * matching film scene must agree when the story is rebuilt. */
export function updateMomentFraming(project: KeepProject, id: string, focus: MomentFocus): KeepProject {
  const adjusted = momentFocus(focus);
  const update = (moment: MediaItem) => moment.id === id && !moment.isSelfie && moment.source !== "text"
    ? { ...moment, ...adjusted }
    : moment;
  return {
    ...project,
    memories: project.memories.map(update),
    ...(project.selfieBaseMedia ? { selfieBaseMedia: project.selfieBaseMedia.map(update) } : {}),
  };
}
