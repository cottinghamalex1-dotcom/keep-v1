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

it("offers a premium Listen & Read mode with the full transcript and no photos", () => {
  const props = {
    name: "Andi", from: "Dad & Mom", year: "2026",
    creatorPreview: true, persistVisit: false,
    messageParagraphs: ["We remember that day.", "You are deeply loved."],
    media: [{ url: "/memory.jpg", kind: "image" as const }],
  };
  render(<KeepRecipientExperience {...props} initialExperience="listen" />);
  expect(screen.getByText("We remember that day.")).toBeTruthy();
  expect(screen.getByText("You are deeply loved.")).toBeTruthy();
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
