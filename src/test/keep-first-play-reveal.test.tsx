import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KeepFirstPlayReveal } from "../components/keep-first-play-reveal";
import { openingMessageIdeas } from "../lib/keep-opening-message";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("shows recipient, occasion, personal introduction and sender without a photo overlay", () => {
  const onOpen = vi.fn();
  const onOtherFormats = vi.fn();
  const { container } = render(
    <KeepFirstPlayReveal
      name="Hannah"
      occasion="Anniversary"
      introduction="I wanted to make sure these words always found you."
      from="Alex"
      year="2026"
      onOpen={onOpen}
      onOtherFormats={onOtherFormats}
    />
  );
  expect(screen.getByRole("heading", { name: "Hannah" })).toBeTruthy();
  expect(screen.getByText("Anniversary")).toBeTruthy();
  expect(screen.getByText("I wanted to make sure these words always found you.")).toBeTruthy();
  expect(screen.getByText("From Alex · 2026")).toBeTruthy();
  expect(container.querySelector("img, video")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Experience your Keep/i }));
  expect(onOpen).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: /listen or read/i }));
  expect(onOtherFormats).toHaveBeenCalledTimes(1);
});

it("handles long names and missing optional metadata gracefully", () => {
  render(
    <KeepFirstPlayReveal
      name="Andi, Crew & Emma"
      introduction=""
      onOpen={() => {}}
      onOtherFormats={() => {}}
    />
  );
  expect(screen.getByRole("heading", { name: "Andi, Crew & Emma" })).toBeTruthy();
  expect(screen.getByText("Some things are worth keeping close.")).toBeTruthy();
  expect(screen.queryByText("undefined")).toBeNull();
});

it("offers concise occasion-aware introductions without adding made-up memories", () => {
  const suggestions = openingMessageIdeas("Hannah", "Anniversary");
  expect(suggestions).toHaveLength(3);
  expect(suggestions[0]).toContain("moments");
  expect(suggestions[1]).toContain("Hannah");
  expect(suggestions.every((s) => s.length <= 160)).toBe(true);
});
