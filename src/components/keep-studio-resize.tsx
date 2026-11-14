import { useRef } from "react";
import { GripHorizontal } from "lucide-react";

export const MIN_PREVIEW_SIZE = 26;
export const MAX_PREVIEW_SIZE = 67;
export const DEFAULT_PREVIEW_SIZE = 46;
export const constrainPreviewSize = (size: number) =>
  Math.max(MIN_PREVIEW_SIZE, Math.min(MAX_PREVIEW_SIZE, Math.round(size)));

type Props = { size: number; onSize: (size: number) => void };

/** Adjustable vertical split, designed for iPhone touch and keyboard alike. */
export function KeepStudioResize({ size, onSize }: Props) {
  const dragging = useRef(false);
  const dragTo = (clientY: number, element: HTMLElement) => {
    const studio = element.closest<HTMLElement>(".keep-studio");
    const stage = studio?.querySelector<HTMLElement>(".keep-studio-stage");
    if (!studio || !stage || !studio.clientHeight) return;
    const stageTop = stage.getBoundingClientRect().top;
    const proportion = (clientY - stageTop) / studio.clientHeight * 100;
    onSize(constrainPreviewSize(proportion));
  };
  return (
    <div className="keep-studio-splitter" aria-label="Resize preview and editing controls">
      <span className="keep-studio-splitter__label">Preview</span>
      <button type="button" className="keep-studio-splitter__grip" aria-label="Drag to resize the preview" title="Drag up or down to resize"
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragTo(event.clientY, event.currentTarget);
        }}
        onPointerMove={(event) => {
          if (dragging.current) dragTo(event.clientY, event.currentTarget);
        }}
        onPointerUp={(event) => {
          dragging.current = false;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { dragging.current = false; }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            onSize(constrainPreviewSize(size + (event.key === "ArrowDown" ? 3 : -3)));
          }
        }}>
        <GripHorizontal className="size-5" strokeWidth={1.5} aria-hidden="true" />
      </button>
      <label className="keep-studio-splitter__range-label">
        <span className="sr-only">Preview height</span>
        <input type="range" aria-label="Preview height" min={MIN_PREVIEW_SIZE} max={MAX_PREVIEW_SIZE} step={1} value={size}
          onChange={(event) => onSize(constrainPreviewSize(Number(event.target.value)))} />
      </label>
      <span className="keep-studio-splitter__label">Effects</span>
    </div>
  );
}
