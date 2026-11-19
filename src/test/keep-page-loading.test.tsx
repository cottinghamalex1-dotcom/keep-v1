import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeepPageLoading } from "@/components/keep-page-loading";

describe("Context-specific loading copy", () => {
  it("defaults to general navigation rather than saying a Keep is being prepared", () => {
    render(<KeepPageLoading />);
    expect(screen.getByRole("status").textContent).toContain("Opening your space");
    expect(screen.queryByText(/Getting your Keep ready/i)).toBeNull();
  });
  it("can describe loading a particular area", () => {
    render(<KeepPageLoading message="Opening your account…" />);
    expect(screen.getByRole("status").textContent).toContain("Opening your account");
  });
});
