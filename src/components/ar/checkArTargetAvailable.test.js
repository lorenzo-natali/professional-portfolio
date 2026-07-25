import { afterEach, describe, expect, it, vi } from "vitest";
import { checkArTargetAvailable } from "./checkArTargetAvailable";

describe("checkArTargetAvailable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns true when the .mind target responds with enough bytes", async () => {
    const bytes = new Uint8Array(128).buffer;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => bytes,
      }),
    );

    await expect(checkArTargetAvailable("./ar/targets/cv-page-1.mind")).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith("./ar/targets/cv-page-1.mind", {
      method: "GET",
      cache: "no-store",
    });
  });

  it("returns false when the target is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        arrayBuffer: async () => new ArrayBuffer(0),
      }),
    );

    await expect(checkArTargetAvailable("./ar/targets/cv-page-1.mind")).resolves.toBe(false);
  });

  it("returns false when the response is too small to be a real target", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new Uint8Array(16).buffer,
      }),
    );

    await expect(checkArTargetAvailable("./ar/targets/cv-page-1.mind")).resolves.toBe(false);
  });

  it("returns false when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(checkArTargetAvailable("./ar/targets/cv-page-1.mind")).resolves.toBe(false);
  });
});
