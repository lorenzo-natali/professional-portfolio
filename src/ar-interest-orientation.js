/**
 * DEV calibration viewer for interest GLB orientation.
 * Persists overrides in localStorage only — never writes production config.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  INTEREST_OBJECTS,
  getInterestObjectConfig,
  getInterestDisplayRotation,
  resolveInterestAssetUrl,
} from "./components/ar/interestObjectsConfig";
import {
  assembleInterestContent,
  getSharedGltfLoader,
} from "./components/ar/loadInterestGlb";

const STORAGE_KEY = "ar-interest-orientation-dev-v1";

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function baseConfig(id) {
  const item = getInterestObjectConfig(id);
  return {
    id: item.id,
    canonicalRotation: { ...item.canonicalRotation },
    displayYaw: item.displayYaw,
    displayTilt: { x: item.displayTilt?.x ?? 0, y: item.displayTilt?.y ?? 0 },
    groundOffset: item.groundOffset,
    targetSize: item.targetSize,
    scaleAxis: item.scaleAxis,
    frontAxis: item.frontAxis ?? null,
    src: item.src,
  };
}

function resolvedConfig(id) {
  const base = baseConfig(id);
  const override = loadStore()[id] || {};
  return {
    ...base,
    ...override,
    canonicalRotation: {
      ...base.canonicalRotation,
      ...(override.canonicalRotation || {}),
    },
    displayTilt: {
      ...base.displayTilt,
      ...(override.displayTilt || {}),
    },
  };
}

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

  const grid = new THREE.GridHelper(2.4, 12, 0x334155, 0x1f2937);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);
  scene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 2.2),
      new THREE.MeshBasicMaterial({
        color: 0x1e293b,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      }),
    ),
  );
  scene.add(new THREE.AxesHelper(0.55));

  return { renderer, scene, camera, controls, root };
}

function fitCamera(camera, controls, mode, size) {
  const maxDim = Math.max(size.x, size.y, size.z, 0.05);
  const dist = maxDim * 2.8;
  if (mode === "side") camera.position.set(dist, 0, dist * 0.35);
  else if (mode === "top") camera.position.set(0.01, 0.01, dist);
  else if (mode === "front") camera.position.set(0, -dist, dist * 0.35);
  else camera.position.set(dist * 0.55, -dist * 0.85, dist * 0.55);
  controls.target.set(0, 0, size.z * 0.35);
  controls.update();
}

const mainView = createViewport(document.getElementById("canvas-main"));
const infoMain = document.getElementById("info-main");
const assetSelect = document.getElementById("asset");
const inputs = {
  cx: document.getElementById("cx"),
  cy: document.getElementById("cy"),
  cz: document.getElementById("cz"),
  yaw: document.getElementById("yaw"),
  tx: document.getElementById("tx"),
  ty: document.getElementById("ty"),
  size: document.getElementById("size"),
  ground: document.getElementById("ground"),
};
const labels = {
  cx: document.getElementById("lab-cx"),
  cy: document.getElementById("lab-cy"),
  cz: document.getElementById("lab-cz"),
  yaw: document.getElementById("lab-yaw"),
  tx: document.getElementById("lab-tx"),
  ty: document.getElementById("lab-ty"),
  size: document.getElementById("lab-size"),
  ground: document.getElementById("lab-ground"),
};

let viewMode = "perspective";
let currentId = INTEREST_OBJECTS[0].id;
/** @type {THREE.Object3D | null} */
let rawCache = null;
let rawCacheId = "";

assetSelect.innerHTML = INTEREST_OBJECTS.map(
  (item) => `<option value="${item.id}">${item.id}</option>`,
).join("");

function syncInputsFromConfig(cfg) {
  inputs.cx.value = String(cfg.canonicalRotation.x);
  inputs.cy.value = String(cfg.canonicalRotation.y);
  inputs.cz.value = String(cfg.canonicalRotation.z);
  inputs.yaw.value = String(cfg.displayYaw);
  inputs.tx.value = String(cfg.displayTilt.x);
  inputs.ty.value = String(cfg.displayTilt.y);
  inputs.size.value = String(cfg.targetSize);
  inputs.ground.value = String(cfg.groundOffset);
  labels.cx.textContent = Number(cfg.canonicalRotation.x).toFixed(3);
  labels.cy.textContent = Number(cfg.canonicalRotation.y).toFixed(3);
  labels.cz.textContent = Number(cfg.canonicalRotation.z).toFixed(3);
  labels.yaw.textContent = Number(cfg.displayYaw).toFixed(3);
  labels.tx.textContent = Number(cfg.displayTilt.x).toFixed(3);
  labels.ty.textContent = Number(cfg.displayTilt.y).toFixed(3);
  labels.size.textContent = Number(cfg.targetSize).toFixed(3);
  labels.ground.textContent = Number(cfg.groundOffset).toFixed(3);
}

function readConfigFromInputs() {
  return {
    id: currentId,
    canonicalRotation: {
      x: Number(inputs.cx.value),
      y: Number(inputs.cy.value),
      z: Number(inputs.cz.value),
    },
    displayYaw: Number(inputs.yaw.value),
    displayTilt: { x: Number(inputs.tx.value), y: Number(inputs.ty.value) },
    targetSize: Number(inputs.size.value),
    groundOffset: Number(inputs.ground.value),
    scaleAxis: getInterestObjectConfig(currentId).scaleAxis,
    frontAxis: getInterestObjectConfig(currentId).frontAxis ?? null,
    src: getInterestObjectConfig(currentId).src,
  };
}

function persistCurrent() {
  const cfg = readConfigFromInputs();
  const store = loadStore();
  store[currentId] = {
    canonicalRotation: cfg.canonicalRotation,
    displayYaw: cfg.displayYaw,
    displayTilt: cfg.displayTilt,
    targetSize: cfg.targetSize,
    groundOffset: cfg.groundOffset,
  };
  saveStore(store);
  return cfg;
}

async function loadRaw(src) {
  if (rawCache && rawCacheId === src) return rawCache.clone(true);
  const loader = await getSharedGltfLoader();
  const gltf = await loader.loadAsync(resolveInterestAssetUrl(src));
  rawCache = gltf.scene;
  rawCacheId = src;
  return rawCache.clone(true);
}

async function reload() {
  const cfg = persistCurrent();
  syncInputsFromConfig(cfg);
  while (mainView.root.children.length) {
    mainView.root.remove(mainView.root.children[0]);
  }
  infoMain.textContent = "Loading…";

  const raw = await loadRaw(cfg.src);
  const assembled = assembleInterestContent(THREE, raw, {
    targetSize: cfg.targetSize,
    scaleAxis: cfg.scaleAxis,
    canonicalRotation: cfg.canonicalRotation,
  });

  const display = new THREE.Group();
  const displayRot = getInterestDisplayRotation(cfg);
  display.rotation.set(displayRot.x, displayRot.y, displayRot.z);
  display.position.z = cfg.groundOffset;
  display.add(assembled.content);
  mainView.root.add(display);

  const box = new THREE.Box3().setFromObject(assembled.content);
  const helper = new THREE.Box3Helper(box.clone(), 0x6ec8d6);
  mainView.root.add(helper);
  const pivot = new THREE.Mesh(
    new THREE.SphereGeometry(0.01, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xf472b6 }),
  );
  mainView.root.add(pivot);

  const size = new THREE.Vector3();
  box.getSize(size);
  fitCamera(mainView.camera, mainView.controls, viewMode, size);

  infoMain.textContent = [
    `id: ${cfg.id}`,
    `canonicalRotation: (${cfg.canonicalRotation.x.toFixed(3)}, ${cfg.canonicalRotation.y.toFixed(3)}, ${cfg.canonicalRotation.z.toFixed(3)})`,
    `displayYaw: ${cfg.displayYaw.toFixed(3)}  tilt: (${cfg.displayTilt.x.toFixed(3)}, ${cfg.displayTilt.y.toFixed(3)})`,
    `targetSize: ${cfg.targetSize.toFixed(3)}  groundOffset: ${cfg.groundOffset.toFixed(3)}`,
    `frontAxis: ${cfg.frontAxis ?? "—"}`,
    `bbox: ${size.x.toFixed(4)} × ${size.y.toFixed(4)} × ${size.z.toFixed(4)}`,
    `minZ: ${box.min.z.toFixed(5)}  maxZ: ${box.max.z.toFixed(5)}`,
    "localStorage DEV only — Copy configuration to paste into interestObjectsConfig.js",
  ].join("\n");
}

function setView(mode, buttonId) {
  viewMode = mode;
  ["view-perspective", "view-front", "view-side", "view-top"].forEach((id) => {
    document.getElementById(id).classList.toggle("active", id === buttonId);
  });
  reload();
}

assetSelect.value = currentId;
syncInputsFromConfig(resolvedConfig(currentId));

assetSelect.addEventListener("change", () => {
  currentId = assetSelect.value;
  syncInputsFromConfig(resolvedConfig(currentId));
  reload();
});
Object.values(inputs).forEach((input) => {
  input.addEventListener("input", () => reload());
});
document.getElementById("view-perspective").addEventListener("click", () => {
  setView("perspective", "view-perspective");
});
document.getElementById("view-front").addEventListener("click", () => {
  setView("front", "view-front");
});
document.getElementById("view-side").addEventListener("click", () => {
  setView("side", "view-side");
});
document.getElementById("view-top").addEventListener("click", () => {
  setView("top", "view-top");
});
document.getElementById("reset-asset").addEventListener("click", () => {
  const store = loadStore();
  delete store[currentId];
  saveStore(store);
  syncInputsFromConfig(baseConfig(currentId));
  reload();
});
document.getElementById("copy-config").addEventListener("click", async () => {
  const cfg = persistCurrent();
  const snippet = {
    id: cfg.id,
    canonicalRotation: cfg.canonicalRotation,
    displayYaw: cfg.displayYaw,
    displayTilt: cfg.displayTilt,
    groundOffset: cfg.groundOffset,
    targetSize: cfg.targetSize,
    scaleAxis: cfg.scaleAxis,
    frontAxis: cfg.frontAxis,
  };
  const text = JSON.stringify(snippet, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    infoMain.textContent = `${infoMain.textContent}\n\nCopied configuration ✓`;
  } catch {
    console.info("[ar-interest-orientation] config\n", text);
    infoMain.textContent = `${infoMain.textContent}\n\nCopy failed — see console`;
  }
});

function loop() {
  const { renderer, scene, camera, controls } = mainView;
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
  requestAnimationFrame(loop);
}

reload();
loop();
