import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepWritingStep } from "@/components/keep-writing-step";
import { useState } from "react";

afterEach(cleanup);

const actions = () => ({
  onSpeak: vi.fn(),
  onType: vi.fn(),
  onUpload: vi.fn(),
  onTextChange: vi.fn(),
  onClear: vi.fn(),
  onContinue: vi.fn(),
});

describe("Keep's own-words writing step", () => {
  it("keeps all entry methods accessible and marks the selected method", () => {
    const handlers = actions();
    render(
      <KeepWritingStep
        {...handlers}
        text=""
        mode="type"
        dictating={false}
        busy={false}
        uploadedName=""
      />,
    );
    expect(screen.getByRole("button", { name: "Type" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Speak" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: "Speak" }));
    fireEvent.click(screen.getByRole("button", { name: "Type" }));
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(handlers.onSpeak).toHaveBeenCalledOnce();
    expect(handlers.onType).toHaveBeenCalledOnce();
    expect(handlers.onUpload).toHaveBeenCalledOnce();
  });

  it("updates the writing estimate and only allows continuing with nonblank words", () => {
    const handlers = actions();
    function Harness() {
      const [text, setText] = useState("");
      return (
        <KeepWritingStep
          {...handlers}
          text={text}
          mode="type"
          dictating={false}
          busy={false}
          uploadedName=""
          onTextChange={setText}
          onClear={() => setText("")}
        />
      );
    }
    render(<Harness />);
    const next = screen.getByRole<HTMLButtonElement>("button", { name: "Continue" });
    expect(next.disabled).toBe(true);
    expect(screen.getByText(/0 words.*0:00/)).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Your message" }), {
      target: { value: "   " },
    });
    expect(next.disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Your message" }), {
      target: { value: Array(450).fill("love").join(" ") },
    });
    expect(screen.getByText(/450 words.*2:18/)).toBeTruthy();
    expect(screen.getByText(/Right in the sweet spot/)).toBeTruthy();
    expect(next.disabled).toBe(false);
    fireEvent.click(next);
    expect(handlers.onContinue).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(next.disabled).toBe(true);
  });

  it("shows listening and stop states and preserves document replacement", () => {
    const handlers = actions();
    const props = { ...handlers, text: "Thank you", busy: false, uploadedName: "" };
    const { rerender } = render(<KeepWritingStep {...props} mode="speak" dictating />);
    expect(screen.getByRole("status").textContent).toContain("Listening");
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(handlers.onSpeak).toHaveBeenCalledOnce();
    rerender(
      <KeepWritingStep {...props} mode="upload" dictating={false} uploadedName="letter.pdf" />,
    );
    expect(screen.getByText("letter.pdf")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Replace" }));
    expect(handlers.onUpload).toHaveBeenCalledOnce();
    rerender(
      <KeepWritingStep {...props} mode="upload" dictating={false} uploadedName="letter.pdf" busy />,
    );
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Reading…" }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Replace" }).disabled).toBe(true);
  });
});
