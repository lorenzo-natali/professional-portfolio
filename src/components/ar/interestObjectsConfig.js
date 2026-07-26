/**
 * Central configuration for Beyond the CV — interest miniatures on the document plane.
 * Positions use document UV (u left→right, vTop top→bottom).
 *
 * Document frame (MindAR): X right, Y up-on-page, Z out of paper (standing height).
 */

/** Source GLBs under Vite `public/` (kept for pipeline / DEV compare; not live). */
export const INTEREST_OBJECTS_SOURCE_PATH = "ar/interests";

/** Live web-optimized GLBs under Vite `public/`. */
export const INTEREST_OBJECTS_BASE_PATH = "ar/interests/web";

/** glTF Y-up → document Z-up (paper normal). */
export const INTEREST_UPRIGHT_Y_TO_Z = { x: -Math.PI / 2, y: 0, z: 0 };

/** Already aligned with document Z-up (no remap). */
export const INTEREST_UPRIGHT_IDENTITY = { x: 0, y: 0, z: 0 };

/**
 * Target display sizes in document units (CV width = 1).
 * Interpreted with each item's `scaleAxis` after final orientation.
 * Calibrated for iPhone AR readability (first pass — still miniature, not full-page).
 */
export const INTEREST_TARGET_SIZES = {
  book: 0.16,
  backpack: 0.18,
  plant: 0.24,
  robot: 0.22,
  fossil: 0.2,
  "evil-eye": 0.1,
};

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

/** @deprecated use INTEREST_TARGET_SIZES */
export const INTEREST_TARGET_HEIGHTS = INTEREST_TARGET_SIZES;

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
 * @property {{ x: number, y: number, z: number }} position
 * @property {{ x: number, y: number, z: number }} rotation Euler after upright
 * @property {{ x: number, y: number, z: number }} upright Basis remap into document Z-up
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
    origin: { u: 0.2, vTop: 0.22 },
    position: { x: 0, y: 0, z: 0.012 },
    rotation: { x: 0, y: 0, z: 0.35 },
    upright: INTEREST_UPRIGHT_Y_TO_Z,
    // Flat cover after upright: scale by largest paper-plane extent.
    scaleAxis: "max",
    targetSize: INTEREST_TARGET_SIZES.book,
    appearanceDelayMs: 0,
  },
  {
    id: "evil-eye",
    group: "knowledge",
    src: `${INTEREST_OBJECTS_BASE_PATH}/evil-eye.glb`,
    origin: { u: 0.4, vTop: 0.18 },
    position: { x: 0, y: 0, z: 0.012 },
    rotation: { x: 0.12, y: -0.35, z: 0.08 },
    upright: INTEREST_UPRIGHT_Y_TO_Z,
    scaleAxis: "z",
    targetSize: INTEREST_TARGET_SIZES["evil-eye"],
    appearanceDelayMs: INTEREST_APPEARANCE_STAGGER_MS,
  },
  {
    id: "robot",
    group: "knowledge",
    src: `${INTEREST_OBJECTS_BASE_PATH}/robot.glb`,
    origin: { u: 0.24, vTop: 0.48 },
    position: { x: 0, y: 0, z: 0.012 },
    rotation: { x: 0, y: 0, z: 0.55 },
    upright: INTEREST_UPRIGHT_Y_TO_Z,
    scaleAxis: "z",
    targetSize: INTEREST_TARGET_SIZES.robot,
    appearanceDelayMs: INTEREST_APPEARANCE_STAGGER_MS * 2,
  },
  {
    id: "fossil",
    group: "exploration",
    src: `${INTEREST_OBJECTS_BASE_PATH}/fossil.glb`,
    origin: { u: 0.74, vTop: 0.28 },
    position: { x: 0, y: 0, z: 0.012 },
    rotation: { x: 0, y: 0, z: -0.85 },
    // Native tallest axis is Z — already document-normal aligned.
    upright: INTEREST_UPRIGHT_IDENTITY,
    scaleAxis: "z",
    targetSize: INTEREST_TARGET_SIZES.fossil,
    appearanceDelayMs: INTEREST_APPEARANCE_STAGGER_MS * 3,
  },
  {
    id: "plant",
    group: "exploration",
    src: `${INTEREST_OBJECTS_BASE_PATH}/plant.glb`,
    origin: { u: 0.76, vTop: 0.58 },
    position: { x: 0, y: 0, z: 0.012 },
    rotation: { x: 0, y: 0, z: 0.25 },
    upright: INTEREST_UPRIGHT_Y_TO_Z,
    scaleAxis: "z",
    targetSize: INTEREST_TARGET_SIZES.plant,
    appearanceDelayMs: INTEREST_APPEARANCE_STAGGER_MS * 4,
  },
  {
    id: "backpack",
    group: "exploration",
    src: `${INTEREST_OBJECTS_BASE_PATH}/backpack.glb`,
    origin: { u: 0.68, vTop: 0.78 },
    position: { x: 0, y: 0, z: 0.012 },
    rotation: { x: 0, y: 0, z: -0.5 },
    upright: INTEREST_UPRIGHT_Y_TO_Z,
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
