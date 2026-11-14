import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { KeepCardFront } from "@/components/keep-card-front";
import { KeepRecipientExperience } from "@/components/keep-recipient-experience";
import { newProject } from "@/lib/keep-project";
import { publicationSettings } from "@/lib/keep-publish";

afterEach(cleanup);

it("shows a personal dedication on the metal card only when engraving is selected", () => {
  const engraving = ["ANDI", "FROM MOM & DAD", "2026"];
  const { rerender } = render(<KeepCardFront engraving={engraving} openingMessage="You make every ordinary day brighter." showOpeningMessage />);
  expect(screen.getByText("You make every ordinary day brighter.")).toBeTruthy();
  expect(screen.getByText(/FROM MOM/)).toBeTruthy();
  rerender(<KeepCardFront engraving={engraving} openingMessage="You make every ordinary day brighter." showOpeningMessage={false} />);
  expect(screen.queryByText("You make every ordinary day brighter.")).toBeNull();
  expect(screen.getByText("ANDI")).toBeTruthy();
});

it("persists the matching digital opening and card inscription with the published Keep", () => {
  const project = { ...newProject(), recipientName: "Andi", openingMessage: "You make every ordinary day brighter.", engraveOpeningMessage: true };
  const settings = publicationSettings(project);
  expect(settings.openingMessage).toBe(project.openingMessage);
  expect(settings.engraveOpeningMessage).toBe(true);
  expect(publicationSettings({ ...project, openingMessage: "", engraveOpeningMessage: false }).engraveOpeningMessage).toBe(false);
});

it("offers hands-free Listen & Read with centered timed words instead of a scrolled transcript", () => {
  const props = {
    name: "Andi", from: "Dad & Mom", year: "2026",
    creatorPreview: true, persistVisit: false,
    messageParagraphs: ["We remember that day.", "You are deeply loved."],
    media: [{ url: "/memory.jpg", kind: "image" as const }],
  };
  render(<KeepRecipientExperience {...props} initialExperience="listen" />);
  expect(screen.queryByText("We remember that day.")).toBeNull();
  expect(screen.getByText("Some words deserve to be heard.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Play narration" })).toBeTruthy();
  expect(screen.queryByAltText(/Memory/)).toBeNull();
});

it("Read shows only the message, and the viewer can return to all three new choices", () => {
  const props = {
    name: "Andi", from: "Dad & Mom", year: "2026",
    creatorPreview: true, persistVisit: false,
    messageParagraphs: ["We remember that day."],
    media: [{ url: "/memory.jpg", kind: "image" as const }],
  };
  const { container } = render(<KeepRecipientExperience {...props} initialExperience="read" />);
  expect(screen.getByText("We remember that day.")).toBeTruthy();
  expect(container.querySelector("video, .keep-read__photo")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Back to experiences" }));
  expect(screen.getByText("Watch, Listen & Read")).toBeTruthy();
  expect(screen.getByText("Listen & Read")).toBeTruthy();
  expect(screen.getByText("Read")).toBeTruthy();
});

it("opens a private, manually navigated photo gallery without creating a fourth experience", () => {
  const props = {
    name: "Mom", from: "Alex", year: "2026",
    creatorPreview: true, persistVisit: false,
    messageParagraphs: ["Thank you for every moment."],
    media: [
      { url: "/first.jpg", kind: "image" as const },
      { url: "/second.jpg", kind: "image" as const },
    ],
  };
  render(<KeepRecipientExperience {...props} initialExperience="read" />);
  fireEvent.click(screen.getByRole("button", { name: "Back to experiences" }));
  expect(screen.getByText("Watch, Listen & Read")).toBeTruthy();
  expect(screen.getByText("Listen & Read")).toBeTruthy();
  expect(screen.getByText("Read")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Want to linger on the photos & videos/ }));
  expect(screen.getByRole("dialog", { name: "Look through your memories" })).toBeTruthy();
  expect(screen.getByText("Moment 1 of 2")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Play background music" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Next memory" }));
  expect(screen.getByText("Moment 2 of 2")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close photo gallery" }));
  expect(screen.queryByRole("dialog", { name: "Look through your memories" })).toBeNull();
});
