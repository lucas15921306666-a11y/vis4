import * as THREE from "three";

// Coordinate system of Airflow_Origin (Blender Empty).
// If the stream points into the fan, change 1 to -1.
export const AIRFLOW_FORWARD_SIGN = -1;

// Specks in a soft cyan airflow cloud, not a heavy solid cone.
const COUNT = 2400;
const STREAM_LENGTH = 2.1;
const BASE_SPEED = 0.7;
const MAX_SPEED = 3.2;

/**
 * Keeps airflow geometry parented to Airflow_Origin. The emission cone is
 * defined in its LOCAL Z direction, so the complete effect inherits the GLB
 * position/orientation and follows model motion without world-axis guessing.
 *
 * Independent of React: update() gets current speed/opening each frame.
 */
export function createAirflowParticles(origin) {
  const positions = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const depths = new Float32Array(COUNT);
  const theta = new Float32Array(COUNT);
  const radiusFactor = new Float32Array(COUNT);
  const seeds = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    depths[i] = Math.random();
    theta[i] = Math.random() * Math.PI * 2;
    radiusFactor[i] = Math.sqrt(Math.random());
    sizes[i] = 3.5 + Math.random() * 4.5;
    seeds[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  // Tiny round points with a soft falloff. No external texture required.
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uColor: { value: new THREE.Color("#79e9ff") },
    },
    vertexShader: `
      attribute float aSize;
      uniform float uPixelRatio;
      varying float vDepth;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(24.0, aSize * uPixelRatio * (2.8 / max(0.15, -mv.z)));
        vDepth = position.z;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vDepth;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float r = length(p);
        float halo = 1.0 - smoothstep(0.02, 0.5, r);
        float fade = smoothstep(0.0, 0.14, abs(vDepth)) * (1.0 - 0.35 * smoothstep(0.75, 2.2, abs(vDepth)));
        gl_FragColor = vec4(uColor, uOpacity * halo * fade);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  points.name = "Airflow_Particles";
  // Blender's Airflow_Origin already has a -90° X rotation in GLB.
  // Apply +90° locally so the stream no longer points upward.
  points.rotation.x = Math.PI / 2;
  origin.add(points);

  const update = (delta, speed, opening, enabled = true) => {
    const speed01 = THREE.MathUtils.clamp((speed || 0) / 100, 0, 1);
    const active = enabled && speed01 > 0.025;
    points.visible = active;
    if (!active) return;

    const angle = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(opening || 1, 1, 90) / 2);
    const coneTangent = Math.tan(angle);
    const streamSpeed = BASE_SPEED + MAX_SPEED * speed01;
    const activeFraction = 0.55 + 0.45 * speed01;
    material.uniforms.uOpacity.value = 0.48 + 0.42 * speed01;

    for (let i = 0; i < COUNT; i++) {
      depths[i] = (depths[i] + (delta * streamSpeed / STREAM_LENGTH) * (0.75 + seeds[i] * 0.5)) % 1;
      const visible = seeds[i] <= activeFraction;
      const z = (0.04 + STREAM_LENGTH * depths[i]) * AIRFLOW_FORWARD_SIGN;
      const coneRadius = 0.012 + Math.abs(z) * coneTangent;
      const r = coneRadius * radiusFactor[i];
      const index = i * 3;
      positions[index] = visible ? Math.cos(theta[i]) * r : 0;
      positions[index + 1] = visible ? Math.sin(theta[i]) * r : 0;
      positions[index + 2] = visible ? z : 0;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeBoundingSphere();
  };

  return {
    update,
    dispose() {
      origin.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}
