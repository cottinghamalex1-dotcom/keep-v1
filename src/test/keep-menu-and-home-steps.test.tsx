import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, isRedirect, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { Route as LegacyShopRoute } from "@/routes/shop";
import { KeepPurchase } from "@/components/keep-purchase";
import { KeepCreateCTA } from "@/components/keep-create-cta";

async function openMenu(path: string) {
  localStorage.removeItem("keep-app-session");
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    isServer: false,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  render(<RouterProvider router={router} />, { container: document });
  const menu = await screen.findByRole("button", { name: "Open navigation menu" });
  fireEvent.click(menu);
  await waitFor(() => expect(screen.getByText("See all my Keeps")).toBeTruthy());
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.removeItem("keep-app-session");
});

describe("Consistent Keep navigation", () => {
  it("permanently redirects the old app storefront to the official Keep website", () => {
    const beforeLoad = LegacyShopRoute.options.beforeLoad!;
    let result: unknown;
    try { beforeLoad({} as Parameters<typeof beforeLoad>[0]); } catch (error) { result = error; }
    expect(isRedirect(result)).toBe(true);
    if (isRedirect(result)) {
      expect(result.options.href).toBe("https://keep-official-review-nov9.candypesto.chatgpt.site/shop");
      expect(result.options.statusCode).toBe(301);
    }
    expect(LegacyShopRoute.options.component).toBeUndefined();
  });
  it("closes the creator menu and restores page scrolling", async () => {
    await openMenu("/app");
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Close app menu" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Keep app navigation" })).toBeNull());
    expect(document.body.style.overflow).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(screen.getByRole("dialog", { name: "Keep app navigation" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Keep app navigation" })).toBeNull());
  });
  it("presents the current launch packages only in the saved Keep purchase flow", () => {
    sessionStorage.clear();
    render(<KeepPurchase keep={{
      id: "saved-keep", recipient_name: "Mom", recipient_token: "saved-link",
      published_project: { musicMood: "Intentional", voiceMode: "solo" },
    }} />);
    const basic = screen.getByRole("button", { name: /Basic Keep/ });
    const signature = screen.getByRole("button", { name: /Signature Keep/ });
    expect(basic).toHaveTextContent("$79");
    expect(basic).toHaveTextContent("1 voice");
    expect(signature).toHaveTextContent("$99");
    expect(signature).toHaveTextContent("2 voices");
    expect(signature).toHaveTextContent("Engraving included");
    fireEvent.click(signature);
    expect(signature).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("$94")).toBeNull();
    expect(screen.getByRole("button", { name: "Checkout opening soon" })).toBeDisabled();
  });
  it("removes the three unwanted links from the dashboard menu", async () => {
    await openMenu("/app");
    expect(screen.queryByText("Keeps given")).toBeNull();
    expect(screen.queryByText("Keeps received")).toBeNull();
    expect(screen.queryByText("What is Keep?")).toBeNull();
    expect(screen.getByText("See all my Keeps")).toBeTruthy();
    expect(screen.getByText("Account")).toBeTruthy();
  });
  it("removes old menu entries from My Keeps and other shared-menu pages", async () => {
    await openMenu("/my-keeps");
    expect(screen.queryByText("Keeps given")).toBeNull();
    expect(screen.queryByText("Keeps received")).toBeNull();
    expect(screen.queryByText("What is Keep?")).toBeNull();
    expect(screen.getByText("See all my Keeps")).toBeTruthy();
  });
  it("gives the home hero one clearly labeled, premium creation action", () => {
    const { container } = render(<KeepCreateCTA />);
    const link = screen.getByRole("link", { name: "Create a Keep — start your story" });
    expect(link.getAttribute("href")).toBe("/?create=1");
    expect(screen.getByText("Create a Keep")).toBeTruthy();
    expect(screen.getByText("Your story begins here.")).toBeTruthy();
    expect(container.querySelector("ol")).toBeNull();
    expect(screen.queryByText("Thoughtfully made, deeply felt")).toBeNull();
  });
});
