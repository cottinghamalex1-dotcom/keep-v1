import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
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
  it("uses one hamburger menu for every shop navigation link and returning-customer login", async () => {
    await openMenu("/shop");
    expect(screen.getByRole("navigation", { name: "Keep menu" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Log in / Continue editing" }).getAttribute("href")).toBe("/app");
    expect(screen.getByRole("link", { name: "The experience" }).getAttribute("href")).toBe("/shop#experience");
    expect(screen.getByRole("link", { name: "How it works" }).getAttribute("href")).toBe("/shop#how-it-works");
    expect(screen.getAllByRole("link", { name: "Packages" }).some(el => el.getAttribute("href") === "/shop#packages")).toBe(true);
    expect(screen.getAllByRole("link", { name: "Our story" }).length).toBeGreaterThan(0);
    expect(document.querySelector('nav[aria-label="Shop navigation"]')).toBeNull();
    expect(screen.queryByText("SOME THINGS ARE WORTH KEEPING")).toBeNull();
  });
  it("shows the updated savings and package inclusions", async () => {
    const router = createRouter({
      routeTree,
      isServer: false,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: ["/shop"] }),
    });
    await router.load();
    render(<RouterProvider router={router} />, { container: document });
    expect(screen.getByText("$94")).toBeTruthy();
    expect(screen.getByText("Save $15")).toBeTruthy();
    expect(screen.getByText("Save $30")).toBeTruthy();
    expect(screen.getByText(/1 card included · No Personalized Engraving/i)).toBeTruthy();
    expect(screen.getByText(/1 card included · Personalized Engraving Included/i)).toBeTruthy();
    expect(screen.getByText("One beautiful Keep, your words engraved, and more:")).toBeTruthy();
    expect(screen.getByText("Two voices included (only 1 is needed)")).toBeTruthy();
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
