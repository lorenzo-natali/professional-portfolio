import * as THREE from "three";
import { createDecisionCore3D } from "./components/ar/createDecisionCore3D";
import { DECISION_CORE_GLOW } from "./components/ar/decisionCoreConfig";

const host = document.getElementById("app");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0c1016, 1);
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 20);
const ambient = new THREE.AmbientLight(0xffffff, 0.62);
const key = new THREE.DirectionalLight(0xf4f7fb, 0.55);
key.position.set(0.4, 0.95, 1.2);
const fill = new THREE.DirectionalLight(0xb8c4d4, 0.22);
fill.position.set(-0.6, 0.2, 0.8);
scene.add(ambient, key, fill);

const artifact = createDecisionCore3D(THREE);
artifact.setOpacity(1);
artifact.group.visible = true;
artifact.setCoreGlow(DECISION_CORE_GLOW.idle);
// Preview without document-plane offset — center the artifact itself.
artifact.placement.position.set(0, 0, 0);
artifact.interaction.rotation.set(-0.28, 0.35, 0);
artifact.anim.position.z = 0;
scene.add(artifact.group);

/** Camera orbits only — keep object pose fixed so angles stay distinct. */
const restRotation = [-0.22, 0.18, 0];
const views = {
  front: { position: [0, 0.06, 0.7], lookAt: [0, 0, 0] },
  "three-quarter": { position: [0.48, 0.24, 0.52], lookAt: [0, 0, 0] },
  side: { position: [0.78, 0.1, 0.05], lookAt: [0, 0, 0] },
  top: { position: [0.05, 0.78, 0.12], lookAt: [0, 0, 0] },
  expanded: { position: [0.32, 0.16, 0.64], lookAt: [0, 0.01, 0] },
};

function applyView(name) {
  const view = views[name] ?? views.front;
  artifact.interaction.rotation.set(...restRotation);
  camera.position.set(...view.position);
  camera.lookAt(...view.lookAt);

  artifact.segments.forEach((segment) => {
    segment.carrier.position.set(
      segment.dir.x * segment.restRadius,
      segment.dir.y * segment.restRadius,
      segment.carrier.position.z,
    );
    segment.label.visible = false;
    segment.label.material.opacity = 0;
    segment.tokenMeshes.forEach((mesh) => {
      mesh.visible = false;
      mesh.material.opacity = 0;
    });
    segment.expanded = false;
    segment.tokensOpen = false;
  });
  artifact.setCoreGlow(DECISION_CORE_GLOW.idle);

  if (name === "expanded") {
    const assess = artifact.segments.find((segment) => segment.id === "assess");
    if (assess) {
      assess.carrier.position.set(
        assess.dir.x * assess.expandRadius,
        assess.dir.y * assess.expandRadius,
        assess.carrier.position.z,
      );
      assess.expanded = true;
      assess.tokensOpen = true;
      assess.label.visible = true;
      assess.label.material.opacity = 1;
      assess.tokenMeshes.forEach((mesh) => {
        mesh.visible = true;
        mesh.material.opacity = 1;
      });
      artifact.setCoreGlow(DECISION_CORE_GLOW.highlight);
    }
  }
}

applyView("front");

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
document.querySelectorAll(".bar button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".bar button").forEach((node) => {
      node.setAttribute("aria-pressed", "false");
    });
    button.setAttribute("aria-pressed", "true");
    applyView(button.dataset.view);
    render();
  });
});

render();

window.__decisionCorePreview = { applyView, render, artifact, renderer };
