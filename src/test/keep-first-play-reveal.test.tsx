import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KeepFirstPlayReveal } from "../components/keep-first-play-reveal";
import { KeepRecipientExperience } from "../components/keep-recipient-experience";
import { openingMessageIdeas } from "../lib/keep-opening-message";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("starts with only A Keep for, the recipient, and a single experience button", () => {
  const onOpen = vi.fn();
  const { container } = render(
    <KeepFirstPlayReveal name="Dad" onOpen={onOpen} />
  );
  expect(screen.getByText("A KEEP FOR")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Dad" })).toBeInTheDocument();
  expect(screen.getAllByRole("button")).toHaveLength(1);
  expect(screen.queryByText("MADE TO BE REMEMBERED")).not.toBeInTheDocument();
  expect(container.querySelector("img, video, blockquote")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Experience your Keep/i }));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

it("handles long names and leaves the opening dedication for after the tap", () => {
  render(
    <KeepFirstPlayReveal name="Andi, Crew & Emma" onOpen={() => {}} />
  );
  expect(screen.getByRole("heading", { name: "Andi, Crew & Emma" })).toBeInTheDocument();
  expect(screen.queryByRole("blockquote")).toBeNull();
  expect(screen.queryByText("undefined")).toBeNull();
});

it("transitions from the simple cover into a dark dedication inside the film", () => {
  render(<KeepRecipientExperience
    name="Dad" from="Alex" year="2026"
    openingMessage="I wanted to make sure these words always found you."
    audioUrl="blob:voice" audioDuration={118}
    media={[{ url: "/dad.jpg", kind: "image" }]}
    persistVisit={false}
  />);
  expect(screen.getByRole("heading", { name: "Dad" })).toBeInTheDocument();
  expect(screen.queryByText("I wanted to make sure these words always found you.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Experience your Keep/i }));
  expect(screen.getByText("I wanted to make sure these words always found you.")).toBeInTheDocument();
  expect(screen.getByText("−2:14")).toBeInTheDocument();
});

it("offers concise occasion-aware introductions without adding made-up memories", () => {
  const suggestions = openingMessageIdeas("Hannah", "Anniversary");
  expect(suggestions).toHaveLength(3);
  expect(suggestions[0]).toContain("moments");
  expect(suggestions[1]).toContain("Hannah");
  expect(suggestions.every((s) => s.length <= 160)).toBe(true);
});
