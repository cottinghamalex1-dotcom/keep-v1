import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepVoiceTransition } from "@/components/keep-voice-transition";

const defaults = {
  isSaving: false,
  isSyncing: false,
  hasCaptions: true,
  syncError: false,
  isDemo: false,
  isPersisted: true,
  hasRecording: true,
  returnToEditor: false,
  onContinue: vi.fn(),
  onRetry: vi.fn(),
  onRecordAgain: vi.fn(),
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("voice confirmation after recording", () => {
  it("replaces the playback screen with a modal and an honest saving indicator", () => {
    render(<KeepVoiceTransition {...defaults} isSaving hasCaptions={false} hasRecording={false} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Holding onto your words.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
    expect(screen.queryByRole("button", { name: /Continue my Keep/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Play recording/ })).not.toBeInTheDocument();
  });

  it("holds the confirmation until caption syncing actually completes", () => {
    const { rerender } = render(<KeepVoiceTransition {...defaults} isSyncing hasCaptions={false}/>);
    expect(screen.getByText("Putting the words in place.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Syncing captions");
    expect(screen.queryByRole("button", { name: /Continue my Keep/ })).not.toBeInTheDocument();

    rerender(<KeepVoiceTransition {...defaults}/>);
    expect(screen.getByText("Your voice is kept.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    fireEvent.click(screen.getByRole("button", { name: /Continue my Keep/ }));
    expect(defaults.onContinue).toHaveBeenCalledOnce();
  });

  it("gives an editor re-recording an appropriate return button", () => {
    render(<KeepVoiceTransition {...defaults} returnToEditor/>);
    fireEvent.click(screen.getByRole("button", { name: /Back to my Keep/ }));
    expect(defaults.onContinue).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /Record again/ }));
    expect(defaults.onRecordAgain).toHaveBeenCalledOnce();
  });

  it("permits continuing if caption sync fails, but exposes a retry action", () => {
    render(<KeepVoiceTransition {...defaults} hasCaptions={false} syncError/>);
    expect(screen.getByText(/Captions need another look/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry caption sync/ }));
    expect(defaults.onRetry).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /Continue my Keep/ }));
    expect(defaults.onContinue).toHaveBeenCalledOnce();
  });

  it("does not claim a missing voice recording was saved", () => {
    render(<KeepVoiceTransition {...defaults} hasRecording={false} isPersisted={false} hasCaptions={false}/>);
    expect(screen.getByText("Your recording needs another try.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue my Keep/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Record again/ }));
    expect(defaults.onRecordAgain).toHaveBeenCalledOnce();
  });

  it("does not pretend the demo contains real recorded audio", () => {
    render(<KeepVoiceTransition {...defaults} isDemo hasRecording isPersisted hasCaptions={false} />);
    expect(screen.getByText("Ready for a preview.")).toBeInTheDocument();
    expect(screen.getByText("DEMO · NO VOICE ATTACHED")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue my Keep/ })).toBeEnabled();
  });

  it("distinguishes an in-session recording from one stored on the device", () => {
    render(<KeepVoiceTransition {...defaults} isPersisted={false}/>);
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't be saved to device storage");
  });
});
