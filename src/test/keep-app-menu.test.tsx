import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepAppMenu } from "@/components/keep-app-menu";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.style.overflow = "";
});

describe("Keep creator app navigation", () => {
  it("shows the compact dashboard choices rather than the public storefront links", () => {
    render(<KeepAppMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    expect(screen.getByRole("dialog", { name: "Keep app navigation" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Keep app menu" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/app");
    expect(screen.getByRole("button", { name: "My Keeps" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("link", { name: "+ Create a new Keep" }).getAttribute("href")).toBe("/?create=1");
    expect(screen.getByRole("link", { name: "See all my Keeps" }).getAttribute("href")).toBe("/my-keeps");
    expect(screen.getByRole("link", { name: "Account" }).getAttribute("href")).toBe("/app#account");
    expect(screen.getByRole("link", { name: "Help & Support" }).getAttribute("href")).toBe("mailto:support@keep.com");

    expect(screen.queryByText("Shop Basic Keep")).toBeNull();
    expect(screen.queryByText("Shop Signature Keep")).toBeNull();
    expect(screen.queryByText("Explore Keep packages")).toBeNull();
    expect(screen.queryByText("The experience")).toBeNull();
  });

  it("supports the submenu, Escape and closing without leaving the creator flow", () => {
    render(<KeepAppMenu />);
    const trigger = screen.getByRole("button", { name: "Open navigation menu" });
    fireEvent.click(trigger);
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByRole("button", { name: "My Keeps" }));
    expect(screen.queryByRole("link", { name: "See all my Keeps" })).toBeNull();
    expect(screen.getByRole("button", { name: "My Keeps" }).getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "My Keeps" }));
    expect(screen.getByRole("link", { name: "See all my Keeps" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Keep app navigation" })).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("uses in-app dashboard navigation callbacks without full-page reloads", () => {
    const home = vi.fn(), account = vi.fn();
    render(<KeepAppMenu onHome={home} onAccount={account} />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    fireEvent.click(screen.getByRole("link", { name: "Account" }));
    expect(account).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "Keep app navigation" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    fireEvent.click(screen.getByRole("link", { name: "Home" }));
    expect(home).toHaveBeenCalledTimes(1);
  });
});
