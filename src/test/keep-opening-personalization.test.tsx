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
  expect(screen.getByText(/Basic can add it at checkout/)).toBeTruthy();
});
