import { drawPixelText } from "./pixelFont.js";
import { getScreenStatus, pad2 } from "../utils/format.js";

const SIZE = 240;
const BATTERY = { x: 60, y: 55, digitWidth: 80, digitHeight: 140, gap: 10 };
const DEGREE = { x: 10, y: 65, width: 40, height: 40 };
const FAN = { x: 10, y: 135, width: 40, height: 40 };
const BAR = { x: 59, y: 215, width: 171, height: 8 };
const LCD_GREEN = "#CFFB50";

function makeBuffer(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function loadSVG(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Missing SVG asset: ${path}`));
    img.src = path;
  });
}

function degreeIndex(value) {
  return Math.min(5, Math.floor((Math.max(1, value) - 1) / 15));
}

/**
 * Canvas engine is independent of React. React owns STATE; this module owns PIXELS.
 * It never sets React state and never reads DOM inputs directly.
 */
export async function createCanvasEngine(canvas, basePath = "/assets/") {
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;
  const [frame, batteryDigits, openingDigits, fan, ...degrees] = await Promise.all([
    "frame.svg", "battery-digits.svg", "opening-digits.svg", "fan.svg",
    ...Array.from({ length: 6 }, (_, i) => `degree-${i + 1}.svg`)
  ].map((name) => loadSVG(basePath + name)));

  const frameBuffer = makeBuffer(SIZE, SIZE);
  const degreeBuffer = makeBuffer(40, 40);
  const batteryBuffer = makeBuffer(170, 140);
  frameBuffer.ctx.drawImage(frame, 0, 0, SIZE, SIZE);
  const display = { battery: 99, opening: 1, speed: 0, charging: false };
  let degreeIndexToScan = 0;
  let batteryTile = 0;
  let degreeRemaining = 0;
  let batteryRemaining = 0;
  let scanDegree = false;
  let scanBattery = false;
  let fanAngle = 0;
  let lastStatus = null;
  let lastTime = null;
  let raf;
  let disposed = false;

  function restore(x, y, width, height) {
    ctx.drawImage(frameBuffer.canvas, x, y, width, height, x, y, width, height);
  }
  function drawSpriteDigit(target, source, digit, cell, w, h, x, y) {
    target.drawImage(source, Number(digit) * cell, 0, w, h, x, y, w, h);
  }
  function buildDegree() {
    const c = degreeBuffer.ctx;
    c.clearRect(0, 0, 40, 40);
    // 40x30 degree graphic is kept at its ORIGINAL dimensions.
    c.drawImage(degrees[degreeIndex(display.opening)], 0, 0);
    const digits = pad2(display.opening);
    drawSpriteDigit(c, openingDigits, digits[0], 8, 6, 10, 13, 30);
    drawSpriteDigit(c, openingDigits, digits[1], 8, 6, 10, 21, 30);
  }
  function buildBattery() {
    const c = batteryBuffer.ctx;
    c.clearRect(0, 0, 170, 140);
    const digits = pad2(display.battery);
    drawSpriteDigit(c, batteryDigits, digits[0], 90, 80, 140, 0, 0);
    drawSpriteDigit(c, batteryDigits, digits[1], 90, 80, 140, 90, 0);
  }
  function drawFullDegree() {
    restore(DEGREE.x, DEGREE.y, 40, 40);
    ctx.drawImage(degreeBuffer.canvas, DEGREE.x, DEGREE.y);
  }
  function drawFullBattery() {
    restore(BATTERY.x, BATTERY.y, 170, 140);
    ctx.drawImage(batteryBuffer.canvas, BATTERY.x, BATTERY.y);
  }
  function scanDegreePixels(count) {
    for (let i = 0; i < count && scanDegree; i++) {
      const x = degreeIndexToScan % 40;
      const y = Math.floor(degreeIndexToScan / 40);
      restore(DEGREE.x + x, DEGREE.y + y, 1, 1);
      ctx.drawImage(degreeBuffer.canvas, x, y, 1, 1, DEGREE.x + x, DEGREE.y + y, 1, 1);
      degreeIndexToScan++;
      if (degreeIndexToScan >= 1600) scanDegree = false;
    }
  }
  function scanBatteryTiles(count) {
    for (let i = 0; i < count && scanBattery; i++) {
      const digit = Math.floor(batteryTile / 112);
      const tile = batteryTile % 112;
      const x = digit * 90 + (tile % 8) * 10;
      const y = Math.floor(tile / 8) * 10;
      restore(BATTERY.x + x, BATTERY.y + y, 10, 10);
      ctx.drawImage(batteryBuffer.canvas, x, y, 10, 10, BATTERY.x + x, BATTERY.y + y, 10, 10);
      batteryTile++;
      if (batteryTile >= 224) scanBattery = false;
    }
  }
  function drawStatus(force = false) {
    const text = getScreenStatus(display);
    if (force || text !== lastStatus) {
      restore(10, 10, 220, 10);
      drawPixelText(ctx, text, 10, 10);
      lastStatus = text;
    }
  }
  function drawFan(dt) {
    restore(FAN.x, FAN.y, FAN.width, FAN.height);
    if (!display.speed) fanAngle = 0;
    else fanAngle = (fanAngle + dt * Math.PI * 4 * display.speed / 100) % (Math.PI * 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(FAN.x, FAN.y, 40, 40);
    ctx.clip();
    ctx.translate(FAN.x + 20, FAN.y + 20);
    ctx.rotate(fanAngle);
    ctx.drawImage(fan, -20, -20, 40, 40);
    ctx.restore();
  }
  function drawBatteryBar(time) {
    restore(BAR.x, BAR.y, BAR.width, BAR.height);
    const innerX = BAR.x + 1;
    const fillWidth = Math.round((BAR.width - 2) * display.battery / 99);
    const fillEnd = innerX + fillWidth - 1;
    ctx.fillStyle = "#000";
    ctx.fillRect(innerX, BAR.y + 1, fillWidth, BAR.height - 2);
    if (!display.charging) return;
    const centerX = Math.max(BAR.x + 3, Math.min(BAR.x + BAR.width - 4, innerX + fillWidth + 5));
    const centerY = BAR.y + 3 + (Math.floor(time / 220) % 2);
    const pixel = (x, y) => {
      ctx.fillStyle = x <= fillEnd ? LCD_GREEN : "#000";
      ctx.fillRect(x, y, 1, 1);
    };
    for (let delta = -2; delta <= 2; delta++) {
      pixel(centerX + delta, centerY);
      pixel(centerX, centerY + delta);
    }
  }

  ctx.drawImage(frameBuffer.canvas, 0, 0);
  buildDegree(); buildBattery(); drawFullDegree(); drawFullBattery(); drawStatus(true);

  function tick(time) {
    if (disposed) return;
    const deltaMs = lastTime === null ? 0 : Math.min(100, time - lastTime);
    lastTime = time;
    if (scanDegree) {
      degreeRemaining += deltaMs * 1600 / 250;
      const count = Math.floor(degreeRemaining);
      degreeRemaining -= count;
      scanDegreePixels(count);
    }
    if (scanBattery) {
      batteryRemaining += deltaMs * 224 / 1000;
      const count = Math.floor(batteryRemaining);
      batteryRemaining -= count;
      scanBatteryTiles(count);
    }
    drawFan(deltaMs / 1000);
    drawBatteryBar(time);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    update(next) {
      if (disposed) return;
      if (next.opening !== undefined && next.opening !== display.opening) {
        display.opening = next.opening;
        buildDegree();
        degreeIndexToScan = 0; degreeRemaining = 0; scanDegree = true;
      }
      if (next.battery !== undefined && next.battery !== display.battery) {
        display.battery = next.battery;
        buildBattery();
        batteryTile = 0; batteryRemaining = 0; scanBattery = true;
      }
      if (next.speed !== undefined) display.speed = next.speed;
      if (next.charging !== undefined) display.charging = next.charging;
      drawStatus();
    },
    destroy() { disposed = true; cancelAnimationFrame(raf); }
  };
}
