import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GrainShader } from "./GrainShader.js";
import { applyFanMaterials } from "./FanMaterials.js";
import { createStudioLighting } from "./StudioLighting.jsx";
import { createAirflowParticles } from "./AirflowParticles.js";

// Labels with real 3D anchors. The two free-standing input tips have no pointers.
const ANNOTATIONS = [
  { id: "trigger", number: "01", side: "left", label: "TRIGGER / AIRFLOW", hint: "R2 · FAN SPEED" },
  { id: "battery", number: "02", side: "left", label: "BATTERY MODULE", hint: "× · REPLACE" },
  { id: "openingT", number: "03", side: "right", label: "FAN OPENING", hint: "LEFT STICK · 1–90°" },
  { id: "cable", number: "04", side: "right", label: "CHARGING PORT", hint: "△ · CABLE" },
];
const INPUT_TIPS = [
  { id: "orbit", number: "05", label: "VIEW ORBIT", hint: "RIGHT STICK · ROTATE" },
  { id: "zoom", number: "06", label: "CAMERA ZOOM", hint: "D-PAD ↑ / ↓ · ZOOM" },
];

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
// Both Opening_Pivot and Opening_Pivot_T are direct children of Keyboard_Fan.
// Move them in opposite directions in their shared parent coordinate system.
// Set the travel to the actual mechanical throw measured in Blender.
const OPENING_SLIDE_OFFSET = new THREE.Vector3(0, -0.3, 0);
const OPENING_T_SLIDE_OFFSET = new THREE.Vector3(0, 0.3, 0);
const OPENING_SLIDE_DAMPING = 12;
const SWAP_DURATION = 2.7; // seconds
const lerp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (t) => { const x = lerp01(t); return x * x * (3 - 2 * x); };
const phase = (t, a, b) => smooth((t - a) / (b - a));

/**
 * 3D Stage 1: load the user's exact GLB hierarchy and animate the pivots.
 * No duplicated fan-speed state: this component only reads speed.
 * viewInputRef is read once per rendered frame, avoiding React rerenders on every stick movement.
 */
export default function FanScene({ speed, opening = 1, viewInputRef, charging = false, swapId = 0, onSwapComplete, onBatteryPowerChange }) {
  const mountRef = useRef(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const showAnnotationsRef = useRef(true);
  showAnnotationsRef.current = showAnnotations;
  const modelRef = useRef(null);
  const speedRef = useRef(speed);
  const openingRef = useRef(opening);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nodes, setNodes] = useState({});
  speedRef.current = speed;
  openingRef.current = opening;
  const chargingRef = useRef(charging);
  const swapIdRef = useRef(swapId);
  const doneRef = useRef(onSwapComplete);
  const powerChangeRef = useRef(onBatteryPowerChange);
  chargingRef.current = charging;
  swapIdRef.current = swapId;
  doneRef.current = onSwapComplete;
  powerChangeRef.current = onBatteryPowerChange;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let raf = 0;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#111417");

    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 500);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      precision: "highp",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth || 700, mount.clientHeight || 500);
    mount.appendChild(renderer.domElement);

    // Full-frame postprocessing: keep the original camera, scene, and controls.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const grainPass = new ShaderPass(GrainShader);
    grainPass.uniforms.amount.value = 0.012; // Fine film grain; keep material detail visible
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
    let openingPivot = null;
    let openingPivotT = null;
    let openingPivotHome = null;
    let openingPivotTHome = null;
    let airflow = null;
    let battery = null;
    let cable = null;
    let batteryHome = null;
    let cableHome = null;
    // Cable starts physically unplugged AND hidden. Never show it unless inserting or removing.
    let cableInsertion = 0;
    let screen = null;
    let screenOriginalMaterial = null;
    let screenCanvasMaterial = null;
    let screenCanvasTexture = null;
    let lcdCanvas = null;
    let lcdRetryElapsed = 0;

    // The React LCD is the single source of truth for both screen views.
    // The CanvasTexture shares the existing 240x240 pixel buffer.
    const attachLCD = () => {
      if (!screen?.isMesh || screenCanvasTexture) return;
      const source = document.querySelector(".fan-interface-column canvas.lcd-screen")
        || document.querySelector("canvas.lcd-screen");
      if (!source || source.width !== 240 || source.height !== 240) return;
      lcdCanvas = source;
      screenCanvasTexture = new THREE.CanvasTexture(lcdCanvas);
      screenCanvasTexture.colorSpace = THREE.SRGBColorSpace;
      screenCanvasTexture.flipY = false; // GLB UV coordinates, like GLTFLoader textures
      screenCanvasTexture.magFilter = THREE.NearestFilter;
      screenCanvasTexture.minFilter = THREE.LinearFilter;
      screenCanvasTexture.generateMipmaps = false;
      screenCanvasMaterial = new THREE.MeshBasicMaterial({
        map: screenCanvasTexture,
        side: THREE.DoubleSide,
        toneMapped: false,
        depthWrite: true,
      });
      if (!powerOff) screen.material = screenCanvasMaterial;
      console.info("[OLED] Linked 240x240 React LCD to Screen_Display");
    };
    const poweredOffScreenMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    let powerOff = false;
    const setPowerOff = (off) => {
      if (powerOff === off) return;
      powerOff = off;
      if (screen && screenOriginalMaterial) screen.material = off ? poweredOffScreenMaterial : (screenCanvasMaterial || screenOriginalMaterial);
      powerChangeRef.current?.(off);
    };
    let activeSwapId = swapIdRef.current;
    let swapElapsed = SWAP_DURATION;
    let swapDoneNotified = true;
    let fittedRadius = 5;
    const calloutNodes = {};
    const projection = new THREE.Vector3();
    // Line coordinates are in the current viewport pixel space.
    function updateAnnotations() {
      if (!showAnnotationsRef.current) return;
      const svg = mount.querySelector(".fan-label-lines");
      if (!svg) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

      mount.querySelectorAll("[data-fan-label]").forEach((label) => {
        const key = label.dataset.fanLabel;
        const node = calloutNodes[key];
        const line = svg.querySelector(`[data-fan-line="${key}"]`);
        const dot = svg.querySelector(`[data-fan-dot="${key}"]`);
        if (!line || !dot) return;

        // Labels are always visible, even when their 3D anchor leaves the viewport
        // or the corresponding part is temporarily removed/hidden.
        label.style.display = "";

        if (!node) {
          line.style.display = "none";
          dot.style.display = "none";
          return;
        }

        // The charging port uses the CONNECTOR'S ORIGIN, never the entire cable's
        // bounding-box center. All other object callouts use visible bounds.
        if (key === "cable") {
          node.getWorldPosition(projection);
        } else {
          const box = new THREE.Box3().setFromObject(node);
          if (!box.isEmpty()) box.getCenter(projection);
          else node.getWorldPosition(projection);
        }

        projection.project(camera);
        const inFront = projection.z > -1 && projection.z < 1;
        const valid = Number.isFinite(projection.x) && Number.isFinite(projection.y);
        if (!inFront || !valid) {
          // Behind the camera: keep the label, hide only an invalid leader line.
          line.style.display = "none";
          dot.style.display = "none";
          return;
        }

        // Clamp the tip to the view boundary, rather than hiding the label.
        const inView = Math.abs(projection.x) <= 1 && Math.abs(projection.y) <= 1;
        const x = clamp((projection.x + 1) * w / 2, 5, w - 5);
        const y = clamp((1 - projection.y) * h / 2, 5, h - 5);
        const r = label.getBoundingClientRect();
        const m = mount.getBoundingClientRect();
        const labelX = r.left - m.left + (r.left < m.left + w / 2 ? r.width : 0);
        const labelY = r.top - m.top + r.height / 2;
        line.style.display = "";
        dot.style.display = inView ? "" : "none";
        line.setAttribute("x1", String(labelX));
        line.setAttribute("y1", String(labelY));
        line.setAttribute("x2", String(x));
        line.setAttribute("y2", String(y));
        dot.setAttribute("cx", String(x));
        dot.setAttribute("cy", String(y));
      });
    }

    const loader = new GLTFLoader();
    loader.load(`${import.meta.env.BASE_URL}models/PortableFan.glb`, (gltf) => {
      if (disposed) return;
      const root = gltf.scene.getObjectByName("Keyboard_Fan") || gltf.scene;
      pivot.add(root);
      disposeFanMaterials = applyFanMaterials(root);
      rotor = root.getObjectByName("Rotor_Pivot");
      trigger = root.getObjectByName("Trigger_Pivot");
      openingPivot = root.getObjectByName("Opening_Pivot");
      openingPivotT = root.getObjectByName("Opening_Pivot_T");
      openingPivotHome = openingPivot?.position.clone() || null;
      openingPivotTHome = openingPivotT?.position.clone() || null;
      console.info("[Fan Opening] Pivot status:", {
        Opening_Pivot: openingPivot ? { parent: openingPivot.parent?.name, start: openingPivotHome.toArray() } : "NOT FOUND",
        Opening_Pivot_T: openingPivotT ? { parent: openingPivotT.parent?.name, start: openingPivotTHome.toArray() } : "NOT FOUND",
      });
      if (openingPivot && openingPivotT && openingPivot.parent !== openingPivotT.parent) {
        console.warn("[Fan Opening] Pivots have different parents. Opposite offsets may need axis conversion.");
      }
      const airflowOrigin = root.getObjectByName("Airflow_Origin");
      if (airflowOrigin) airflow = createAirflowParticles(airflowOrigin);
      battery = root.getObjectByName("Battery_Pivot");
      cable = root.getObjectByName("Charging_Cable");
      batteryHome = battery?.position.clone() || null;
      cableHome = cable?.position.clone() || null;
      // The Blender cable's exported pose is treated as the inserted pose.
      if (cable && cableHome) {
        cable.position.copy(cableHome).add(CABLE_UNPLUG_OFFSET);
        cable.visible = false;
      }
      screen = root.getObjectByName("Screen_Display");
      if (screen?.isMesh) { screenOriginalMaterial = screen.material; attachLCD(); }
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

      // Our camera uses a custom spherical orbit (not OrbitControls).
      // Use the visible OLED geometry center as the orbit target, in WORLD space.
      // This must be computed AFTER the whole model has been centered.
      root.updateMatrixWorld(true);
      if (screen?.isMesh) {
        const screenBounds = new THREE.Box3().setFromObject(screen);
        if (!screenBounds.isEmpty()) {
          screenBounds.getCenter(target);
          console.info("[Camera] Orbit target = Screen_Display center:", target.toArray());
        } else {
          console.warn("[Camera] Screen_Display has no valid bounds; using model center.");
        }
      } else {
        console.warn("[Camera] Screen_Display not found; using model center.");
      }

      // Prefer a separately named plug mesh/Empty if provided in Blender.
      // In the current GLB the connector head is 立方体.003, under Charging_Cable.
      const cableConnector = cable?.getObjectByName("Cable_Connector")
        || cable?.getObjectByName("Charging_Connector")
        || cable?.getObjectByName("立方体.003")
        || cable;
      console.info("[Annotations] Charging connector origin:", cableConnector?.name);
      Object.assign(calloutNodes, {
        trigger, openingT: openingPivotT, battery, cable: cableConnector,
      });
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
      const input = viewInputRef?.current || { x: 0, y: 0, zoom: 0, reset: false };
      if (input.toggleLabels) {
        input.toggleLabels = false;
        setShowAnnotations((previous) => !previous);
      }
      if (input.reset) {
        orbit.yaw = defaults.yaw;
        orbit.pitch = defaults.pitch;
        orbit.radius = defaults.radius;
        input.reset = false;
      }
      // D-pad Up zooms in, Down zooms out. Match the mouse-wheel limits.
      // Multiplicative zoom feels consistent over different GLB scales.
      if (input.zoom) {
        orbit.radius = clamp(
          orbit.radius * Math.exp(-input.zoom * delta * 1.2),
          fittedRadius * 0.45,
          fittedRadius * 3
        );
      }
      orbit.yaw -= stick(input.x || 0) * delta * 2.2;
      orbit.pitch = clamp(orbit.pitch + stick(input.y || 0) * delta * 1.65, -1.45, 1.45);
      camera.position.set(
        target.x + orbit.radius * Math.sin(orbit.yaw) * Math.cos(orbit.pitch),
        target.y + orbit.radius * Math.sin(orbit.pitch),
        target.z + orbit.radius * Math.cos(orbit.yaw) * Math.cos(orbit.pitch)
      );
      camera.lookAt(target);
      // Battery swap: release -> remove -> disappear -> new module inserts -> lock.
      if (swapIdRef.current !== activeSwapId) {
        activeSwapId = swapIdRef.current;
        swapElapsed = 0;
        swapDoneNotified = false;
      }
      if (!swapDoneNotified) swapElapsed = Math.min(SWAP_DURATION, swapElapsed + delta);
      const swapping = !swapDoneNotified;

      if (battery && batteryHome) {
        let out = 0;
        if (swapping) {
          if (swapElapsed < 0.95) out = phase(swapElapsed, 0.25, 0.95);
          else if (swapElapsed < 1.3) out = 1;
          else out = 1 - phase(swapElapsed, 1.3, 2.35);
        }
        battery.position.copy(batteryHome).addScaledVector(BATTERY_REMOVE_OFFSET, out);
        // Hide OLD battery when fully removed. Show NEW one where it enters.
        battery.visible = !swapping || swapElapsed < 0.95 || swapElapsed >= 1.3;
      }

      // No battery: the LCD is electrically off (also mirrored onto 2D UI).
      // Power down as soon as the module begins disengaging, restore when locked.
      setPowerOff(swapping && swapElapsed >= 0.25 && swapElapsed < 2.35);

      if (cable && cableHome) {
        // Start from 0 (fully unplugged and invisible). Both direction and
        // visibility come from the actual insertion progress, never a flash.
        // If a swap begins during charging, retract before battery slides.
        const wantsCharge = chargingRef.current && !swapping;
        const rate = delta / 0.45;
        cableInsertion = clamp(cableInsertion + (wantsCharge ? rate : -rate), 0, 1);
        cable.position.copy(cableHome).addScaledVector(CABLE_UNPLUG_OFFSET, 1 - smooth(cableInsertion));
        cable.visible = cableInsertion > 0.00001;
      }
      if (swapping && swapElapsed >= SWAP_DURATION) {
        swapDoneNotified = true;
        battery && (battery.visible = true);
        setPowerOff(false);
        doneRef.current?.(activeSwapId);
      }

      // Opening 1° -> parked at original positions; 90° -> full travel.
      // Both pivots move in opposite directions, while preserving their
      // original rotations, scales, and all child mesh transforms.
      const opening = clamp(openingRef.current ?? 1, 1, 90);
      const slide = (opening - 1) / 89;
      const slideAlpha = 1 - Math.exp(-OPENING_SLIDE_DAMPING * delta);
      if (openingPivot && openingPivotHome) {
        const goal = openingPivotHome.clone().addScaledVector(OPENING_SLIDE_OFFSET, slide);
        openingPivot.position.lerp(goal, slideAlpha);
      }
      if (openingPivotT && openingPivotTHome) {
        const goalT = openingPivotTHome.clone().addScaledVector(OPENING_T_SLIDE_OFFSET, slide);
        openingPivotT.position.lerp(goalT, slideAlpha);
      }
      const speed01 = swapping ? 0 : (speedRef.current || 0) / 100;
      airflow?.update(delta, speed01 * 100, opening, !powerOff && !swapping);
      if (rotor) rotor.rotation[ROTOR_LOCAL_AXIS] += delta * speed01 * Math.PI * 18;
      if (trigger) {
        const goal = triggerOriginal + TRIGGER_MAX_ANGLE * speed01;
        trigger.rotation[TRIGGER_LOCAL_AXIS] = THREE.MathUtils.damp(trigger.rotation[TRIGGER_LOCAL_AXIS], goal, 12, delta);
      }
      // Canvas is rendered by the existing LCD engine. Refresh the texture on
      // every frame to preserve pixel animation, charge state, and battery scans.
      if (screen && !screenCanvasTexture) {
        lcdRetryElapsed += delta;
        if (lcdRetryElapsed >= 0.25) { lcdRetryElapsed = 0; attachLCD(); }
      }
      if (screenCanvasTexture && !powerOff) screenCanvasTexture.needsUpdate = true;
      grainPass.uniforms.time.value += delta;
      updateAnnotations();
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
      powerChangeRef.current?.(false);
      scene.traverse((obj) => {
        // Dispose the GLTF meshes only. The WebGLRenderer is disposed separately.
        if (obj.isMesh) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m?.dispose());
        }
      });
      airflow?.dispose();
      // Restore the original GLB material before disposing our canvas material.
      if (screen && screenOriginalMaterial) screen.material = screenOriginalMaterial;
      screenCanvasMaterial?.dispose();
      screenCanvasTexture?.dispose();
      poweredOffScreenMaterial.dispose();
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
        <div className="fan-label-toggle-wrap">
          <span className="fan-label-toggle-title">AI / OBJECT ANALYSIS</span>
          <span className="fan-label-circle-hint">○ TOGGLE</span>
          <button className="fan-label-toggle" type="button" aria-pressed={showAnnotations}
            onClick={() => setShowAnnotations((previous) => !previous)}>
            {showAnnotations ? "HIDE LABELS" : "SHOW LABELS"}
          </button>
        </div>
        {showAnnotations && <div className="fan-label-overlay" aria-hidden="true">
          <svg className="fan-label-lines" preserveAspectRatio="none">
            {ANNOTATIONS.map(({id}) => <React.Fragment key={id}>
              <line data-fan-line={id} className="fan-label-line" />
              <circle data-fan-dot={id} className="fan-label-point" r="3" />
            </React.Fragment>)}
          </svg>
          {ANNOTATIONS.map((item) => <div key={item.id}
            className={`fan-data-label fan-data-label--${item.side} fan-data-label--${item.id}`}
            data-fan-label={item.id}>
            <div className="fan-label-index">{item.number} / DETECTED OBJECT</div>
            <div className="fan-label-name">{item.label}</div>
            <div className="fan-label-hint">{item.hint}</div>
          </div>)}
          <div className="fan-input-tips fan-input-tips--left">
            {INPUT_TIPS.map((item) => (
              <div key={item.id} className="fan-data-label fan-data-label--input">
                <div className="fan-label-index">{item.number} / INPUT GUIDE</div>
                <div className="fan-label-name">{item.label}</div>
                <div className="fan-label-hint">{item.hint}</div>
              </div>
            ))}
          </div>
        </div>}
        {loading && !error && <div className="fan-3d-overlay">Loading model…</div>}
        {error && <div className="fan-3d-overlay fan-3d-error">{error}</div>}
      </div>
      <div className="fan-3d-footer">
        <span>RIGHT STICK / DRAG — ORBIT</span>
        <span>D-PAD ↑ / ↓ · WHEEL — ZOOM</span>
        <span>□ — RESET</span>
      </div>
      {!loading && !error && <div className="fan-3d-nodes">PIVOTS: ROTOR {nodes.rotor ? "✓" : "✕"} · TRIGGER {nodes.trigger ? "✓" : "✕"} · BATTERY {nodes.battery ? "✓" : "✕"} · CABLE {nodes.cable ? "✓" : "✕"} · OLED {nodes.screen ? "✓" : "✕"}</div>}
    </section>
  );
}
