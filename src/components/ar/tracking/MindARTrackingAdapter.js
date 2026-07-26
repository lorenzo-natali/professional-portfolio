import { AR_TARGET_SRC } from "../arConfig";
import { AR_SHOW_ANCHOR_PROOF } from "../arDebug";
import {
  isTargetLoadError,
  loadArTargetBuffer,
} from "../checkArTargetAvailable";
import { createAnchorProofObject } from "../createAnchorProofObject";
import { bindArViewportListeners, syncArViewportShell } from "../arViewport";

/**
 * Lift MindAR's video above the container background (MindAR defaults to z-index: -2)
 * and keep the WebGL/CSS3D layers transparent above it.
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

  // CSS3DRenderer host is a positioned div (not a canvas).
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

        const shell = findViewportShell(container);
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

        // Clean camera baseline: tracking anchor only — no Risk/Governance Lens content.
        const anchor = mindarThree.addAnchor(0);
        if (showAnchorProof) {
          anchor.group.add(createAnchorProofObject(THREE));
        }

        anchor.onTargetFound = () => {
          callbacks.onTargetFound?.();
        };
        anchor.onTargetLost = () => {
          callbacks.onTargetLost?.();
        };

        await mindarThree.start();

        // Shell is the only sizing authority; then resize MindAR from that container.
        syncArViewportShell(shell);
        try {
          mindarThree.resize();
        } catch {
          // ignore
        }
        applyCameraLayerStacking(container, renderer);

        // MindAR also binds window.resize internally (anonymous bound fn — not removable).
        // Our listeners cover visualViewport; both converge on container client box.
        const onViewportChange = () => {
          if (!running || !mindarThree) return;
          syncArViewportShell(shell);
          try {
            mindarThree.resize();
          } catch {
            // ignore
          }
          applyCameraLayerStacking(container, renderer);
        };
        running = true;
        viewportCleanup = bindArViewportListeners(onViewportChange);

        // Narrow seam for optional diagnostics — does not alter camera constraints.
        const video = container.querySelector("video");
        if (video) {
          callbacks.onVideoReady?.({ video, container });
        }

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

      // Detached MindAR window.resize handlers no-op once video is removed (library checks !video).
    },
  };
}
