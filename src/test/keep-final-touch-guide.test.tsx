import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { KeepFinalTouchGuide } from "@/components/keep-final-touch-guide";

afterEach(cleanup);
it("automatically explains both written film moments with examples, then dismisses",()=>{
  render(<KeepFinalTouchGuide recipientName="Diane" />);
  const dialog=screen.getByRole("dialog",{name:"The first and last words."});
  expect(within(dialog).getByText("Diane")).toBeTruthy();
  expect(within(dialog).getByText(/01 · Opening line/)).toBeTruthy();
  expect(within(dialog).getByText(/02 · Closing line/)).toBeTruthy();
  expect(within(dialog).getByText(/no recording needed/)).toBeTruthy();
  fireEvent.click(within(dialog).getByRole("button",{name:/add the final words/i}));
  expect(screen.queryByRole("dialog")).toBeNull();
});
