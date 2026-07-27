import { describe, expect, it, vi } from "vitest";

/**
 * Contract: lightweight diag sessions never construct MindAR and use at most
 * one Three animation loop.
 */
describe("startArCrashDiagLightweightSession contract", () => {
  it("documents subsystem matrix for camera vs render", async () => {
    const { getArCrashDiagCapabilities } = await import("./arCrashDiag");
    expect(getArCrashDiagCapabilities("camera").mindAr).toBe(false);
    expect(getArCrashDiagCapabilities("camera").threeRender).toBe(false);
    expect(getArCrashDiagCapabilities("render").mindAr).toBe(false);
    expect(getArCrashDiagCapabilities("render").threeRender).toBe(true);
  });

  it("camera session cleanup stops tracks and is idempotent-safe", async () => {
    const stop = vi.fn();
    const track = { stop, readyState: "live" };
    const getUserMedia = vi.fn(async () => ({
      getTracks: () => [track],
    }));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });

    const monitor = {
      note: vi.fn(),
      bump: vi.fn(),
      sampleRenderer: vi.fn(),
      mountHud: vi.fn(),
      bindVideoFrameCounter: vi.fn(() => () => {}),
    };

    const { startArCrashDiagLightweightSession } = await import(
      "./startArCrashDiagLightweightSession"
    );
    const container = document.createElement("div");
    document.body.appendChild(container);

    const session = await startArCrashDiagLightweightSession({
      mode: "camera",
      container,
      monitor,
      callbacks: { onReady: vi.fn() },
      getSessionGeneration: () => 1,
      sessionToken: 1,
    });

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(container.querySelector("video")).toBeTruthy();
    expect(container.querySelector("canvas")).toBeNull();

    await session.cleanup();
    await session.cleanup();
    expect(stop).toHaveBeenCalled();
    container.remove();
  });
});
