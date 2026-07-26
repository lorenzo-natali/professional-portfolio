import * as THREE from "three";
import { DOCUMENT_HEIGHT, DOCUMENT_WIDTH } from "./components/ar/arDocumentPlane";
import { createProfessionalEvolutionLayer } from "./components/ar/createProfessionalEvolutionLayer";
import { createProfessionalEvolutionAnimation } from "./components/ar/professionalEvolutionAnimation";

const host = document.getElementById("app");
const statusEl = document.getElementById("status");

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0b1016, 1);
  if ("outputColorSpace" in renderer && "SRGBColorSpace" in THREE) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.01, 20);
  camera.position.set(0, 0.05, 2.35);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  const texture = await new THREE.TextureLoader().loadAsync(
    `${import.meta.env.BASE_URL}ar/targets/cv-page-1.png`,
  );
  if ("colorSpace" in texture && "SRGBColorSpace" in THREE) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  const page = new THREE.Mesh(
    new THREE.PlaneGeometry(DOCUMENT_WIDTH, DOCUMENT_HEIGHT),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  page.name = "cv-page-preview";
  scene.add(page);

  const layer = createProfessionalEvolutionLayer(THREE);
  scene.add(layer.group);

  const animation = createProfessionalEvolutionAnimation(layer, { reducedMotion: false });

  function render() {
    renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
  }
  window.addEventListener("resize", onResize);

  const loop = () => {
    render();
    requestAnimationFrame(loop);
  };
  loop();

  document.getElementById("replay")?.addEventListener("click", () => {
    animation.dispose();
    layer.resetVisualState();
    const next = createProfessionalEvolutionAnimation(layer, { reducedMotion: false });
    window.__pePreviewAnimation = next;
    next.onTargetFound();
    setStatus("Entrance replaying…");
  });

  document.getElementById("complete")?.addEventListener("click", () => {
    layer.group.visible = true;
    layer.applyProgress({
      heading: 1,
      line: 1,
      stages: [1, 1, 1, 1],
      emphasis: 1,
    });
    layer.anim.position.z = layer.riseHeight;
    setStatus("Snapped to completed state");
  });

  animation.onTargetFound();
  setStatus(
    `Professional Evolution · ${layer.stages.length} stages · UV (${layer.group.userData.calibration.origin.u}, ${layer.group.userData.calibration.origin.vTop})`,
  );

  window.__pePreview = { layer, animation, renderer, scene, camera, render };
} catch (error) {
  console.error(error);
  setStatus(`Failed: ${error?.message || error}`);
  host.textContent = `Preview failed: ${error?.message || error}`;
}
