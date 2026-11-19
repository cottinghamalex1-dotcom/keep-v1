import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KeepEngravingOffer } from "@/components/keep-engraving-offer";

describe("completion engraving offer", () => {
  it("requires explicit acceptance at the approved $19 price", () => {
    const select=vi.fn();
    render(<KeepEngravingOffer open onOpenChange={vi.fn()} onSelect={select} />);
    expect(screen.getByRole("dialog", {name:"Make it unmistakably theirs."})).toBeVisible();
    expect(screen.getByText("$19.00")).toBeVisible();
    expect(screen.queryByText("$20.00")).toBeNull();
    expect(select).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name:"Add engraving to Basic · $19"}));
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
