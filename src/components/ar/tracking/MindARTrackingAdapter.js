import { AR_TARGET_SRC } from "../arConfig";
import {
  isTargetLoadError,
  loadArTargetBuffer,
} from "../checkArTargetAvailable";
import { createAnchorProofObject } from "../createAnchorProofObject";

/**
 * Lift MindAR's video above the container background (MindAR defaults to z-index: -2)
 * and keep the WebGL/CSS canvases transparent above it.
 */
export function applyCameraLayerStacking(container, renderer) {
  if (!container) return;

  container.style.background = "transparent";
  container.style.isolation = "isolate";

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
    canvas.style.pointerEvents = "none";
    canvas.style.background = "transparent";
  });

  if (renderer) {
    renderer.setClearColor?.(0x000000, 0);
    if (typeof renderer.setClearAlpha === "function") {
      renderer.setClearAlpha(0);
    }
    if (renderer.domElement) {
      renderer.domElement.style.background = "transparent";
    }
  }
}

/**
 * MindAR is confined to this adapter. Swap adapters without changing UI code.
 * Target bytes are validated before getUserMedia so the camera never opens on a bad target.
 * @returns {import("./createTrackingAdapter").TrackingAdapter}
 */
export function createMindARTrackingAdapter({ targetSrc = AR_TARGET_SRC } = {}) {
  let mindarThree = null;
  let running = false;
  let rafLoop = null;
  let stackingCleanup = null;

  return {
    isRunning: () => running,

    async start(container, callbacks = {}) {
      if (running) await this.stop();

      // Prefer validating/preloading before camera initialization.
      const targetBuffer = await loadArTargetBuffer(targetSrc);
      if (!targetBuffer) {
        callbacks.onUnsupported?.("target-unavailable");
        return;
      }

      const blobUrl = URL.createObjectURL(
        new Blob([targetBuffer], { type: "application/octet-stream" }),
      );

      try {
        const [{ MindARThree }, THREE] = await Promise.all([
          import("mind-ar/dist/mindar-image-three.prod.js"),
          import("three"),
        ]);

        mindarThree = new MindARThree({
          container,
          imageTargetSrc: blobUrl,
          filterMinCF: 0.0001,
          filterBeta: 0.001,
          warmupTolerance: 5,
          missTolerance: 10,
          uiLoading: "no",
          uiScanning: "no",
          uiError: "no",
        });

        const { renderer, scene, camera } = mindarThree;
        // Transparent GL clear so the live video remains visible underneath.
        renderer.setClearColor(0x000000, 0);
        if (typeof renderer.setClearAlpha === "function") {
          renderer.setClearAlpha(0);
        }

        const light = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(light);

        const anchor = mindarThree.addAnchor(0);
        // Spatial proof: visible frame bound to the CV image target.
        // MindAR toggles anchor.group.visible on found/lost — no fixed HTML.
        const proof = createAnchorProofObject(THREE);
        anchor.group.add(proof);

        anchor.onTargetFound = () => callbacks.onTargetFound?.();
        anchor.onTargetLost = () => callbacks.onTargetLost?.();

        await mindarThree.start();
        applyCameraLayerStacking(container, renderer);

        const onResize = () => {
          try {
            mindarThree?.resize?.();
          } catch {
            // ignore
          }
          applyCameraLayerStacking(container, renderer);
        };
        window.addEventListener("resize", onResize);
        window.addEventListener("orientationchange", onResize);
        stackingCleanup = () => {
          window.removeEventListener("resize", onResize);
          window.removeEventListener("orientationchange", onResize);
        };

        running = true;
        callbacks.onReady?.();

        renderer.setAnimationLoop(() => {
          renderer.render(scene, camera);
        });
        rafLoop = renderer;
      } catch (error) {
        running = false;
        const err = error instanceof Error ? error : new Error(String(error));
        if (isTargetLoadError(err)) {
          callbacks.onUnsupported?.("target-unavailable");
        } else {
          callbacks.onError?.(err);
        }
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    },

    async stop() {
      running = false;
      try {
        stackingCleanup?.();
      } catch {
        // ignore
      }
      stackingCleanup = null;
      try {
        if (rafLoop?.setAnimationLoop) rafLoop.setAnimationLoop(null);
        await mindarThree?.stop?.();
      } catch {
        // Best-effort cleanup.
      }
      try {
        mindarThree?.renderer?.dispose?.();
      } catch {
        // ignore
      }
      mindarThree = null;
      rafLoop = null;
    },
  };
}
