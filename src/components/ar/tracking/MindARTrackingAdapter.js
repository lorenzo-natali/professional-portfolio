import { AR_TARGET_SRC } from "../arConfig";
import { AR_SHOW_ANCHOR_PROOF, AR_INTERESTS_DEBUG } from "../arDebug";
import {
  isTargetLoadError,
  loadArTargetBuffer,
} from "../checkArTargetAvailable";
import { createAnchorProofObject } from "../createAnchorProofObject";
import { createInterestObjectsLayer } from "../createInterestObjectsLayer";
import { createInterestObjectsAnimation } from "../createInterestObjectsAnimation";
import { createInterestObjectsTapController } from "../createInterestObjectsTapController";
// Intentionally no static import of createInterestObjectsDebug — production builds
// must keep that module outside the public dependency graph (DEV dynamic import only).
import { createAnchorPoseStabilizer } from "../createAnchorPoseStabilizer";
import { INTEREST_OBJECTS_STABILIZATION } from "../interestObjectsConfig";
import { AR_SESSION_RESET_MS } from "../arSessionTiming";
import {
  recordArRuntimeAuditPhase,
  setArRuntimeAuditState,
} from "../createArRuntimeAudit";
import { getArRuntimeFlags } from "../arRuntimeFlags";
import {
  bindArViewportListeners,
  normalizeMindArLayerStyles,
  recordArViewportLifecycle,
  syncArViewportShell,
  syncTrackingContainerToShell as syncTrackingContainerFullscreen,
} from "../arViewport";
import { createArSessionResizeCoordinator, detachMindArWindowResizeListener, disableUnusedMindArCss3d } from "../createArSessionResizeCoordinator";
import {
  applyArRuntimeVariantPixelRatio,
  arRuntimeVariantSnapshotLabel,
  countObject3DTriangles,
  resolveInterestItemsForVariant,
  shouldDisableCardLayoutProjection,
} from "../arRuntimeVariant";
import { getArCrashDiagCapabilities } from "../arCrashDiag";
import { createArCrashDiagMonitor } from "../createArCrashDiagMonitor";
import { startArCrashDiagLightweightSession } from "../startArCrashDiagLightweightSession";

/**
 * Keep the MindAR container as a true fullscreen absolute layer.
 * Never pin width/height from shell.clientWidth / visualViewport / camera aspect —
 * that dual sizing system caused the persistent iPhone right-side gap.
 * @param {HTMLElement | null} container
 * @param {HTMLElement | null} [_shell]
 */
export function syncTrackingContainerToShell(container) {
  syncTrackingContainerFullscreen(container);
}

/**
 * Lift MindAR's video above the container background (MindAR defaults to z-index: -2)
 * and keep the WebGL/CSS3D layers transparent above it.
 *
 * Interest taps use a dedicated hit layer; Close stays outside with pointer-events: auto.
 */
export function applyCameraLayerStacking(container, renderer, options = {}) {
  if (!container) return;

  const canvasPointerEvents = options.canvasPointerEvents ?? "none";
  const interactive = canvasPointerEvents === "auto";
  const shell =
    options.shell ||
    container.closest?.("[data-ar-viewport-shell='true']") ||
    container.parentElement;

  syncArViewportShell(shell);
  // Explicit adapter pass: neutralize MindAR/container sizing after create/resize.
  // Do not call renderer.setSize — session resize coordinator owns GPU buffers.
  normalizeMindArLayerStyles(container, { resizeRenderer: false });

  container.style.background = "transparent";
  container.style.isolation = "isolate";
  container.style.pointerEvents = interactive ? "auto" : "none";
  container.style.touchAction = "none";
  container.style.userSelect = "none";
  container.style.webkitUserSelect = "none";
  if (interactive) container.dataset.arInterestInteractive = "true";
  else delete container.dataset.arInterestInteractive;

  const video = container.querySelector("video");
  if (video) {
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.muted = true;
  }

  const canvases = container.querySelectorAll("canvas");
  canvases.forEach((canvas, index) => {
    canvas.style.zIndex = String(1 + index);
    canvas.style.pointerEvents = canvasPointerEvents;
    canvas.style.touchAction = "none";
  });

  const hitLayer = container.querySelector?.("[data-ar-interest-hit='true']");
  if (hitLayer instanceof HTMLElement) {
    hitLayer.style.pointerEvents = interactive ? "auto" : "none";
    hitLayer.style.touchAction = "none";
    hitLayer.style.zIndex = "8";
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
 * Video may be larger (cover crop) but its layout box must still cover the container.
 * @param {HTMLElement} container
 */
export function layersMatchContainer(container) {
  if (!container) return false;
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width < 1 || height < 1) return false;

  const canvas = container.querySelector("canvas");
  const video = container.querySelector("video");
  const cssHost = Array.from(container.children).find((node) => node.tagName === "DIV");

  const canvasOk = !canvas
    ? true
    : (() => {
        const w = Math.round(parseFloat(canvas.style.width) || canvas.clientWidth);
        const h = Math.round(parseFloat(canvas.style.height) || canvas.clientHeight);
        return Math.abs(w - width) <= 1 && Math.abs(h - height) <= 1;
      })();

  const cssOk = !cssHost
    ? true
    : (() => {
        const w = Math.round(parseFloat(cssHost.style.width) || cssHost.clientWidth);
        const h = Math.round(parseFloat(cssHost.style.height) || cssHost.clientHeight);
        return Math.abs(w - width) <= 1 && Math.abs(h - height) <= 1;
      })();

  // MindAR cover: video CSS box ≥ container, centered with negative offsets.
  const videoOk = !video
    ? true
    : (() => {
        const w = Math.round(parseFloat(video.style.width) || video.clientWidth);
        const h = Math.round(parseFloat(video.style.height) || video.clientHeight);
        return w + 1 >= width && h + 1 >= height;
      })();

  return canvasOk && cssOk && videoOk;
}

/**
 * Video metadata/resize may only request a coordinated resize — never call
 * MindAR.resize / setSize directly (single resize authority).
 * @param {{ video?: HTMLVideoElement | null } | null} mindarThree
 * @param {{
 *   container?: HTMLElement | null,
 *   shell?: HTMLElement | null,
 *   onResizeRequest?: (reason: string) => void,
 * }} [options]
 * @returns {() => void} cleanup
 */
export function bindMindArVideoResize(mindarThree, options = {}) {
  const video = mindarThree?.video;
  const onResizeRequest = options.onResizeRequest;
  if (!video || typeof onResizeRequest !== "function") return () => {};

  const run = (phase = "video-resize") => {
    try {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        onResizeRequest(phase);
      }
    } catch {
      // ignore
    }
  };

  const onMeta = () => run("loadedmetadata");
  const onVideoResize = () => run("video-element-resize");
  video.addEventListener("loadedmetadata", onMeta);
  video.addEventListener("resize", onVideoResize);
  run("video-resize-bind");

  return () => {
    video.removeEventListener("loadedmetadata", onMeta);
    video.removeEventListener("resize", onVideoResize);
  };
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

/**
 * Load the keyboard layout debugger only in Vite DEV or an explicit authoring build,
 * and only when the editor is actually requested. Public production builds resolve
 * the authoring loader to a stub via Vite alias (not tree-shaking alone).
 * @returns {Promise<{
 *   enabled: boolean,
 *   create: null | ((layer: any, options: object) => any),
 * }>}
 */
async function loadInterestObjectsDebugApi() {
  const allowAuthoring =
    Boolean(import.meta.env.DEV) ||
    (typeof __AR_AUTHORING_BUILD__ !== "undefined" && __AR_AUTHORING_BUILD__);
  if (!allowAuthoring) {
    return { enabled: false, create: null };
  }

  let queryEnabled = false;
  try {
    if (typeof window !== "undefined") {
      queryEnabled =
        new URLSearchParams(window.location.search).get("arInterestsDebug") === "1";
    }
  } catch {
    queryEnabled = false;
  }

  if (!AR_INTERESTS_DEBUG && !queryEnabled) {
    return { enabled: false, create: null };
  }

  const debugMod = await import("../authoring/interestLayoutKeyboard.js");
  return debugMod.loadInterestLayoutKeyboard();
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
  let videoResizeCleanup = null;
  /** @type {ReturnType<typeof createArSessionResizeCoordinator> | null} */
  let resizeCoordinator = null;
  let interestLayer = null;
  let interestAnimation = null;
  let interestDebug = null;
  let interestTap = null;
  let poseStabilizer = null;
  let presentationRoot = null;
  let presentationLighting = null;
  let lastFrameTimeMs = 0;
  let sessionResetTimer = 0;
  let sessionBlobUrl = null;
  /** @type {HTMLElement | null} */
  let sessionContainer = null;
  /** @type {ReturnType<typeof createArCrashDiagMonitor> | null} */
  let crashDiagMonitor = null;
  /** @type {null | (() => Promise<void>)} */
  let lightweightDiagCleanup = null;
  /** @type {(() => void) | null} */
  let videoFrameCounterCleanup = null;

  /** Opt-in rotate audit only — never throws into the adapter path. */
  function auditNote(kind, extra) {
    if (typeof window === "undefined") return;
    try {
      window.__arRotateAudit?.note?.(kind, extra);
    } catch {
      // Diagnostics must never affect WebAR.
    }
  }

  function clearAuditHealthProvider() {
    if (typeof window === "undefined") return;
    try {
      window.__arRotateAudit?.setHealthProvider?.(null);
    } catch {
      // ignore
    }
  }

  function bindAuditHealthProvider(renderer, layer, frameStats) {
    if (typeof window === "undefined") return;
    try {
      const runtimeVariant = getArRuntimeFlags().arRuntimeVariant;
      window.__arRotateAudit?.setHealthProvider?.(() => {
        try {
          const video = mindarThree?.video;
          const stream =
            typeof MediaStream !== "undefined" &&
            video?.srcObject instanceof MediaStream
              ? video.srcObject
              : null;
          const track = stream?.getVideoTracks?.()?.[0] ?? null;
          const info = renderer?.info;
          const canvas = renderer?.domElement;
          const cssWidth = canvas?.clientWidth ?? null;
          const cssHeight = canvas?.clientHeight ?? null;
          const drawingWidth = canvas?.width ?? null;
          const drawingHeight = canvas?.height ?? null;
          const pixelRatio =
            typeof renderer?.getPixelRatio === "function"
              ? renderer.getPixelRatio()
              : null;
          const estimatedPixels =
            typeof drawingWidth === "number" && typeof drawingHeight === "number"
              ? drawingWidth * drawingHeight
              : null;
          const tri = countObject3DTriangles(layer?.placement ?? presentationRoot);
          const timing = frameStats?.consume?.() ?? null;
          const gestureMode =
            interestTap?.getGestureMode?.() ??
            window.__arRotateAudit?.last?.gestureMode ??
            null;
          const activePointerId =
            typeof interestTap?.getActivePointerId === "function"
              ? interestTap.getActivePointerId()
              : null;
          return {
            runtimeVariant: arRuntimeVariantSnapshotLabel(runtimeVariant),
            geometries: info?.memory?.geometries ?? null,
            textures: info?.memory?.textures ?? null,
            programs: Array.isArray(info?.programs) ? info.programs.length : null,
            renderCalls: info?.render?.calls ?? null,
            triangles: info?.render?.triangles ?? null,
            canvasWidth: drawingWidth,
            canvasHeight: drawingHeight,
            cssCanvasWidth: cssWidth,
            cssCanvasHeight: cssHeight,
            drawingBufferWidth: drawingWidth,
            drawingBufferHeight: drawingHeight,
            pixelRatio,
            estimatedPixelsPerFrame: estimatedPixels,
            sceneTriangles: tri.sceneTriangles,
            visibleTriangles: tri.visibleTriangles,
            visibleMeshes: tri.visibleMeshes,
            trackReadyState: track?.readyState ?? null,
            trackMuted: track ? Boolean(track.muted) : null,
            trackEnabled: track ? Boolean(track.enabled) : null,
            interestEntries: Array.isArray(layer?.entries) ? layer.entries.length : null,
            rendererAvailable: Boolean(renderer),
            gestureMode,
            pointerId: gestureMode === "idle" ? null : activePointerId,
            rafHz: timing?.rafHz ?? null,
            longestFrameMs: timing?.longestFrameMs ?? null,
            avgFrameMs: timing?.avgFrameMs ?? null,
            layoutProjectionUpdates: timing?.layoutProjectionUpdates ?? null,
          };
        } catch {
          return null;
        }
      });
    } catch {
      // ignore
    }
  }

  function createFrameStats() {
    let frames = 0;
    let sumMs = 0;
    let maxMs = 0;
    let layoutProjectionUpdates = 0;
    let intervalStart =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    return {
      record(dtMs) {
        const dt = Number(dtMs);
        if (!Number.isFinite(dt) || dt < 0) return;
        frames += 1;
        sumMs += dt;
        if (dt > maxMs) maxMs = dt;
      },
      recordLayoutProjection() {
        layoutProjectionUpdates += 1;
      },
      consume() {
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        const elapsed = Math.max(0, now - intervalStart);
        const out = {
          rafHz: elapsed > 0 ? (frames * 1000) / elapsed : null,
          longestFrameMs: frames ? maxMs : null,
          avgFrameMs: frames ? sumMs / frames : null,
          layoutProjectionUpdates,
          sampleIntervalMs: elapsed,
          frames,
        };
        frames = 0;
        sumMs = 0;
        maxMs = 0;
        layoutProjectionUpdates = 0;
        intervalStart = now;
        return out;
      },
    };
  }

  /** Shared in-flight cleanup — concurrent stop/cleanup callers await the same Promise. */
  /** @type {Promise<void> | null} */
  let cleanupPromise = null;
  /** Invalidates async load callbacks from prior AR sessions. */
  let sessionGeneration = 0;
  /** @type {number[]} */
  let lifecycleTimers = [];

  function clearSessionReset() {
    if (sessionResetTimer) {
      clearTimeout(sessionResetTimer);
      sessionResetTimer = 0;
    }
  }

  function resetSessionAtomic() {
    interestTap?.cancelActiveGesture?.();
    interestAnimation?.resetSession();
  }

  /**
   * Single cleanup authority for start-failure, stop, and reopen.
   * Concurrent callers share one in-flight Promise; later stops are safe no-ops.
   * @returns {Promise<void>}
   */
  function cleanupSession() {
    if (cleanupPromise) return cleanupPromise;

    cleanupPromise = (async () => {
      running = false;
      // Bump first so in-flight promise callbacks from this session become no-ops.
      sessionGeneration += 1;
      clearSessionReset();
      auditNote("cleanupStarted", { cleanupReason: "cleanupSession" });
      auditNote("cleanupSession", {
        cleanupReason: "cleanupSession",
      });
      clearAuditHealthProvider();

      try {
        videoFrameCounterCleanup?.();
      } catch {
        // ignore
      }
      videoFrameCounterCleanup = null;

      try {
        await lightweightDiagCleanup?.();
      } catch {
        // ignore
      }
      lightweightDiagCleanup = null;

      try {
        crashDiagMonitor?.dispose?.();
      } catch {
        // ignore
      }
      crashDiagMonitor = null;

      try {
        viewportCleanup?.();
      } catch {
        // ignore
      }
      viewportCleanup = null;

      try {
        videoResizeCleanup?.();
      } catch {
        // ignore
      }
      videoResizeCleanup = null;

      try {
        resizeCoordinator?.dispose?.();
      } catch {
        // ignore
      }
      resizeCoordinator = null;

      lifecycleTimers.forEach((id) => clearTimeout(id));
      lifecycleTimers = [];

      try {
        interestTap?.dispose();
      } catch {
        // ignore
      }
      interestTap = null;

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

      // Stop the render loop before MindAR/camera teardown (also covers partial init
      // where rafLoop was never assigned but the renderer already exists).
      // Clear exactly once — rafLoop and instance.renderer are the same object when live.
      try {
        const loopTarget = rafLoop || instance?.renderer;
        if (loopTarget?.setAnimationLoop) {
          loopTarget.setAnimationLoop(null);
        }
      } catch {
        // ignore
      }
      rafLoop = null;

      try {
        await instance?.stop?.();
      } catch {
        // Best-effort cleanup — continue even if MindAR stop throws.
      }

      // Belt-and-suspenders if MindAR stop left tracks or CSS DOM behind.
      try {
        const stream = instance?.video?.srcObject;
        const tracks =
          stream && typeof stream.getTracks === "function" ? stream.getTracks() : [];
        for (const track of tracks) {
          try {
            if (track && track.readyState !== "ended") track.stop();
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
      try {
        instance?.video?.remove?.();
      } catch {
        // ignore
      }
      try {
        instance?.cssRenderer?.domElement?.remove?.();
      } catch {
        // ignore
      }
      try {
        instance?.renderer?.domElement?.remove?.();
      } catch {
        // ignore
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

      // Adapter owns session DOM clearing after MindAR stop (video/canvas/css host).
      const container = sessionContainer || instance?.container || null;
      sessionContainer = null;
      if (container) {
        try {
          container.innerHTML = "";
        } catch {
          // ignore
        }
      }
    })().finally(() => {
      auditNote("cleanupCompleted", { cleanupReason: "cleanupSession" });
      cleanupPromise = null;
    });

    return cleanupPromise;
  }

  return {
    isRunning: () => running,

    async start(container, callbacks = {}) {
      auditNote("adapterStartRequested", {});
      auditNote("start", {});
      // Serialize against any prior start/stop: wait for in-flight cleanup, then begin.
      // P1-1: start() always begins with stop()/cleanupSession (provisional when idle).
      await this.stop();

      sessionContainer = container;

      const crashDiagMode = getArRuntimeFlags().arCrashDiag;
      const crashCaps = getArCrashDiagCapabilities(crashDiagMode);
      if (crashDiagMode) {
        crashDiagMonitor = createArCrashDiagMonitor(crashDiagMode);
        auditNote("crashDiagStart", {
          mode: crashDiagMode,
          capabilities: crashCaps,
        });
      }

      // CAMERA_ONLY / CAMERA_PLUS_RENDER: no MindAR, no .mind fetch.
      if (crashDiagMode === "camera" || crashDiagMode === "render") {
        const sessionToken = ++sessionGeneration;
        try {
          const lightweight = await startArCrashDiagLightweightSession({
            mode: crashDiagMode,
            container,
            monitor: crashDiagMonitor,
            callbacks,
            getSessionGeneration: () => sessionGeneration,
            sessionToken,
          });
          if (sessionGeneration !== sessionToken || cleanupPromise || sessionContainer !== container) {
            await lightweight.cleanup();
            await cleanupSession();
            return;
          }
          lightweightDiagCleanup = lightweight.cleanup;
          rafLoop = lightweight.rafLoop;
          running = true;
          auditNote("adapterStartSucceeded", {
            runtimeVariant: arRuntimeVariantSnapshotLabel(
              getArRuntimeFlags().arRuntimeVariant,
            ),
            crashDiag: crashDiagMode,
          });
          return;
        } catch (error) {
          auditNote("adapterStartFailed", {
            message: error instanceof Error ? error.message : String(error),
            crashDiag: crashDiagMode,
          });
          const stillOwner = sessionContainer === container && !cleanupPromise;
          await cleanupSession();
          if (!stillOwner) return;
          const err = error instanceof Error ? error : new Error(String(error));
          if (/NotAllowed|Permission|security/i.test(err.message)) {
            callbacks.onUnsupported?.("camera-denied");
          } else {
            callbacks.onError?.(err);
          }
          return;
        }
      }

      const targetBuffer = await loadArTargetBuffer(targetSrc);
      if (cleanupPromise || !sessionContainer) {
        // Stop/unmount won the race during target fetch.
        await cleanupSession();
        return;
      }
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

        if (cleanupPromise || sessionContainer !== container) {
          await cleanupSession();
          return;
        }

        const shell = findViewportShell(container);
        syncArViewportShell(shell);
        syncTrackingContainerToShell(container, shell);
        recordArViewportLifecycle(shell, "before-mindar-construct");

        mindarThree = new MindARThree({
          container,
          imageTargetSrc: sessionBlobUrl,
          // Restore last deployed usable baseline (84e81d5); 0.001/1000 was nearly unusable on device.
          filterMinCF: 0.0001,
          filterBeta: 0.001,
          warmupTolerance: 5,
          missTolerance: 10,
          uiLoading: "no",
          uiScanning: "no",
          uiError: "no",
        });
        // Adapter assumes resize ownership immediately — MindAR must not keep an
        // independent window.resize → setSize path alongside the coordinator.
        detachMindArWindowResizeListener(mindarThree);
        disableUnusedMindArCss3d(mindarThree);

        const { renderer, scene, camera } = mindarThree;
        configureInterestRenderer(THREE, renderer);
        const runtimeVariant = getArRuntimeFlags().arRuntimeVariant;
        applyArRuntimeVariantPixelRatio(renderer, runtimeVariant);
        auditNote("rendererCreated", {
          runtimeVariant: arRuntimeVariantSnapshotLabel(runtimeVariant),
          crashDiag: crashDiagMode,
        });
        if (crashDiagMonitor && mindarThree.controller) {
          crashDiagMonitor.instrumentController(mindarThree.controller);
        }
        presentationLighting = crashCaps.interestContent
          ? createInterestLighting(THREE, scene)
          : null;
        recordArViewportLifecycle(shell, "after-mindar-construct");

        // MindAR anchor (raw)
        //   → presentation (rigid identity / filtered)
        //     → interest objects placement
        const anchor = mindarThree.addAnchor(0);
        if (showAnchorProof && crashCaps.interestContent) {
          anchor.group.add(createAnchorProofObject(THREE));
        }

        presentationRoot = new THREE.Group();
        presentationRoot.name = "ar-interest-objects-presentation";
        presentationRoot.userData.kind = "ar-interest-objects-presentation";
        presentationRoot.matrixAutoUpdate = false;
        anchor.group.add(presentationRoot);

        const interestDebugApi = crashCaps.interestContent
          ? await loadInterestObjectsDebugApi()
          : { enabled: false, create: null };
        const debugEnabled = interestDebugApi.enabled;
        setArRuntimeAuditState({
          trackingAdapter: "MindARTrackingAdapter",
          arComponent: "ARCameraView/ARTrackingScene",
        });
        recordArRuntimeAuditPhase("mindar-adapter-start", {
          searchNow: typeof location !== "undefined" ? location.search : "",
          crashDiag: crashDiagMode,
        });
        // Isolate this start() from any prior in-flight interest load callbacks.
        const sessionToken = ++sessionGeneration;
        /** @type {ReturnType<typeof createInterestObjectsLayer> | null} */
        let sessionLayer = null;
        /** @type {ReturnType<typeof createInterestObjectsAnimation> | null} */
        let sessionAnim = null;

        // Mount empty placeholders immediately — do not block the camera on GLBs.
        const interestItems = crashCaps.interestContent
          ? resolveInterestItemsForVariant(runtimeVariant)
          : [];
        sessionLayer = createInterestObjectsLayer(THREE, {
          items: interestItems,
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
          items: interestItems,
        });
        interestAnimation = sessionAnim;

        poseStabilizer = createAnchorPoseStabilizer(THREE, {
          rawAnchor: anchor.group,
          presentation: presentationRoot,
          config: INTEREST_OBJECTS_STABILIZATION,
          onAcquisitionReady: () => {
            if (sessionGeneration !== sessionToken) return;
            if (interestAnimation !== sessionAnim || !sessionAnim) return;
            sessionAnim.onAcquisitionReady();
          },
        });

        if (debugEnabled && interestDebugApi.create) {
          interestDebug = interestDebugApi.create(sessionLayer, {
            enabled: true,
            THREE,
            rawAnchor: anchor.group,
            presentation: presentationRoot,
            poseStabilizer,
          });
        }

        anchor.onTargetFound = () => {
          if (sessionGeneration !== sessionToken) return;
          clearSessionReset();
          poseStabilizer?.onTargetFound();
          if (typeof window !== "undefined") {
            window.__arRotateAudit?.note?.("targetFound", {});
          }
          callbacks.onTargetFound?.();
        };
        anchor.onTargetLost = () => {
          if (sessionGeneration !== sessionToken) return;
          poseStabilizer?.onTargetLost();
          clearSessionReset();
          if (typeof window !== "undefined") {
            window.__arRotateAudit?.note?.("targetLost", {});
          }
          interestTap?.cancelActiveGesture?.();
          interestTap?.close?.({ animate: true });
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

        recordArViewportLifecycle(shell, "before-mindar-start");
        await mindarThree.start();
        auditNote("mindarStartCompleted", {});
        if (crashDiagMonitor && mindarThree.controller) {
          // Controller may be created inside start(); instrument again safely.
          crashDiagMonitor.instrumentController(mindarThree.controller);
        }
        if (crashDiagMonitor) {
          crashDiagMonitor.mountHud(shell);
          videoFrameCounterCleanup = crashDiagMonitor.bindVideoFrameCounter(
            mindarThree.video,
          );
        }
        if (
          typeof MediaStream !== "undefined" &&
          mindarThree.video?.srcObject instanceof MediaStream
        ) {
          auditNote("cameraStreamActive", {});
        }

        // FROZEN_TRACKING: stop MindAR processVideo after first stable pose emit.
        if (crashCaps.freezeAfterAcquire && mindarThree.controller) {
          const controller = mindarThree.controller;
          const prevOnUpdate = controller.onUpdate;
          controller.onUpdate = (evt) => {
            try {
              prevOnUpdate?.(evt);
            } catch {
              // ignore
            }
            if (
              !crashDiagMonitor?.isFrozen?.() &&
              evt?.type === "updateMatrix" &&
              evt.worldMatrix
            ) {
              crashDiagMonitor?.markFrozen?.();
              queueMicrotask(() => {
                try {
                  controller.stopProcessVideo?.();
                  crashDiagMonitor?.note?.("trackingStoppedAfterAcquire");
                } catch {
                  // ignore
                }
              });
            }
          };
        }

        // Close/unmount during getUserMedia or init: do not revive the session.
        if (sessionGeneration !== sessionToken || cleanupPromise || sessionContainer !== container) {
          await cleanupSession();
          return;
        }

        recordArViewportLifecycle(shell, "after-mindar-start", {
          mindArInline: {
            video: mindarThree.video
              ? {
                  width: mindarThree.video.style.width,
                  height: mindarThree.video.style.height,
                  left: mindarThree.video.style.left,
                  top: mindarThree.video.style.top,
                }
              : null,
          },
        });

        /** Dirty-flag for application Three renders (MindAR TF loop stays independent). */
        let renderDirty = true;
        const invalidateRender = () => {
          renderDirty = true;
        };

        const hasDrawableContent = () => {
          if (showAnchorProof) return true;
          const placement = interestLayer?.placement ?? presentationRoot;
          if (!placement || placement.visible === false) return false;
          let found = false;
          placement.traverse?.((node) => {
            if (found) return;
            if (node.isMesh && node.visible !== false) found = true;
          });
          return found;
        };

        resizeCoordinator = createArSessionResizeCoordinator({
          getSessionGeneration: () => sessionGeneration,
          sessionToken,
          getMindarThree: () => mindarThree,
          getContainer: () => sessionContainer,
          getShell: () => shell,
          getRuntimeVariant: () => getArRuntimeFlags().arRuntimeVariant,
          useCss3d: false,
          applyCameraLayers: (layerContainer, layerRenderer) => {
            applyCameraLayerStacking(layerContainer, layerRenderer, {
              canvasPointerEvents: "auto",
              shell,
            });
          },
          onApplied: () => {
            invalidateRender();
          },
        });
        resizeCoordinator.assumeOwnership(mindarThree);
        // Deterministic first apply (video dimensions known after start).
        resizeCoordinator.flushNow("after-first-normalize", { force: true });

        videoResizeCleanup = bindMindArVideoResize(mindarThree, {
          container,
          shell,
          onResizeRequest: (reason) => {
            resizeCoordinator?.request(reason, { force: true });
          },
        });

        const frameStats = createFrameStats();

        interestTap = crashCaps.interestContent
          ? createInterestObjectsTapController({
              THREE,
              layer: sessionLayer,
              camera,
              domElement: renderer.domElement,
              container,
              shell,
              disableCardLayoutProjection: shouldDisableCardLayoutProjection(runtimeVariant),
              onLayoutProjectionUpdate: () => frameStats.recordLayoutProjection(),
            })
          : null;
        auditNote("interactionControllerInstalled", {
          runtimeVariant: arRuntimeVariantSnapshotLabel(runtimeVariant),
          crashDiag: crashDiagMode,
        });
        bindAuditHealthProvider(renderer, sessionLayer, frameStats);
        recordArRuntimeAuditPhase("interest-tap-controller-created", {
          hasHitLayer: Boolean(interestTap?.hitLayer),
          runtimeVariant: arRuntimeVariantSnapshotLabel(runtimeVariant),
          crashDiag: crashDiagMode,
        });

        const onViewportChange = () => {
          if (!running || !mindarThree || !resizeCoordinator) return;
          resizeCoordinator.request("viewport-change");
        };

        // Unmount/stop may have won after MindAR start but before we go live.
        if (sessionGeneration !== sessionToken || cleanupPromise || sessionContainer !== container) {
          await cleanupSession();
          return;
        }

        running = true;
        auditNote("adapterStartSucceeded", {
          runtimeVariant: arRuntimeVariantSnapshotLabel(runtimeVariant),
          crashDiag: crashDiagMode,
        });
        // Coordinator owns rAF coalesce — bind listeners without a second coalesce layer.
        viewportCleanup = bindArViewportListeners(onViewportChange, { coalesce: false });

        // Re-check after listener bind: a concurrent stop must not deliver onReady.
        if (sessionGeneration !== sessionToken || cleanupPromise || sessionContainer !== container) {
          await cleanupSession();
          return;
        }

        // Invalidate on visibility / interaction transitions (closures above are live).
        const prevFound = anchor.onTargetFound;
        const prevLost = anchor.onTargetLost;
        anchor.onTargetFound = () => {
          invalidateRender();
          prevFound?.();
        };
        anchor.onTargetLost = () => {
          invalidateRender();
          prevLost?.();
        };

        callbacks.onReady?.();

        let firstFrameRecorded = false;
        lastFrameTimeMs = performance.now();

        if (!crashCaps.threeRender) {
          // MINDAR_NO_RENDER: keep MindAR TF/worker loop; do not own a Three render loop.
          rafLoop = null;
          crashDiagMonitor?.note?.("threeRenderDisabled");
        } else {
          // Exactly one application-owned Three loop per session.
          renderer.setAnimationLoop((frameTime) => {
            if (sessionGeneration !== sessionToken) return;
            const tNow = typeof frameTime === "number" ? frameTime : performance.now();
            const dtSec = Math.min(0.1, Math.max(0, (tNow - lastFrameTimeMs) / 1000));
            lastFrameTimeMs = tNow;

            const anchorVisible = Boolean(anchor.visible);
            const animPlaying = interestAnimation?.isPlaying?.() === true;
            const gestureMode = interestTap?.getGestureMode?.() ?? "idle";
            const interacting = gestureMode !== "idle";
            const cardOpen = Boolean(interestTap?.getOpenId?.());
            const drawable = hasDrawableContent();
            const continuous =
              (anchorVisible && drawable) || animPlaying || interacting;

            // Pose filter must advance while tracking even if we skip a draw.
            poseStabilizer?.update(dtSec);
            // Card projection / gesture follow-up only when relevant (avoid per-frame DOM).
            if (cardOpen || interacting) {
              interestTap?.update?.();
            }

            if (!continuous && !renderDirty) {
              return;
            }

            frameStats.record(dtSec * 1000);
            renderer.render(scene, camera);
            crashDiagMonitor?.bump?.("renderFrames");
            crashDiagMonitor?.sampleRenderer?.(renderer);
            renderDirty = continuous;
            if (!firstFrameRecorded) {
              firstFrameRecorded = true;
              recordArViewportLifecycle(shell, "first-frame");
            }
          });
          rafLoop = renderer;
        }

        lifecycleTimers.push(
          window.setTimeout(() => {
            if (sessionGeneration !== sessionToken) return;
            resizeCoordinator?.request("after-500ms", { force: true });
          }, 500),
        );
      } catch (error) {
        auditNote("adapterStartFailed", {
          message: error instanceof Error ? error.message : String(error),
        });
        // Capture ownership before cleanup clears sessionContainer / sets cleanupPromise.
        const stillOwner = sessionContainer === container && !cleanupPromise;
        await cleanupSession();
        // Stop/unmount already invalidated this start — stay silent (not a user-facing error).
        if (!stillOwner) return;
        const err = error instanceof Error ? error : new Error(String(error));
        if (isTargetLoadError(err)) {
          callbacks.onUnsupported?.("target-unavailable");
        } else {
          callbacks.onError?.(err);
        }
      }
    },

    /**
     * Awaitable session teardown. Concurrent callers receive the same in-flight
     * cleanup Promise (not a wrapper), so identity and settlement stay shared.
     * @returns {Promise<void>}
     */
    stop() {
      auditNote("adapterStopRequested", {});
      auditNote("stop", {});
      return cleanupSession();
    },
  };
}
