import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KeepEngravingOffer } from "@/components/keep-engraving-offer";

describe("completion engraving offer", () => {
  it("requires explicit acceptance and presents both prices", () => {
    const select=vi.fn();
    render(<KeepEngravingOffer open onOpenChange={vi.fn()} onSelect={select} />);
    expect(screen.getByRole("dialog", {name:"Make it unmistakably theirs."})).toBeVisible();
    expect(screen.getByText("$9.00")).toBeVisible();
    expect(screen.getByText("$20.00")).toBeVisible();
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name:"Yes, personalize my card · $9"}));
    expect(select).toHaveBeenCalledExactlyOnceWith(true);
  });
  it("lets the creator decline without selecting engraving", () => {
    const select=vi.fn();
    render(<KeepEngravingOffer open onOpenChange={vi.fn()} onSelect={select} />);
    fireEvent.click(screen.getByRole("button", {name:"No thanks, keep it classic"}));
    expect(select).toHaveBeenCalledExactlyOnceWith(false);
  });
  it("dismisses with Escape without changing an existing selection", () => {
    const change=vi.fn(),select=vi.fn();
    render(<KeepEngravingOffer open onOpenChange={change} onSelect={select} />);
    fireEvent.keyDown(screen.getByRole("dialog"), {key:"Escape"});
    expect(change).toHaveBeenCalledWith(false);
    expect(select).not.toHaveBeenCalled();
  });
});
