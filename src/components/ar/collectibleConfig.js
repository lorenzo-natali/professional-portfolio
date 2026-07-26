const publicAsset = (path) => `${import.meta.env.BASE_URL}${path}`;

/** Canonical live collectible — mobile-optimized web GLB (Meshopt + resized JPEG maps). */
export const COLLECTIBLE_GLB_SRC = publicAsset("ar/collectible/collectible_web.glb");

/** Full-quality textured reference / runtime fallback if web asset fails to decode. */
export const COLLECTIBLE_TEXTURED_GLB_SRC = publicAsset(
  "ar/collectible/collectible_textured.glb",
);

/** Raw geometry retained for preview comparison + spatial-material fallback tests. */
export const COLLECTIBLE_RAW_GLB_SRC = publicAsset("ar/collectible/collectible_raw.glb");

/**
 * Fit the GLB into the existing CV-centered AR hierarchy.
 * Model native bbox ≈ 1.24 × 1.90 × 0.56 (Y-up).
 */
export const COLLECTIBLE_ORIGIN = {
  u: 0.5,
  vTop: 0.5,
};

export const COLLECTIBLE_TRANSFORM = {
  position: { x: 0, y: 0, z: 0.02 },
  /** Uniform scale so the figure reads clearly on an A4-ish tracked page. */
  scale: 0.26,
  /** Near front-facing; slight tip for depth. */
  rotation: { x: -0.08, y: 0, z: 0 },
  riseHeight: 0.045,
};

export const COLLECTIBLE_RENDERER = {
  /** Recalibrated against collectible_reference for the textured GLB. */
  toneMappingExposure: 0.82,
};

export const COLLECTIBLE_LIGHTING = {
  ambient: { color: 0xf4f6f8, intensity: 0.28 },
  hemi: { sky: 0xf2f4f7, ground: 0x8b939e, intensity: 0.4 },
  key: { color: 0xfff4e8, intensity: 0.72, position: [0.65, 1.25, 1.05] },
  fill: { color: 0xd0dae6, intensity: 0.24, position: [-0.85, 0.4, 0.7] },
  rim: { color: 0xe8eef5, intensity: 0.16, position: [0.2, 0.45, -1.0] },
};

/**
 * Premium material presets approximating the reference product shot.
 * Applied in Three.js — the GLB itself is a fused position-only mesh.
 */
export const COLLECTIBLE_MATERIALS = {
  shell: {
    color: "#1f242b",
    metalness: 0.12,
    roughness: 0.78,
    clearcoat: 0.08,
    clearcoatRoughness: 0.65,
    sheen: 0.4,
    sheenRoughness: 0.8,
    sheenColor: "#5c6570",
    opacity: 1,
  },
  acrylic: {
    color: "#f3f6f9",
    metalness: 0.0,
    roughness: 0.08,
    transmission: 0.72,
    thickness: 0.25,
    ior: 1.49,
    opacity: 0.18,
    transparent: true,
  },
  figure: {
    color: "#b7c4d4",
    metalness: 0.04,
    roughness: 0.58,
    clearcoat: 0.06,
    clearcoatRoughness: 0.55,
    sheen: 0.25,
    sheenRoughness: 0.75,
    sheenColor: "#d7dde5",
    opacity: 1,
  },
  aluminium: {
    color: "#d2d8e0",
    metalness: 0.95,
    roughness: 0.28,
    opacity: 1,
  },
  ai: {
    color: "#6fd4e4",
    metalness: 0.02,
    roughness: 0.16,
    transmission: 0.35,
    thickness: 0.35,
    emissive: "#2eb6c8",
    emissiveIntensity: 0.85,
    opacity: 0.9,
    transparent: true,
  },
  shield: {
    color: "#2f343c",
    metalness: 0.75,
    roughness: 0.34,
    opacity: 1,
  },
  satinMetal: {
    color: "#b8c0ca",
    metalness: 0.88,
    roughness: 0.36,
    opacity: 1,
  },
  darkMetal: {
    color: "#22262d",
    metalness: 0.9,
    roughness: 0.24,
    opacity: 1,
  },
  glass: {
    color: "#e8eef5",
    metalness: 0.0,
    roughness: 0.04,
    transmission: 0.85,
    thickness: 0.15,
    ior: 1.5,
    opacity: 0.28,
    transparent: true,
  },
  book: {
    color: "#14171c",
    metalness: 0.06,
    roughness: 0.82,
    opacity: 1,
  },
};
