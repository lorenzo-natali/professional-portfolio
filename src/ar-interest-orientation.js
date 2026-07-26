/**
 * DEV calibration viewer for interest GLB canonical orientation.
 * Document plane convention: XY paper, +Z out of paper.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  INTEREST_OBJECTS,
  getInterestObjectConfig,
  resolveInterestAssetUrl,
} from "./components/ar/interestObjectsConfig";
import {
  assembleInterestContent,
  getSharedGltfLoader,
} from "./components/ar/loadInterestGlb";

function createViewport(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  if ("outputColorSpace" in renderer && "SRGBColorSpace" in THREE) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1014);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  scene.add(new THREE.HemisphereLight(0xdde7f2, 0x1a1f28, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(1.2, 1.4, 2.2);
  scene.add(key);

  const root = new THREE.Group();
  scene.add(root);

  // Document plane: XY, normal +Z.
  const grid = new THREE.GridHelper(2.4, 12, 0x334155, 0x1f2937);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.2),
    new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    }),
  );
  scene.add(plane);

  const axes = new THREE.AxesHelper(0.55);
  scene.add(axes);

  return { renderer, scene, camera, controls, root, helpers: { grid, plane, axes } };
}

function clearRoot(root) {
  while (root.children.length) {
    const child = root.children[0];
    root.remove(child);
  }
}

function fitCamera(camera, controls, mode, size) {
  const maxDim = Math.max(size.x, size.y, size.z, 0.05);
  const dist = maxDim * 2.8;
  if (mode === "side") {
    camera.position.set(dist, 0, dist * 0.35);
  } else if (mode === "top") {
    camera.position.set(0.01, 0.01, dist);
  } else {
    camera.position.set(dist * 0.55, -dist * 0.85, dist * 0.55);
  }
  controls.target.set(0, 0, size.z * 0.35);
  controls.update();
}

function addBboxHelper(THREE, root, object) {
  const box = new THREE.Box3().setFromObject(object);
  const helper = new THREE.Box3Helper(box, 0x6ec8d6);
  root.add(helper);
  const pivot = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xf472b6 }),
  );
  pivot.position.set(0, 0, 0);
  root.add(pivot);
  return box;
}

async function loadRawScene(src) {
  const loader = await getSharedGltfLoader();
  const url = resolveInterestAssetUrl(src);
  const gltf = await loader.loadAsync(url);
  return gltf.scene.clone(true);
}

const mainView = createViewport(document.getElementById("canvas-main"));
const nativeView = createViewport(document.getElementById("canvas-native"));
const infoMain = document.getElementById("info-main");
const infoNative = document.getElementById("info-native");
const infoConfig = document.getElementById("info-config");
const assetSelect = document.getElementById("asset");
const showNative = document.getElementById("show-native");

let viewMode = "front";
let currentId = assetSelect.value;

function setActiveButton(id) {
  ["view-front", "view-side", "view-top"].forEach((btnId) => {
    document.getElementById(btnId).classList.toggle("active", btnId === id);
  });
}

async function reload() {
  const config = getInterestObjectConfig(currentId);
  if (!config) return;

  infoConfig.textContent = JSON.stringify(
    {
      id: config.id,
      src: config.src,
      canonicalRotation: config.canonicalRotation,
      displayYaw: config.displayYaw,
      displayTilt: config.displayTilt ?? null,
      groundOffset: config.groundOffset,
      scaleAxis: config.scaleAxis,
      targetSize: config.targetSize,
    },
    null,
    2,
  );

  clearRoot(mainView.root);
  clearRoot(nativeView.root);

  infoMain.textContent = "Loading…";
  infoNative.textContent = showNative.checked ? "Loading…" : "Hidden";

  const raw = await loadRawScene(config.src);
  const assembled = assembleInterestContent(THREE, raw, {
    targetSize: config.targetSize,
    scaleAxis: config.scaleAxis,
    canonicalRotation: config.canonicalRotation,
  });
  mainView.root.add(assembled.content);
  const box = addBboxHelper(THREE, mainView.root, assembled.content);
  const size = new THREE.Vector3();
  box.getSize(size);
  fitCamera(mainView.camera, mainView.controls, viewMode, size);
  infoMain.textContent = [
    `canonicalRotation: (${config.canonicalRotation.x.toFixed(3)}, ${config.canonicalRotation.y.toFixed(3)}, ${config.canonicalRotation.z.toFixed(3)})`,
    `bbox size: ${size.x.toFixed(4)} × ${size.y.toFixed(4)} × ${size.z.toFixed(4)}`,
    `minZ: ${box.min.z.toFixed(5)}  maxZ: ${box.max.z.toFixed(5)}`,
    `normScale: ${assembled.bounds.normScale.toFixed(5)}`,
    "Plane = document XY · +Z out of paper · pivot at origin",
  ].join("\n");

  if (showNative.checked) {
    const native = await loadRawScene(config.src);
    nativeView.root.add(native);
    native.updateMatrixWorld(true);
    const nbox = new THREE.Box3().setFromObject(native);
    const nsize = new THREE.Vector3();
    const ncenter = new THREE.Vector3();
    nbox.getSize(nsize);
    nbox.getCenter(ncenter);
    native.position.sub(ncenter);
    addBboxHelper(THREE, nativeView.root, native);
    // Orbit in glTF Y-up space for native panel.
    nativeView.helpers.grid.rotation.set(0, 0, 0);
    nativeView.camera.position.set(nsize.length() * 1.2, nsize.y * 0.8, nsize.length() * 1.2);
    nativeView.controls.target.set(0, 0, 0);
    nativeView.controls.update();
    infoNative.textContent = [
      `native size: ${nsize.x.toFixed(4)} × ${nsize.y.toFixed(4)} × ${nsize.z.toFixed(4)}`,
      `tallest: ${["x", "y", "z"][[nsize.x, nsize.y, nsize.z].indexOf(Math.max(nsize.x, nsize.y, nsize.z))]}`,
      "No canonicalRotation / grounding applied",
    ].join("\n");
  } else {
    infoNative.textContent = "Enable “Also show native” to compare.";
  }
}

assetSelect.innerHTML = INTEREST_OBJECTS.map(
  (item) => `<option value="${item.id}">${item.id}</option>`,
).join("");
assetSelect.value = currentId;

assetSelect.addEventListener("change", () => {
  currentId = assetSelect.value;
  reload();
});
showNative.addEventListener("change", () => reload());
document.getElementById("view-front").addEventListener("click", () => {
  viewMode = "front";
  setActiveButton("view-front");
  reload();
});
document.getElementById("view-side").addEventListener("click", () => {
  viewMode = "side";
  setActiveButton("view-side");
  reload();
});
document.getElementById("view-top").addEventListener("click", () => {
  viewMode = "top";
  setActiveButton("view-top");
  reload();
});

function frame(view) {
  const { renderer, scene, camera, controls } = view;
  const canvas = renderer.domElement;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  controls.update();
  renderer.render(scene, camera);
}

function loop() {
  frame(mainView);
  frame(nativeView);
  requestAnimationFrame(loop);
}

reload();
loop();
