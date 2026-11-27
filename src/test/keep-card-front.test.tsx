import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { KeepCardFront } from "@/components/keep-card-front";

afterEach(cleanup);

it("places the smaller logo, left-aligned middle dedication and right-aligned bottom details in separate rows", () => {
  render(<KeepCardFront engraving={["HANNAH", "ALEX", "2026"]} layout={{ title: "HAPPY BIRTHDAY", order: ["date", "title", "to", "from"] }} openingMessage="You make our home feel like home." showOpeningMessage />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(within(card).getByRole("img", { name: "Keep" })).toHaveClass("row-start-1", "w-[31%]");
  expect(within(card).getByText("You make our home feel like home.")).toHaveClass("row-start-2", "text-left");
  const details = within(card).getByText("2026").parentElement;
  expect(details).toHaveClass("row-start-3", "flex-col", "items-end", "self-end", "text-right");
  expect(Array.from(details?.children ?? []).map(line => line.textContent)).toEqual(["2026", "HAPPY BIRTHDAY", "HANNAH", "ALEX"]);
  expect(card.querySelector(".h-px")).toBeNull();
});

it("retains the footer position without an engraved opening message and omits empty fields", () => {
  render(<KeepCardFront engraving={["", "ALEX", ""]} openingMessage="Only in the film" />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(within(card).queryByText("Only in the film")).toBeNull();
  expect(within(card).getByText("ALEX").parentElement).toHaveClass("row-start-3", "text-right");
  expect(card.textContent).toBe("ALEX");
});

it("leaves just the logo when all optional engraving is omitted", () => {
  render(<KeepCardFront engraving={["", "", ""]} />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(within(card).getByRole("img", { name: "Keep" })).toBeTruthy();
  expect(card.textContent).toBe("");
});
