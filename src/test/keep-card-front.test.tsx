import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KeepCardFront } from "@/components/keep-card-front";

afterEach(cleanup);

it("places the small logo, large italic dedication and split-aligned bottom details in the #10 design", () => {
  render(<KeepCardFront engraving={["HANNAH", "ALEX", "2026"]} layout={{ title: "HAPPY BIRTHDAY", order: ["date", "title", "to", "from"] }} openingMessage="You make our home feel like home." showOpeningMessage />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(within(card).getByRole("img", { name: "Keep" })).toHaveClass("row-start-1", "w-[21%]");
  const opening = within(card).getByText("You make our home feel like home.");
  expect(opening).toHaveClass("text-left", "italic", "leading-[1.28]", "tracking-[.01em]");
  expect(opening.parentElement).toHaveClass("row-start-2");
  expect(opening.parentElement?.style.getPropertyValue("--keep-opening-size")).toBe("5.8cqw");
  const left = within(card).getByText("2026 • HAPPY BIRTHDAY");
  const right = within(card).getByText("HANNAH • ALEX");
  expect(left).toHaveClass("whitespace-nowrap", "text-left");
  expect(right).toHaveClass("whitespace-nowrap", "text-right");
  expect(left.parentElement).toBe(right.parentElement);
  expect(left.parentElement).toHaveClass("row-start-3", "self-end", "justify-between");
  expect(card.querySelector(".h-px")).toBeNull();
});

it("retains the footer position without an engraved opening message and omits empty fields", () => {
  render(<KeepCardFront engraving={["", "ALEX", ""]} openingMessage="Only in the film" />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(within(card).queryByText("Only in the film")).toBeNull();
  expect(within(card).getByText("ALEX")).toHaveClass("text-left");
  expect(within(card).getByText("ALEX").parentElement).toHaveClass("row-start-3", "justify-between");
  expect(card.textContent).toBe("ALEX");
});

it("keeps the logo and tap cue when all optional engraving is omitted", () => {
  render(<KeepCardFront engraving={["", "", ""]} />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(within(card).getByRole("img", { name: "Keep" })).toBeTruthy();
  expect(within(card).getByRole("img", { name: "Tap your phone here" })).toBeTruthy();
  expect(card.textContent).toBe("");
});

it("keeps the exact same footer typography and bottom anchor when toggling or editing a long opening", () => {
  const engraving = ["HANNAH ELIZABETH", "FROM YOUR LOVING FAMILY", "NOVEMBER 27, 2026"];
  const layout = { title: "HAPPY 30TH BIRTHDAY, OUR LOVE", order: ["title", "to", "from", "date"] as const };
  const message = "On your 30th, I celebrate the quiet empathy and warmth that make our home a safer and softer place to grow.";
  const props = { engraving, layout: { ...layout, order: [...layout.order] }, openingMessage: message };
  const { rerender } = render(<KeepCardFront {...props} showOpeningMessage={false} />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  const footerText = [layout.title, engraving[0]].join(" • ");
  const rightText = [engraving[1], engraving[2]].join(" • ");
  const footer = within(card).getByText(footerText).parentElement!;
  const logo = within(card).getByRole("img", { name: "Keep" });
  const markup = footer.outerHTML;
  expect(footer).toHaveClass("tracking-[.13em]", "row-start-3", "self-end");
  expect(footer.parentElement).toHaveClass("grid-rows-[auto_minmax(0,1fr)_auto]");
  rerender(<KeepCardFront {...props} showOpeningMessage />);
  expect(within(card).getByText(message)).toBeTruthy();
  expect(within(card).getByText(footerText).parentElement).toBe(footer);
  expect(within(card).getByText(rightText).parentElement).toBe(footer);
  expect(footer.outerHTML).toBe(markup);
  expect(within(card).getByRole("img", { name: "Keep" })).toBe(logo);
  rerender(<KeepCardFront {...props} openingMessage="You are so loved." showOpeningMessage />);
  expect(footer.outerHTML).toBe(markup);
  rerender(<KeepCardFront {...props} showOpeningMessage={false} />);
  expect(within(card).queryByText(message)).toBeNull();
  expect(footer.outerHTML).toBe(markup);
});

it("separates only populated fields into clean left and right groups", () => {
  render(<KeepCardFront engraving={["", "FROM ALEX", "2026"]} layout={{ title: "", order: ["title", "to", "from", "date"] }} />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(card.textContent).toBe("FROM ALEX 2026");
  expect(within(card).getByText("FROM ALEX")).toHaveClass("text-left");
  expect(within(card).getByText("2026")).toHaveClass("text-right");
});

it("fits a long bullet-separated row to the card width without wrapping or shortening the text", () => {
  const clientWidth = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200);
  const measuredWidth = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 400 } as DOMRect);
  try {
    const engraving = ["HANNAH ELIZABETH", "FROM LOVING FRIENDS", "NOVEMBER 27, 2026"];
    render(<KeepCardFront engraving={engraving} layout={{ title: "HAPPY BIRTHDAY", order: ["title", "to", "from", "date"] }} />);
    const left = screen.getByText(["HAPPY BIRTHDAY", engraving[0]].join(" • "));
    const right = screen.getByText([engraving[1], engraving[2]].join(" • "));
    expect(left).toHaveClass("whitespace-nowrap");
    expect(right).toHaveClass("whitespace-nowrap");
    expect(left.parentElement).toBe(right.parentElement);
    expect(left.parentElement?.style.getPropertyValue("--keep-engraving-size")).toBe("0.608cqw");
  } finally {
    clientWidth.mockRestore();
    measuredWidth.mockRestore();
  }
});

it("always places the permanent phone-tap mark at the top right and gives the footer the full card width", () => {
  const props = { engraving: ["HANNAH", "FROM ALEX", "2026"], openingMessage: "You are so loved." };
  const { rerender } = render(<KeepCardFront {...props} showOpeningMessage />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  const mark = within(card).getByRole("img", { name: "Tap your phone here" });
  expect(mark).toHaveClass("absolute", "top-[1.5%]", "right-0", "w-[4.8cqw]");
  expect(mark.querySelector("circle")).toBeTruthy();
  expect(mark.querySelector("path")?.getAttribute("d")?.match(/M/g)).toHaveLength(4);
  expect(mark.querySelector("rect")).toBeNull();
  expect(within(card).getByText("HANNAH").parentElement).toHaveClass("w-full", "justify-between");
  expect(within(card).getByText("FROM ALEX • 2026")).toHaveClass("text-right");
  rerender(<KeepCardFront {...props} showOpeningMessage={false} />);
  expect(within(card).getByRole("img", { name: "Tap your phone here" })).toBe(mark);
  rerender(<KeepCardFront engraving={[]} />);
  expect(within(card).getByRole("img", { name: "Tap your phone here" })).toBe(mark);
});


it("matches the selected mockup with the title at left and sender and year together at right", () => {
  const message = "On your 30th, I celebrate how your quiet empathy makes our home safer and softer.";
  render(<KeepCardFront engraving={["", "FROM ALEX", "2026"]} layout={{ title: "HAPPY 30TH BIRTHDAY", order: ["title", "to", "from", "date"] }} openingMessage={message} showOpeningMessage />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(within(card).getByText(message)).toHaveClass("italic");
  expect(within(card).getByText("HAPPY 30TH BIRTHDAY")).toHaveClass("text-left");
  expect(within(card).getByText("FROM ALEX • 2026")).toHaveClass("text-right");
});
