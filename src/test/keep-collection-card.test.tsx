import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KeepCollectionCard } from "@/components/keep-collection-card";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("matches the premium creation CTA and opens the Given Keeps section", () => {
  const onClick = vi.fn();
  render(<KeepCollectionCard kind="given" count={3} onClick={onClick} />);
  const button = screen.getByRole("button", { name: "View given keeps: 3" });
  expect(button.className).toContain("keep-home-create-cta");
  expect(screen.getByText("Shared by you")).toBeTruthy();
  expect(screen.getByText("Given Keeps")).toBeTruthy();
  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledOnce();
});

it("shows the received total in the same design without changing navigation", () => {
  const onClick = vi.fn();
  render(<KeepCollectionCard kind="received" count={0} onClick={onClick} />);
  const button = screen.getByRole("button", { name: "View received keeps: 0" });
  expect(button.className).toContain("keep-home-create-cta");
  expect(screen.getByText("Shared with you")).toBeTruthy();
  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledOnce();
});
