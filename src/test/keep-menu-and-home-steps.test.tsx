import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { KeepCreationSteps } from "@/components/keep-creation-steps";

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
  it("keeps the home journey elegant, numbered and accessible", () => {
    const { container } = render(<KeepCreationSteps />);
    expect(screen.getByRole("region", { name: "Create a Keep in three steps" })).toBeTruthy();
    expect(screen.getByText("Thoughtfully made, deeply felt")).toBeTruthy();
    expect([...container.querySelectorAll("ol li")]).toHaveLength(3);
    expect(screen.getByText("Your words")).toBeTruthy();
    expect(screen.getByText("Your moments")).toBeTruthy();
    expect(screen.getByText("Their Keep")).toBeTruthy();
  });
});
