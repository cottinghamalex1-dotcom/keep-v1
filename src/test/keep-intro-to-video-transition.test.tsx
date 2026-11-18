import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepRecipientExperience } from "@/components/keep-recipient-experience";

vi.mock("@/components/keep-player", () => ({
  KeepPlayer: ({ onOpeningFrameReady, onExit, onFinish, audioUrl }: {
    onOpeningFrameReady?: () => void; onExit?: () => void; onFinish?: () => void; audioUrl?: string;
  }) => <div data-testid="recipient-film" data-audio={audioUrl}>
    <button type="button" onClick={onOpeningFrameReady}>Opening photo decoded</button>
    <button type="button" onClick={onExit}>Exit preview</button>
    <button type="button" onClick={onFinish}>Finish film</button>
  </div>,
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("seamless personalized introduction to film", () => {
  const props = {
    name: "Hannah", from: "Alex", year: "2026",
    openingMessage: "This is for every moment worth keeping.",
    media: [{ url: "/first-photo.jpg", kind: "image" as const }],
    audioUrl: "/voice.mp3",
    audioDuration: 150,
    persistVisit: false,
  };

  it("keeps the same intro visible until the first photo is ready, then dissolves it away", () => {
    const { container } = render(<KeepRecipientExperience {...props} />);
    const originalReveal = container.querySelector(".keep-first-play");
    expect(originalReveal).not.toBeNull();
    expect(screen.queryByTestId("recipient-film")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Experience your Keep" }));
    const film = screen.getByTestId("recipient-film");
    expect(film).toHaveAttribute("data-audio", "/voice.mp3");

    // The original first impression stays mounted rather than dropping to black.
    expect(container.querySelector(".keep-first-play")).toBe(originalReveal);
    expect(screen.getByText("Opening your Keep…")).toBeInTheDocument();
    const cover = originalReveal!.parentElement!;
    expect(cover).toHaveClass("opacity-100");
    expect(cover).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(screen.getByRole("button", { name: "Opening photo decoded" }));
    expect(cover).toHaveClass("opacity-0");
    fireEvent.transitionEnd(cover);
    expect(container.querySelector(".keep-first-play")).toBeNull();
    expect(screen.getByTestId("recipient-film")).toBeInTheDocument();
  });

  it("keeps alternate formats available after leaving the cinematic film", () => {
    render(<KeepRecipientExperience {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Experience your Keep" }));
    fireEvent.click(screen.getByRole("button", { name: "Exit preview" }));
    expect(screen.getByRole("button", { name: /Watch, Listen & Read/i })).toBeInTheDocument();
    expect(screen.queryByTestId("recipient-film")).not.toBeInTheDocument();
  });

  it("always replays the title, dedication and film after choosing Watch again", () => {
    const { container } = render(<KeepRecipientExperience {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Experience your Keep" }));
    expect(screen.getByTestId("recipient-film")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Finish film" }));
    expect(screen.getByText(/Some things are/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Experience it again/i }));
    fireEvent.click(screen.getByRole("button", { name: /Watch, Listen & Read/i }));
    expect(container.querySelector(".keep-first-play")).not.toBeNull();
    expect(screen.queryByTestId("recipient-film")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Experience your Keep" }));
    expect(screen.getByTestId("recipient-film")).toBeInTheDocument();
    expect(screen.getByText("Opening your Keep…")).toBeInTheDocument();
  });

  it("shows direct creator watch previews without a redundant introduction", () => {
    const { container } = render(<KeepRecipientExperience {...props} creatorPreview initialExperience="watch" />);
    expect(screen.getByTestId("recipient-film")).toBeInTheDocument();
    expect(container.querySelector(".keep-first-play")).toBeNull();
  });
});
