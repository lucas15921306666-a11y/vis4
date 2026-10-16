import React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Product photography-style lighting without real-time ray tracing.
 * RoomEnvironment becomes a prefiltered static studio reflection map, which
 * helps metal and frosted plastic read as physical materials.
 */
export function createStudioLighting(scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environmentTarget = pmrem.fromScene(room, 0.05);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.95;

  // Broad tonal separation: neutral key, cool fill, restrained edge definition.
  const ambient = new THREE.HemisphereLight(0xffffff, 0x4a5360, 1.35);
  const key = new THREE.DirectionalLight(0xfff9f1, 2.4);
  key.position.set(4.5, 6.0, 8.0);
  const fill = new THREE.DirectionalLight(0xd9eaff, 0.95);
  fill.position.set(-6.0, 1.0, 3.5);
  const rim = new THREE.DirectionalLight(0xf0faff, 1.65);
  rim.position.set(-1.8, 5.0, -6.0);
  const lower = new THREE.DirectionalLight(0xffffff, 0.45);
  lower.position.set(2.0, -4.0, 4.0);

  scene.add(ambient, key, fill, rim, lower);

  return () => {
    scene.remove(ambient, key, fill, rim, lower);
    [ambient, key, fill, rim, lower].forEach((light) => light.dispose());
    if (scene.environment === environmentTarget.texture) scene.environment = null;
    environmentTarget.dispose();
    room.dispose();
    pmrem.dispose();
  };
}

export default function StudioLighting() { return null; }
