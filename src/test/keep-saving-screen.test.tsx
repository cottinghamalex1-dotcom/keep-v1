import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { KeepSavingScreen } from "@/components/keep-saving-screen";

vi.mock("@/lib/keep-render-client", () => ({
  beginKeepRender: vi.fn(),
  refreshKeepRender: vi.fn(),
  retryKeepRender: vi.fn(),
}));

afterEach(cleanup);

describe("finishing a Keep", () => {
  const props = {
    musicMood: "Warm + Nostalgic",
    musicMuted: false,
    publishing: true,
    publishMessage: "Saving memories 2 of 4…",
    onReady: vi.fn(),
    onRetryPublish: vi.fn(),
    onBack: vi.fn(),
  };
  it("shows a fullscreen saving page with a percentage, not the card page or supplier terms", () => {
    render(<KeepSavingScreen {...props} />);
    expect(screen.getByRole("dialog", { name: "Saving your Keep" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Keep saving progress" })).toHaveAttribute("aria-valuenow", "21");
    expect(screen.getByText("21%")).toBeInTheDocument();
    expect(screen.queryByText(/Shotstack|preprocessing|render status/i)).toBeNull();
    expect(screen.queryByText(/Give it somewhere to live/i)).toBeNull();
    expect(screen.queryByText(/Your Keep is ready/i)).toBeNull();
  });
  it("does not show an unverified 100 percent when publishing failed", () => {
    render(<KeepSavingScreen {...props} publishing={false} publishError="A source file could not upload." />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "38");
    expect(screen.getByRole("button", { name: "Try saving again" })).toBeInTheDocument();
    expect(screen.getByText("A source file could not upload.")).toBeInTheDocument();
  });
});
