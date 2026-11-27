import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepFramingReview } from "@/components/keep-framing-review";
import { focusAfterDrag, framingReviewScale, framingZoomPercent, momentFocus, updateMomentFraming } from "@/lib/keep-framing";
import { newProject, type MediaItem } from "@/lib/keep-project";
import { spreadMemories } from "@/lib/keep-story-layout";
import { cameraMotion, coverCrop } from "../../supabase/functions/keep-render/composition";

const photo: MediaItem = { id: "photo", kind: "image", source: "upload", url: "/photo.jpg", displayDurationSec: 8, transition: "fade" };
const video: MediaItem = { id: "video", kind: "video", source: "upload", url: "/video.mp4", videoDurationSec: 10, displayDurationSec: 6 };
const frame = { width: 270, height: 480 };
const wide = { width: 1600, height: 900 };

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Full-screen framing math", () => {
  it("uses the actual maximum cinematic zoom rather than a contained image", () => {
    const motion = cameraMotion(photo, 0);
    expect(framingReviewScale(photo)).toBe(Math.max(motion.from, motion.to));
    expect(framingReviewScale(photo)).toBeGreaterThan(1);
  });
  it("tracks the actual finger displacement and clamps at the photo edges", () => {
    const scale = framingReviewScale(photo);
    const extraWidth = wide.width * Math.max(frame.width / wide.width, frame.height / wide.height) * scale - frame.width;
    expect(focusAfterDrag({ focusX: 50, focusY: 50 }, { x: extraWidth / 2, y: 0 }, wide, frame, scale)).toEqual({ focusX: 0, focusY: 50 });
    expect(focusAfterDrag({ focusX: 50, focusY: 50 }, { x: -2000, y: 2000 }, wide, frame, scale)).toEqual({ focusX: 100, focusY: 0 });
    const result = focusAfterDrag({ focusX: 50, focusY: 50 }, { x: -extraWidth / 4, y: 0 }, wide, frame, scale);
    expect(result.focusX).toBeCloseTo(75);
    const crop = coverCrop(wide.width, wide.height, result.focusX, result.focusY)!;
    expect(crop.left).toBeGreaterThan(crop.right);
  });
  it("saves zoom on the selected moment, retains it through later focus edits, and clamps to film renderer bounds", () => {
    const draft = { ...newProject(), memories: [photo, video], selfieBaseMedia: [photo, video] };
    const zoomed = updateMomentFraming(draft, "photo", { focusX: 25, focusY: 75, zoom: 1.31 });
    const dragged = updateMomentFraming(zoomed, "photo", { focusX: 30, focusY: 70 });
    expect(dragged.memories[0]).toMatchObject({ focusX: 30, focusY: 70, zoom: 1.31 });
    expect(dragged.selfieBaseMedia?.[0]).toEqual(dragged.memories[0]);
    expect(dragged.memories[1]).toBe(video);
    expect(spreadMemories(dragged.memories, 60)[0]?.zoom).toBe(1.31);
    expect(framingReviewScale(dragged.memories[0]!)).toBeCloseTo(1.31 * 1.065);
    expect(framingZoomPercent(0.5)).toBe(103);
    expect(framingZoomPercent(2)).toBe(135);
  });
  it("preserves all other scenes, source files, narration and orientation settings", () => {
    const draft = { ...newProject(), memories: [photo, video], selfieBaseMedia: [photo, video] };
    const updated = updateMomentFraming(draft, "photo", { focusX: 78, focusY: 15 });
    expect(updated.memories[0]).toEqual({ ...photo, focusX: 78, focusY: 15 });
    expect(updated.selfieBaseMedia?.[0]).toEqual(updated.memories[0]);
    expect(updated.memories[1]).toBe(video);
    expect(updated.finalVoiceRecording).toBe(draft.finalVoiceRecording);
    const generated = spreadMemories(updated.memories, 60);
    expect(momentFocus(generated[0]!)).toEqual({ focusX: 78, focusY: 15 });
  });
});

describe("Guided photo and video review", () => {
  it("shows one full-bleed moment at a time, saves the focus, and finishes only after the last moment", () => {
    const completed = vi.fn();
    const changes = vi.fn();
    function Review() {
      const [index, setIndex] = useState(0);
      const [moments, setMoments] = useState([photo, video]);
      return <KeepFramingReview moments={moments} index={index} onIndex={setIndex} onComplete={completed}
        onFocus={(id, focus) => { changes(id, focus); setMoments(old => old.map(m => m.id === id ? { ...m, ...focus } : m)); }} />;
    }
    render(<Review />);
    expect(screen.getByText("Photo 1 of 2")).toBeInTheDocument();
    const image = screen.getByRole("img", { name: "Photo 1 framing preview" });
    expect(image.className).toContain("object-cover");
    expect(screen.getByRole("button", { name: "Previous moment" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("group", { name: "Reposition photo 1" }), { key: "ArrowLeft" });
    expect(changes).toHaveBeenLastCalledWith("photo", { focusX: 55, focusY: 50 });
    expect(image.style.objectPosition).toBe("55% 50%");
    const initialTransform = image.style.transform;
    const slider = screen.getByRole("slider", { name: "Zoom" });
    expect(slider).toHaveValue("108");
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(slider).toHaveValue("113");
    expect(image.style.transform).not.toBe(initialTransform);
    expect(changes).toHaveBeenLastCalledWith("photo", { focusX: 55, focusY: 50, zoom: 1.13 });
    fireEvent.change(slider, { target: { value: "135" } });
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next moment" }));
    expect(screen.getByText("Video 2 of 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Video 2 framing preview")).toHaveClass("object-cover");
    expect(screen.getByRole("slider", { name: "Zoom" })).toHaveValue("108");
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(changes).toHaveBeenLastCalledWith("video", { focusX: 50, focusY: 50, zoom: 1.03 });
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    expect(completed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Previous moment" }));
    expect(screen.getByRole("img", { name: "Photo 1 framing preview" }).style.objectPosition).toBe("55% 50%");
    expect(screen.getByRole("slider", { name: "Zoom" })).toHaveValue("135");
    fireEvent.keyDown(screen.getByRole("group", { name: "Reposition photo 1" }), { key: "ArrowRight" });
    expect(screen.getByRole("slider", { name: "Zoom" })).toHaveValue("135");
    fireEvent.click(screen.getByRole("button", { name: "Reset framing" }));
    expect(changes).toHaveBeenLastCalledWith("photo", { focusX: 50, focusY: 50, zoom: 1.08 });
    expect(screen.getByRole("slider", { name: "Zoom" })).toHaveValue("108");
    expect(screen.getByRole("img", { name: "Photo 1 framing preview" }).style.transform).toBe(initialTransform);
    fireEvent.click(screen.getByRole("button", { name: "Next moment" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish review" }));
    expect(completed).toHaveBeenCalledOnce();
  });
  it("uses pointer drag to reposition the real photo rather than only the keyboard", () => {
    const changes = vi.fn();
    render(<KeepFramingReview moments={[photo]} index={0} onIndex={vi.fn()} onFocus={changes} onComplete={vi.fn()} />);
    const image = screen.getByRole("img", { name: "Photo 1 framing preview" });
    Object.defineProperties(image, { naturalWidth: { value: 1600 }, naturalHeight: { value: 900 } });
    fireEvent.load(image);
    const surface = screen.getByRole("group", { name: "Reposition photo 1" });
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, width: 270, height: 480, top: 0, right: 270, bottom: 480, left: 0, toJSON: () => ({}) });
    fireEvent(surface, new MouseEvent("pointerdown", { bubbles: true, clientX: 130, clientY: 200, button: 0 }));
    fireEvent(surface, new MouseEvent("pointermove", { bubbles: true, clientX: 70, clientY: 215 }));
    expect(changes).toHaveBeenCalledOnce();
    const adjusted = changes.mock.calls[0]![1];
    expect(adjusted.focusX).toBeGreaterThan(50);
    expect(adjusted.focusY).toBeLessThan(50);
    fireEvent(surface, new MouseEvent("pointerup", { bubbles: true }));
    fireEvent(surface, new MouseEvent("pointermove", { bubbles: true, clientX: 0, clientY: 0 }));
    expect(changes).toHaveBeenCalledOnce();
  });
  it("can reopen on the saved photo or video index", () => {
    render(<KeepFramingReview moments={[photo, video]} index={1} onIndex={vi.fn()} onFocus={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText("Video 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish review" })).toBeInTheDocument();
  });
});
