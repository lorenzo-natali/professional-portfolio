import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  INTEREST_CANONICAL_IDENTITY,
  INTEREST_CANONICAL_Y_UP_TO_Z_UP,
  INTEREST_OBJECTS,
  getInterestDisplayRotation,
} from "./interestObjectsConfig";
import { assembleInterestContent } from "./loadInterestGlb";
import { createInterestObjectsLayer } from "./createInterestObjectsLayer";
import { INTEREST_ENTRANCE } from "./interestObjectsConfig";

describe("Interest objects orientation config", () => {
  it("gives every asset an explicit canonicalRotation (no shared mandatory flip)", () => {
    const rotations = INTEREST_OBJECTS.map((item) => item.canonicalRotation);
    expect(rotations).toHaveLength(6);
    INTEREST_OBJECTS.forEach((item) => {
      expect(item.canonicalRotation).toEqual(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          z: expect.any(Number),
        }),
      );
      expect(typeof item.displayYaw).toBe("number");
      expect(typeof item.groundOffset).toBe("number");
      expect(item).not.toHaveProperty("upright");
      expect(item).not.toHaveProperty("rotation");
    });
  });

  it("gives fossil an explicit museum canonicalRotation (not identity, not shared heuristic)", () => {
    const fossil = INTEREST_OBJECTS.find((item) => item.id === "fossil");
    expect(fossil.canonicalRotation).not.toEqual(INTEREST_CANONICAL_IDENTITY);
    expect(fossil.canonicalRotation.x).toBeCloseTo(Math.PI / 2, 10);
    expect(fossil.frontAxis).toBe("+y");

    const yUpIds = ["book", "evil-eye", "robot", "plant", "backpack"];
    yUpIds.forEach((id) => {
      const item = INTEREST_OBJECTS.find((entry) => entry.id === id);
      expect(item.canonicalRotation.x).toBeCloseTo(Math.PI / 2, 10);
      expect(item.canonicalRotation).toEqual(INTEREST_CANONICAL_Y_UP_TO_Z_UP);
    });
  });

  it("uses the production evil-eye targetSize", () => {
    const eye = INTEREST_OBJECTS.find((item) => item.id === "evil-eye");
    expect(eye.targetSize).toBeCloseTo(0.275096, 5);
  });

  it("separates displayYaw from canonicalRotation", () => {
    INTEREST_OBJECTS.forEach((item) => {
      const display = getInterestDisplayRotation(item);
      expect(display.z).toBe(item.displayYaw);
      // Canonical must not equal display for assets with non-zero yaw.
      if (Math.abs(item.displayYaw) > 1e-6) {
        expect(item.canonicalRotation.z).not.toBe(item.displayYaw);
      }
    });
  });
});

describe("Interest objects orientation pipeline", () => {
  it("grounds after canonical rotation and scale with minZ ≈ 0 and +Z extent", () => {
    INTEREST_OBJECTS.forEach((item) => {
      const proxy =
        item.scaleAxis === "max"
          ? (() => {
              const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.9));
              mesh.position.set(0, 0.1, 0);
              const g = new THREE.Group();
              g.add(mesh);
              return g;
            })()
          : (() => {
              const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.7));
              mesh.position.set(0, 0.7, 0);
              const g = new THREE.Group();
              g.add(mesh);
              return g;
            })();

      const { content, bounds } = assembleInterestContent(THREE, proxy, {
        targetSize: item.targetSize,
        scaleAxis: item.scaleAxis,
        canonicalRotation: item.canonicalRotation,
      });
      content.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(content);
      expect(box.min.z, `${item.id} minZ`).toBeCloseTo(0, 5);
      expect(bounds.minZ, `${item.id} bounds.minZ`).toBeCloseTo(0, 5);
      expect(box.max.z, `${item.id} maxZ`).toBeGreaterThan(0.01);
      expect(bounds.normScale, `${item.id} scale`).toBeGreaterThan(0);
    });
  });

  it("applies display yaw on the display wrapper, not on seated content", () => {
    const layer = createInterestObjectsLayer(THREE, {
      items: INTEREST_OBJECTS.filter((item) => item.id === "robot"),
    });
    const entry = layer.getEntry("robot");
    expect(entry.display.rotation.z).toBeCloseTo(-0.590886, 5);
    expect(entry.entrance.parent).toBe(entry.display);
    expect(entry.display.parent).toBe(entry.root);
    // Content not loaded yet — entrance holds animation transform only.
    expect(entry.entrance.position.z).toBeCloseTo(INTEREST_ENTRANCE.riseFromZ, 5);
    layer.dispose();
  });

  it("does not let entrance animation mutate canonical pose after reveal", () => {
    const layer = createInterestObjectsLayer(THREE, {
      items: INTEREST_OBJECTS.filter((item) => item.id === "plant"),
    });
    const entry = layer.getEntry("plant");
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5));
    proxy.position.set(0, 0.5, 0);
    const root = new THREE.Group();
    root.add(proxy);
    const { content } = assembleInterestContent(THREE, root, {
      targetSize: 0.2,
      scaleAxis: "z",
      canonicalRotation: INTEREST_CANONICAL_Y_UP_TO_Z_UP,
    });
    entry.entrance.add(content);
    entry.content = content;

    const before = content.quaternion.clone();
    const beforePos = content.position.clone();
    layer.applyEntranceProgress("plant", 1);
    expect(content.quaternion.equals(before)).toBe(true);
    expect(content.position.equals(beforePos)).toBe(true);
    expect(entry.entrance.position.z).toBeCloseTo(0, 5);
    expect(entry.entrance.scale.x).toBeCloseTo(INTEREST_ENTRANCE.endScale, 5);
    layer.dispose();
  });
});
