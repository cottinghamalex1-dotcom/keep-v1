import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { KeepOpeningPersonalization } from "@/components/keep-opening-personalization";
import { newProject } from "@/lib/keep-project";
import { fetchOpeningSuggestions } from "@/lib/keep-ai";
vi.mock("@/lib/keep-ai", () => ({ fetchOpeningSuggestions: vi.fn() }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("offers three transcript-specific choices, mirrors the selected inscription and permits no opening", async () => {
  const options = [
    "The everyday things you do are the things we cherish most.",
    "We hope you always feel the love we share with you.",
    "Our favorite days are the ordinary ones we spend with you.",
  ];
  vi.mocked(fetchOpeningSuggestions).mockResolvedValue(options);
  function Harness() {
    const [p, setP] = useState({ ...newProject(), recipientName: "Andi", occasion: "Birthday",
      messageParagraphs: ["The everyday moments with you are always the ones we cherish most."] });
    return <KeepOpeningPersonalization project={p} onUpdate={values => setP(old => ({ ...old, ...values }))} onPreview={() => {}} />;
  }
  render(<Harness />);
  await waitFor(() => expect(screen.getByText(options[2]!)).toBeTruthy());
  expect(fetchOpeningSuggestions).toHaveBeenCalledWith("Andi", "Birthday", ["The everyday moments with you are always the ones we cherish most."]);
  const second = screen.getByText(options[1]!);
  fireEvent.click(second);
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(card.textContent).toContain(options[1]);
  fireEvent.click(screen.getByRole("button", { name: /No opening message/ }));
  expect(card.textContent).not.toContain(options[1]);
});
