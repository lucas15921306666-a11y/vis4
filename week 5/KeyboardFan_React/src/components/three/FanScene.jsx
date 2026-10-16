import React from "react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const DEADZONE = 0.14;
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
const stick = (n) => Math.abs(n) > DEADZONE ? n : 0;

// Change these two axes only if the pivot's local rotation axis differs in Blender.
const ROTOR_LOCAL_AXIS = "z";
const TRIGGER_LOCAL_AXIS = "x";
const TRIGGER_MAX_ANGLE = -0.28; // radians, ~16 degrees

/**
 * 3D Stage 1: load the user's exact GLB hierarchy and animate the pivots.
 * No duplicated fan-speed state: this component only reads speed.
 * viewInputRef is read once per rendered frame, avoiding React rerenders on every stick movement.
 */
export default function FanScene({ speed, viewInputRef }) {
  const mountRef = useRef(null);
  const modelRef = useRef(null);
  const speedRef = useRef(speed);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nodes, setNodes] = useState({});
  speedRef.current = speed;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let raf = 0;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#111417");

    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth || 700, mount.clientHeight || 500);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xe5f0ff, 0x252b32, 3.4));
    const key = new THREE.DirectionalLight(0xffffff, 4.0);
    key.position.set(5, 8, 9);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8ed9ff, 2.0);
    fill.position.set(-6, -2, -4);
    scene.add(fill);

    // Orbit the camera around a static centered model, preserving the model's GLB pivots.
    const pivot = new THREE.Group();
    scene.add(pivot);
    const orbit = { yaw: -0.65, pitch: 0.1, radius: 5.0 };
    const defaults = { ...orbit };
    const target = new THREE.Vector3(0, 0, 0);
    const clock = new THREE.Clock();
    let rotor = null;
    let trigger = null;
    let triggerOriginal = 0;
    let fittedRadius = 5;

    const loader = new GLTFLoader();
    loader.load(`${import.meta.env.BASE_URL}models/PortableFan.glb`, (gltf) => {
      if (disposed) return;
      const root = gltf.scene.getObjectByName("Keyboard_Fan") || gltf.scene;
      pivot.add(root);
      rotor = root.getObjectByName("Rotor_Pivot");
      trigger = root.getObjectByName("Trigger_Pivot");
      const battery = root.getObjectByName("Battery_Pivot");
      const cable = root.getObjectByName("Charging_Cable");
      const screen = root.getObjectByName("Screen_Display");
      triggerOriginal = trigger?.rotation[TRIGGER_LOCAL_AXIS] || 0;
      setNodes({ root: root.name, rotor: !!rotor, trigger: !!trigger, battery: !!battery, cable: !!cable, screen: !!screen });

      // Center model without disturbing Empty child transforms.
      root.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(root);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());
      root.position.sub(center);
      const longest = Math.max(size.x, size.y, size.z, 0.001);
      fittedRadius = longest * 1.75;
      orbit.radius = fittedRadius;
      defaults.radius = fittedRadius;
      modelRef.current = { rotor, trigger };
      setLoading(false);
    }, undefined, () => {
      if (!disposed) { setLoading(false); setError("Could not load public/models/PortableFan.glb"); }
    });

    // Pointer drag (mouse) and scroll-wheel zoom also work without a controller.
    let pointer = null;
    const onPointerDown = (event) => {
      pointer = { x: event.clientX, y: event.clientY };
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event) => {
      if (!pointer) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      orbit.yaw -= dx * 0.006;
      orbit.pitch = clamp(orbit.pitch + dy * 0.006, -1.45, 1.45);
      pointer = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = () => { pointer = null; };
    const onWheel = (event) => {
      event.preventDefault();
      orbit.radius = clamp(orbit.radius * Math.exp(event.deltaY * 0.001), fittedRadius * 0.45, fittedRadius * 3);
    };
    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const resize = new ResizeObserver(() => {
      const w = mount.clientWidth || 700;
      const h = mount.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    resize.observe(mount);

    function animate() {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const input = viewInputRef.current || { x: 0, y: 0, reset: false };
      if (input.reset) {
        orbit.yaw = defaults.yaw;
        orbit.pitch = defaults.pitch;
        orbit.radius = defaults.radius;
        input.reset = false;
      }
      orbit.yaw -= stick(input.x || 0) * delta * 2.2;
      orbit.pitch = clamp(orbit.pitch + stick(input.y || 0) * delta * 1.65, -1.45, 1.45);
      camera.position.set(
        target.x + orbit.radius * Math.sin(orbit.yaw) * Math.cos(orbit.pitch),
        target.y + orbit.radius * Math.sin(orbit.pitch),
        target.z + orbit.radius * Math.cos(orbit.yaw) * Math.cos(orbit.pitch)
      );
      camera.lookAt(target);
      const speed01 = (speedRef.current || 0) / 100;
      if (rotor) rotor.rotation[ROTOR_LOCAL_AXIS] += delta * speed01 * Math.PI * 18;
      if (trigger) {
        const goal = triggerOriginal + TRIGGER_MAX_ANGLE * speed01;
        trigger.rotation[TRIGGER_LOCAL_AXIS] = THREE.MathUtils.damp(trigger.rotation[TRIGGER_LOCAL_AXIS], goal, 12, delta);
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      scene.traverse((obj) => {
        // Dispose the GLTF meshes only. The WebGLRenderer is disposed separately.
        if (obj.isMesh) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m?.dispose());
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [viewInputRef]);

  return (
    <section className="fan-3d-panel" aria-label="Interactive 3D product demo">
      <div className="fan-3d-heading"><span>3D PRODUCT VIEW</span><small>PortableFan.glb</small></div>
      <div className="fan-3d-viewport" ref={mountRef}>
        {loading && !error && <div className="fan-3d-overlay">Loading model…</div>}
        {error && <div className="fan-3d-overlay fan-3d-error">{error}</div>}
      </div>
      <div className="fan-3d-footer">
        <span>RIGHT STICK / DRAG — ORBIT</span>
        <span>WHEEL — ZOOM</span>
        <span>□ — RESET</span>
      </div>
      {!loading && !error && <div className="fan-3d-nodes">PIVOTS: ROTOR {nodes.rotor ? "✓" : "✕"} · TRIGGER {nodes.trigger ? "✓" : "✕"} · BATTERY {nodes.battery ? "✓" : "✕"} · CABLE {nodes.cable ? "✓" : "✕"} · OLED {nodes.screen ? "✓" : "✕"}</div>}
    </section>
  );
}
