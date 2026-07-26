/**
 * DEV-only side-by-side viewer for original vs web-optimized interest GLBs.
 * Not wired into the live AR runtime.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const ASSETS = ["robot", "evil-eye", "book", "fossil", "backpack", "plant"];

function resolvePublicUrl(relPath) {
  const base = import.meta.env.BASE_URL || "/";
  const normalized = String(base).endsWith("/") ? base : `${base}/`;
  return `${normalized}${relPath.replace(/^\//, "")}`;
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
  camera.position.set(1.4, 1.1, 1.8);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0.35, 0);

  scene.add(new THREE.HemisphereLight(0xdde7f2, 0x1a1f28, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(1.2, 2.2, 1.4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9eb6ff, 0.35);
  fill.position.set(-1.4, 0.4, 0.8);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);

  const ground = new THREE.GridHelper(3, 12, 0x334155, 0x1f2937);
  ground.position.y = 0;
  scene.add(ground);

  return { renderer, scene, camera, controls, root };
}

function fitObject(object, camera, controls) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  object.position.sub(center);
  object.position.y += size.y / 2;

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const dist = maxDim * 2.4;
  camera.position.set(dist * 0.75, dist * 0.55, dist);
  controls.target.set(0, size.y * 0.35, 0);
  controls.update();
  return { size, minY: 0, maxDim };
}

function countTriangles(root) {
  let tris = 0;
  root.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    const geo = node.geometry;
    if (geo.index) tris += geo.index.count / 3;
    else if (geo.attributes.position) tris += geo.attributes.position.count / 3;
  });
  return Math.round(tris);
}

async function loadInto(viewport, url, infoEl, metaEl) {
  while (viewport.root.children.length) {
    const child = viewport.root.children[0];
    viewport.root.remove(child);
  }

  infoEl.textContent = `Loading\n${url}`;
  metaEl.textContent = "…";

  const loader = new GLTFLoader();
  if (MeshoptDecoder) {
    await MeshoptDecoder.ready;
    loader.setMeshoptDecoder(MeshoptDecoder);
  }

  try {
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;
    viewport.root.add(model);
    const fit = fitObject(model, viewport.camera, viewport.controls);
    const tris = countTriangles(model);
    let textures = 0;
    const seen = new Set();
    model.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat) => {
        ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "aoMap"].forEach((key) => {
          const tex = mat[key];
          if (tex && !seen.has(tex)) {
            seen.add(tex);
            textures += 1;
          }
        });
      });
    });

    const res = await fetch(url, { method: "HEAD" }).catch(() => null);
    const bytes = Number(res?.headers?.get("content-length") || 0);
    const mb = bytes ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : "size n/a";
    metaEl.textContent = mb;
    infoEl.textContent = [
      `URL: ${url}`,
      `Triangles: ${tris.toLocaleString()}`,
      `Textures (unique maps): ${textures}`,
      `AABB max dim: ${fit.maxDim.toFixed(3)}`,
      `Grounded visually for compare (not AR runtime)`,
    ].join("\n");
    return true;
  } catch (error) {
    metaEl.textContent = "error";
    infoEl.textContent = `Failed to load\n${url}\n${error?.message || error}`;
    return false;
  }
}

const originalView = createViewport(document.getElementById("canvas-original"));
const webView = createViewport(document.getElementById("canvas-web"));
const assetSelect = document.getElementById("asset");
const spinToggle = document.getElementById("spin");

async function reload() {
  const id = assetSelect.value;
  const originalUrl = resolvePublicUrl(`ar/interests/${id}.glb`);
  const webUrl = resolvePublicUrl(`ar/interests/web/${id}.glb`);
  await Promise.all([
    loadInto(
      originalView,
      originalUrl,
      document.getElementById("info-original"),
      document.getElementById("meta-original"),
    ),
    loadInto(
      webView,
      webUrl,
      document.getElementById("info-web"),
      document.getElementById("meta-web"),
    ),
  ]);
}

function resizeView(view) {
  const { renderer, camera, canvas = renderer.domElement } = {
    ...view,
    canvas: view.renderer.domElement,
  };
  const w = canvas.clientWidth;
  const h = canvas.clientHeight || 360;
  if (canvas.width !== w || canvas.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
}

function frame(now) {
  resizeView(originalView);
  resizeView(webView);
  if (spinToggle.checked) {
    originalView.root.rotation.y = now * 0.00035;
    webView.root.rotation.y = now * 0.00035;
  }
  originalView.controls.update();
  webView.controls.update();
  originalView.renderer.render(originalView.scene, originalView.camera);
  webView.renderer.render(webView.scene, webView.camera);
  requestAnimationFrame(frame);
}

assetSelect.innerHTML = ASSETS.map((id) => `<option value="${id}">${id}</option>`).join("");
document.getElementById("reload").addEventListener("click", () => {
  void reload();
});
assetSelect.addEventListener("change", () => {
  void reload();
});

void reload();
requestAnimationFrame(frame);
