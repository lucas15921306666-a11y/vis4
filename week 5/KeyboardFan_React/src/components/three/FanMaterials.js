import * as THREE from "three";

// Material names from the Blender GLB. Only these two materials are replaced.
const FROSTED_NAMES = new Set(["塑料玻璃着色器"]);
const METAL_NAMES = new Set(["拉丝金属", "拉丝金属 01", "拉丝金属 01.002"]);

// Very subtle procedural microtexture: no external texture files and no network requests.
// Only applied as a roughness map to the gray metal, not to the OLED or other meshes.
function makeMicroRoughness() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const image = context.createImageData(size, size);
  // Deterministic generator for consistent screenshot appearance.
  let seed = 1729;
  function random() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let y = 0; y < size; y++) {
    const streak = 0.9 + random() * 0.1;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const value = Math.round(215 * streak + random() * 35);
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  map.anisotropy = 4;
  return map;
}

export function applyFanMaterials(root) {
  const roughnessMap = makeMicroRoughness();

  const frosted = new THREE.MeshPhysicalMaterial({
    name: "Frosted polycarbonate / studio",
    color: new THREE.Color("#d9e3e5"),
    metalness: 0,
    roughness: 0.42,
    transmission: 0.82,
    thickness: 0.14, // GLB model units, tweak for actual wall thickness
    ior: 1.48,
    attenuationColor: new THREE.Color("#d5e6eb"),
    attenuationDistance: 2.0,
    clearcoat: 0.10,
    clearcoatRoughness: 0.42,
    side: THREE.DoubleSide,
    depthWrite: true,
    envMapIntensity: 1.05,
  });

  const grayMetal = new THREE.MeshPhysicalMaterial({
    name: "Satin gray metal / studio",
    color: new THREE.Color("#8a9092"),
    metalness: 0.80,
    roughness: 0.38,
    roughnessMap,
    clearcoat: 0.10,
    clearcoatRoughness: 0.36,
    envMapIntensity: 1.15,
  });

  const original = new Map();
  let plasticCount = 0;
  let metalCount = 0;

  function replace(material) {
    if (!material) return material;
    const name = String(material.name || "").trim();
    if (FROSTED_NAMES.has(name)) { plasticCount++; return frosted; }
    if (METAL_NAMES.has(name)) { metalCount++; return grayMetal; }
    return material;
  }

  root.traverse((object) => {
    if (!object.isMesh) return;
    const before = object.material;
    const after = Array.isArray(before) ? before.map(replace) : replace(before);
    if (Array.isArray(before) ? after.some((material, i) => material !== before[i]) : after !== before) {
      original.set(object, before);
      object.material = after;
    }
  });

  console.info("[Studio Materials]", { plasticCount, metalCount });

  return () => {
    original.forEach((oldMaterial, object) => { object.material = oldMaterial; });
    frosted.dispose();
    grayMetal.dispose();
    roughnessMap.dispose();
  };
}
