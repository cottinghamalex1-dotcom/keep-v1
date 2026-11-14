import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepRecipientExperience } from "@/components/keep-recipient-experience";
import { frameAtTime, makeReadingFrames, readingFrameAtTime } from "@/lib/keep-immersive-reading";

const first = "Trevor, you have been such a true friend through every season of life.";
const second = "I will always remember how you showed up when it mattered most.";
const cues = [
  { text: first, start: 1, end: 4 },
  { text: second, start: 8, end: 12 },
];

const props = {
  name: "Trevor",
  from: "Alex",
  year: "2026",
  audioUrl: "/saved-voice.wav",
  audioDuration: 30,
  messageParagraphs: [first, second],
  captionCues: cues,
  persistVisit: false,
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Listen and Read: visible spoken words", () => {
  it("shows the actual first passage immediately when Listen and Read is selected", () => {
    render(<KeepRecipientExperience {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /choose another way to experience it/i }));
    fireEvent.click(screen.getByRole("button", { name: /Listen & Read/i }));
    expect(screen.getByText(first)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play narration" })).toBeInTheDocument();
    expect(screen.queryByText("Some words deserve to be heard.")).not.toBeInTheDocument();
  });

  it("advances passages on the actual voice clock and holds between phrases", () => {
    const { container } = render(
      <KeepRecipientExperience {...props} creatorPreview initialExperience="listen" />
    );
    const voice = container.querySelector("audio")!;
    expect(screen.getByText(first)).toBeInTheDocument();

    Object.defineProperty(voice, "duration", { configurable: true, value: 30 });
    voice.currentTime = 5;
    fireEvent.timeUpdate(voice);
    expect(screen.getByText(first)).toBeInTheDocument();

    voice.currentTime = 9;
    fireEvent.timeUpdate(voice);
    expect(screen.getByText(second)).toBeInTheDocument();
    expect(screen.queryByText(first)).not.toBeInTheDocument();

    voice.currentTime = 16;
    fireEvent.timeUpdate(voice);
    expect(screen.getByText(second)).toBeInTheDocument();
  });

  it("uses the saved message when caption timing is missing", () => {
    render(<KeepRecipientExperience {...props} captionCues={[]} creatorPreview initialExperience="listen" />);
    expect(screen.getByText(/Trevor, you have been such a true friend/)).toBeInTheDocument();
  });

  it("never substitutes an unrelated demonstration script for missing real voice text", () => {
    render(<KeepRecipientExperience {...props} captionCues={[]} messageParagraphs={[]} creatorPreview initialExperience="listen" />);
    expect(screen.getByText(/written message isn’t available yet/)).toBeInTheDocument();
    expect(screen.queryByText(/Hanna, I wanted to make this/)).not.toBeInTheDocument();
  });
});

describe("reading-specific cue selection", () => {
  it("continues displaying the most recent passage between time-aligned phrases", () => {
    const frames = makeReadingFrames(cues, [first, second], 30);
    expect(frames).toHaveLength(2);
    expect(readingFrameAtTime(frames, 0)).toBe(0);
    expect(readingFrameAtTime(frames, 5)).toBe(0);
    expect(readingFrameAtTime(frames, 9)).toBe(1);
    expect(readingFrameAtTime(frames, 20)).toBe(1);
    // The strict film-caption selector must retain its own silence behavior.
    expect(frameAtTime(frames, 5)).toBe(-1);
  });
  it("does not try to render a passage when no written words exist", () => {
    expect(readingFrameAtTime([], 0)).toBe(-1);
  });
});
