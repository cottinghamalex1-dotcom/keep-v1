import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KeepCardFront } from "@/components/keep-card-front";

afterEach(cleanup);

it("places the smaller logo, left-aligned middle dedication and left-aligned bottom details on one bullet-separated line", () => {
  render(<KeepCardFront engraving={["HANNAH", "ALEX", "2026"]} layout={{ title: "HAPPY BIRTHDAY", order: ["date", "title", "to", "from"] }} openingMessage="You make our home feel like home." showOpeningMessage />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(within(card).getByRole("img", { name: "Keep" })).toHaveClass("row-start-1", "w-[31%]");
  expect(within(card).getByText("You make our home feel like home.")).toHaveClass("row-start-2", "text-left");
  const line = within(card).getByText("2026 • HAPPY BIRTHDAY • HANNAH • ALEX");
  expect(line).toHaveClass("whitespace-nowrap");
  expect(line.parentElement).toHaveClass("row-start-3", "self-end", "text-left");
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
  const footerText = [layout.title, ...engraving].join(" • ");
  const footer = within(card).getByText(footerText).parentElement!;
  const logo = within(card).getByRole("img", { name: "Keep" });
  const markup = footer.outerHTML;
  expect(footer).toHaveClass("tracking-[.15em]", "row-start-3", "self-end");
  expect(footer.parentElement).toHaveClass("grid-rows-[auto_minmax(0,1fr)_auto]");
  rerender(<KeepCardFront {...props} showOpeningMessage />);
  expect(within(card).getByText(message)).toBeTruthy();
  expect(within(card).getByText(footerText).parentElement).toBe(footer);
  expect(footer.outerHTML).toBe(markup);
  expect(within(card).getByRole("img", { name: "Keep" })).toBe(logo);
  rerender(<KeepCardFront {...props} openingMessage="You are so loved." showOpeningMessage />);
  expect(footer.outerHTML).toBe(markup);
  rerender(<KeepCardFront {...props} showOpeningMessage={false} />);
  expect(within(card).queryByText(message)).toBeNull();
  expect(footer.outerHTML).toBe(markup);
});

it("separates only populated fields, with no leading or trailing bullet", () => {
  render(<KeepCardFront engraving={["", "FROM ALEX", "2026"]} layout={{ title: "", order: ["title", "to", "from", "date"] }} />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(card.textContent).toBe("FROM ALEX • 2026");
});

it("fits a long bullet-separated row to the card width without wrapping or shortening the text", () => {
  const clientWidth = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200);
  const measuredWidth = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 400 } as DOMRect);
  try {
    const engraving = ["HANNAH ELIZABETH", "FROM LOVING FRIENDS", "NOVEMBER 27, 2026"];
    render(<KeepCardFront engraving={engraving} layout={{ title: "HAPPY BIRTHDAY", order: ["title", "to", "from", "date"] }} />);
    const line = screen.getByText(["HAPPY BIRTHDAY", ...engraving].join(" • "));
    expect(line).toHaveClass("whitespace-nowrap");
    expect(line.parentElement?.style.getPropertyValue("--keep-engraving-size")).toBe("1.318cqw");
  } finally {
    clientWidth.mockRestore();
    measuredWidth.mockRestore();
  }
});
