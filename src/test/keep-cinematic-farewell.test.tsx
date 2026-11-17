import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { KeepPlayer } from "@/components/keep-player";
import { KeepOpeningPersonalization } from "@/components/keep-opening-personalization";
import { newProject } from "@/lib/keep-project";
import { publicationSettings } from "@/lib/keep-publish";

vi.mock("@/lib/keep-ai", () => ({
  fetchOpeningSuggestions: vi.fn().mockResolvedValue(["You are loved.", "Always here.", "Forever grateful."]),
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("cinematic Keep farewell", () => {
  it("fades to an optional personal last line when the real narration finishes", () => {
    const { container } = render(<KeepPlayer
      name="DAD" from="Alex" year="2026" onExit={() => {}}
      audioUrl="blob:old-keep" audioDuration={123}
      closingLine="I love you, Dad."
      media={[{ url: "/photo.jpg", kind: "image" }]}
    />);
    const farewell = screen.getByText("I love you, Dad.");
    const overlay = farewell.closest('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    fireEvent.ended(container.querySelector("audio")!);
    expect(farewell.closest('[aria-hidden="false"]')).not.toBeNull();
    expect(screen.getByText("With love, Alex")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Keep playback progress" })).toBeInTheDocument();
  });

  it("uses a meaningful default for a previously published Keep with no closing line", () => {
    const { container } = render(<KeepPlayer
      name="MOM" from="Alex" year="2026" onExit={() => {}}
      audioUrl="blob:previously-published" audioDuration={118}
    />);
    fireEvent.ended(container.querySelector("audio")!);
    expect(screen.getByText("You are so loved.")).toBeInTheDocument();
  });

  it("lets creators write the ending without changing their recorded voice", () => {
    const p = { ...newProject(), recipientName: "Dad", closingLine: "Until we meet again." };
    expect(publicationSettings(p).closingLine).toBe("Until we meet again.");
    const update = vi.fn();
    render(<KeepOpeningPersonalization project={p} onUpdate={update} onPreview={() => {}} />);
    expect(screen.getByLabelText("Closing moment preview")).toHaveTextContent("Until we meet again.");
    fireEvent.change(screen.getByRole("textbox", { name: "Your closing line" }), {
      target: { value: "I love you, Dad." },
    });
    expect(update).toHaveBeenCalledWith({ closingLine: "I love you, Dad." });
  });
});
