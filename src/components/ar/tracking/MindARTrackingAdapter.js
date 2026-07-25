import { AR_TARGET_SRC } from "../arConfig";
import {
  isTargetLoadError,
  loadArTargetBuffer,
} from "../checkArTargetAvailable";
import { createAnchorProofObject } from "../createAnchorProofObject";
import { bindArViewportListeners, syncArViewportShell } from "../arViewport";

/**
 * Lift MindAR's video above the container background (MindAR defaults to z-index: -2)
 * and keep the WebGL/CSS canvases transparent above it.
 */
export function applyCameraLayerStacking(container, renderer) {
  if (!container) return;

  container.style.background = "transparent";
  container.style.isolation = "isolate";
  container.style.position = "absolute";
  container.style.inset = "0px";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.overflow = "hidden";

  const video = container.querySelector("video");
  if (video) {
    video.style.zIndex = "0";
    video.style.pointerEvents = "none";
    video.style.objectFit = "cover";
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.muted = true;
  }

  const canvases = container.querySelectorAll("canvas");
  canvases.forEach((canvas, index) => {
    canvas.style.zIndex = String(1 + index);
    canvas.style.pointerEvents = "none";
    canvas.style.background = "transparent";
    // MindAR sets explicit cover crop geometry; keep fill without stretch fallback.
    if (!canvas.style.width) canvas.style.width = "100%";
    if (!canvas.style.height) canvas.style.height = "100%";
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

function findCameraShell(container) {
  return container?.closest?.("[data-ar-camera-shell='true']") || container?.parentElement || null;
}

/**
 * MindAR is confined to this adapter. Swap adapters without changing UI code.
 * @returns {import("./createTrackingAdapter").TrackingAdapter}
 */
export function createMindARTrackingAdapter({ targetSrc = AR_TARGET_SRC } = {}) {
  let mindarThree = null;
  let running = false;
  let rafLoop = null;
  let viewportCleanup = null;

  return {
    isRunning: () => running,

    async start(container, callbacks = {}) {
      if (running) await this.stop();

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

        const shell = findCameraShell(container);
        syncArViewportShell(shell);

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
        renderer.setClearColor(0x000000, 0);
        if (typeof renderer.setClearAlpha === "function") {
          renderer.setClearAlpha(0);
        }

        const light = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(light);

        const anchor = mindarThree.addAnchor(0);
        const proof = createAnchorProofObject(THREE);
        anchor.group.add(proof);

        anchor.onTargetFound = () => callbacks.onTargetFound?.();
        anchor.onTargetLost = () => callbacks.onTargetLost?.();

        await mindarThree.start();
        syncArViewportShell(shell);
        try {
          mindarThree.resize?.();
        } catch {
          // ignore
        }
        applyCameraLayerStacking(container, renderer);

        const onViewportChange = () => {
          syncArViewportShell(shell);
          try {
            mindarThree?.resize?.();
          } catch {
            // ignore
          }
          applyCameraLayerStacking(container, renderer);
        };
        viewportCleanup = bindArViewportListeners(onViewportChange);

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
        viewportCleanup?.();
      } catch {
        // ignore
      }
      viewportCleanup = null;
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
