import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AR_TARGET_MIN_BYTES,
  checkArTargetAvailable,
  isValidMindTargetBuffer,
  loadArTargetBuffer,
} from "./checkArTargetAvailable";
import { createValidMindFixture } from "./mindTargetFixture";

function mockFetchResponse({
  ok = true,
  status = 200,
  contentType = "application/octet-stream",
  body,
}) {
  return {
    ok,
    status,
    headers: {
      get: (name) => (name.toLowerCase() === "content-type" ? contentType : null),
    },
    arrayBuffer: async () => body,
  };
}

describe("checkArTargetAvailable / loadArTargetBuffer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns unavailable for 404 HTML", async () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><html><body>Not Found</body></html>");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          ok: false,
          status: 404,
          contentType: "text/html; charset=utf-8",
          body: html.buffer,
        }),
      ),
    );

    await expect(checkArTargetAvailable("./ar/targets/cv-page-1.mind")).resolves.toBe(false);
    await expect(loadArTargetBuffer("./ar/targets/cv-page-1.mind")).resolves.toBeNull();
  });

  it("returns unavailable for 200 HTML", async () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><html><body>oops</body></html>");
    // Pad so size alone would pass a naive byte-length check.
    const padded = new Uint8Array(AR_TARGET_MIN_BYTES + 32);
    padded.set(html, 0);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          ok: true,
          contentType: "text/html",
          body: padded.buffer,
        }),
      ),
    );

    await expect(checkArTargetAvailable("./ar/targets/cv-page-1.mind")).resolves.toBe(false);
  });

  it("returns unavailable for empty response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          ok: true,
          body: new ArrayBuffer(0),
        }),
      ),
    );

    await expect(checkArTargetAvailable("./ar/targets/cv-page-1.mind")).resolves.toBe(false);
  });

  it("returns unavailable when HTML signature is present even with octet-stream type", async () => {
    const html = "<!DOCTYPE html><html><head></head><body>GitHub Pages 404</body></html>";
    const bytes = new TextEncoder().encode(html.padEnd(AR_TARGET_MIN_BYTES + 8, " "));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          ok: true,
          contentType: "application/octet-stream",
          body: bytes.buffer,
        }),
      ),
    );

    await expect(checkArTargetAvailable("./ar/targets/cv-page-1.mind")).resolves.toBe(false);
    expect(isValidMindTargetBuffer(bytes.buffer)).toBe(false);
  });

  it("returns available for a valid .mind fixture", async () => {
    const fixture = createValidMindFixture();
    expect(isValidMindTargetBuffer(fixture)).toBe(true);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockFetchResponse({
          ok: true,
          body: fixture,
        }),
      ),
    );

    await expect(checkArTargetAvailable("./ar/targets/cv-page-1.mind")).resolves.toBe(true);
    const loaded = await loadArTargetBuffer("./ar/targets/cv-page-1.mind");
    expect(loaded).toBeInstanceOf(ArrayBuffer);
    expect(loaded.byteLength).toBeGreaterThanOrEqual(AR_TARGET_MIN_BYTES);
  });

  it("returns unavailable when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    await expect(checkArTargetAvailable("./ar/targets/cv-page-1.mind")).resolves.toBe(false);
  });
});
