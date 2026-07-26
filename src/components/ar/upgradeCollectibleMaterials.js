import { COLLECTIBLE_MATERIALS } from "./collectibleConfig";

const REGION_ORDER = [
  "shell",
  "acrylic",
  "figure",
  "aluminium",
  "ai",
  "shield",
  "satinMetal",
  "darkMetal",
  "glass",
  "book",
];

const COLOR_MAP_KEYS = ["map", "emissiveMap"];
const LINEAR_MAP_KEYS = [
  "normalMap",
  "roughnessMap",
  "metalnessMap",
  "aoMap",
  "bumpMap",
  "displacementMap",
  "alphaMap",
];

/**
 * True when the imported mesh already carries usable baked shading data.
 * @param {import("three").Mesh} mesh
 */
export function meshHasBakedShading(mesh) {
  const geometry = mesh?.geometry;
  const hasNormals = Boolean(geometry?.getAttribute?.("normal"));
  const materials = Array.isArray(mesh?.material)
    ? mesh.material
    : mesh?.material
      ? [mesh.material]
      : [];
  const hasTexture = materials.some((material) =>
    [...COLOR_MAP_KEYS, ...LINEAR_MAP_KEYS].some((key) => Boolean(material?.[key])),
  );
  return hasNormals && hasTexture;
}

/**
 * Configure colour spaces on imported textures without replacing materials.
 * @param {typeof import("three")} THREE
 * @param {import("three").Material} material
 */
export function configureImportedTextureColorSpaces(THREE, material) {
  if (!material) return;

  const setSpace = (texture, kind) => {
    if (!texture) return;
    const isColor = kind === "srgb";
    if ("colorSpace" in texture) {
      if (isColor && "SRGBColorSpace" in THREE) {
        texture.colorSpace = THREE.SRGBColorSpace;
      } else if (!isColor && "LinearSRGBColorSpace" in THREE) {
        texture.colorSpace = THREE.LinearSRGBColorSpace;
      }
    }
    if ("encoding" in texture) {
      if (isColor && "sRGBEncoding" in THREE) {
        texture.encoding = THREE.sRGBEncoding;
      } else if (!isColor && "LinearEncoding" in THREE) {
        texture.encoding = THREE.LinearEncoding;
      }
    }
    texture.needsUpdate = true;
  };

  COLOR_MAP_KEYS.forEach((key) => setSpace(material[key], "srgb"));
  LINEAR_MAP_KEYS.forEach((key) => setSpace(material[key], "linear"));
}

/**
 * Mobile-safe transparency tweaks that preserve imported PBR values.
 * @param {import("three").Material} material
 */
export function sanitizeImportedTransparency(material) {
  if (!material) return;
  const transparent =
    Boolean(material.transparent) ||
    (typeof material.opacity === "number" && material.opacity < 0.999) ||
    material.alphaMode === "BLEND" ||
    (typeof material.transmission === "number" && material.transmission > 0);

  if (!transparent) {
    material.userData.baseOpacity = material.opacity ?? 1;
    return;
  }

  material.transparent = true;
  // Keep internals visible: avoid writing depth for light alpha / transmission.
  const opacity = material.opacity ?? 1;
  const transmission = material.transmission ?? 0;
  if (opacity < 0.95 || transmission > 0.05) {
    material.depthWrite = false;
  }
  material.userData.baseOpacity = opacity;
}

/**
 * Preserve imported materials (textures, roughness, metalness, normals).
 * @param {typeof import("three")} THREE
 * @param {import("three").Mesh} mesh
 * @returns {{ materials: import("three").Material[], mode: "preserve" }}
 */
export function preserveImportedCollectibleMaterials(THREE, mesh) {
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  list.forEach((material) => {
    if (!material) return;
    configureImportedTextureColorSpaces(THREE, material);
    sanitizeImportedTransparency(material);
    // Do not override roughness / metalness when the GLB already authored them.
    if ("envMapIntensity" in material && material.envMapIntensity == null) {
      material.envMapIntensity = 0.55;
    } else if ("envMapIntensity" in material) {
      material.envMapIntensity = Math.min(material.envMapIntensity ?? 0.55, 0.7);
    }
    material.userData.materialSource = "imported";
    material.needsUpdate = true;
  });
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return { materials: list.filter(Boolean), mode: "preserve" };
}

/**
 * Build a MeshPhysicalMaterial (fallback: MeshStandardMaterial) from a preset.
 * @param {typeof import("three")} THREE
 * @param {object} preset
 */
export function createCollectiblePhysicalMaterial(THREE, preset) {
  const Physical =
    "MeshPhysicalMaterial" in THREE ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const material = new Physical({
    color: new THREE.Color(preset.color ?? "#888888"),
    metalness: preset.metalness ?? 0.2,
    roughness: preset.roughness ?? 0.5,
    transparent: Boolean(preset.transparent || (preset.opacity != null && preset.opacity < 1)),
    opacity: preset.opacity ?? 1,
    depthWrite: !(preset.transparent || (preset.opacity != null && preset.opacity < 0.99)),
    ...(preset.emissive
      ? {
          emissive: new THREE.Color(preset.emissive),
          emissiveIntensity: preset.emissiveIntensity ?? 0.4,
        }
      : {}),
  });

  if (Physical === THREE.MeshPhysicalMaterial) {
    if (preset.clearcoat != null) material.clearcoat = preset.clearcoat;
    if (preset.clearcoatRoughness != null) material.clearcoatRoughness = preset.clearcoatRoughness;
    if (preset.sheen != null) material.sheen = preset.sheen;
    if (preset.sheenRoughness != null) material.sheenRoughness = preset.sheenRoughness;
    if (preset.sheenColor) material.sheenColor = new THREE.Color(preset.sheenColor);
    if (preset.transmission != null) material.transmission = preset.transmission;
    if (preset.thickness != null) material.thickness = preset.thickness;
    if (preset.ior != null) material.ior = preset.ior;
  }

  if ("envMapIntensity" in material) {
    material.envMapIntensity = preset.metalness > 0.6 ? 0.85 : 0.35;
  }
  material.userData.baseOpacity = material.opacity;
  material.userData.region = preset._region;
  material.userData.materialSource = "spatial-fallback";
  return material;
}

/**
 * Classify a triangle centroid (normalized 0–1 in bbox) into a material region.
 * Used only when the asset lacks baked textures/normals.
 */
export function classifyCollectibleRegion(nx, ny, nz) {
  const nearShell =
    nx < 0.055 ||
    nx > 0.945 ||
    ny < 0.04 ||
    ny > 0.96 ||
    (nz < 0.08 && (nx < 0.22 || nx > 0.78 || ny < 0.18 || ny > 0.82));
  if (nearShell) return "shell";

  if (nz > 0.9 && nx > 0.14 && nx < 0.86 && ny > 0.1 && ny < 0.9) {
    return "acrylic";
  }

  if (nx > 0.06 && nx < 0.3) {
    if (ny > 0.64) return "aluminium";
    if (ny > 0.4 && ny < 0.58 && nz > 0.25) return "ai";
    if (ny < 0.34) return "shield";
    return nz > 0.35 ? "aluminium" : "shell";
  }

  if (nx > 0.7 && nx < 0.94) {
    if (ny > 0.64) return "book";
    if (ny > 0.4 && ny < 0.6) return "satinMetal";
    if (ny < 0.34) {
      if (nz > 0.48 && nx > 0.78 && nx < 0.9) return "glass";
      return "darkMetal";
    }
    return "satinMetal";
  }

  return "figure";
}

/**
 * Spatial fallback for assets that genuinely lack textures/normals.
 * @param {typeof import("three")} THREE
 * @param {import("three").Mesh} mesh
 * @returns {{ materials: import("three").Material[], mode: "spatial-fallback" }}
 */
export function applySpatialCollectibleMaterials(THREE, mesh) {
  const geometry = mesh.geometry;
  if (!geometry?.attributes?.position) {
    const fallback = createCollectiblePhysicalMaterial(THREE, {
      ...COLLECTIBLE_MATERIALS.shell,
      _region: "shell",
    });
    mesh.material = fallback;
    return { materials: [fallback], mode: "spatial-fallback" };
  }

  if (!geometry.getAttribute("normal")) {
    geometry.computeVertexNormals();
  }

  const pos = geometry.getAttribute("position");
  const index = geometry.index;
  const box = new THREE.Box3().setFromBufferAttribute(pos);
  const size = new THREE.Vector3();
  const min = box.min.clone();
  box.getSize(size);
  const sx = Math.max(size.x, 1e-9);
  const sy = Math.max(size.y, 1e-9);
  const sz = Math.max(size.z, 1e-9);

  /** @type {Record<string, number[]>} */
  const buckets = Object.fromEntries(REGION_ORDER.map((key) => [key, []]));

  const triCount = index ? index.count / 3 : Math.floor(pos.count / 3);
  for (let t = 0; t < triCount; t += 1) {
    let i0;
    let i1;
    let i2;
    if (index) {
      i0 = index.getX(t * 3);
      i1 = index.getX(t * 3 + 1);
      i2 = index.getX(t * 3 + 2);
    } else {
      i0 = t * 3;
      i1 = t * 3 + 1;
      i2 = t * 3 + 2;
    }
    const cx = (pos.getX(i0) + pos.getX(i1) + pos.getX(i2)) / 3;
    const cy = (pos.getY(i0) + pos.getY(i1) + pos.getY(i2)) / 3;
    const cz = (pos.getZ(i0) + pos.getZ(i1) + pos.getZ(i2)) / 3;
    const region = classifyCollectibleRegion(
      (cx - min.x) / sx,
      (cy - min.y) / sy,
      (cz - min.z) / sz,
    );
    const bucket = buckets[region] ?? buckets.figure;
    if (index) {
      bucket.push(index.getX(t * 3), index.getX(t * 3 + 1), index.getX(t * 3 + 2));
    } else {
      bucket.push(i0, i1, i2);
    }
  }

  let total = 0;
  REGION_ORDER.forEach((region) => {
    total += buckets[region].length;
  });
  const useUint32 = pos.count > 65535 || total > 65535;
  const ordered = useUint32 ? new Uint32Array(total) : new Uint16Array(total);
  const groups = [];
  let cursor = 0;
  REGION_ORDER.forEach((region) => {
    const indices = buckets[region];
    if (!indices.length) return;
    const materialIndex = groups.length;
    const start = cursor;
    for (let i = 0; i < indices.length; i += 1) {
      ordered[cursor + i] = indices[i];
    }
    cursor += indices.length;
    groups.push({ start, count: indices.length, materialIndex, region });
  });

  geometry.setIndex(new THREE.BufferAttribute(ordered, 1));
  geometry.clearGroups();
  groups.forEach((group) => {
    geometry.addGroup(group.start, group.count, group.materialIndex);
  });

  const materials = groups.map((group) => {
    const preset = {
      ...(COLLECTIBLE_MATERIALS[group.region] ?? COLLECTIBLE_MATERIALS.figure),
      _region: group.region,
    };
    return createCollectiblePhysicalMaterial(THREE, preset);
  });

  mesh.material = materials;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return { materials, mode: "spatial-fallback" };
}

/**
 * Upgrade a single mesh: preserve baked materials when present, else spatial fallback.
 * @param {typeof import("three")} THREE
 * @param {import("three").Mesh} mesh
 */
export function upgradeCollectibleMeshMaterials(THREE, mesh) {
  if (meshHasBakedShading(mesh)) {
    return preserveImportedCollectibleMaterials(THREE, mesh);
  }
  return applySpatialCollectibleMaterials(THREE, mesh);
}

/**
 * Upgrade every mesh under a loaded collectible root.
 * @param {typeof import("three")} THREE
 * @param {import("three").Object3D} root
 * @returns {{ materials: import("three").Material[], mode: "preserve"|"spatial-fallback"|"mixed" }}
 */
export function upgradeCollectibleMaterials(THREE, root) {
  /** @type {import("three").Material[]} */
  const materials = [];
  /** @type {Set<string>} */
  const modes = new Set();
  root.traverse((node) => {
    if (!node.isMesh) return;
    const result = upgradeCollectibleMeshMaterials(THREE, node);
    materials.push(...result.materials);
    modes.add(result.mode);
  });
  const mode =
    modes.size === 1 ? [...modes][0] : modes.size > 1 ? "mixed" : "spatial-fallback";
  return { materials, mode };
}
