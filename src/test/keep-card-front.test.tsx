import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { KeepCardFront } from "@/components/keep-card-front";

afterEach(cleanup);

it("places the smaller logo, left-aligned middle dedication and left-aligned bottom details in separate rows", () => {
  render(<KeepCardFront engraving={["HANNAH", "ALEX", "2026"]} layout={{ title: "HAPPY BIRTHDAY", order: ["date", "title", "to", "from"] }} openingMessage="You make our home feel like home." showOpeningMessage />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(within(card).getByRole("img", { name: "Keep" })).toHaveClass("row-start-1", "w-[31%]");
  expect(within(card).getByText("You make our home feel like home.")).toHaveClass("row-start-2", "text-left");
  const details = within(card).getByText("2026").parentElement;
  expect(details).toHaveClass("row-start-3", "flex-col", "items-start", "self-end", "text-left");
  expect(Array.from(details?.children ?? []).map(line => line.textContent)).toEqual(["2026", "HAPPY BIRTHDAY", "HANNAH", "ALEX"]);
  expect(card.querySelector(".h-px")).toBeNull();
});

it("retains the footer position without an engraved opening message and omits empty fields", () => {
  render(<KeepCardFront engraving={["", "ALEX", ""]} openingMessage="Only in the film" />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(within(card).queryByText("Only in the film")).toBeNull();
  expect(within(card).getByText("ALEX").parentElement).toHaveClass("row-start-3", "text-left");
  expect(card.textContent).toBe("ALEX");
});

it("leaves just the logo when all optional engraving is omitted", () => {
  render(<KeepCardFront engraving={["", "", ""]} />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(within(card).getByRole("img", { name: "Keep" })).toBeTruthy();
  expect(card.textContent).toBe("");
});

it("keeps the exact same footer typography and bottom anchor when toggling or editing a long opening", () => {
  const engraving = ["HANNAH ELIZABETH", "FROM YOUR LOVING FAMILY", "NOVEMBER 27, 2026"];
  const layout = { title: "HAPPY 30TH BIRTHDAY, OUR LOVE", order: ["title", "to", "from", "date"] as const };
  const message = "On your 30th, I celebrate the quiet empathy and warmth that make our home a safer and softer place to grow.";
  const props = { engraving, layout: { ...layout, order: [...layout.order] }, openingMessage: message };
  const { rerender } = render(<KeepCardFront {...props} showOpeningMessage={false} />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  const footer = within(card).getByText(engraving[0]!).parentElement!;
  const logo = within(card).getByRole("img", { name: "Keep" });
  const markup = footer.outerHTML;
  expect(footer).toHaveClass("text-[2.65cqw]", "tracking-[.15em]", "row-start-3", "self-end");
  expect(footer.parentElement).toHaveClass("grid-rows-[auto_minmax(0,1fr)_auto]");
  rerender(<KeepCardFront {...props} showOpeningMessage />);
  expect(within(card).getByText(message)).toBeTruthy();
  expect(within(card).getByText(engraving[0]!).parentElement).toBe(footer);
  expect(footer.outerHTML).toBe(markup);
  expect(within(card).getByRole("img", { name: "Keep" })).toBe(logo);
  rerender(<KeepCardFront {...props} openingMessage="You are so loved." showOpeningMessage />);
  expect(footer.outerHTML).toBe(markup);
  rerender(<KeepCardFront {...props} showOpeningMessage={false} />);
  expect(within(card).queryByText(message)).toBeNull();
  expect(footer.outerHTML).toBe(markup);
});
