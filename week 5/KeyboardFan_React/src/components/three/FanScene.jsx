import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GrainShader } from "./GrainShader.js";
import { applyFanMaterials } from "./FanMaterials.js";
import { createStudioLighting } from "./StudioLighting.jsx";

const DEADZONE = 0.14;
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
const stick = (n) => Math.abs(n) > DEADZONE ? n : 0;

// Change these two axes only if the pivot's local rotation axis differs in Blender.
const ROTOR_LOCAL_AXIS = "z";
const TRIGGER_LOCAL_AXIS = "x";
const TRIGGER_MAX_ANGLE = 0.28; // radians, ~16 degrees

// Offsets are in local coordinates of the corresponding Blender Empty.
// Adjust these two vectors if your actual battery/cable slide direction differs.
const BATTERY_REMOVE_OFFSET = new THREE.Vector3(0, 0.65, -0.65);
const CABLE_UNPLUG_OFFSET = new THREE.Vector3(0, 0.25, -0.25);
const SWAP_DURATION = 2.7; // seconds
const lerp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (t) => { const x = lerp01(t); return x * x * (3 - 2 * x); };
const phase = (t, a, b) => smooth((t - a) / (b - a));

/** Make a small part-mounted number tag; one per independent battery. */
function createBatteryNumber(number, referenceBattery) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 144;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 144);
  ctx.fillStyle = "rgba(12, 15, 17, 0.9)";
  ctx.fillRect(16, 16, 224, 112);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
  ctx.lineWidth = 3;
  ctx.strokeRect(17, 17, 222, 110);
  ctx.font = "bold 82px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f2f4f4";
  ctx.fillText(number, 128, 72);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture, transparent: true, depthTest: false, depthWrite: false,
  });
  const tag = new THREE.Sprite(material);
  tag.name = `Battery_Number_${number}`;
  // Compute a *battery-local* bounding box, so the tag follows the battery Empty.
  referenceBattery.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(referenceBattery);
  const inverse = referenceBattery.matrixWorld.clone().invert();
  const points = [];
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        points.push(new THREE.Vector3(x, y, z).applyMatrix4(inverse));
      }
    }
  }
  const localBounds = new THREE.Box3().setFromPoints(points);
  const size = localBounds.getSize(new THREE.Vector3());
  const center = localBounds.getCenter(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z, 0.001);
  tag.position.set(center.x, center.y, localBounds.max.z + span * 0.04);
  tag.scale.set(span * 0.32, span * 0.18, 1);
  tag.renderOrder = 900;
  referenceBattery.add(tag);
  return tag;
}

/**
 * 3D Stage 1: load the user's exact GLB hierarchy and animate the pivots.
 * No duplicated fan-speed state: this component only reads speed.
 * viewInputRef is read once per rendered frame, avoiding React rerenders on every stick movement.
 */
export default function FanScene({ speed, viewInputRef, charging = false, swapId = 0, onSwapComplete }) {
  const mountRef = useRef(null);
  const modelRef = useRef(null);
  const speedRef = useRef(speed);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nodes, setNodes] = useState({});
  speedRef.current = speed;
  const chargingRef = useRef(charging);
  const swapIdRef = useRef(swapId);
  const doneRef = useRef(onSwapComplete);
  chargingRef.current = charging;
  swapIdRef.current = swapId;
  doneRef.current = onSwapComplete;

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
    renderer.toneMappingExposure = 1.25;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth || 700, mount.clientHeight || 500);
    mount.appendChild(renderer.domElement);

    // Full-frame postprocessing: keep the original camera, scene, and controls.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const grainPass = new ShaderPass(GrainShader);
    grainPass.uniforms.amount.value = 0.025;
    composer.addPass(grainPass);

    const disposeStudioLighting = createStudioLighting(scene, renderer);
    let disposeFanMaterials = null;

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
    let battery = null;
    let cable = null;
    let batteryHome = null;
    let cableHome = null;
    let spareBattery = null;
    let batteryOne = null;
    let batteryTwo = null;
    let activeBattery = 0; // 0 = battery 01, 1 = battery 02
    let exchangeBattery = 1;
    let swappedAtMidpoint = false;
    let cableSlide = 1; // 0 inserted, 1 unplugged
    let previousCharge = Boolean(chargingRef.current);
    let cableTransition = false;
    const removableTextures = [];

    let activeSwapId = swapIdRef.current;
    let swapElapsed = SWAP_DURATION;
    let swapDoneNotified = true;
    let fittedRadius = 5;

    const loader = new GLTFLoader();
    loader.load(`${import.meta.env.BASE_URL}models/PortableFan.glb`, (gltf) => {
      if (disposed) return;
      const root = gltf.scene.getObjectByName("Keyboard_Fan") || gltf.scene;
      pivot.add(root);
      disposeFanMaterials = applyFanMaterials(root);
      rotor = root.getObjectByName("Rotor_Pivot");
      trigger = root.getObjectByName("Trigger_Pivot");
      battery = root.getObjectByName("Battery_Pivot");
      cable = root.getObjectByName("Charging_Cable");
      batteryHome = battery?.position.clone() || null;
      cableHome = cable?.position.clone() || null;
      // The Blender cable pose is INSERTED. An idle scene must never display it.
      cableSlide = chargingRef.current ? 0 : 1;
      previousCharge = Boolean(chargingRef.current);
      cableTransition = false;
      if (cable && cableHome) {
        cable.position.copy(cableHome).addScaledVector(CABLE_UNPLUG_OFFSET, cableSlide);
        cable.visible = Boolean(chargingRef.current);
      }
      if (battery && batteryHome) {
        // Two physical instances so 01 really disappears before 02 is inserted.
        batteryOne = battery;
        // Calculate the label BEFORE adding its clone; clone will get a separate 02 label.
        const firstLabel = createBatteryNumber("01", batteryOne);
        removableTextures.push(firstLabel.material);
        // Clone from the original without its label so 01 is not copied to 02.
        firstLabel.removeFromParent();
        batteryTwo = batteryOne.clone(true);
        firstLabel.position && batteryOne.add(firstLabel);
        batteryTwo.name = "Battery_02";
        batteryTwo.position.copy(batteryHome).add(BATTERY_REMOVE_OFFSET);
        batteryTwo.visible = false;
        batteryOne.parent.add(batteryTwo);
        const secondLabel = createBatteryNumber("02", batteryTwo);
        removableTextures.push(secondLabel.material);
      }
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
      composer.setSize(w, h);
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
      // Battery swap: 0–0.8 remove, 0.8–1.2 pause, 1.2–2.2 insert.
      // With charging active the cable retracts before any battery movement.
      if (swapIdRef.current !== activeSwapId) {
        activeSwapId = swapIdRef.current;
        swapElapsed = 0;
        swapDoneNotified = false;
        swappedAtMidpoint = false;
        exchangeBattery = 1 - activeBattery;
        // A swap forcibly disconnects charging; never briefly show the cable.
        cableSlide = 1;
        cableTransition = false;
        if (cable && cableHome) {
          cable.visible = false;
          cable.position.copy(cableHome).add(CABLE_UNPLUG_OFFSET);
        }
      }
      if (!swapDoneNotified) swapElapsed = Math.min(SWAP_DURATION, swapElapsed + delta);
      const swapping = !swapDoneNotified;

      if (batteryOne && batteryTwo && batteryHome) {
        const batteries = [batteryOne, batteryTwo];
        const oldPart = batteries[activeBattery];
        const newPart = batteries[exchangeBattery];

        if (swapping && swapElapsed < 1.22) {
          // Withdraw 01, hold outside briefly, then hide it at the midpoint.
          oldPart.visible = true;
          oldPart.position.copy(batteryHome).addScaledVector(
            BATTERY_REMOVE_OFFSET, phase(swapElapsed, 0.2, 0.95)
          );
          newPart.visible = false;
        } else if (swapping) {
          if (!swappedAtMidpoint) {
            oldPart.visible = false; // 01 disappears while outside the product.
            newPart.visible = true;  // 02 appears at the same outside position.
            swappedAtMidpoint = true;
          }
          const slide = 1 - phase(swapElapsed, 1.4, 2.45);
          newPart.position.copy(batteryHome).addScaledVector(BATTERY_REMOVE_OFFSET, slide);
        } else {
          batteries[activeBattery].visible = true;
          batteries[activeBattery].position.copy(batteryHome);
          batteries[1 - activeBattery].visible = false;
        }
      }

      if (cable && cableHome) {
        const shouldCharge = Boolean(chargingRef.current) && !swapping;
        if (shouldCharge !== previousCharge) {
          previousCharge = shouldCharge;
          cableTransition = true;
          // On insertion show the cable in the unplugged pose FIRST.
          if (shouldCharge) cable.visible = true;
        }
        const goal = shouldCharge ? 0 : 1;
        if (cableTransition && !swapping) {
          cableSlide = THREE.MathUtils.damp(cableSlide, goal, 8, delta);
          if (Math.abs(cableSlide - goal) < 0.004) {
            cableSlide = goal;
            cableTransition = false;
          }
        } else if (swapping) {
          cableSlide = 1;
          cableTransition = false;
        }
        cable.position.copy(cableHome).addScaledVector(CABLE_UNPLUG_OFFSET, cableSlide);
        // Don't set visible=true every frame: that caused the idle cable flash.
        cable.visible = shouldCharge || (cableTransition && !swapping);
      }
      if (swapping && swapElapsed >= SWAP_DURATION) {
        swapDoneNotified = true;
        activeBattery = exchangeBattery;
        doneRef.current?.(activeSwapId);
      }

      const speed01 = swapping ? 0 : (speedRef.current || 0) / 100;
      if (rotor) rotor.rotation[ROTOR_LOCAL_AXIS] += delta * speed01 * Math.PI * 18;
      if (trigger) {
        const goal = triggerOriginal + TRIGGER_MAX_ANGLE * speed01;
        trigger.rotation[TRIGGER_LOCAL_AXIS] = THREE.MathUtils.damp(trigger.rotation[TRIGGER_LOCAL_AXIS], goal, 12, delta);
      }
      grainPass.uniforms.time.value += delta;
      composer.render();
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
      removableTextures.forEach((material) => {
        material.map?.dispose();
        material.dispose();
      });
      disposeFanMaterials?.();
      disposeStudioLighting();
      composer.dispose();
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
