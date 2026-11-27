import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { KeepEditorCardPreview } from "@/components/keep-editor-card-preview";
import { newProject } from "@/lib/keep-project";

afterEach(cleanup);

const project = {
  ...newProject(),
  recipientName: "Mom",
  publicationId: "draft-id",
  openingMessage: "You made every day special.",
  closingLine: "Love you always.",
  engraveOpeningMessage: true,
  cardEngraving: ["MOM", "FROM ALEX", "2026"],
};

it("only unlocks the editor card preview after final personalization has been successfully saved", () => {
  const view = render(<KeepEditorCardPreview project={project} />);
  expect(screen.queryByRole("button", { name: /Preview Keep Card/ })).toBeNull();
  view.rerender(<KeepEditorCardPreview project={{ ...project, publicationToken: "saved-link" }} />);
  expect(screen.getByRole("button", { name: /Preview Keep Card/ })).toBeTruthy();
});

it("opens the actual saved engraved card and returns to the editor preview choices", () => {
  render(<KeepEditorCardPreview project={{ ...project, publicationToken: "saved-link" }} />);
  const trigger = screen.getByRole("button", { name: /Preview Keep Card/ });
  expect(screen.queryByLabelText("Preview of the front of your Keep card")).toBeNull();
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Your Keep card." });
  const card = within(dialog).getByLabelText("Preview of the front of your Keep card");
  expect(within(card).getByRole("img", { name: "Keep" })).toBeTruthy();
  expect(card).toHaveTextContent("You made every day special.");
  expect(card).toHaveTextContent("MOM");
  expect(card).toHaveTextContent("FROM ALEX");
  expect(card).toHaveTextContent("2026");
  expect(card).not.toHaveTextContent("Love you always.");
  fireEvent.click(within(dialog).getByRole("button", { name: "Back to previews" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(trigger).toBeTruthy();
});

it("allows a finalized card without an opening inscription and keeps the engraving details", () => {
  render(<KeepEditorCardPreview project={{ ...project, publicationToken: "saved-link", engraveOpeningMessage: false }} />);
  fireEvent.click(screen.getByRole("button", { name: /Preview Keep Card/ }));
  const card = screen.getByLabelText("Preview of the front of your Keep card");
  expect(card).toHaveTextContent("MOM");
  expect(card).not.toHaveTextContent("You made every day special.");
});
