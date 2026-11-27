import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KeepFinalTouchNavigation } from "@/components/keep-final-touch-navigation";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function Harness() {
  return <>
    <KeepFinalTouchNavigation />
    <section id="keep-final-opening">Opening line</section>
    <section id="keep-final-closing">Closing line</section>
    <section id="keep-final-card">Card details</section>
  </>;
}

it("marks the current section and follows scrolling in both directions", async () => {
  const positions = { opening: 150, closing: 480, card: 900 };
  const rect = (top: number, bottom = top + 300) => ({ top, bottom } as DOMRect);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.tagName === "NAV") return rect(68, 142);
    const id = this.id.replace("keep-final-", "") as keyof typeof positions;
    return rect(positions[id] ?? 9999);
  });
  render(<Harness />);
  const opening = screen.getByRole("button", { name: "Opening" });
  const closing = screen.getByRole("button", { name: "Closing" });
  const card = screen.getByRole("button", { name: "Card" });
  expect(opening).toHaveAttribute("aria-current", "location");
  positions.opening = -220; positions.closing = 143; positions.card = 600;
  fireEvent.scroll(window);
  await waitFor(() => expect(closing).toHaveAttribute("aria-current", "location"));
  expect(opening).not.toHaveAttribute("aria-current");
  positions.closing = -200; positions.card = 144;
  fireEvent.scroll(window);
  await waitFor(() => expect(card).toHaveAttribute("aria-current", "location"));
  positions.opening = 150; positions.closing = 480; positions.card = 900;
  fireEvent.scroll(window);
  await waitFor(() => expect(opening).toHaveAttribute("aria-current", "location"));
});

it("selects and scrolls to a tapped section without changing the other buttons", () => {
  render(<Harness />);
  const cardSection = document.getElementById("keep-final-card")!;
  const scrollIntoView = vi.fn();
  cardSection.scrollIntoView = scrollIntoView;
  fireEvent.click(screen.getByRole("button", { name: "Card" }));
  expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "start" }));
  expect(screen.getByRole("button", { name: "Card" })).toHaveAttribute("aria-current", "location");
  expect(screen.getByRole("button", { name: "Opening" })).not.toHaveAttribute("aria-current");
});
