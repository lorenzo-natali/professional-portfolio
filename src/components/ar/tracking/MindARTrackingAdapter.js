import { AR_TARGET_SRC } from "../arConfig";
import { AR_SHOW_ANCHOR_PROOF, AR_INTERESTS_DEBUG } from "../arDebug";
import {
  isTargetLoadError,
  loadArTargetBuffer,
} from "../checkArTargetAvailable";
import { createAnchorProofObject } from "../createAnchorProofObject";
import { createInterestObjectsLayer } from "../createInterestObjectsLayer";
import { createInterestObjectsAnimation } from "../createInterestObjectsAnimation";
import {
  createInterestObjectsDebug,
  isInterestObjectsDebugEnabled,
} from "../createInterestObjectsDebug";
import { createAnchorPoseStabilizer } from "../createAnchorPoseStabilizer";
import { AR_SESSION_RESET_MS } from "../arSessionTiming";
import { bindArViewportListeners, syncArViewportShell } from "../arViewport";

/**
 * Lift MindAR's video above the container background (MindAR defaults to z-index: -2)
 * and keep the WebGL/CSS3D layers transparent above it.
 *
 * Canvas stays non-interactive for this milestone (static interest miniatures).
 * Close stays outside this container with pointer-events: auto.
 */
export function applyCameraLayerStacking(container, renderer, options = {}) {
  if (!container) return;

  const canvasPointerEvents = options.canvasPointerEvents ?? "none";

  container.style.background = "transparent";
  container.style.isolation = "isolate";
  container.style.position = "absolute";
  container.style.inset = "0px";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.overflow = "hidden";
  container.style.pointerEvents = "none";
  container.style.touchAction = "none";
  container.style.userSelect = "none";
  container.style.webkitUserSelect = "none";

  const video = container.querySelector("video");
  if (video) {
    video.style.zIndex = "0";
    video.style.pointerEvents = "none";
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.muted = true;
  }

  const canvases = container.querySelectorAll("canvas");
  canvases.forEach((canvas, index) => {
    canvas.style.zIndex = String(1 + index);
    canvas.style.pointerEvents = canvasPointerEvents;
    canvas.style.touchAction = "none";
    canvas.style.background = "transparent";
  });

  const cssHost = Array.from(container.children).find((node) => node.tagName === "DIV");
  if (cssHost) {
    cssHost.style.zIndex = String(1 + canvases.length);
    cssHost.style.pointerEvents = "none";
    cssHost.style.background = "transparent";
  }

  if (renderer) {
    renderer.setClearColor?.(0x000000, 0);
    if (typeof renderer.setClearAlpha === "function") {
      renderer.setClearAlpha(0);
    }
    if (renderer.domElement) {
      renderer.domElement.style.background = "transparent";
      renderer.domElement.style.pointerEvents = canvasPointerEvents;
      renderer.domElement.style.touchAction = "none";
    }
  }
}

/**
 * Assert MindAR media layers share the container client box after resize.
 * @param {HTMLElement} container
 */
export function layersMatchContainer(container) {
  if (!container) return false;
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width < 1 || height < 1) return false;

  const canvas = container.querySelector("canvas");
  const cssHost = Array.from(container.children).find((node) => node.tagName === "DIV");
  const targets = [canvas, cssHost].filter(Boolean);

  return targets.every((el) => {
    const w = Math.round(parseFloat(el.style.width) || el.clientWidth);
    const h = Math.round(parseFloat(el.style.height) || el.clientHeight);
    return Math.abs(w - width) <= 1 && Math.abs(h - height) <= 1;
  });
}

function findViewportShell(container) {
  return (
    container?.closest?.("[data-ar-viewport-shell='true']") ||
    document.querySelector("[data-ar-viewport-shell='true']") ||
    container?.parentElement ||
    null
  );
}

function configureInterestRenderer(THREE, renderer) {
  if (!renderer) return;
  if ("outputColorSpace" in renderer && "SRGBColorSpace" in THREE) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else if ("outputEncoding" in renderer && "sRGBEncoding" in THREE) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  if ("physicallyCorrectLights" in renderer) {
    renderer.physicallyCorrectLights = true;
  }
  if ("toneMapping" in THREE && "toneMapping" in renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping ?? renderer.toneMapping;
    renderer.toneMappingExposure = 1.05;
  }
  renderer.setClearColor?.(0x000000, 0);
  renderer.setClearAlpha?.(0);
}

function createInterestLighting(THREE, scene) {
  const lights = [];
  const hemi = new THREE.HemisphereLight(0xdde7f2, 0x1a1f28, 0.55);
  hemi.name = "ar-interest-hemi";
  scene.add(hemi);
  lights.push(hemi);

  const key = new THREE.DirectionalLight(0xf4f7fb, 0.85);
  key.name = "ar-interest-key";
  key.position.set(0.45, 0.9, 1.2);
  scene.add(key);
  lights.push(key);

  const fill = new THREE.DirectionalLight(0x9eb6ff, 0.28);
  fill.name = "ar-interest-fill";
  fill.position.set(-0.7, 0.2, 0.6);
  scene.add(fill);
  lights.push(fill);

  const rim = new THREE.DirectionalLight(0x5ec8d6, 0.22);
  rim.name = "ar-interest-rim";
  rim.position.set(0.1, -0.4, -0.9);
  scene.add(rim);
  lights.push(rim);

  return {
    lights,
    dispose() {
      lights.forEach((light) => {
        try {
          light.removeFromParent?.();
          light.dispose?.();
        } catch {
          // ignore
        }
      });
      lights.length = 0;
    },
  };
}

function resolveInterestDebugEnabled() {
  if (!import.meta.env.DEV) return false;
  return isInterestObjectsDebugEnabled({ forceFlag: AR_INTERESTS_DEBUG });
}

/**
 * MindAR is confined to this adapter. Swap adapters without changing UI code.
 * @returns {import("./createTrackingAdapter").TrackingAdapter}
 */
export function createMindARTrackingAdapter({
  targetSrc = AR_TARGET_SRC,
  showAnchorProof = AR_SHOW_ANCHOR_PROOF,
} = {}) {
  let mindarThree = null;
  let running = false;
  let rafLoop = null;
  let viewportCleanup = null;
  let interestLayer = null;
  let interestAnimation = null;
  let interestDebug = null;
  let poseStabilizer = null;
  let presentationRoot = null;
  let presentationLighting = null;
  let lastFrameTimeMs = 0;
  let sessionResetTimer = 0;
  let sessionBlobUrl = null;
  let cleaning = false;
  /** Invalidates async load callbacks from prior AR sessions. */
  let sessionGeneration = 0;

  function clearSessionReset() {
    if (sessionResetTimer) {
      clearTimeout(sessionResetTimer);
      sessionResetTimer = 0;
    }
  }

  function resetSessionAtomic() {
    interestAnimation?.resetSession();
  }

  /**
   * Idempotent teardown for start-failure, stop, and dispose.
   */
  async function cleanupSession() {
    if (cleaning) return;
    cleaning = true;
    running = false;
    // Bump first so in-flight promise callbacks from this session become no-ops.
    sessionGeneration += 1;
    clearSessionReset();

    try {
      viewportCleanup?.();
    } catch {
      // ignore
    }
    viewportCleanup = null;

    try {
      interestDebug?.dispose();
    } catch {
      // ignore
    }
    interestDebug = null;

    try {
      interestAnimation?.dispose();
    } catch {
      // ignore
    }
    interestAnimation = null;

    try {
      poseStabilizer?.dispose();
    } catch {
      // ignore
    }
    poseStabilizer = null;

    try {
      interestLayer?.dispose();
    } catch {
      // ignore
    }
    interestLayer = null;

    try {
      presentationLighting?.dispose();
    } catch {
      // ignore
    }
    presentationLighting = null;

    try {
      presentationRoot?.removeFromParent?.();
    } catch {
      // ignore
    }
    presentationRoot = null;
    lastFrameTimeMs = 0;

    const instance = mindarThree;
    mindarThree = null;

    try {
      if (rafLoop?.setAnimationLoop) rafLoop.setAnimationLoop(null);
    } catch {
      // ignore
    }
    rafLoop = null;

    try {
      await instance?.stop?.();
    } catch {
      // Best-effort cleanup.
    }

    try {
      instance?.renderer?.dispose?.();
    } catch {
      // ignore
    }

    if (sessionBlobUrl) {
      try {
        URL.revokeObjectURL(sessionBlobUrl);
      } catch {
        // ignore
      }
      sessionBlobUrl = null;
    }

    cleaning = false;
  }

  return {
    isRunning: () => running,

    async start(container, callbacks = {}) {
      if (running) await this.stop();
      // Ensure a previous failed start left no residue.
      await cleanupSession();

      const targetBuffer = await loadArTargetBuffer(targetSrc);
      if (!targetBuffer) {
        callbacks.onUnsupported?.("target-unavailable");
        return;
      }

      sessionBlobUrl = URL.createObjectURL(
        new Blob([targetBuffer], { type: "application/octet-stream" }),
      );

      try {
        const [{ MindARThree }, THREE] = await Promise.all([
          import("mind-ar/dist/mindar-image-three.prod.js"),
          import("three"),
        ]);

        const shell = findViewportShell(container);
        syncArViewportShell(shell);

        mindarThree = new MindARThree({
          container,
          imageTargetSrc: sessionBlobUrl,
          filterMinCF: 0.0001,
          filterBeta: 0.001,
          warmupTolerance: 5,
          missTolerance: 10,
          uiLoading: "no",
          uiScanning: "no",
          uiError: "no",
        });

        const { renderer, scene, camera } = mindarThree;
        configureInterestRenderer(THREE, renderer);
        presentationLighting = createInterestLighting(THREE, scene);

        // MindAR anchor (raw)
        //   → presentation (filtered)
        //     → interest objects placement
        const anchor = mindarThree.addAnchor(0);
        if (showAnchorProof) {
          anchor.group.add(createAnchorProofObject(THREE));
        }

        presentationRoot = new THREE.Group();
        presentationRoot.name = "ar-interest-objects-presentation";
        presentationRoot.userData.kind = "ar-interest-objects-presentation";
        presentationRoot.matrixAutoUpdate = false;
        anchor.group.add(presentationRoot);

        const debugEnabled = resolveInterestDebugEnabled();
        // Isolate this start() from any prior in-flight interest load callbacks.
        const sessionToken = ++sessionGeneration;
        /** @type {ReturnType<typeof createInterestObjectsLayer> | null} */
        let sessionLayer = null;
        /** @type {ReturnType<typeof createInterestObjectsAnimation> | null} */
        let sessionAnim = null;

        // Mount empty placeholders immediately — do not block the camera on GLBs.
        sessionLayer = createInterestObjectsLayer(THREE, {
          onItemLoaded: (id) => {
            if (sessionGeneration !== sessionToken) return;
            if (interestLayer !== sessionLayer) return;
            if (interestAnimation !== sessionAnim || !sessionAnim) return;
            if (sessionAnim.getState?.()?.disposed) return;
            sessionAnim.onItemLoaded(id);
          },
        });
        interestLayer = sessionLayer;
        presentationRoot.add(sessionLayer.placement);

        sessionAnim = createInterestObjectsAnimation(sessionLayer, {
          showAllImmediately: debugEnabled,
        });
        interestAnimation = sessionAnim;

        if (debugEnabled) {
          interestDebug = createInterestObjectsDebug(sessionLayer, { enabled: true });
        }

        poseStabilizer = createAnchorPoseStabilizer(THREE, {
          rawAnchor: anchor.group,
          presentation: presentationRoot,
          onAcquisitionReady: () => {
            if (sessionGeneration !== sessionToken) return;
            if (interestAnimation !== sessionAnim || !sessionAnim) return;
            sessionAnim.onAcquisitionReady();
          },
        });

        anchor.onTargetFound = () => {
          if (sessionGeneration !== sessionToken) return;
          clearSessionReset();
          poseStabilizer?.onTargetFound();
          callbacks.onTargetFound?.();
        };
        anchor.onTargetLost = () => {
          if (sessionGeneration !== sessionToken) return;
          poseStabilizer?.onTargetLost();
          clearSessionReset();
          // Brief loss: keep last stable pose + objects. Full reset after shared threshold.
          sessionResetTimer = window.setTimeout(() => {
            sessionResetTimer = 0;
            if (sessionGeneration !== sessionToken) return;
            resetSessionAtomic();
          }, AR_SESSION_RESET_MS);
          callbacks.onTargetLost?.();
        };

        // Camera permission / MindAR startup — failure must fully clean up.
        // Interest GLBs load in the background after (and overlapping) camera start.
        // Capture session refs now; never read live bindings at promise resolve time.
        const interestLoadPromise = sessionLayer.startLoading();
        void interestLoadPromise.then(() => {
          if (sessionGeneration !== sessionToken) return;
          if (interestLayer !== sessionLayer) return;
          if (interestAnimation !== sessionAnim || !sessionAnim) return;
          if (sessionAnim.getState?.()?.disposed) return;
          sessionAnim.markLoadFinished();
        });

        await mindarThree.start();

        syncArViewportShell(shell);
        try {
          mindarThree.resize();
        } catch {
          // ignore
        }
        applyCameraLayerStacking(container, renderer, { canvasPointerEvents: "none" });

        const onViewportChange = () => {
          if (!running || !mindarThree) return;
          syncArViewportShell(shell);
          try {
            mindarThree.resize();
          } catch {
            // ignore
          }
          applyCameraLayerStacking(container, renderer, { canvasPointerEvents: "none" });
        };
        running = true;
        viewportCleanup = bindArViewportListeners(onViewportChange);

        callbacks.onReady?.();

        lastFrameTimeMs = performance.now();
        renderer.setAnimationLoop((frameTime) => {
          const tNow = typeof frameTime === "number" ? frameTime : performance.now();
          const dtSec = Math.min(0.1, Math.max(0, (tNow - lastFrameTimeMs) / 1000));
          lastFrameTimeMs = tNow;
          poseStabilizer?.update(dtSec);
          renderer.render(scene, camera);
        });
        rafLoop = renderer;
      } catch (error) {
        await cleanupSession();
        const err = error instanceof Error ? error : new Error(String(error));
        if (isTargetLoadError(err)) {
          callbacks.onUnsupported?.("target-unavailable");
        } else {
          callbacks.onError?.(err);
        }
      }
    },

    async stop() {
      await cleanupSession();
    },
  };
}
