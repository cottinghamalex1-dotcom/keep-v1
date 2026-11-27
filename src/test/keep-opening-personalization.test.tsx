import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { KeepOpeningPersonalization } from "@/components/keep-opening-personalization";
import { newProject } from "@/lib/keep-project";
import { fetchOpeningSuggestions } from "@/lib/keep-ai";
vi.mock("@/lib/keep-ai", () => ({ fetchOpeningSuggestions: vi.fn() }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("offers three transcript-specific opening choices and permits no opening", async () => {
  const options = [
    "The everyday things you do are the things we cherish most.",
    "We hope you always feel the love we share with you.",
    "Our favorite days are the ordinary ones we spend with you.",
  ];
  vi.mocked(fetchOpeningSuggestions).mockResolvedValue(options);
  function Harness() {
    const [p, setP] = useState({ ...newProject(), recipientName: "Andi", occasion: "Birthday",
      messageParagraphs: ["The everyday moments with you are always the ones we cherish most."] });
    return <KeepOpeningPersonalization project={p} onUpdate={values => setP(old => ({ ...old, ...values }))} />;
  }
  render(<Harness />);
  await waitFor(() => expect(screen.getByText(options[2]!)).toBeTruthy());
  expect(fetchOpeningSuggestions).toHaveBeenCalledWith("Andi", "Birthday", ["The everyday moments with you are always the ones we cherish most."]);
  const second = screen.getByText(options[1]!);
  fireEvent.click(second);
  expect(screen.getByRole("textbox", { name: "Custom opening message" })).toHaveValue(options[1]);
  expect(screen.getByLabelText("Preview of the front of your Keep card")).toHaveTextContent(options[1]!);
  fireEvent.click(screen.getByRole("button", { name: /No opening message/ }));
  expect(screen.getByRole("textbox", { name: "Custom opening message" })).toHaveValue("");
});

it("opens the dark dedication screen immediately without covering the first photo", () => {
  function Harness() {
    const [p, setP] = useState({
      ...newProject(),
      recipientName: "Mom",
      openingMessage: "You made our house a home.",
      engraveOpeningMessage: true,
      memories: [{ id: "first", kind: "image" as const, source: "upload" as const, url: "/our-home.jpg" }],
    });
    return <KeepOpeningPersonalization project={p} onUpdate={values => setP(old => ({ ...old, ...values }))} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: /Preview opening screen/ }));
  const dialog = screen.getByRole("dialog", { name: "Opening screen preview" });
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain("You made our house a home.");
  expect(dialog.textContent).toContain("The film opens on this dark dedication");
  expect(dialog.querySelector("img")).toBeNull();
  expect(dialog.querySelector('div[class*="bg-[#171311]"]')).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close opening preview" }));
  expect(screen.queryByRole("dialog", { name: "Opening screen preview" })).toBeNull();
});


it("previews the same opening line and saved engraving details on the black card before saving", () => {
  function Harness() {
    const [p, setP] = useState({
      ...newProject(),
      recipientName: "Mom",
      cardEngraving: ["MOM", "FROM ALEX", "2026"],
      openingMessage: "You made our house a home.",
      engraveOpeningMessage: true,
    });
    return <KeepOpeningPersonalization project={p} onUpdate={values => setP(old => ({ ...old, ...values }))} />;
  }
  render(<Harness />);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(within(card).getByRole("img", { name: "Keep" })).toBeTruthy();
  expect(card).toHaveTextContent("You made our house a home.");
  expect(card).toHaveTextContent("MOM");
  expect(card).toHaveTextContent("FROM ALEX");
  expect(card).toHaveTextContent("2026");
  fireEvent.change(screen.getByRole("textbox", { name: "Custom opening message" }), { target: { value: "My forever thank you." } });
  expect(card).toHaveTextContent("My forever thank you.");
  expect(card).not.toHaveTextContent("You made our house a home.");
  fireEvent.change(screen.getByRole("textbox", { name: "Your closing line" }), { target: { value: "See you soon." } });
  expect(card).not.toHaveTextContent("See you soon.");
  fireEvent.click(screen.getByRole("button", { name: /No opening message/ }));
  expect(card).not.toHaveTextContent("My forever thank you.");
  expect(card).toHaveTextContent("MOM");
  expect(screen.getByText(/Personalized engraving is exclusive to Signature/)).toBeTruthy();
});


it("reopens saved final touches, edits the engraved details, and saves a film-only opening if requested", () => {
  function Harness() {
    const [p, setP] = useState({
      ...newProject(), publicationId: "existing-id", publicationToken: "same-link",
      recipientName: "Hannah", openingMessage: "You make our home brighter.",
      closingLine: "All my love.", engraveOpeningMessage: true,
      cardEngraving: ["HANNAH", "FROM ALEX", "2026"],
    });
    return <KeepOpeningPersonalization project={p} onUpdate={values => setP(old => ({ ...old, ...values }))} />;
  }
  render(<Harness />);
  expect(screen.getByRole("textbox", { name: "Custom opening message" })).toHaveValue("You make our home brighter.");
  expect(screen.getByRole("textbox", { name: "Your closing line" })).toHaveValue("All my love.");
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  fireEvent.change(screen.getByRole("textbox", { name: "To" }), { target: { value: "My Hannah" } });
  fireEvent.change(screen.getByRole("textbox", { name: "From" }), { target: { value: "Love, Alex" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Date" }), { target: { value: "" } });
  expect(card).toHaveTextContent("MY HANNAH");
  expect(card).toHaveTextContent("LOVE, ALEX");
  expect(card).not.toHaveTextContent("2026");
  fireEvent.click(screen.getByRole("checkbox", { name: /Include my opening line on the card/ }));
  expect(card).not.toHaveTextContent("You make our home brighter.");
  expect(screen.getByRole("textbox", { name: "Custom opening message" })).toHaveValue("You make our home brighter.");
  fireEvent.change(screen.getByRole("textbox", { name: "Custom opening message" }), { target: { value: "You make life beautiful." } });
  expect(card).not.toHaveTextContent("You make life beautiful.");
  fireEvent.click(screen.getByRole("button", { name: /Preview opening screen/ }));
  expect(screen.getByRole("dialog", { name: "Opening screen preview" })).toHaveTextContent("You make life beautiful.");
  fireEvent.click(screen.getByRole("button", { name: "Close opening preview" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Include my opening line on the card/ }));
  expect(card).toHaveTextContent("You make life beautiful.");
});

it("offers four independently optional fields, reorders them live, and permits a logo-only card", () => {
  function Harness() {
    const [p, setP] = useState({
      ...newProject(), recipientName: "Hannah", openingMessage: "You are loved.", engraveOpeningMessage: true,
      cardEngraving: ["HANNAH", "FROM ALEX", "2026"],
    });
    return <KeepOpeningPersonalization project={p} onUpdate={values => setP(old => ({ ...old, ...values }))} />;
  }
  render(<Harness />);
  const group = screen.getByRole("group", { name: "Engraving fields in card order" });
  const inputOrder = () => within(group).getAllByRole("textbox").map(input => input.getAttribute("aria-label"));
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(inputOrder()).toEqual(["Title", "To", "From", "Date"]);
  expect(within(group).getByRole("textbox", { name: "Title" })).toHaveValue("");
  expect(within(group).getByRole("textbox", { name: "To" })).toHaveValue("HANNAH");
  fireEvent.change(within(group).getByRole("textbox", { name: "Title" }), { target: { value: "Happy Birthday" } });
  fireEvent.click(within(group).getByRole("button", { name: "Move Date up" }));
  fireEvent.click(within(group).getByRole("button", { name: "Move Date up" }));
  fireEvent.click(within(group).getByRole("button", { name: "Move Date up" }));
  expect(inputOrder()).toEqual(["Date", "Title", "To", "From"]);
  expect(within(group).getByRole("button", { name: "Move Date up" })).toBeDisabled();
  expect(within(group).getByRole("button", { name: "Move From down" })).toBeDisabled();
  expect(card.textContent).toMatch(/2026.*HAPPY BIRTHDAY.*HANNAH.*FROM ALEX/);
  expect(card).toHaveTextContent("You are loved.");
  fireEvent.click(screen.getByRole("checkbox", { name: /Include my opening line on the card/ }));
  expect(card.textContent).toBe("2026 • HAPPY BIRTHDAY • HANNAH • FROM ALEX");
  for (const input of within(group).getAllByRole("textbox")) {
    expect(input).not.toBeRequired();
    fireEvent.change(input, { target: { value: "" } });
  }
  expect(card.textContent).toBe("");
  expect(within(card).getByRole("img", { name: "Keep" })).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox", { name: /Include my opening line on the card/ }));
  expect(card.textContent).toBe("You are loved.");
});
