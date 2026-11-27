import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KeepEngravingOffer } from "@/components/keep-engraving-offer";

describe("completion engraving offer", () => {
  it("requires upgrading to Signature for engraving", () => {
    const select=vi.fn(), upgrade=vi.fn();
    render(<KeepEngravingOffer open onOpenChange={vi.fn()} onSelect={select} onUpgradeToSignature={upgrade} />);
    expect(screen.getByRole("dialog", {name:"Make it unmistakably theirs."})).toBeVisible();
    expect(screen.queryByText("$19.00")).toBeNull();
    expect(screen.getByText("$20.00")).toBeVisible();
    expect(select).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", {name:/Add engraving to Basic/})).toBeNull();
    fireEvent.click(screen.getByRole("button", {name:"Upgrade to Signature · $99"}));
    expect(upgrade).toHaveBeenCalledOnce();
    expect(select).not.toHaveBeenCalled();
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
