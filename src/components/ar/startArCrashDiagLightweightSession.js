/**
 * Lightweight crash-diag sessions that never construct MindARThree.
 * Used for arDiag=camera and arDiag=render only.
 */

/**
 * @param {object} options
 * @param {'camera' | 'render'} options.mode
 * @param {HTMLElement} options.container
 * @param {ReturnType<import("./createArCrashDiagMonitor").createArCrashDiagMonitor>} options.monitor
 * @param {{ onReady?: Function, onError?: Function }} options.callbacks
 * @param {() => number} options.getSessionGeneration
 * @param {number} options.sessionToken
 * @returns {Promise<{
 *   running: true,
 *   cleanup: () => Promise<void>,
 *   rafLoop: any,
 *   video: HTMLVideoElement | null,
 * }>}
 */
export async function startArCrashDiagLightweightSession({
  mode,
  container,
  monitor,
  callbacks,
  getSessionGeneration,
  sessionToken,
}) {
  const shell =
    container.closest?.("[data-ar-viewport-shell='true']") || container.parentElement;

  container.style.position = container.style.position || "absolute";
  container.style.inset = container.style.inset || "0";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.overflow = "hidden";
  container.style.background = "#000";

  const video = document.createElement("video");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;";
  container.appendChild(video);

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch (err) {
    monitor.note("cameraDenied", err instanceof Error ? err.message : String(err));
    throw err;
  }

  if (getSessionGeneration() !== sessionToken) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error("ar-crash-diag-session-aborted");
  }

  video.srcObject = stream;
  try {
    await video.play();
  } catch {
    // Autoplay policies: still consider stream active.
  }
  monitor.note("cameraStreamActive");

  const unbindVideoFrames = monitor.bindVideoFrameCounter(video);
  monitor.mountHud(shell);

  /** @type {import("three").WebGLRenderer | null} */
  let renderer = null;
  /** @type {(() => void) | null} */
  let stopLoop = null;

  if (mode === "render") {
    const THREE = await import("three");
    if (getSessionGeneration() !== sessionToken) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error("ar-crash-diag-session-aborted");
    }

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "default",
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 2.2;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.45),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true }),
    );
    scene.add(mesh);

    const resize = () => {
      const w = Math.max(1, container.clientWidth || window.innerWidth);
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    window.addEventListener("resize", resize);

    // Same ownership model as production: one setAnimationLoop.
    renderer.setAnimationLoop(() => {
      if (getSessionGeneration() !== sessionToken) return;
      mesh.rotation.x += 0.008;
      mesh.rotation.y += 0.012;
      renderer.render(scene, camera);
      monitor.bump("renderFrames");
      monitor.sampleRenderer(renderer);
    });

    stopLoop = () => {
      window.removeEventListener("resize", resize);
      try {
        renderer.setAnimationLoop(null);
      } catch {
        // ignore
      }
    };
    monitor.note("minimalThreeRenderActive");
  }

  callbacks.onReady?.();

  return {
    running: true,
    rafLoop: renderer,
    video,
    cleanup: async () => {
      try {
        unbindVideoFrames?.();
      } catch {
        // ignore
      }
      try {
        stopLoop?.();
      } catch {
        // ignore
      }
      try {
        renderer?.dispose?.();
      } catch {
        // ignore
      }
      try {
        renderer?.domElement?.remove?.();
      } catch {
        // ignore
      }
      try {
        const tracks = stream?.getTracks?.() || [];
        for (const track of tracks) {
          try {
            track.stop();
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
      try {
        video.srcObject = null;
        video.remove();
      } catch {
        // ignore
      }
    },
  };
}
