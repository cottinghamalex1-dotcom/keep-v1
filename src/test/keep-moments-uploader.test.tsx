import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepMomentsUploader } from "@/components/keep-moments-uploader";
import type { MediaItem } from "@/lib/keep-project";

const samples: MediaItem[] = [
  { id: "first", source: "upload", kind: "image", url: "/hannah.jpg", name: "Hannah photo" },
  { id: "second", source: "upload", kind: "video", url: "/clip.mp4", name: "Family clip" },
];

const controls = () => ({ onAdd: vi.fn(), onRemove: vi.fn(), onContinue: vi.fn() });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Moments uploader", () => {
  it("makes adding media a large primary action when the gallery is empty", () => {
    const actions = controls();
    render(<KeepMomentsUploader moments={[]} busy={false} {...actions} />);
    const add = screen.getByRole("button", { name: /Add photos & videos/i });
    expect(add).toHaveClass("min-h-[168px]");
    expect(screen.getByText("Tap to choose from your library")).toBeInTheDocument();
    fireEvent.click(add);
    expect(actions.onAdd).toHaveBeenCalledTimes(1);
  });

  it("allows the creator to continue without photos using either path", () => {
    const actions = controls();
    render(<KeepMomentsUploader moments={[]} busy={false} {...actions} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Continue without photos" }));
    expect(actions.onContinue).toHaveBeenCalledTimes(2);
  });

  it("shows uploaded photos/videos and retains add and remove controls", () => {
    const actions = controls();
    render(<KeepMomentsUploader moments={samples} busy={false} {...actions} />);
    expect(screen.getByAltText("Hannah photo")).toBeInTheDocument();
    expect(screen.getByLabelText("Family clip")).toBeInTheDocument();
    expect(screen.getByText("1 photo · 1 video added")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add more" }));
    expect(actions.onAdd).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove memory 2" }));
    expect(actions.onRemove).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Continue without more photos" }));
    expect(actions.onContinue).toHaveBeenCalledTimes(1);
  });

  it("prevents re-opening the upload picker while another upload is underway", () => {
    const actions = controls();
    const { rerender } = render(<KeepMomentsUploader moments={[]} busy {...actions} />);
    screen.getAllByRole("button", { name: /Adding your moments/ }).forEach(button => expect(button).toBeDisabled());
    rerender(<KeepMomentsUploader moments={samples} busy {...actions} />);
    expect(screen.getByRole("button", { name: "Adding…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Adding your moments…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue without more photos" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Adding your moments…" }));
    expect(actions.onContinue).not.toHaveBeenCalled();
  });
});
