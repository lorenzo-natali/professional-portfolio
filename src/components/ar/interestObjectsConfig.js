/**
 * Central configuration for Beyond the CV — interest miniatures on the document plane.
 * Positions use document UV (u left→right, vTop top→bottom).
 *
 * Document frame (MindAR): X right, Y up-on-page, Z out of paper (standing height).
 *
 * Orientation responsibilities (do not mix):
 * - canonicalRotation — asset upright with base toward the paper, height along +Z
 * - displayYaw / displayRotation — how the miniature faces on the page (after grounding)
 * - groundOffset — small lift along document normal
 * - entrance — animation only (rise/scale/fade)
 */

/** Source GLBs under Vite `public/` (kept for pipeline / DEV compare; not live). */
export const INTEREST_OBJECTS_SOURCE_PATH = "ar/interests";

/** Live web-optimized GLBs under Vite `public/`. */
export const INTEREST_OBJECTS_BASE_PATH = "ar/interests/web";

/**
 * glTF Y-up → document Z-up (paper normal / out of paper).
 *
 * Three.js rotateX(+π/2): +Y → +Z.
 * The previous −π/2 mapped +Y → −Z and grounded models upside-down
 * (head on paper, feet toward camera). Fossil never used this remap.
 */
export const INTEREST_CANONICAL_Y_UP_TO_Z_UP = { x: Math.PI / 2, y: 0, z: 0 };

/** Already aligned with document Z-up (no remap) — fossil. */
export const INTEREST_CANONICAL_IDENTITY = { x: 0, y: 0, z: 0 };

/**
 * Target display sizes in document units (CV width = 1).
 * Interpreted with each item's `scaleAxis` after final orientation.
 * Phone-tuned production sizes (document width = 1).
 */
export const INTEREST_TARGET_SIZES = {
  book: 0.199924,
  backpack: 0.26792,
  plant: 0.229734,
  robot: 0.271292,
  fossil: 0.326418,
  "evil-eye": 0.275096,
};

/**
 * Fossil-specific museum pose (not the shared Y-up remap).
 * Native tallest axis is Z (snout↔occiput length). Identity grounded that length
 * on +Z, so the skull rested on a lateral/wrong face. rotateX(+π/2) maps native
 * +Y (cranial vault “up”) → document +Z and lays length into the page plane.
 */
export const INTEREST_FOSSIL_CANONICAL = { x: Math.PI / 2, y: 0, z: 0 };

/**
 * Rigid CV attachment: presentation stays identity under the MindAR anchor.
 * Avoids professional-card pose lag that made miniatures slip vs the paper.
 */
export const INTEREST_OBJECTS_STABILIZATION = {
  rigidAttachment: true,
  acquisitionMs: 160,
  minAcquisitionSamples: 3,
  maxAcquisitionMs: 480,
  translationTauSec: 0,
  rotationTauSec: 0,
  scaleTauSec: 0,
  positionDeadZone: 0,
  angularDeadZoneRad: 0,
  scaleDeadZone: 0,
  reacquisitionBlendMs: 60,
};

export const INTEREST_ENTRANCE = {
  durationMs: 480,
  /** Local drop along document normal before rise. */
  riseFromZ: -0.018,
  startScale: 0.82,
  endScale: 1,
};

export const INTEREST_APPEARANCE_ORDER = [
  "book",
  "evil-eye",
  "robot",
  "fossil",
  "plant",
  "backpack",
];

export const INTEREST_APPEARANCE_STAGGER_MS = 320;

/**
 * @typedef {Object} InterestObjectConfig
 * @property {string} id
 * @property {"knowledge"|"exploration"} group
 * @property {string} src
 * @property {{ u: number, vTop: number }} origin
 * @property {{ x: number, y: number, z: number }} canonicalRotation Explicit upright euler
 * @property {number} displayYaw Yaw around document Z after grounding
 * @property {{ x: number, y: number }} [displayTilt] Optional tilt after grounding (not yaw)
 * @property {number} groundOffset Lift along document normal after seating
 * @property {"+x"|"-x"|"+y"|"-y"|"+z"|"-z"} [frontAxis] Local axis that faces “forward” after canonicalRotation
 * @property {"x"|"y"|"z"|"max"} scaleAxis AABB axis used for uniform scale after orientation
 * @property {number} targetSize Desired size along scaleAxis (document units)
 * @property {number} appearanceDelayMs
 */

/** @type {InterestObjectConfig[]} */
export const INTEREST_OBJECTS = [
  {
    id: "book",
    group: "knowledge",
    src: `${INTEREST_OBJECTS_BASE_PATH}/book.glb`,
    origin: { u: 0.152529, vTop: 0.543903 },
    // Flat cover on paper after Y→Z; scale by largest paper-plane extent.
    canonicalRotation: { ...INTEREST_CANONICAL_Y_UP_TO_Z_UP },
    displayYaw: 0.341353,
    groundOffset: 0.012,
    frontAxis: "+y",
    scaleAxis: "max",
    targetSize: INTEREST_TARGET_SIZES.book,
    appearanceDelayMs: 0,
  },
  {
    id: "evil-eye",
    group: "knowledge",
    src: `${INTEREST_OBJECTS_BASE_PATH}/evil-eye.glb`,
    origin: { u: 0.231192, vTop: 0.238103 },
    canonicalRotation: { ...INTEREST_CANONICAL_Y_UP_TO_Z_UP },
    displayYaw: -0.163465,
    displayTilt: { x: 0.12, y: -0.35 },
    groundOffset: 0.012,
    frontAxis: "+y",
    scaleAxis: "z",
    targetSize: INTEREST_TARGET_SIZES["evil-eye"],
    appearanceDelayMs: INTEREST_APPEARANCE_STAGGER_MS,
  },
  {
    id: "robot",
    group: "knowledge",
    src: `${INTEREST_OBJECTS_BASE_PATH}/robot.glb`,
    origin: { u: 0.623818, vTop: 0.569126 },
    canonicalRotation: { ...INTEREST_CANONICAL_Y_UP_TO_Z_UP },
    displayYaw: -0.590886,
    groundOffset: 0.012,
    frontAxis: "+y",
    scaleAxis: "z",
    targetSize: INTEREST_TARGET_SIZES.robot,
    appearanceDelayMs: INTEREST_APPEARANCE_STAGGER_MS * 2,
  },
  {
    id: "fossil",
    group: "exploration",
    src: `${INTEREST_OBJECTS_BASE_PATH}/fossil.glb`,
    origin: { u: 0.507306, vTop: 0.318222 },
    // Explicit museum pose — not identity, not a shared heuristic with other assets.
    canonicalRotation: { ...INTEREST_FOSSIL_CANONICAL },
    displayYaw: -0.843607,
    displayTilt: { x: 0.08, y: 0 },
    groundOffset: 0.012,
    frontAxis: "+y",
    scaleAxis: "z",
    targetSize: INTEREST_TARGET_SIZES.fossil,
    appearanceDelayMs: INTEREST_APPEARANCE_STAGGER_MS * 3,
  },
  {
    id: "plant",
    group: "exploration",
    src: `${INTEREST_OBJECTS_BASE_PATH}/plant.glb`,
    origin: { u: 0.143736, vTop: 0.876186 },
    canonicalRotation: { ...INTEREST_CANONICAL_Y_UP_TO_Z_UP },
    displayYaw: 0.304357,
    groundOffset: 0.012,
    frontAxis: "+y",
    scaleAxis: "z",
    targetSize: INTEREST_TARGET_SIZES.plant,
    appearanceDelayMs: INTEREST_APPEARANCE_STAGGER_MS * 4,
  },
  {
    id: "backpack",
    group: "exploration",
    src: `${INTEREST_OBJECTS_BASE_PATH}/backpack.glb`,
    origin: { u: 0.621042, vTop: 0.890808 },
    canonicalRotation: { ...INTEREST_CANONICAL_Y_UP_TO_Z_UP },
    displayYaw: -0.548487,
    groundOffset: 0.012,
    frontAxis: "+y",
    scaleAxis: "z",
    targetSize: INTEREST_TARGET_SIZES.backpack,
    appearanceDelayMs: INTEREST_APPEARANCE_STAGGER_MS * 5,
  },
];

export function getInterestObjectConfig(id) {
  return INTEREST_OBJECTS.find((item) => item.id === id) ?? null;
}

export function resolveInterestAssetUrl(src, baseUrl = import.meta.env.BASE_URL || "/") {
  const base = String(baseUrl).endsWith("/") ? baseUrl : `${baseUrl}/`;
  const path = String(src).replace(/^\//, "");
  return `${base}${path}`;
}

/** Display euler after grounding (tilt + yaw). */
export function getInterestDisplayRotation(config) {
  return {
    x: config.displayTilt?.x ?? 0,
    y: config.displayTilt?.y ?? 0,
    z: config.displayYaw ?? 0,
  };
}
