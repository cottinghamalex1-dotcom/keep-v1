import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteOwnedKeep, keepDeleteConfirmation } from "@/lib/keep-delete";

const id = "00000000-0000-4000-8000-000000000002";
beforeEach(() => { vi.restoreAllMocks(); });

describe("Keep deletion", () => {
  it("sends an authenticated, narrowly scoped deletion request and verifies the ID", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      deleted: true, keepId: id, mediaCleanupPending: false,
    }), { status: 200 }));
    vi.stubGlobal("fetch", request);
    const result = await deleteOwnedKeep(id, "example-token");
    expect(result).toEqual({ deleted: true, keepId: id, mediaCleanupPending: false });
    expect(request).toHaveBeenCalledTimes(1);
    const [url, options] = request.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/functions\/v1\/keep-delete$/);
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({ Authorization: "Bearer example-token" });
    expect(JSON.parse(String(options.body))).toEqual({ keepId: id });
  });
  it("refuses to claim success if the server did not delete the requested Keep", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      deleted: true, keepId: "another-keep",
    }))));
    await expect(deleteOwnedKeep(id, "token")).rejects.toThrow("could not be confirmed");
  });
  it("surfaces permission errors without removing anything from the dashboard", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: "This Keep was not found in your account.",
    }), { status: 404 })));
    await expect(deleteOwnedKeep(id, "token")).rejects.toThrow("not found in your account");
  });
  it("warns that published viewing links and linked NFC cards stop working", () => {
    const message = keepDeleteConfirmation("Gigi and Pops", true, true);
    expect(message).toContain("Gigi and Pops");
    expect(message).toContain("viewing link will stop working");
    expect(message).toContain("NFC card");
    expect(message).toContain("cannot be undone");
    expect(keepDeleteConfirmation("Someone", false, false)).toContain("draft cannot be restored");
  });
});
