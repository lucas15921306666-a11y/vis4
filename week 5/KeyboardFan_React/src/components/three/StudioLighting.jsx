import React from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * One-time studio environment + fill lighting (NOT real-time environment reflections).
 * Renderer must already exist when this is called.
 */
export function createStudioLighting(scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRenderTarget = pmrem.fromScene(new RoomEnvironment(), 0.05);
  const environment = envRenderTarget.texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.85;

  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x414951, 1.35);
  const key = new THREE.DirectionalLight(0xffffff, 3.0);
  key.position.set(5, 7, 7);
  const fill = new THREE.DirectionalLight(0xc5e1ff, 1.25);
  fill.position.set(-6, 2, -5);
  const rim = new THREE.DirectionalLight(0xffffff, 1.8);
  rim.position.set(2, 5, -6);
  scene.add(hemisphere, key, fill, rim);

  return () => {
    scene.remove(hemisphere, key, fill, rim);
    hemisphere.dispose();
    key.dispose();
    fill.dispose();
    rim.dispose();
    scene.environment = null;
    envRenderTarget.dispose();
    pmrem.dispose();
  };
}

// Kept as a valid JSX module for a clean React component structure.
export default function StudioLighting() {
  return null;
}
