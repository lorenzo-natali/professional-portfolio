import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  INTEREST_OBJECTS,
  INTEREST_TARGET_SIZES,
} from "./interestObjectsConfig";
import { createInterestObjectsLayer } from "./createInterestObjectsLayer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const INTEREST_RUNTIME_FILES = [
  "src/components/ar/createInterestObjectsLayer.js",
  "src/components/ar/createInterestObjectsAnimation.js",
  "src/components/ar/loadInterestGlb.js",
  "src/components/ar/interestObjectsConfig.js",
  "src/components/ar/tracking/MindARTrackingAdapter.js",
];

describe("Interest objects physical pose", () => {
  it("has no lookAt / billboard / camera-facing code in interest runtime", () => {
    INTEREST_RUNTIME_FILES.forEach((rel) => {
      const src = readFileSync(path.join(root, rel), "utf8");
      expect(src, rel).not.toMatch(/\.lookAt\s*\(/);
      expect(src, rel).not.toMatch(/billboard/i);
      expect(src, rel).not.toMatch(/Sprite\b/);
      expect(src, rel).not.toMatch(/quaternion\.copy\s*\(\s*camera/);
      expect(src, rel).not.toMatch(/camera\.quaternion/);
    });
  });

  it("keeps local display transforms constant when a scene camera moves", () => {
    const layer = createInterestObjectsLayer(THREE, {
      items: INTEREST_OBJECTS.filter((item) => item.id === "robot"),
    });
    const entry = layer.getEntry("robot");
    const before = {
      display: entry.display.quaternion.clone(),
      root: entry.root.quaternion.clone(),
      entrance: entry.entrance.quaternion.clone(),
    };

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(2, -3, 1.5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    // Interest runtime must ignore camera — no per-frame facing update exists.
    entry.display.updateMatrixWorld(true);

    expect(entry.display.quaternion.equals(before.display)).toBe(true);
    expect(entry.root.quaternion.equals(before.root)).toBe(true);
    expect(entry.entrance.quaternion.equals(before.entrance)).toBe(true);
    layer.dispose();
  });

  it("keeps displayYaw/displayTilt separate from canonicalRotation", () => {
    INTEREST_OBJECTS.forEach((item) => {
      expect(item.canonicalRotation).toBeTruthy();
      expect(typeof item.displayYaw).toBe("number");
      if (item.displayTilt) {
        expect(item.displayTilt).toEqual(
          expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
        );
      }
    });
    expect(INTEREST_TARGET_SIZES["evil-eye"]).toBeCloseTo(0.275096, 5);
  });
});
