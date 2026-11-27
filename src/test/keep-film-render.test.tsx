import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeepFilmRender } from "@/components/keep-film-render";

vi.mock("@/lib/keep-cloud", () => ({
  activeKeepSession: async () => ({ access_token: "test-token" }),
}));

const response = (data: unknown) => new Response(JSON.stringify(data));
const renderFilm = () => render(<KeepFilmRender keepId="test-keep" musicMood="Intentional" />);
const flush = async () => { await act(async () => {}); };

describe("finished Keep film recovery", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not offer another render until the current job status is confirmed", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response({status: "rendering", providerStatus: "rendering"}));
    vi.stubGlobal("fetch", fetchMock);
    renderFilm();
    await flush();
    expect(screen.queryByRole("button", {name: "Render my 1080p film"})).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't check the saved film");
    fireEvent.click(screen.getByRole("button", {name: "Check film status"}));
    await flush();
    expect(screen.getByRole("status")).toHaveTextContent("Preparing your finished MP4");
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).action)).toEqual(["status", "status"]);
  });

  it("recovers after a temporary polling failure without another render request", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({status: "rendering", providerStatus: "rendering"}))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response({status: "ready", videoUrl: "https://example.com/private-film.mp4"}));
    vi.stubGlobal("fetch", fetchMock);
    renderFilm();
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(7000); });
    expect(screen.getByRole("alert")).toHaveTextContent("automatically");
    await act(async () => { await vi.advanceTimersByTimeAsync(14000); });
    expect(screen.getByLabelText("Completed, seekable Keep film")).toHaveAttribute("src", "https://example.com/private-film.mp4");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).action)).toEqual(["status", "status", "status"]);
  });

  it("exposes a render button only after the service reports not_started", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({status: "not_started"}));
    vi.stubGlobal("fetch", fetchMock);
    renderFilm();
    expect(screen.getByRole("button", {name: "Checking saved film…"})).toBeDisabled();
    await flush();
    expect(screen.getByRole("button", {name: "Render my 1080p film"})).toBeEnabled();
  });
  it("offers a new render, not a saving recovery, when submission was rejected", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({
      status:"failed", id:"failed-job", hasProviderRender:false, error:"Could not submit the film."
    }));
    vi.stubGlobal("fetch",fetchMock);
    renderFilm();
    await flush();
    expect(screen.getByRole("button",{name:"Render again"})).toBeEnabled();
    expect(screen.queryByRole("button",{name:"Retry saving existing MP4"})).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not submit the film");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("retains the nonbillable recovery option for a job with a provider render", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({
      status:"failed", id:"saved-job", hasProviderRender:true, error:"Could not save the completed film."
    }));
    vi.stubGlobal("fetch",fetchMock);
    renderFilm();
    await flush();
    expect(screen.getByRole("button",{name:"Retry saving existing MP4"})).toBeEnabled();
    expect(screen.getByRole("button",{name:"Render again"})).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

});
