import * as THREE from "three";
import { createCollectible3D } from "./components/ar/createCollectible3D";
import {
  COLLECTIBLE_GLB_SRC,
  COLLECTIBLE_RAW_GLB_SRC,
  COLLECTIBLE_TEXTURED_GLB_SRC,
} from "./components/ar/collectibleConfig";
import {
  attachCollectibleEnvironment,
  configureCollectibleRenderer,
  createCollectibleLighting,
} from "./components/ar/configureCollectiblePresentation";

const host = document.getElementById("app");
const statusEl = document.getElementById("status");

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

try {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  configureCollectibleRenderer(THREE, renderer);
  renderer.setClearColor(0xd8dbe0, 1);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.01, 20);
  createCollectibleLighting(THREE, scene);
  await attachCollectibleEnvironment(THREE, renderer, scene);

  /** @type {Awaited<ReturnType<typeof createCollectible3D>> | null} */
  let artifact = null;
  let currentView = "front";

  const views = {
    front: { position: [0, 0.15, 3.4], lookAt: [0, 0, 0], rotation: [0, 0, 0] },
    "three-quarter": { position: [1.6, 0.45, 2.8], lookAt: [0, 0, 0], rotation: [0, 0.55, 0] },
    side: { position: [3.2, 0.2, 0.35], lookAt: [0, 0, 0], rotation: [0, 1.45, 0] },
    "figure-close": { position: [0.15, 0.05, 1.35], lookAt: [0, -0.05, 0], rotation: [0, 0.15, 0] },
    "ai-cube": { position: [-0.55, 0.05, 1.2], lookAt: [-0.35, -0.05, 0], rotation: [0, 0.35, 0] },
    "package-edge": { position: [1.1, 0.55, 1.5], lookAt: [0.35, 0.35, 0], rotation: [-0.2, 0.55, 0] },
  };

  function applyView(name) {
    currentView = name;
    if (!artifact) return;
    const view = views[name] ?? views.front;
    artifact.interaction.rotation.set(...view.rotation);
    camera.position.set(...view.position);
    camera.lookAt(...view.lookAt);
  }

  function render() {
    renderer.render(scene, camera);
  }

  async function loadVariant(url, label) {
    const t0 = performance.now();
    setStatus(`Loading ${label}…`);
    if (artifact) {
      scene.remove(artifact.group);
      artifact.dispose();
      artifact = null;
    }
    artifact = await createCollectible3D(THREE, { url });
    artifact.setOpacity(1);
    artifact.group.visible = true;
    artifact.placement.position.set(0, 0, 0);
    artifact.interaction.scale.setScalar(1);
    artifact.anim.position.set(0, 0, 0);
    scene.add(artifact.group);
    applyView(currentView);
    render();
    const ms = Math.round(performance.now() - t0);
    setStatus(
      `${label} · ${ms} ms · mode=${artifact.materialMode}` +
        (artifact.group.userData.usedFallback ? " · FALLBACK" : ""),
    );
    window.__collectiblePreview = {
      applyView,
      render,
      artifact,
      renderer,
      loadVariant,
      lastLoadMs: ms,
    };
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
  }

  window.addEventListener("resize", onResize);
  document.querySelectorAll(".bar button[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".bar button[data-view]").forEach((node) => {
        node.setAttribute("aria-pressed", "false");
      });
      button.setAttribute("aria-pressed", "true");
      applyView(button.dataset.view);
      render();
    });
  });
  document.querySelectorAll(".bar button[data-asset]").forEach((button) => {
    button.addEventListener("click", async () => {
      document.querySelectorAll(".bar button[data-asset]").forEach((node) => {
        node.setAttribute("aria-pressed", "false");
      });
      button.setAttribute("aria-pressed", "true");
      const map = {
        web: COLLECTIBLE_GLB_SRC,
        textured: COLLECTIBLE_TEXTURED_GLB_SRC,
        raw: COLLECTIBLE_RAW_GLB_SRC,
      };
      await loadVariant(map[button.dataset.asset] ?? COLLECTIBLE_GLB_SRC, button.textContent.trim());
    });
  });

  await loadVariant(COLLECTIBLE_GLB_SRC, "Web (live)");
} catch (error) {
  console.error(error);
  window.__collectiblePreviewError = String(error?.stack || error);
  setStatus(`Failed: ${error?.message || error}`);
  host.textContent = `Collectible preview failed: ${error?.message || error}`;
}
