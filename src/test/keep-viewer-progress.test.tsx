import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KeepPlayer } from "@/components/keep-player";
import { KeepRecipientExperience } from "@/components/keep-recipient-experience";

const media = [
  { url: "/memory-one.jpg", kind: "image" as const, displayDurationSec: 5 },
  { url: "/memory-two.jpg", kind: "image" as const, displayDurationSec: 5 },
];

afterEach(cleanup);

describe("non-interactive Keep viewing progress", () => {
  it("shows full elapsed and remaining time without a seek slider or dot", () => {
    const { container } = render(<KeepPlayer
      name="Mom" from="Alex" year="2026" onExit={() => {}}
      media={media} audioUrl="blob:test-narration" audioDuration={111}
    />);
    const progress = screen.getByRole("progressbar", { name: "Keep playback progress" });
    expect(progress).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0:00")).toBeInTheDocument();
    // 2.8-second intro + 1:51 voice + 4.5-second outro.
    expect(screen.getByText("−1:58")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(container.querySelector('[role="progressbar"] input')).toBeNull();
    expect(progress.querySelectorAll("div")).toHaveLength(1);
  });

  it("fades the passive progress bar with other controls and reveals it on tap", () => {
    const { container } = render(<KeepPlayer
      name="Dad" from="Alex" year="2026" onExit={() => {}}
      media={media} audioUrl="blob:old-saved" audioDuration={90}
    />);
    const progress = screen.getByRole("progressbar", { name: "Keep playback progress" });
    const wrapper = progress.parentElement!;
    expect(wrapper).toHaveAttribute("aria-hidden", "false");
    fireEvent.click(container.firstElementChild!);
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(container.firstElementChild!);
    expect(wrapper).toHaveAttribute("aria-hidden", "false");
  });

  it("offers the fullscreen icon beside playback controls and hides it on screen tap", () => {
    const { container } = render(<KeepPlayer
      name="Dad" from="Alex" year="2026" onExit={() => {}}
      media={media} audioUrl="blob:full-screen-film" audioDuration={90}
    />);
    const button = screen.getByRole("button", { name: "Enter fullscreen" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.parentElement?.querySelector('button[aria-label="Mute"]')).not.toBeNull();
    const controls = button.closest('[aria-hidden="false"]');
    expect(controls).toBeInTheDocument();
    fireEvent.click(container.firstElementChild!);
    expect(controls).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(container.firstElementChild!);
    expect(controls).toHaveAttribute("aria-hidden", "false");
  });

  it("uses authored scene durations for a Keep without narration", () => {
    render(<KeepPlayer name="Dad" from="Alex" year="2026" onExit={() => {}} media={media} />);
    expect(screen.getByText("−0:10")).toBeInTheDocument();
  });

  it("also applies to older completed Keeps opened in Watch mode", () => {
    render(<KeepRecipientExperience name="Dad" from="Alex" year="2026"
      media={media} audioUrl="blob:old-saved-narration" audioDuration={80}
      captionCues={[{ text: "Thank you for everything.", start: 1, end: 4 }]}
      initialExperience="watch" creatorPreview persistVisit={false}
    />);
    expect(screen.getByRole("progressbar", { name: "Keep playback progress" })).toBeInTheDocument();
    expect(screen.getByText("−1:32")).toBeInTheDocument();
  });
});
