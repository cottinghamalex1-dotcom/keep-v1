import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KeepLoadingScreen } from "@/components/keep-loading-screen";
import { KeepOpeningScreen } from "@/components/keep-opening-screen";
import { getKeepEntryIntent } from "@/lib/keep-entry-intent";

afterEach(cleanup);

describe("loading screens show the correct context", () => {
  it("uses a neutral message for Home, My Keeps and account loading", () => {
    render(<KeepLoadingScreen />);
    expect(screen.getByRole("status", { name: "Opening Keep" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Opening Keep." })).toBeInTheDocument();
    expect(screen.queryByText(/getting your Keep ready|your words and memories/i)).toBeNull();
  });
  it("shows Keep-specific language only when opening an actual recipient film", () => {
    render(<KeepLoadingScreen context="keep" />);
    expect(screen.getByRole("status", { name: "Getting your Keep ready" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Getting your Keep ready." })).toBeInTheDocument();
  });
  it("retains detailed restoration progress only in a personal Keep editor", () => {
    render(<KeepOpeningScreen phase="media"
      progress={{ completed: 2, total: 4, kind: "media" }} onBack={() => {}} />);
    expect(screen.getByText("Getting your Keep ready.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Restoring your Keep" })).toHaveAttribute("aria-valuenow", "50");
  });
});

describe("the main entry point", () => {
  it("goes directly to dashboard for general navigation rather than restoring a draft", () => {
    expect(getKeepEntryIntent("").redirectToDashboard).toBe(true);
    expect(getKeepEntryIntent("?utm_source=instagram").redirectToDashboard).toBe(true);
  });
  it("only restores a personal Keep for resume or edit URLs", () => {
    expect(getKeepEntryIntent("?resume=1")).toMatchObject({
      resumeRequested: true, createRequested: false, redirectToDashboard: false,
    });
    expect(getKeepEntryIntent("?edit=existing-keep")).toMatchObject({
      editId: "existing-keep", resumeRequested: true, redirectToDashboard: false,
    });
    expect(getKeepEntryIntent("?create=1")).toMatchObject({
      createRequested: true, resumeRequested: false, redirectToDashboard: false,
    });
  });
});
