import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepCardCollection, type CollectionCard } from "@/components/keep-card-collection";

const gift: CollectionCard = {
  id: "card-given", card_code: "NFC-8124", recipient_label: "For Hannah",
  status: "activated", creator_id: "owner", recipient_id: "hannah", keep_id: "keep-hannah",
};
const spare: CollectionCard = {
  id: "card-spare", card_code: "NFC-0073", recipient_label: null,
  status: "unassigned", creator_id: "owner", recipient_id: null, keep_id: null,
};
const keeps = [{ id: "keep-hannah", status: "ready", recipient_token: "valid-secret-token", published_at: "2026-11-14" }];
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("premium Given and Received collections", () => {
  it("shows a grounded Given collection with only account-linked physical cards", () => {
    const onBack = vi.fn();
    render(<KeepCardCollection kind="given" cards={[gift, spare]} keeps={keeps} onBack={onBack} />);
    expect(screen.getByRole("heading", { name: /The Keeps you’ve given/i })).toBeInTheDocument();
    expect(screen.getByText("2", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("2 Keeps")).toBeInTheDocument();
    expect(screen.getByText("For Hannah")).toBeInTheDocument();
    expect(screen.getByText("A thoughtful Keep")).toBeInTheDocument();
    expect(screen.getByText("Card ending 8124")).toBeInTheDocument();
    expect(screen.getByText("Card ending 0073")).toBeInTheDocument();
    expect(screen.getByText("Activated")).toBeInTheDocument();
    const openLink = screen.getByRole("link", { name: /View this Keep/i });
    expect(openLink).toHaveAttribute("target", "_blank");
    expect(openLink.getAttribute("href")).toContain("valid-secret-token");
    expect(screen.getByRole("link", { name: /See all my Keeps/i })).toHaveAttribute("href", "/my-keeps");
    fireEvent.click(screen.getByRole("button", { name: "Back to home" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("does not invent playback links for received cards without an accessible published Keep", () => {
    const incoming: CollectionCard = { ...gift, id: "received-1", creator_id: "another-person", recipient_id: "owner", keep_id: "their-private-keep", recipient_label: "For you", status: "registered" };
    render(<KeepCardCollection kind="received" cards={[incoming]} keeps={keeps} onBack={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /The Keeps you’ve received/i })).toBeInTheDocument();
    expect(screen.getByText("For you")).toBeInTheDocument();
    expect(screen.getByText("1", { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /View this Keep/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Tap the physical card with your phone/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /See all my Keeps/i })).not.toBeInTheDocument();
  });

  it("shows a useful empty state for Keeps Given without fake card entries", () => {
    render(<KeepCardCollection kind="given" cards={[]} keeps={[]} onBack={vi.fn()} />);
    expect(screen.getByText("A meaningful gift begins here.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create a Keep/i })).toHaveAttribute("href", "/?create=1");
    expect(screen.queryByText(/Card ending/)).not.toBeInTheDocument();
    expect(screen.getByText("0", { exact: true })).toBeInTheDocument();
  });

  it("uses a distinct received empty state and an actual back action", () => {
    const back = vi.fn();
    render(<KeepCardCollection kind="received" cards={[]} keeps={[]} onBack={back} />);
    expect(screen.getByText("Something special belongs here.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Create a Keep/i })).not.toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "Back to home" });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]!);
    expect(back).toHaveBeenCalledOnce();
  });

  it("never presents unpublished Keeps as playable", () => {
    render(<KeepCardCollection kind="given" cards={[gift]} keeps={[{ ...keeps[0]!, published_at: null }]} onBack={vi.fn()} />);
    expect(screen.queryByRole("link", { name: /View this Keep/i })).not.toBeInTheDocument();
    expect(within(screen.getByRole("article")).getByText(/Tap the physical card/i)).toBeInTheDocument();
  });
});
