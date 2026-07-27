import { ANCHOR_POSE_STABILIZATION } from "./anchorPoseStabilizationConfig";

/**
 * Exponential smoothing weight for a time constant tau (seconds).
 * @param {number} dtSec
 * @param {number} tauSec
 */
export function smoothingAlpha(dtSec, tauSec) {
  if (!(dtSec > 0)) return 0;
  if (!(tauSec > 0)) return 1;
  return 1 - Math.exp(-dtSec / tauSec);
}

/**
 * Ensure quaternion `candidate` lies on the same hemisphere as `reference`.
 * @param {import("three").Quaternion} reference
 * @param {import("three").Quaternion} candidate
 * @param {import("three").Quaternion} out
 */
export function alignQuaternionHemisphere(reference, candidate, out) {
  out.copy(candidate);
  if (reference.dot(out) < 0) {
    out.x = -out.x;
    out.y = -out.y;
    out.z = -out.z;
    out.w = -out.w;
  }
  return out;
}

/**
 * Stable presentation filter between a raw MindAR anchor and the professional card.
 *
 * Scene graph:
 *   rawAnchor (MindAR)
 *     → presentation (this writer; world pose = filtered)
 *       → professional card root / animation / geometry
 *
 * The presentation group counters the noisy parent so its world pose tracks the
 * filtered pose, while card-local animation stays in target-local coordinates.
 *
 * @param {typeof import("three")} THREE
 * @param {{
 *   rawAnchor: import("three").Object3D,
 *   presentation: import("three").Object3D,
 *   config?: typeof ANCHOR_POSE_STABILIZATION,
 *   now?: () => number,
 *   onAcquisitionReady?: () => void,
 * }} options
 */
export function createAnchorPoseStabilizer(THREE, options) {
  const config = { ...ANCHOR_POSE_STABILIZATION, ...options.config };
  const rawAnchor = options.rawAnchor;
  const presentation = options.presentation;
  const now = options.now ?? (() => performance.now());
  const onAcquisitionReady = options.onAcquisitionReady;

  presentation.name = presentation.name || "ar-professional-card-presentation";
  presentation.matrixAutoUpdate = false;

  /** @type {"idle"|"acquiring"|"tracking"|"frozen"|"blending"} */
  let state = "idle";
  let disposed = false;
  let hasFilter = false;
  let acquisitionStartedAt = 0;
  let sessionResetTimer = 0;
  let blendElapsedMs = 0;
  let readyNotified = false;

  // Preallocated — no per-frame heap traffic for core math.
  const rawPos = new THREE.Vector3();
  const rawQuat = new THREE.Quaternion();
  const rawScale = new THREE.Vector3();
  const smoothPos = new THREE.Vector3();
  const smoothQuat = new THREE.Quaternion();
  const smoothScale = new THREE.Vector3(1, 1, 1);
  const targetPos = new THREE.Vector3();
  const targetQuat = new THREE.Quaternion();
  const targetScale = new THREE.Vector3(1, 1, 1);
  const blendFromPos = new THREE.Vector3();
  const blendFromQuat = new THREE.Quaternion();
  const blendFromScale = new THREE.Vector3(1, 1, 1);
  const displayPos = new THREE.Vector3();
  const displayQuat = new THREE.Quaternion();
  const displayScale = new THREE.Vector3(1, 1, 1);
  const alignedQuat = new THREE.Quaternion();
  const avgPos = new THREE.Vector3();
  const avgQuat = new THREE.Quaternion();
  const avgScale = new THREE.Vector3();
  const sampleQuat = new THREE.Quaternion();
  const matRaw = new THREE.Matrix4();
  const matSmooth = new THREE.Matrix4();
  const matInv = new THREE.Matrix4();
  const identityScale = new THREE.Vector3(1, 1, 1);

  /** @type {Array<{ pos: import("three").Vector3, quat: import("three").Quaternion, scale: import("three").Vector3 }>} */
  const acquisitionSamples = [];

  function clearSessionResetTimer() {
    if (sessionResetTimer) {
      clearTimeout(sessionResetTimer);
      sessionResetTimer = 0;
    }
  }

  function isFiniteVec3(v) {
    return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
  }

  function isFiniteQuat(q) {
    return (
      Number.isFinite(q.x) &&
      Number.isFinite(q.y) &&
      Number.isFinite(q.z) &&
      Number.isFinite(q.w)
    );
  }

  /**
   * Read the MindAR-authored anchor matrix.
   *
   * MindAR sets `anchor.group.matrixAutoUpdate = false` and writes `group.matrix`
   * directly each tracking update. Calling `updateMatrix()` would recompose from
   * default position/quaternion/scale and destroy the tracked pose (identity).
   */
  function readRawPose() {
    matRaw.copy(rawAnchor.matrix);
    matRaw.decompose(rawPos, rawQuat, rawScale);
    return (
      isFiniteVec3(rawPos) &&
      isFiniteQuat(rawQuat) &&
      isFiniteVec3(rawScale) &&
      Math.abs(rawScale.x) > 1e-8 &&
      Math.abs(rawScale.y) > 1e-8 &&
      Math.abs(rawScale.z) > 1e-8
    );
  }

  /**
   * Authoritative writer: presentation local = inv(rawMatrix) * display
   * so world(presentation) == display while remaining under the MindAR anchor.
   * @param {import("three").Vector3} pos
   * @param {import("three").Quaternion} quat
   * @param {import("three").Vector3} scale
   */
  function writePresentation(pos, quat, scale) {
    if (!isFiniteVec3(pos) || !isFiniteQuat(quat) || !isFiniteVec3(scale)) return;
    matSmooth.compose(pos, quat, scale);
    // Use the MindAR matrix as-is — never updateMatrix() on the raw anchor.
    matInv.copy(rawAnchor.matrix);
    if (Math.abs(matInv.determinant()) < 1e-12) return;
    matInv.invert();
    presentation.matrix.multiplyMatrices(matInv, matSmooth);
    presentation.matrixWorldNeedsUpdate = true;
  }

  function writeFilteredPresentation() {
    writePresentation(smoothPos, smoothQuat, smoothScale);
  }

  /** Stick presentation to the raw MindAR pose (no lag / no inverse counter-matrix). */
  function writeRigidPassthrough() {
    presentation.matrix.identity();
    presentation.matrixWorldNeedsUpdate = true;
  }

  const rigidAttachment = Boolean(config.rigidAttachment);

  function resetFilter() {
    hasFilter = false;
    readyNotified = false;
    blendElapsedMs = 0;
    acquisitionSamples.length = 0;
    acquisitionStartedAt = 0;
    smoothPos.set(0, 0, 0);
    smoothQuat.identity();
    smoothScale.copy(identityScale);
    presentation.matrix.identity();
    presentation.matrixWorldNeedsUpdate = true;
  }

  function averageAcquisitionSamples() {
    avgPos.set(0, 0, 0);
    avgScale.set(0, 0, 0);
    avgQuat.set(0, 0, 0, 0);
    const count = acquisitionSamples.length;
    if (count === 0) {
      readRawPose();
      avgPos.copy(rawPos);
      avgQuat.copy(rawQuat);
      avgScale.copy(rawScale);
      return;
    }

    const ref = acquisitionSamples[0].quat;
    for (let i = 0; i < count; i += 1) {
      const sample = acquisitionSamples[i];
      avgPos.add(sample.pos);
      avgScale.add(sample.scale);
      alignQuaternionHemisphere(ref, sample.quat, sampleQuat);
      avgQuat.x += sampleQuat.x;
      avgQuat.y += sampleQuat.y;
      avgQuat.z += sampleQuat.z;
      avgQuat.w += sampleQuat.w;
    }
    avgPos.multiplyScalar(1 / count);
    avgScale.multiplyScalar(1 / count);
    avgQuat.normalize();
  }

  function initFilterFromAverage() {
    averageAcquisitionSamples();
    smoothPos.copy(avgPos);
    smoothQuat.copy(avgQuat);
    smoothScale.copy(avgScale);
    hasFilter = true;
  }

  function pushAcquisitionSample() {
    if (!readRawPose()) return false;
    acquisitionSamples.push({
      pos: rawPos.clone(),
      quat: rawQuat.clone(),
      scale: rawScale.clone(),
    });
    // Bound memory if a frame loop runs hot during acquisition.
    if (acquisitionSamples.length > 48) {
      acquisitionSamples.shift();
    }
    return true;
  }

  function shouldFinishAcquisition(elapsedMs) {
    const samples = acquisitionSamples.length;
    if (samples < 1) return false;
    if (elapsedMs >= config.acquisitionMs && samples >= config.minAcquisitionSamples) {
      return true;
    }
    // Bounded visibility invariant: never stay hidden indefinitely while found.
    const maxMs = config.maxAcquisitionMs ?? Math.max(config.acquisitionMs * 2, 900);
    return elapsedMs >= maxMs;
  }

  function applyDeadZone() {
    targetPos.copy(rawPos);
    alignQuaternionHemisphere(smoothQuat, rawQuat, targetQuat);
    targetScale.copy(rawScale);

    if (smoothPos.distanceToSquared(rawPos) < config.positionDeadZone ** 2) {
      targetPos.copy(smoothPos);
    }

    const angle = smoothQuat.angleTo(targetQuat);
    if (angle < config.angularDeadZoneRad) {
      targetQuat.copy(smoothQuat);
    }

    const scaleDelta = Math.abs(smoothScale.x - rawScale.x);
    if (scaleDelta < config.scaleDeadZone) {
      targetScale.copy(smoothScale);
    }
  }

  function dampTowardTargets(dtSec) {
    const posAlpha = smoothingAlpha(dtSec, config.translationTauSec);
    const rotAlpha = smoothingAlpha(dtSec, config.rotationTauSec);
    const scaleAlpha = smoothingAlpha(dtSec, config.scaleTauSec);

    smoothPos.lerp(targetPos, posAlpha);
    alignQuaternionHemisphere(smoothQuat, targetQuat, alignedQuat);
    smoothQuat.slerp(alignedQuat, rotAlpha);
    smoothScale.lerp(targetScale, scaleAlpha);
  }

  function finishAcquisition() {
    if (readyNotified || disposed) return;
    initFilterFromAverage();
    state = "tracking";
    readyNotified = true;
    if (rigidAttachment) writeRigidPassthrough();
    else writeFilteredPresentation();
    onAcquisitionReady?.();
  }

  function onTargetFound() {
    if (disposed) return;
    clearSessionResetTimer();

    // Quick reacquisition: keep frozen pose, blend toward new filtered samples.
    if (hasFilter && (state === "frozen" || state === "blending")) {
      blendFromPos.copy(smoothPos);
      blendFromQuat.copy(smoothQuat);
      blendFromScale.copy(smoothScale);
      blendElapsedMs = 0;
      state = "blending";
      readyNotified = true;
      // Hold the frozen world pose immediately (raw may already have moved).
      writePresentation(blendFromPos, blendFromQuat, blendFromScale);
      onAcquisitionReady?.();
      return;
    }

    if (state === "acquiring" || state === "tracking") {
      return;
    }

    state = "acquiring";
    readyNotified = false;
    acquisitionStartedAt = now();
    acquisitionSamples.length = 0;
    pushAcquisitionSample();
  }

  function onTargetLost() {
    if (disposed) return;

    if (state === "acquiring") {
      // Never started entrance — drop partial samples; no frozen pose to hold.
      state = "idle";
      acquisitionSamples.length = 0;
      acquisitionStartedAt = 0;
      clearSessionResetTimer();
      sessionResetTimer = window.setTimeout(() => {
        sessionResetTimer = 0;
        if (disposed) return;
        resetFilter();
        state = "idle";
      }, config.sessionResetMs);
      return;
    }

    if (!hasFilter) {
      state = "idle";
      return;
    }

    // Capture the last known MindAR pose before freezing (critical for rigid mode,
    // which otherwise never updates smooth* during tracking).
    if (readRawPose()) {
      smoothPos.copy(rawPos);
      smoothQuat.copy(rawQuat);
      smoothScale.copy(rawScale);
    }

    state = "frozen";
    writeFilteredPresentation();
    clearSessionResetTimer();
    sessionResetTimer = window.setTimeout(() => {
      sessionResetTimer = 0;
      if (disposed) return;
      resetFilter();
      state = "idle";
    }, config.sessionResetMs);
  }

  /**
   * @param {number} dtSec frame delta in seconds
   */
  function update(dtSec) {
    if (disposed) return;
    const dt = Math.min(Math.max(dtSec || 0, 0), 0.1);

    if (state === "idle") {
      return;
    }

    if (state === "acquiring") {
      pushAcquisitionSample();
      const elapsed = now() - acquisitionStartedAt;
      if (shouldFinishAcquisition(elapsed)) {
        finishAcquisition();
      } else {
        // Hold presentation at identity relative to raw until filter is ready —
        // card stays invisible during acquisition, so no visual pop.
        presentation.matrix.identity();
        presentation.matrixWorldNeedsUpdate = true;
      }
      return;
    }

    if (state === "frozen") {
      // Keep world pose fixed at last smooth while the raw anchor may drift/stop.
      writeFilteredPresentation();
      return;
    }

    if (rigidAttachment) {
      // Interests must inherit MindAR pose 1:1 (no translation/rotation/scale lag).
      if (state === "blending") {
        blendElapsedMs += dt * 1000;
        if (blendElapsedMs >= Math.max(1, config.reacquisitionBlendMs)) {
          state = "tracking";
        }
      }
      writeRigidPassthrough();
      return;
    }

    readRawPose();
    applyDeadZone();
    dampTowardTargets(dt);

    if (state === "blending") {
      blendElapsedMs += dt * 1000;
      const blendT = Math.min(1, blendElapsedMs / Math.max(1, config.reacquisitionBlendMs));
      // Display blends from frozen → filter; filter itself keeps tracking raw.
      displayPos.lerpVectors(blendFromPos, smoothPos, blendT);
      alignQuaternionHemisphere(blendFromQuat, smoothQuat, alignedQuat);
      displayQuat.copy(blendFromQuat).slerp(alignedQuat, blendT);
      displayScale.lerpVectors(blendFromScale, smoothScale, blendT);
      writePresentation(displayPos, displayQuat, displayScale);
      if (blendT >= 1) {
        state = "tracking";
      }
      return;
    }

    // tracking
    writeFilteredPresentation();
  }

  function dispose() {
    disposed = true;
    clearSessionResetTimer();
    resetFilter();
    state = "idle";
  }

  return {
    onTargetFound,
    onTargetLost,
    update,
    dispose,
    reset: () => {
      clearSessionResetTimer();
      resetFilter();
      state = "idle";
    },
    /** @internal */
    getState: () => ({
      state,
      hasFilter,
      readyNotified,
      sampleCount: acquisitionSamples.length,
      rigidAttachment,
      config,
      smoothPosition: smoothPos.clone(),
      smoothQuaternion: smoothQuat.clone(),
      smoothScale: smoothScale.clone(),
    }),
  };
}
