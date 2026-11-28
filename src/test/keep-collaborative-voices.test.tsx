import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeepCollaborativeVoices } from "@/components/keep-collaborative-voices";

afterEach(cleanup);

const speakers = [{ id: "a", name: "Alex" }, { id: "b", name: "Hannah" }];

describe("collaborative voice setup", () => {
  it("preserves names and the original in-person default, and allows switching modes", () => {
    const props = {
      contributors: speakers,
      onRename: vi.fn(),
      onAdd: vi.fn(),
      onRemove: vi.fn(),
      onLocationChange: vi.fn(),
    };
    const view = render(<KeepCollaborativeVoices {...props} />);
    expect(screen.getByRole("textbox", { name: "Voice 1 name" })).toHaveValue("Alex");
    expect(screen.getByRole("textbox", { name: "Voice 2 name" })).toHaveValue("Hannah");
    const together = screen.getByRole("button", { name: /Together here/ });
    const remote = screen.getByRole("button", { name: /From anywhere/ });
    expect(together).toHaveAttribute("aria-pressed", "true");
    expect(remote).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(remote);
    expect(props.onLocationChange).toHaveBeenCalledWith("remote");
    view.rerender(<KeepCollaborativeVoices {...props} location="remote" />);
    expect(remote).toHaveAttribute("aria-pressed", "true");
    expect(together).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/no need to invite yourself/)).toBeInTheDocument();
    fireEvent.click(together);
    expect(props.onLocationChange).toHaveBeenLastCalledWith("in_person");
  });

  it("keeps rename, add and remove actions, including the two-to-eight voice limits", () => {
    const props = {
      contributors: speakers,
      onRename: vi.fn(),
      onAdd: vi.fn(),
      onRemove: vi.fn(),
      onLocationChange: vi.fn(),
    };
    const view = render(<KeepCollaborativeVoices {...props} />);
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Voice 2 name" }), { target: { value: "Hannah C." } });
    expect(props.onRename).toHaveBeenCalledWith("b", "Hannah C.");
    fireEvent.click(screen.getByRole("button", { name: "Add another contributor" }));
    expect(props.onAdd).toHaveBeenCalledOnce();
    view.rerender(<KeepCollaborativeVoices {...props} contributors={[...speakers, { id: "c", name: "" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove voice 3" }));
    expect(props.onRemove).toHaveBeenCalledWith("c");
    view.rerender(<KeepCollaborativeVoices {...props} contributors={Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: "" }))} />);
    expect(screen.queryByRole("button", { name: "Add another contributor" })).not.toBeInTheDocument();
  });
});
