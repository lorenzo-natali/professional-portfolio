import { describe, expect, it, vi } from "vitest";

/**
 * Contract for Patch AB (MindAR controller lifecycle):
 * - stopProcessVideo resolves in-flight worker waits and clears callback slots
 * - dispose is idempotent, terminates worker, disposes input loader
 * - processVideo iteration always disposes inputT in finally after abort
 *
 * Mirrors the patched mind-ar@1.2.5 controller behavior without loading TF.
 */
function createAbortSafeControllerContract() {
  const disposedTensors = [];
  const worker = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
  };
  const inputLoader = {
    dispose: vi.fn(),
    loadInput: vi.fn(() => {
      const tensor = {
        disposed: false,
        dispose() {
          this.disposed = true;
          disposedTensors.push(this);
        },
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
    trackingStates: [{ isTracking: false, showing: false, trackCount: 0, trackMiss: 0 }],
    maxTrack: 1,
    interestedTargetIndex: -1,
    markerDimensions: [[100, 100]],
    onUpdate: vi.fn(),
    filterMinCF: 0.001,
    filterBeta: 1000,
    warmupTolerance: 5,
    missTolerance: 5,

    stopProcessVideo() {
      this.processingVideo = false;
      const matchDone = this.workerMatchDone;
      const trackDone = this.workerTrackDone;
      this.workerMatchDone = null;
      this.workerTrackDone = null;
      if (matchDone) {
        matchDone({ targetIndex: -1, modelViewTransform: null, debugExtra: null });
      }
      if (trackDone) {
        trackDone({ modelViewTransform: null });
      }
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

    _workerMatch() {
      return new Promise((resolve) => {
        this.workerMatchDone = (data) => {
          this.workerMatchDone = null;
          resolve(data);
        };
      });
    },

    async runOneAbortableIteration(gate) {
      this.processingVideo = true;
      let inputT = null;
      try {
        inputT = this.inputLoader.loadInput({});
        await gate;
        if (!this.processingVideo) return "aborted";
        this.onUpdate({ type: "processDone" });
        return "done";
      } finally {
        try {
          inputT?.dispose?.();
        } catch {
          // ignore
        }
      }
    },
  };

  return { controller, disposedTensors, worker, inputLoader };
}

describe("mind-ar Patch AB contract", () => {
  it("dispose terminates worker, clears callbacks, and disposes input loader once", () => {
    const { controller, worker, inputLoader } = createAbortSafeControllerContract();
    const matchSpy = vi.fn();
    controller.workerMatchDone = matchSpy;

    controller.dispose();
    controller.dispose();

    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "dispose" });
    expect(inputLoader.dispose).toHaveBeenCalledTimes(1);
    expect(controller.worker).toBeNull();
    expect(controller.workerMatchDone).toBeNull();
    expect(matchSpy).toHaveBeenCalledWith({
      targetIndex: -1,
      modelViewTransform: null,
      debugExtra: null,
    });
  });

  it("stop mid-await disposes inputT and does not emit processDone", async () => {
    const { controller, disposedTensors } = createAbortSafeControllerContract();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });

    const iteration = controller.runOneAbortableIteration(gate);
    controller.stopProcessVideo();
    release();
    const result = await iteration;

    expect(result).toBe("aborted");
    expect(disposedTensors).toHaveLength(1);
    expect(disposedTensors[0].disposed).toBe(true);
    expect(controller.onUpdate).not.toHaveBeenCalled();
  });

  it("late worker callbacks after stop are ignored because slots are cleared", async () => {
    const { controller } = createAbortSafeControllerContract();
    const pending = controller._workerMatch();
    controller.stopProcessVideo();
    // A late message would call the stored slot; after stop it is null.
    expect(controller.workerMatchDone).toBeNull();
    const result = await pending;
    expect(result.targetIndex).toBe(-1);
  });
});
