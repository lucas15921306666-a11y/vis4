import { useCallback, useEffect, useRef, useState } from "react";

// Real-time procedural fan sound. Requires one user gesture to start AudioContext.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const RAMP_SECONDS = 0.11;

export function useFanSound(speed) {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const engineRef = useRef(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const updateAudio = useCallback((engine, value) => {
    const amount = clamp(Number(value) || 0, 0, 100) / 100;
    const now = engine.ctx.currentTime;
    const ramp = (param, next) => {
      param.cancelScheduledValues(now);
      param.setTargetAtTime(next, now, RAMP_SECONDS);
    };
    const audible = amount < 0.005 ? 0 : amount;

    // Motor low hum, with higher pitch at increasing speed.
    ramp(engine.motor.frequency, 55 + Math.pow(amount, 1.05) * 225);
    ramp(engine.motorGain.gain, audible * 0.065);

    // Moving broadband air, with more upper harmonics at higher speed.
    ramp(engine.noiseFilter.frequency, 260 + amount * amount * 3600);
    ramp(engine.noiseGain.gain, Math.pow(audible, 1.5) * 0.32);

    // Slight high-speed whine, present mostly at higher trigger positions.
    ramp(engine.whine.frequency, 260 + Math.pow(amount, 1.35) * 1800);
    ramp(engine.whineGain.gain, Math.pow(Math.max(0, (audible - 0.43) / 0.57), 2) * 0.055);
  }, []);

  const createEngine = useCallback(async () => {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error("This browser does not support Web Audio.");
    const ctx = new Context();
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);

    const motor = ctx.createOscillator();
    motor.type = "sawtooth";
    const motorFilter = ctx.createBiquadFilter();
    motorFilter.type = "lowpass";
    motorFilter.frequency.value = 570;
    const motorGain = ctx.createGain();
    motorGain.gain.value = 0;
    motor.connect(motorFilter).connect(motorGain).connect(master);

    // 2-second white-noise loop, generated locally without any audio asset.
    const duration = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.Q.value = 0.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noise.connect(noiseFilter).connect(noiseGain).connect(master);

    const whine = ctx.createOscillator();
    whine.type = "sine";
    const whineGain = ctx.createGain();
    whineGain.gain.value = 0;
    whine.connect(whineGain).connect(master);

    const engine = { ctx, master, motor, motorGain, noise, noiseFilter, noiseGain, whine, whineGain };
    motor.start();
    noise.start();
    whine.start();
    await ctx.resume();
    return engine;
  }, []);

  const enable = useCallback(async () => {
    try {
      setError("");
      if (!engineRef.current) engineRef.current = await createEngine();
      else await engineRef.current.ctx.resume();
      updateAudio(engineRef.current, speedRef.current);
      setEnabled(true);
    } catch (e) {
      setEnabled(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [createEngine, updateAudio]);

  const disable = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      updateAudio(engine, 0);
      // Suspend stops sound immediately, even if speed changes while muted.
      engine.ctx.suspend().catch(() => {});
    }
    setEnabled(false);
  }, [updateAudio]);

  const toggle = useCallback(() => {
    if (enabled) disable(); else void enable();
  }, [enabled, disable, enable]);

  useEffect(() => {
    if (enabled && engineRef.current) updateAudio(engineRef.current, speed);
  }, [enabled, speed, updateAudio]);

  useEffect(() => () => {
    const engine = engineRef.current;
    engineRef.current = null;
    if (engine) engine.ctx.close().catch(() => {});
  }, []);

  return { enabled, error, toggle };
}
