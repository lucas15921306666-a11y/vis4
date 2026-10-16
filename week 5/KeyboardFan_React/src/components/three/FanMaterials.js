import * as THREE from "three";

// Only replace the two requested materials; everything else stays from Blender.
const FROSTED_NAME = "塑料玻璃着色器";
const METAL_NAME = "拉丝金属";

export function applyFanMaterials(root) {
  const frost = new THREE.MeshPhysicalMaterial({
    name: "Frosted translucent plastic",
    color: new THREE.Color("#d3e0e3"),
    metalness: 0,
    roughness: 0.48,
    transmission: 0.78,
    thickness: 0.12, // GLB world units: adjust if enclosure scale differs
    ior: 1.46,
    attenuationColor: new THREE.Color("#c8e1e8"),
    attenuationDistance: 1.5,
    clearcoat: 0.12,
    clearcoatRoughness: 0.45,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  const metal = new THREE.MeshStandardMaterial({
    name: "Soft gray metal",
    color: new THREE.Color("#838b90"),
    metalness: 0.72,
    roughness: 0.42,
    envMapIntensity: 0.7,
  });

  const shared = [frost, metal];
  const changed = { frosted: 0, metal: 0 };

  function changeMaterial(material) {
    if (!material) return material;
    const name = material.name.trim();
    if (name === FROSTED_NAME) {
      changed.frosted++;
      return frost;
    }
    // Support the older GLB as well as the new name in the user's Blender file.
    if (name === METAL_NAME || name === "拉丝金属 01" || name === "拉丝金属 01.002") {
      changed.metal++;
      return metal;
    }
    return material;
  }

  root.traverse((object) => {
    if (!object.isMesh) return;
    if (Array.isArray(object.material)) {
      object.material = object.material.map(changeMaterial);
    } else {
      object.material = changeMaterial(object.material);
    }
  });

  console.info("Fan material replacements:", changed);
  // The scene owns these two new shared materials. Call dispose on unmount.
  return () => shared.forEach((material) => material.dispose());
}
