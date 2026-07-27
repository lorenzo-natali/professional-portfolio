/**
 * Exact triangle / resource counts from decoded glTF BufferGeometry (via GLTFLoader).
 * Used by CLI (`node src/components/ar/auditInterestGlbGeometry.cli.mjs`) and tests.
 */

import { readFile as readFileAsync } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Blob } from "node:buffer";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder as ThreeMeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

if (typeof globalThis.self === "undefined") {
  globalThis.self = globalThis;
}
if (typeof globalThis.Blob === "undefined") {
  globalThis.Blob = Blob;
}

/** @param {import("three").BufferGeometry} geometry */
export function countTrianglesFromGeometry(geometry) {
  if (!geometry?.attributes?.position) return 0;

  const index = geometry.index;
  const groups = geometry.groups?.length ? geometry.groups : null;

  if (groups?.length) {
    let total = 0;
    for (const group of groups) {
      const count = group.count ?? 0;
      total += Math.floor(count / 3);
    }
    return total;
  }

  if (index) return Math.floor(index.count / 3);
  return Math.floor(geometry.attributes.position.count / 3);
}

/**
 * @param {import("three").Object3D} root
 * @returns {{
 *   triangleCount: number,
 *   meshCount: number,
 *   geometryCount: number,
 *   materialCount: number,
 *   textureCount: number,
 *   imageCount: number,
 *   densestMesh: { name: string, triangles: number } | null,
 *   meshes: Array<{ name: string, triangles: number }>,
 * }}
 */
export function auditObject3DTriangles(root) {
  /** @type {Map<import("three").BufferGeometry, number>} */
  const geometryInstances = new Map();
  /** @type {Set<import("three").Material>} */
  const materials = new Set();
  /** @type {Set<import("three").Texture>} */
  const textures = new Set();
  /** @type {Array<{ name: string, triangles: number }>} */
  const meshes = [];

  root.traverse((node) => {
    if (!node.isMesh) return;
    const mesh = /** @type {import("three").Mesh} */ (node);
    const geometry = mesh.geometry;
    if (!geometry) return;

    const tris = countTrianglesFromGeometry(geometry);
    meshes.push({ name: mesh.name || "(unnamed)", triangles: tris });
    geometryInstances.set(geometry, (geometryInstances.get(geometry) ?? 0) + 1);

    const matList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of matList) {
      if (!mat) continue;
      materials.add(mat);
      for (const key of Object.keys(mat)) {
        const value = mat[key];
        if (value?.isTexture) textures.add(value);
      }
    }
  });

  let densestMesh = null;
  for (const entry of meshes) {
    if (!densestMesh || entry.triangles > densestMesh.triangles) {
      densestMesh = { name: entry.name, triangles: entry.triangles };
    }
  }

  const triangleCount = meshes.reduce((sum, m) => sum + m.triangles, 0);

  return {
    triangleCount,
    meshCount: meshes.length,
    geometryCount: geometryInstances.size,
    materialCount: materials.size,
    textureCount: textures.size,
    imageCount: textures.size,
    densestMesh,
    meshes,
  };
}

let loaderPromise = null;
let nodeIoPromise = null;

async function getLoader() {
  if (!loaderPromise) {
    loaderPromise = (async () => {
      if (ThreeMeshoptDecoder?.ready) await ThreeMeshoptDecoder.ready;
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(ThreeMeshoptDecoder);
      return loader;
    })();
  }
  return loaderPromise;
}

async function getNodeIo() {
  if (!nodeIoPromise) {
    nodeIoPromise = (async () => {
      await MeshoptDecoder.ready;
      return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
        "meshopt.decoder": MeshoptDecoder,
      });
    })();
  }
  return nodeIoPromise;
}

async function readGltfResourceCounts(absolutePath) {
  const io = await getNodeIo();
  const document = await io.read(absolutePath);
  const root = document.getRoot();
  const materials = root.listMaterials();
  const textures = root.listTextures();
  const images = new Set(textures.map((tex) => tex.getImage()).filter(Boolean));
  return {
    materialCountGltf: materials.length,
    textureCount: textures.length,
    imageCount: images.size,
  };
}

/**
 * @param {string} absolutePath
 */
export async function auditInterestGlbFile(absolutePath) {
  const loader = await getLoader();
  const buffer = await readFileAsync(absolutePath);
  const resourcePath = `${pathToFileURL(path.dirname(absolutePath)).href}/`;
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      resourcePath,
      resolve,
      reject,
    );
  });
  const stats = auditObject3DTriangles(gltf.scene);
  const gltfMeta = await readGltfResourceCounts(absolutePath);
  return {
    path: absolutePath,
    scene: gltf.scene,
    ...stats,
    materialCount: Math.max(stats.materialCount, gltfMeta.materialCountGltf),
    textureCount: gltfMeta.textureCount,
    imageCount: gltfMeta.imageCount,
  };
}

/** @internal test helper */
export function resetAuditLoaderForTests() {
  loaderPromise = null;
  nodeIoPromise = null;
}
