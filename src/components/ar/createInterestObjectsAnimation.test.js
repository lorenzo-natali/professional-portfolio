import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createInterestObjectsAnimation } from "./createInterestObjectsAnimation";
import { INTEREST_OBJECTS } from "./interestObjectsConfig";

function makeLayer(loadedIds = INTEREST_OBJECTS.map((item) => item.id)) {
  const loaded = new Set(loadedIds);
  return {
    applyEntranceProgress: vi.fn(),
    setVisible: vi.fn(),
    resetVisualState: vi.fn(),
    getEntry: vi.fn((id) => ({ id, loaded: loaded.has(id) })),
    _loaded: loaded,
  };
}

describe("createInterestObjectsAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      return setTimeout(() => cb(performance.now()), 16);
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("staggers entrance after acquisition and stays idle afterwards", async () => {
    const layer = makeLayer(INTEREST_OBJECTS.slice(0, 2).map((item) => item.id));
    const anim = createInterestObjectsAnimation(layer, {
      items: INTEREST_OBJECTS.slice(0, 2),
      now: () => performance.now(),
    });

    anim.onAcquisitionReady();
    anim.markLoadFinished();
    expect(layer.setVisible).toHaveBeenCalledWith(true);

    await vi.advanceTimersByTimeAsync(2000);
    expect(layer.applyEntranceProgress).toHaveBeenCalled();
    expect(anim.getState().phase).toBe("idle");
    expect(anim.getState().played).toBe(true);

    layer.applyEntranceProgress.mockClear();
    anim.onAcquisitionReady();
    expect(layer.applyEntranceProgress).toHaveBeenCalledWith("book", 1);
    expect(layer.applyEntranceProgress).toHaveBeenCalledWith("evil-eye", 1);

    anim.dispose();
  });

  it("resets visual state on session reset and cancels RAF", () => {
    const layer = makeLayer(["book"]);
    const anim = createInterestObjectsAnimation(layer, {
      items: INTEREST_OBJECTS.slice(0, 1),
      showAllImmediately: true,
    });
    anim.markLoadFinished();
    anim.onAcquisitionReady();
    expect(anim.getState().played).toBe(true);

    anim.resetSession();
    expect(layer.resetVisualState).toHaveBeenCalled();
    expect(anim.getState().played).toBe(false);
    expect(anim.getState().phase).toBe("hidden");
    anim.dispose();
  });

  it("keeps pre-tracking loads hidden until acquisition is ready", () => {
    const layer = makeLayer([]);
    const anim = createInterestObjectsAnimation(layer, {
      items: INTEREST_OBJECTS.slice(0, 1),
    });
    layer._loaded.add("book");
    anim.onItemLoaded("book");
    expect(layer.applyEntranceProgress).toHaveBeenCalledWith("book", 0);
    expect(anim.getState().phase).toBe("hidden");

    anim.onAcquisitionReady();
    expect(anim.getState().phase).toBe("playing");
    anim.dispose();
  });

  it("keeps an asset loaded during tracking-lost hidden until the next acquisition", () => {
    const layer = makeLayer([]);
    const anim = createInterestObjectsAnimation(layer, {
      items: INTEREST_OBJECTS.slice(0, 1),
      showAllImmediately: true,
    });
    anim.markLoadFinished();
    anim.onAcquisitionReady();
    expect(anim.getState().played).toBe(true);

    anim.resetSession();
    expect(anim.getState().sessionActive).toBe(false);
    layer._loaded.add("book");
    layer.applyEntranceProgress.mockClear();
    anim.onItemLoaded("book");
    expect(layer.applyEntranceProgress).toHaveBeenCalledWith("book", 0);
    expect(anim.getState().phase).toBe("hidden");
    expect(anim.getState().played).toBe(false);

    anim.onAcquisitionReady();
    expect(layer.applyEntranceProgress).toHaveBeenCalledWith("book", 1);
    anim.dispose();
  });

  it("does not set played=true while the load pass is still open with zero loaded assets", async () => {
    const layer = makeLayer([]);
    const anim = createInterestObjectsAnimation(layer, {
      items: INTEREST_OBJECTS.slice(0, 2),
    });
    anim.onAcquisitionReady();
    expect(anim.getState().phase).toBe("playing");
    expect(anim.getState().played).toBe(false);

    await vi.advanceTimersByTimeAsync(2000);
    expect(anim.getState().played).toBe(false);
    expect(anim.getState().phase).toBe("playing");
    expect(anim.getState().loadPassDone).toBe(false);

    anim.dispose();
  });

  it("settles cleanly when every asset fails after the load pass finishes", async () => {
    const layer = makeLayer([]);
    const anim = createInterestObjectsAnimation(layer, {
      items: INTEREST_OBJECTS.slice(0, 3),
    });
    anim.onAcquisitionReady();
    anim.markLoadFinished();
    await vi.advanceTimersByTimeAsync(50);

    expect(anim.getState().loadPassDone).toBe(true);
    expect(anim.getState().loadedCount).toBe(0);
    expect(anim.getState().played).toBe(true);
    expect(anim.getState().phase).toBe("idle");
    anim.dispose();
  });

  it("keeps late loads on the stagger path while still playing", async () => {
    const layer = makeLayer([]);
    const anim = createInterestObjectsAnimation(layer, {
      items: INTEREST_OBJECTS.slice(0, 2),
      now: () => performance.now(),
    });
    anim.onAcquisitionReady();
    expect(anim.getState().phase).toBe("playing");

    layer._loaded.add("book");
    anim.onItemLoaded("book");
    // Still playing — must not idle-snap the whole sequence.
    expect(anim.getState().played).toBe(false);
    expect(anim.getState().phase).toBe("playing");

    anim.markLoadFinished();
    layer._loaded.add("evil-eye");
    anim.onItemLoaded("evil-eye");
    expect(anim.getState().played).toBe(false);

    await vi.advanceTimersByTimeAsync(2000);
    expect(anim.getState().played).toBe(true);
    expect(anim.getState().phase).toBe("idle");
    anim.dispose();
  });

  it("can reveal loaded objects immediately in debug mode", async () => {
    const layer = makeLayer(INTEREST_OBJECTS.map((item) => item.id));
    const anim = createInterestObjectsAnimation(layer, {
      items: INTEREST_OBJECTS,
      showAllImmediately: true,
    });
    anim.markLoadFinished();
    anim.play();
    await vi.advanceTimersByTimeAsync(50);
    INTEREST_OBJECTS.forEach((item) => {
      expect(layer.applyEntranceProgress).toHaveBeenCalledWith(item.id, 1);
    });
    expect(anim.getState().played).toBe(true);
    anim.dispose();
  });
});
