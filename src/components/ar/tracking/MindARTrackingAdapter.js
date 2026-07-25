import { AR_TARGET_SRC } from "../arConfig";

async function targetExists(url) {
  try {
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    if (!response.ok) return false;
    const buffer = await response.arrayBuffer();
    return buffer.byteLength > 64;
  } catch {
    return false;
  }
}

/**
 * MindAR is confined to this adapter. Swap adapters without changing UI code.
 * @returns {import("./createTrackingAdapter").TrackingAdapter}
 */
export function createMindARTrackingAdapter({ targetSrc = AR_TARGET_SRC } = {}) {
  let mindarThree = null;
  let running = false;
  let rafLoop = null;

  return {
    isRunning: () => running,

    async start(container, callbacks = {}) {
      if (running) await this.stop();

      const available = await targetExists(targetSrc);
      if (!available) {
        callbacks.onUnsupported?.("Image target is not available.");
        return;
      }

      try {
        const [{ MindARThree }, THREE] = await Promise.all([
          import("mind-ar/dist/mindar-image-three.prod.js"),
          import("three"),
        ]);

        mindarThree = new MindARThree({
          container,
          imageTargetSrc: targetSrc,
          filterMinCF: 0.0001,
          filterBeta: 0.001,
          warmupTolerance: 5,
          missTolerance: 10,
        });

        const { renderer, scene, camera } = mindarThree;
        // Soft, professional lighting — no neon bloom.
        const light = new THREE.AmbientLight(0xffffff, 0.85);
        scene.add(light);

        const anchor = mindarThree.addAnchor(0);
        anchor.onTargetFound = () => callbacks.onTargetFound?.();
        anchor.onTargetLost = () => callbacks.onTargetLost?.();

        // Invisible marker plane keeps the anchor alive for potential future overlays.
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1.414),
          new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
        );
        anchor.group.add(plane);

        await mindarThree.start();
        running = true;
        callbacks.onReady?.();

        renderer.setAnimationLoop(() => {
          renderer.render(scene, camera);
        });
        rafLoop = renderer;
      } catch (error) {
        running = false;
        const err = error instanceof Error ? error : new Error(String(error));
        callbacks.onError?.(err);
      }
    },

    async stop() {
      running = false;
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
      if (typeof document !== "undefined") {
        // MindAR injects video/canvas into the container; clear residual nodes.
      }
    },
  };
}
