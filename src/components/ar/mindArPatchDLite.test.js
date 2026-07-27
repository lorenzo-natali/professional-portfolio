import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * Contract for Patch D-lite (alternate-frame tracking while stably showing):
 * - TRACK_EVERY_N_FRAMES = 2
 * - heavy path (loadInput / track / worker) only on alternate stable frames
 * - skipped frames re-emit last pose and do not clear it
 * - detect/reacquire always heavy when not stably locked
 * - serialized loop: no overlapping heavy iterations
 * - AB stop/dispose still safe on skip or heavy frame
 */
const TRACK_EVERY_N_FRAMES = 2;

function createDLiteControllerContract() {
  const worker = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
  };
  let inFlightHeavy = 0;
  let maxConcurrentHeavy = 0;

  const inputLoader = {
    dispose: vi.fn(),
    loadInput: vi.fn(() => {
      const tensor = {
        dispose: vi.fn(),
      };
      return tensor;
    }),
  };

  const controller = {
    processingVideo: false,
    _disposed: false,
    worker,
    workerMatchDone: null,
    workerTrackDone: null,
    inputLoader,
    maxTrack: 1,
    interestedTargetIndex: -1,
    inputWidth: 640,
    inputHeight: 480,
    warmupTolerance: 5,
    missTolerance: 5,
    onUpdate: vi.fn(),
    trackingStates: [
      {
        showing: false,
        isTracking: false,
        currentModelViewTransform: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]],
        trackCount: 0,
        trackMiss: 0,
        trackingMatrix: null,
        filter: { filter: (_t, m) => m, reset: vi.fn() },
      },
    ],

    _glModelViewMatrix(modelViewTransform) {
      return Float32Array.from([
        modelViewTransform[0][0],
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
      ]);
    },

    getRotatedZ90Matrix(m) {
      return m;
    },

    stopProcessVideo() {
      this.processingVideo = false;
      const matchDone = this.workerMatchDone;
      const trackDone = this.workerTrackDone;
      this.workerMatchDone = null;
      this.workerTrackDone = null;
      if (matchDone) matchDone({ targetIndex: -1, modelViewTransform: null, debugExtra: null });
      if (trackDone) trackDone({ modelViewTransform: null });
    },

    dispose() {
      if (this._disposed) return;
      this._disposed = true;
      this.stopProcessVideo();
      try {
        this.worker?.postMessage?.({ type: "dispose" });
      } catch {
        // ignore
      }
      try {
        this.worker?.terminate?.();
      } catch {
        // ignore
      }
      this.worker = null;
      try {
        this.inputLoader?.dispose?.();
      } catch {
        // ignore
      }
    },

    async _detectAndMatch() {
      return { targetIndex: -1, modelViewTransform: null };
    },

    async _trackAndUpdate(_inputT, last) {
      inFlightHeavy += 1;
      maxConcurrentHeavy = Math.max(maxConcurrentHeavy, inFlightHeavy);
      await Promise.resolve();
      inFlightHeavy -= 1;
      return last;
    },

    /**
     * Mirrors patched processVideo D-lite cadence for N loop ticks.
     * @param {number} ticks
     * @param {{ input?: { width: number, height: number }, nextFrame?: () => Promise<void> }} [opts]
     */
    async runLoopTicks(ticks, opts = {}) {
      const input = opts.input || { width: 640, height: 480 };
      const nextFrame = opts.nextFrame || (() => Promise.resolve());
      this.processingVideo = true;
      let stableFrameIndex = 0;

      for (let tick = 0; tick < ticks; tick += 1) {
        if (!this.processingVideo) break;

        const nTrackingPreview = this.trackingStates.reduce(
          (acc, s) => acc + (s.isTracking ? 1 : 0),
          0,
        );
        const needsDetect = nTrackingPreview < this.maxTrack;
        const stableShowing =
          !needsDetect &&
          this.trackingStates.some((s) => s.showing && s.isTracking) &&
          this.trackingStates.every((s) => !s.isTracking || (s.showing && s.isTracking));

        let runHeavyPipeline = true;
        if (stableShowing && TRACK_EVERY_N_FRAMES > 1) {
          runHeavyPipeline = stableFrameIndex % TRACK_EVERY_N_FRAMES === 0;
          stableFrameIndex += 1;
        } else {
          stableFrameIndex = 0;
        }

        if (!runHeavyPipeline) {
          for (let i = 0; i < this.trackingStates.length; i++) {
            const trackingState = this.trackingStates[i];
            if (!trackingState.showing || !trackingState.trackingMatrix) continue;
            const clone = Array.from(trackingState.trackingMatrix);
            this.onUpdate({ type: "updateMatrix", targetIndex: i, worldMatrix: clone });
          }
          if (!this.processingVideo) break;
          this.onUpdate({ type: "processDone" });
          if (!this.processingVideo) break;
          await nextFrame();
          continue;
        }

        let inputT = null;
        try {
          inputT = this.inputLoader.loadInput(input);
          if (!this.processingVideo) break;

          const nTracking = this.trackingStates.reduce(
            (acc, s) => acc + (s.isTracking ? 1 : 0),
            0,
          );
          if (nTracking < this.maxTrack) {
            const { targetIndex, modelViewTransform } = await this._detectAndMatch();
            if (!this.processingVideo) break;
            if (targetIndex !== -1) {
              this.trackingStates[targetIndex].isTracking = true;
              this.trackingStates[targetIndex].currentModelViewTransform = modelViewTransform;
            }
          }

          for (let i = 0; i < this.trackingStates.length; i++) {
            if (!this.processingVideo) break;
            const trackingState = this.trackingStates[i];
            if (trackingState.isTracking) {
              const modelViewTransform = await this._trackAndUpdate(
                inputT,
                trackingState.currentModelViewTransform,
                i,
              );
              if (!this.processingVideo) break;
              if (modelViewTransform === null) {
                trackingState.isTracking = false;
              } else {
                trackingState.currentModelViewTransform = modelViewTransform;
              }
            }

            if (!trackingState.showing) {
              if (trackingState.isTracking) {
                trackingState.trackMiss = 0;
                trackingState.trackCount += 1;
                if (trackingState.trackCount > this.warmupTolerance) {
                  trackingState.showing = true;
                  trackingState.trackingMatrix = null;
                  trackingState.filter.reset();
                }
              }
            }

            if (trackingState.showing) {
              if (!trackingState.isTracking) {
                trackingState.trackCount = 0;
                trackingState.trackMiss += 1;
                if (trackingState.trackMiss > this.missTolerance) {
                  trackingState.showing = false;
                  trackingState.trackingMatrix = null;
                  this.onUpdate({
                    type: "updateMatrix",
                    targetIndex: i,
                    worldMatrix: null,
                  });
                }
              } else {
                trackingState.trackMiss = 0;
              }
            }

            if (trackingState.showing) {
              const worldMatrix = this._glModelViewMatrix(
                trackingState.currentModelViewTransform,
                i,
              );
              trackingState.trackingMatrix = trackingState.filter.filter(
                Date.now(),
                worldMatrix,
              );
              this.onUpdate({
                type: "updateMatrix",
                targetIndex: i,
                worldMatrix: Array.from(trackingState.trackingMatrix),
              });
            }
          }

          if (!this.processingVideo) break;
          this.onUpdate({ type: "processDone" });
        } finally {
          inputT?.dispose?.();
        }
        if (!this.processingVideo) break;
        await nextFrame();
      }

      return { maxConcurrentHeavy };
    },
  };

  return { controller, inputLoader, worker, getMaxConcurrentHeavy: () => maxConcurrentHeavy };
}

describe("mind-ar Patch D-lite contract", () => {
  it("ships TRACK_EVERY_N_FRAMES = 2 in controller source and runtime chunk", () => {
    const source = readFileSync(
      join(repoRoot, "node_modules/mind-ar/src/image-target/controller.js"),
      "utf8",
    );
    const dist = readFileSync(
      join(repoRoot, "node_modules/mind-ar/dist/controller-mGt1s8dJ.js"),
      "utf8",
    );
    expect(source).toContain("const TRACK_EVERY_N_FRAMES = 2");
    expect(source).toContain("runHeavyPipeline");
    expect(dist).toContain("TRACK_EVERY_N_FRAMES = 2");
    expect(dist).toContain("TRACK_EVERY_N_FRAMES > 1");
  });

  it("calls loadInput/track about once per two stable showing frames", async () => {
    const { controller, inputLoader } = createDLiteControllerContract();
    const state = controller.trackingStates[0];
    state.isTracking = true;
    state.showing = true;
    state.trackingMatrix = new Float32Array(16);
    state.trackCount = 10;

    const trackSpy = vi.spyOn(controller, "_trackAndUpdate");
    await controller.runLoopTicks(6);

    // Stable frames 0,2,4 heavy → 3 loadInput / 3 track of 6 ticks
    expect(inputLoader.loadInput).toHaveBeenCalledTimes(3);
    expect(trackSpy).toHaveBeenCalledTimes(3);
  });

  it("skipped frames re-emit the latest pose and do not clear it", async () => {
    const { controller, inputLoader } = createDLiteControllerContract();
    const pose = Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const state = controller.trackingStates[0];
    state.isTracking = true;
    state.showing = true;
    state.trackingMatrix = pose;
    state.trackCount = 10;

    await controller.runLoopTicks(2);

    expect(inputLoader.loadInput).toHaveBeenCalledTimes(1);
    expect(state.showing).toBe(true);
    expect(state.isTracking).toBe(true);
    expect(state.trackingMatrix).not.toBeNull();

    const matrixUpdates = controller.onUpdate.mock.calls
      .map((args) => args[0])
      .filter((evt) => evt.type === "updateMatrix");
    expect(matrixUpdates.length).toBeGreaterThanOrEqual(2);
    expect(matrixUpdates.every((evt) => evt.worldMatrix != null)).toBe(true);
    // No loss/clear event on the skip path.
    expect(matrixUpdates.some((evt) => evt.worldMatrix === null)).toBe(false);
  });

  it("never overlaps heavy track iterations", async () => {
    const { controller } = createDLiteControllerContract();
    const state = controller.trackingStates[0];
    state.isTracking = true;
    state.showing = true;
    state.trackingMatrix = new Float32Array(16);
    state.trackCount = 10;

    let inFlight = 0;
    let maxInFlight = 0;
    controller._trackAndUpdate = async (_inputT, last) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      return last;
    };

    await controller.runLoopTicks(4);
    expect(maxInFlight).toBe(1);
  });

  it("keeps full-rate heavy frames while searching / warming up (not stably showing)", async () => {
    const { controller, inputLoader } = createDLiteControllerContract();
    const detectSpy = vi.spyOn(controller, "_detectAndMatch").mockResolvedValue({
      targetIndex: 0,
      modelViewTransform: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
      ],
    });
    const trackSpy = vi.spyOn(controller, "_trackAndUpdate");

    // Not stably showing yet → no D-lite skips; every tick loads input.
    await controller.runLoopTicks(3);
    expect(inputLoader.loadInput).toHaveBeenCalledTimes(3);
    // Detect only while nTracking < maxTrack (first tick acquires).
    expect(detectSpy).toHaveBeenCalledTimes(1);
    // Subsequent warmup ticks still track at full rate.
    expect(trackSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(controller.trackingStates[0].showing).toBe(false);
  });

  it("can lose and reacquire after a stable lock", async () => {
    const { controller, inputLoader } = createDLiteControllerContract();
    const state = controller.trackingStates[0];
    state.isTracking = true;
    state.showing = true;
    state.trackingMatrix = new Float32Array(16);
    state.trackCount = 10;

    let trackCalls = 0;
    controller._trackAndUpdate = async (_inputT, last) => {
      trackCalls += 1;
      if (trackCalls === 2) return null;
      return last;
    };

    // 4 stable ticks → heavy on 0 and 2; second heavy loses track.
    await controller.runLoopTicks(4);
    expect(state.isTracking).toBe(false);

    // Finish miss tolerance on heavy frames (no longer stable → no skip).
    state.trackMiss = controller.missTolerance;
    await controller.runLoopTicks(1);
    expect(state.showing).toBe(false);
    expect(state.trackingMatrix).toBeNull();

    inputLoader.loadInput.mockClear();
    const reacquire = vi.spyOn(controller, "_detectAndMatch").mockResolvedValue({
      targetIndex: 0,
      modelViewTransform: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
      ],
    });
    await controller.runLoopTicks(2);
    expect(reacquire).toHaveBeenCalled();
    expect(inputLoader.loadInput).toHaveBeenCalledTimes(2);
    expect(state.isTracking).toBe(true);
  });

  it("stop during a skipped or tracked frame is safe", async () => {
    const { controller, inputLoader } = createDLiteControllerContract();
    const state = controller.trackingStates[0];
    state.isTracking = true;
    state.showing = true;
    state.trackingMatrix = new Float32Array(16);
    state.trackCount = 10;

    const nextFrame = vi.fn(async () => {
      controller.stopProcessVideo();
    });

    await controller.runLoopTicks(4, { nextFrame });
    expect(controller.processingVideo).toBe(false);
    expect(state.showing).toBe(true);
    expect(state.trackingMatrix).not.toBeNull();
    expect(inputLoader.loadInput.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("dispose still terminates the worker and resolves pending work", () => {
    const { controller, worker, inputLoader } = createDLiteControllerContract();
    const pending = vi.fn();
    controller.workerMatchDone = pending;
    controller.dispose();
    controller.dispose();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(inputLoader.dispose).toHaveBeenCalledTimes(1);
    expect(pending).toHaveBeenCalled();
    expect(controller.worker).toBeNull();
  });
});
