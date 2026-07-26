import { ALIGNMENT_CORE_LAYOUT, ALIGNMENT_CORE_MATERIALS } from "./alignmentCoreConfig";

/**
 * Build one complementary open shell for the Alignment Core.
 *
 * Geometry/material ownership lives on the shell: dispose() releases them once.
 *
 * @param {typeof import("three")} THREE
 * @param {{
 *   side: "left" | "right",
 *   radius?: number,
 *   materials?: typeof ALIGNMENT_CORE_MATERIALS,
 * }} options
 */
export function createAlignmentShell(THREE, options) {
  const side = options.side;
  const radius = options.radius ?? ALIGNMENT_CORE_LAYOUT.shellRadius;
  const colors = { ...ALIGNMENT_CORE_MATERIALS, ...options.materials };
  const disposables = [];
  const sign = side === "left" ? -1 : 1;
  let disposed = false;

  const root = new THREE.Group();
  root.name = `ar-alignment-shell-${side}`;
  root.userData.kind = "ar-alignment-shell";
  root.userData.side = side;

  const graphite = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.graphite),
    metalness: 0.78,
    roughness: 0.38,
    envMapIntensity: 0.85,
  });
  const graphiteRim = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.graphiteHighlight),
    metalness: 0.82,
    roughness: 0.28,
    emissive: new THREE.Color(colors.cyan),
    emissiveIntensity: 0.12,
  });
  const cyanAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.cyan),
    metalness: 0.35,
    roughness: 0.35,
    emissive: new THREE.Color(colors.cyanSoft),
    emissiveIntensity: 0.45,
  });
  const violetAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colors.violet),
    metalness: 0.4,
    roughness: 0.4,
    emissive: new THREE.Color(colors.violetDeep),
    emissiveIntensity: 0.35,
  });
  disposables.push(graphite, graphiteRim, cyanAccent, violetAccent);

  // Open shell: sphere sector — opening faces the center (+X for left, -X for right).
  const outerGeo = new THREE.SphereGeometry(
    radius,
    48,
    32,
    0,
    Math.PI * 2,
    0.18,
    Math.PI * 0.78,
  );
  disposables.push(outerGeo);
  const outer = new THREE.Mesh(outerGeo, graphite);
  outer.name = `ar-alignment-shell-body-${side}`;
  outer.rotation.z = sign * (Math.PI / 2);
  outer.castShadow = false;
  outer.receiveShadow = false;
  root.add(outer);

  // Inner lining — slightly smaller, cooler graphite for depth.
  const innerGeo = new THREE.SphereGeometry(
    radius * 0.92,
    40,
    28,
    0,
    Math.PI * 2,
    0.22,
    Math.PI * 0.74,
  );
  disposables.push(innerGeo);
  const innerMat = graphite.clone();
  innerMat.color = new THREE.Color(colors.graphiteHighlight);
  innerMat.metalness = 0.55;
  innerMat.roughness = 0.48;
  innerMat.side = THREE.BackSide;
  disposables.push(innerMat);
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.name = `ar-alignment-shell-inner-${side}`;
  inner.rotation.z = sign * (Math.PI / 2);
  root.add(inner);

  // Opening rim — cyan accent torus (primary emissive cue).
  const rimGeo = new THREE.TorusGeometry(radius * 0.78, radius * 0.018, 10, 48);
  disposables.push(rimGeo);
  const rim = new THREE.Mesh(rimGeo, cyanAccent);
  rim.name = `ar-alignment-shell-rim-${side}`;
  rim.rotation.y = sign * (Math.PI / 2);
  rim.position.x = sign * radius * 0.12;
  root.add(rim);

  // Soft chamfer band inside the rim.
  const bandGeo = new THREE.TorusGeometry(radius * 0.7, radius * 0.01, 8, 40);
  disposables.push(bandGeo);
  const band = new THREE.Mesh(bandGeo, graphiteRim);
  band.rotation.y = sign * (Math.PI / 2);
  band.position.x = sign * radius * 0.08;
  root.add(band);

  // Asymmetric violet cue — unique per side so orientation stays readable.
  const accentGeo = new THREE.TorusGeometry(
    radius * 0.22,
    radius * 0.016,
    8,
    28,
    Math.PI * 0.85,
  );
  disposables.push(accentGeo);
  const accent = new THREE.Mesh(accentGeo, violetAccent);
  accent.name = `ar-alignment-shell-accent-${side}`;
  if (side === "left") {
    accent.position.set(-radius * 0.15, radius * 0.42, radius * 0.28);
    accent.rotation.set(0.6, 0.4, -0.3);
  } else {
    accent.position.set(radius * 0.12, -radius * 0.38, -radius * 0.32);
    accent.rotation.set(-0.5, -0.55, 0.35);
  }
  root.add(accent);

  // Small graphite fin for further asymmetry (not mirrored).
  const finGeo =
    typeof THREE.CapsuleGeometry === "function"
      ? new THREE.CapsuleGeometry(radius * 0.02, radius * 0.16, 4, 8)
      : new THREE.CylinderGeometry(radius * 0.02, radius * 0.02, radius * 0.2, 8);
  disposables.push(finGeo);
  const fin = new THREE.Mesh(finGeo, graphiteRim);
  fin.name = `ar-alignment-shell-fin-${side}`;
  if (side === "left") {
    fin.position.set(-radius * 0.55, -radius * 0.2, radius * 0.15);
    fin.rotation.z = 0.55;
  } else {
    fin.position.set(radius * 0.5, radius * 0.25, -radius * 0.18);
    fin.rotation.z = -0.4;
    fin.rotation.x = 0.35;
  }
  root.add(fin);

  // Tight hit proxy — same open sector as the visible shell (not a full sphere).
  const hitGeo = new THREE.SphereGeometry(
    radius * 1.04,
    16,
    12,
    0,
    Math.PI * 2,
    0.16,
    Math.PI * 0.8,
  );
  disposables.push(hitGeo);
  const hitMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  disposables.push(hitMat);
  const hit = new THREE.Mesh(hitGeo, hitMat);
  hit.name = `ar-alignment-shell-hit-${side}`;
  hit.userData.shellSide = side;
  hit.rotation.z = sign * (Math.PI / 2);
  root.add(hit);

  return {
    root,
    side,
    hit,
    materials: { graphite, cyanAccent, violetAccent },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent?.();
      disposables.forEach((item) => {
        try {
          item.dispose?.();
        } catch {
          // ignore
        }
      });
      disposables.length = 0;
    },
  };
}
