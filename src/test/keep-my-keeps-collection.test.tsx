import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepMyKeepsCollection } from "@/components/keep-my-keeps-collection";
import type { KeepLibraryItem } from "@/components/keep-library-card";

const published: KeepLibraryItem = {
  id: "mom", recipient_name: "Mom", occasion: "Milestone", status: "ready",
  recipient_token: "recipient-mom-token", published_at: "2026-11-11", created_at: "2026-11-11",
  published_project: { openingMessage: "Thank you for all the ways you love our family." },
};
const unfinished: KeepLibraryItem = {
  id: "new", recipient_name: null, occasion: "Anniversary", status: "draft",
  recipient_token: "", published_at: null, created_at: "2026-11-14",
};
const actions = () => ({ onToggle: vi.fn(), onCopy: vi.fn(), onDelete: vi.fn() });
const props = (cb: ReturnType<typeof actions>, override: Partial<Parameters<typeof KeepMyKeepsCollection>[0]> = {}) => ({
  keeps: [published, unfinished], thumbnails: { mom: "/mom-cover.jpg" },
  expandedId: null, copiedId: null, deletingId: null, ...cb, ...override,
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Your Keeps editorial collection", () => {
  it("matches the premium archive header with accurate creation counts", () => {
    render(<KeepMyKeepsCollection {...props(actions())} />);
    expect(screen.getByRole("heading", { name: /The stories you’ve kept/i })).toBeInTheDocument();
    expect(screen.getByText("2", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("2 Keeps")).not.toBeInTheDocument();
    expect(screen.getByText("1 ready to share")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create a Keep/i })).toHaveAttribute("href", "/?create=1");
  });

  it("shows full recipient names without truncation and uses the actual cover image", () => {
    const longName: KeepLibraryItem = { ...published, id: "long", recipient_name: "Our wonderful lifelong friends and family" };
    const { container } = render(<KeepMyKeepsCollection {...props(actions(), {
      keeps: [longName], thumbnails: { long: "/real-cover.jpg" },
    })} />);
    expect(screen.getByText("Our wonderful lifelong friends and family")).toBeInTheDocument();
    const title = screen.getByText("Our wonderful lifelong friends and family");
    expect(title).not.toHaveClass("truncate");
    expect(title).toHaveClass("break-words");
    expect(screen.getByAltText("Cover photo for Our wonderful lifelong friends and family")).toHaveAttribute("src", "/real-cover.jpg");
    expect(container.querySelectorAll("article")).toHaveLength(1);
  });

  it("preserves action links, published viewing, copy and delete controls", () => {
    const cb = actions();
    const { rerender } = render(<KeepMyKeepsCollection {...props(cb)} />);
    fireEvent.click(screen.getByRole("button", { name: "Options for Mom" }));
    expect(cb.onToggle).toHaveBeenCalledWith("mom");
    rerender(<KeepMyKeepsCollection {...props(cb, { expandedId: "mom" })} />);
    const options = screen.getByRole("button", { name: "Options for Mom" }).closest("article")!;
    expect(within(options).getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/?edit=mom");
    const open = within(options).getByRole("link", { name: "View Keep" });
    expect(open.getAttribute("href")).toContain("recipient-mom-token");
    expect(open).toHaveAttribute("target", "_blank");
    fireEvent.click(within(options).getByRole("button", { name: "Copy link" }));
    expect(within(options).queryByRole("button", { name: /Delete this Keep/i })).not.toBeInTheDocument();
    expect(within(options).queryByRole("link", { name: /Film & card options/i })).not.toBeInTheDocument();
    fireEvent.click(within(options).getByRole("button", { name: "More" }));
    expect(within(options).getByRole("link", { name: /Film & card options/i })).toHaveAttribute("href", "/checkout?keep=mom");
    fireEvent.click(within(options).getByRole("button", { name: /Delete this Keep/i }));
    expect(cb.onCopy).toHaveBeenCalledWith(published);
    expect(cb.onDelete).toHaveBeenCalledWith(published);
    expect(within(options).getByText("Thank you for all the ways you love our family.")).toBeInTheDocument();
  });

  it("never offers an unpublished Keep's viewing link", () => {
    render(<KeepMyKeepsCollection {...props(actions(), { keeps: [unfinished], expandedId: "new" })} />);
    expect(screen.getByText("someone special")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continue editing/i })).toHaveAttribute("href", "/?edit=new");
    expect(screen.queryByRole("link", { name: "View Keep" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy link" })).not.toBeInTheDocument();
  });

  it("offers a premium empty state without claiming creations that do not exist", () => {
    render(<KeepMyKeepsCollection {...props(actions(), { keeps: [], thumbnails: {} })} />);
    expect(screen.getByRole("heading", { name: "Your first Keep starts here." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create your first Keep/i })).toHaveAttribute("href", "/?create=1");
    expect(screen.getByText("0", { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});
