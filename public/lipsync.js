// public/lipsync.js
const canvas = document.getElementById("avatar");
const ctx = canvas.getContext("2d");

let t0 = performance.now();

// Smoothed animation state
let mouth = 0;        // 0..1
let eyeOpen = 1;      // 0..1
let gazeX = 0;        // -1..1
let gazeY = 0;        // -1..1
let targetGazeX = 0;
let targetGazeY = 0;
let blinkTimer = 0;
let nextBlinkAt = 1050 + Math.random() * 2100;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, k) { return a + (b - a) * k; }

function drawNoiseTexture(x, y, w, h, alpha = 0.05) {
  // Fast-ish skin grain: small random dots
  // (Keeps it from looking flat/cartoon)
  const step = 6;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#000";
  for (let yy = y; yy < y + h; yy += step) {
    for (let xx = x; xx < x + w; xx += step) {
      if (Math.random() < 0.22) {
        ctx.fillRect(xx + (Math.random() * 2), yy + (Math.random() * 2), 1, 1);
      }
    }
  }
  ctx.restore();
}

function radial(x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [p, c] of stops) g.addColorStop(p, c);
  return g;
}

function softEllipseFill(x, y, rx, ry, fill, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// “Less-cartoon, more realistic” palette (young female, airline vibe)
const THEME = {
  skinMid: "#e8bfa3",
  skinLight: "#f3d0bc",
  skinShadow: "#d49a82",

  hair: "#231a16",
  hairSoft: "rgba(35,26,22,0.35)",

  iris: "#1b2430",
  sclera: "#f7f7f8",

  lip: "#b85a63",           // less saturated than “cartoon pink”
  lipShadow: "rgba(0,0,0,0.25)",

  blazer: "#0b1020",
  scarfA: "#b91c1c",
  scarfB: "#f59e0b",

  // realism knobs
  eyeScale: 0.88,           // smaller eyes == less cartoon
  lidStrength: 0.45,
};

function drawFrame({ mouthOpen = 0, energy = 0 }) {
  const w = canvas.width;
  const h = canvas.height;

  const now = performance.now();
  const dt = Math.min(0.05, (now - t0) / 1000);
  t0 = now;

  // Smooth mouth
  mouth = lerp(mouth, clamp(mouthOpen, 0, 1), 0.25);

  // Gaze: subtle
  const gazeSpeed = 0.65 + energy * 2.0;
  const alive = 0.10 + energy * 0.75;
  if (Math.random() < dt * (0.45 + alive * 2.4)) {
    targetGazeX = (Math.random() * 2 - 1) * (0.16 + alive * 0.18);
    targetGazeY = (Math.random() * 2 - 1) * (0.10 + alive * 0.14);
  }
  gazeX = lerp(gazeX, targetGazeX, dt * gazeSpeed);
  gazeY = lerp(gazeY, targetGazeY, dt * gazeSpeed);

  // Blink: natural
  blinkTimer += dt * 1000;
  if (blinkTimer > nextBlinkAt) {
    const phase = (blinkTimer - nextBlinkAt);
    const x = phase / 140;
    if (x <= 1) {
      const b = x < 0.55 ? (x / 0.55) : (1 - (x - 0.55) / 0.45);
      eyeOpen = 1 - b;
    } else {
      eyeOpen = 1;
      blinkTimer = 0;
      nextBlinkAt = (1050 + Math.random() * 2500) / (1 + energy * 0.75);
    }
  } else {
    eyeOpen = lerp(eyeOpen, clamp(1 - energy * 0.06, 0.82, 1), 0.08);
  }

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Background plate (subtle studio light)
  ctx.fillStyle = "#020617";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.48, 0, Math.PI * 2);
  ctx.fill();

  softEllipseFill(w / 2 - 70, h / 2 - 90, 210, 170, "rgba(59,130,246,0.14)", 1);
  softEllipseFill(w / 2 + 80, h / 2 + 60, 220, 170, "rgba(168,85,247,0.10)", 1);

  // Uniform hint (kept subtle)
  softEllipseFill(w / 2, h / 2 + 215, 210, 140, THEME.blazer, 0.96);
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = THEME.scarfA;
  ctx.beginPath();
  ctx.moveTo(w / 2, h / 2 + 145);
  ctx.lineTo(w / 2 - 60, h / 2 + 182);
  ctx.lineTo(w / 2 + 60, h / 2 + 182);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = THEME.scarfB;
  ctx.beginPath();
  ctx.ellipse(w / 2 - 20, h / 2 + 175, 19, 10, -0.25, 0, Math.PI * 2);
  ctx.ellipse(w / 2 + 20, h / 2 + 175, 19, 10, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const cx = w / 2;
  const cy = h / 2 - 28;

  // Neck (adds realism; cartoon faces often float)
  ctx.save();
  ctx.globalAlpha = 0.98;
  ctx.fillStyle = radial(cx, cy + 150, 20, 120, [
    [0, THEME.skinMid],
    [1, THEME.skinShadow],
  ]);
  ctx.beginPath();
  ctx.ellipse(cx, cy + 168, 60, 75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Face base — 3-tone gradient
  const faceG = radial(cx - 30, cy - 35, 30, 230, [
    [0, THEME.skinLight],
    [0.55, THEME.skinMid],
    [1, THEME.skinShadow],
  ]);
  ctx.fillStyle = faceG;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 145, 165, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cheekbone / jaw shading (realistic contour)
  softEllipseFill(cx - 92, cy + 20, 55, 105, "rgba(0,0,0,0.08)", 1);
  softEllipseFill(cx + 92, cy + 20, 55, 105, "rgba(0,0,0,0.08)", 1);
  softEllipseFill(cx, cy + 125, 85, 35, "rgba(0,0,0,0.10)", 1);

  // Skin texture/grain (makes it less flat)
  drawNoiseTexture(cx - 150, cy - 170, 300, 360, 0.045);

  // Hair: neat bun (less “cartoon helmet”, more layered)
  ctx.save();
  ctx.fillStyle = THEME.hair;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 105, 155, 115, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 86, cy - 138, 52, 46, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair soft shadow on forehead
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = THEME.hairSoft;
  ctx.beginPath();
  ctx.ellipse(cx - 10, cy - 92, 130, 55, 0.05, 0, Math.PI * 2);
  ctx.fill();

  // subtle hair shine
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(cx - 55, cy - 132, 95, 55, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Eyes (smaller + more detailed iris, less “cute”)
  const eyeY = cy - 52;
  const eyeLX = cx - 56;
  const eyeRX = cx + 56;
  const eyeW = 30 * THEME.eyeScale;
  const eyeH = 20 * THEME.eyeScale;

  function drawEye(ex, ey) {
    // sclera
    ctx.fillStyle = THEME.sclera;
    ctx.beginPath();
    ctx.ellipse(ex, ey, eyeW, eyeH * eyeOpen, 0, 0, Math.PI * 2);
    ctx.fill();

    // iris offset
    const px = ex + gazeX * 8;
    const py = ey + gazeY * 6;

    const irisG = radial(px - 2, py - 2, 2, 14, [
      [0, "#2c3a4a"],
      [0.6, THEME.iris],
      [1, "#0b1020"],
    ]);

    ctx.fillStyle = irisG;
    ctx.beginPath();
    ctx.arc(px, py, 9.5, 0, Math.PI * 2);
    ctx.fill();

    // pupil
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(px, py, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // catchlight
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(px - 3.2, py - 4.0, 2.1, 0, Math.PI * 2);
    ctx.fill();

    // eyelid (soft, not thick cartoon line)
    ctx.strokeStyle = `rgba(15,23,42,${0.22 + THEME.lidStrength * 0.38})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ex, ey - 6, eyeW * 0.95, Math.PI, 0);
    ctx.stroke();

    // under-eye shadow
    ctx.strokeStyle = "rgba(15,23,42,0.10)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex, ey + 5, eyeW * 0.78, 0, Math.PI);
    ctx.stroke();
  }

  drawEye(eyeLX, eyeY);
  drawEye(eyeRX, eyeY);

  // Brows (thin, shaped)
  ctx.strokeStyle = "rgba(35,26,22,0.45)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 92, cy - 92);
  ctx.quadraticCurveTo(cx - 62, cy - 108, cx - 28, cy - 98);
  ctx.moveTo(cx + 92, cy - 92);
  ctx.quadraticCurveTo(cx + 62, cy - 108, cx + 28, cy - 98);
  ctx.stroke();

  // Nose (more subtle; no hard triangle lines)
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(15,23,42,0.14)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 20);
  ctx.quadraticCurveTo(cx - 6, cy + 18, cx, cy + 28);
  ctx.stroke();

  ctx.strokeStyle = "rgba(15,23,42,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx - 6, cy + 32, 7, 0.1, Math.PI * 0.9);
  ctx.arc(cx + 6, cy + 32, 7, 0.1, Math.PI * 0.9);
  ctx.stroke();
  ctx.restore();

  // Lips / mouth — less saturated, more natural
  // --- Lips / mouth (idle smile + talking) ---
const my = cy + 102;
const open = 6 + mouth * 30;
const wide = 48 + mouth * 6;

// smile strength: 1 at idle, fades out as she talks
const smile = clamp(1 - mouth * 1.8, 0, 1);

// corners lift a bit when smiling
const cornerLift = 6 * smile;          // higher = more smile
const smileCurve = 10 * smile;         // curvature of the lip

// If talking, show cavity; if idle, keep it closed and smiling
if (mouth > 0.10) {
  // mouth cavity
  softEllipseFill(cx, my + 2, wide * 0.86, Math.max(6, open), "#0b1020", 1);
}

// upper lip (slightly curved into a smile at idle)
ctx.save();
ctx.globalAlpha = 0.92;
ctx.fillStyle = THEME.lip;
ctx.beginPath();

// left corner → cupid bow → right corner (with smile)
ctx.moveTo(cx - wide * 0.78, my - 2 - cornerLift);
ctx.quadraticCurveTo(
  cx,
  my - (16 + mouth * 4) - smileCurve,   // lift center when smiling
  cx + wide * 0.78,
  my - 2 - cornerLift
);

// close shape (keeps lips together when idle)
const lipClose = 6 * smile;            // thickness when smiling
ctx.quadraticCurveTo(
  cx,
  my + (5 + lipClose) + mouth * 2,      // slightly fuller lower edge at idle
  cx - wide * 0.78,
  my - 2 - cornerLift
);
ctx.fill();
ctx.restore();

// lower lip highlight (subtle; more visible when smiling)
ctx.save();
ctx.globalAlpha = (0.14 + mouth * 0.05) + (0.08 * smile);
ctx.fillStyle = "rgba(255,255,255,0.7)";
ctx.beginPath();
ctx.ellipse(cx, my + 14 - 2 * smile, wide * (0.38 + 0.03 * smile), 5 + mouth * 2, 0, 0, Math.PI * 2);
ctx.fill();
ctx.restore();

// tongue (only when open)
if (mouth > 0.30) {
  ctx.save();
  ctx.globalAlpha = clamp((mouth - 0.30) / 0.6, 0, 1) * 0.78;
  ctx.fillStyle = "rgba(216,96,124,0.85)";
  ctx.beginPath();
  ctx.ellipse(cx, my + 18, wide * 0.44, open * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}


  // upper lip
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = THEME.lip;
  ctx.beginPath();
  ctx.moveTo(cx - wide * 0.78, my - 2);
  ctx.quadraticCurveTo(cx, my - 16 - mouth * 4, cx + wide * 0.78, my - 2);
  ctx.quadraticCurveTo(cx, my + 5, cx - wide * 0.78, my - 2);
  ctx.fill();
  ctx.restore();

  // lower lip highlight (very subtle)
  ctx.save();
  ctx.globalAlpha = 0.12 + mouth * 0.06;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.ellipse(cx, my + 14, wide * 0.38, 5 + mouth * 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // tongue (only when open)
  if (mouth > 0.30) {
    ctx.save();
    ctx.globalAlpha = clamp((mouth - 0.30) / 0.6, 0, 1) * 0.78;
    ctx.fillStyle = "rgba(216,96,124,0.85)";
    ctx.beginPath();
    ctx.ellipse(cx, my + 18, wide * 0.44, open * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // final face specular highlights (forehead/nose/cheek)
  softEllipseFill(cx - 38, cy - 55, 58, 28, "rgba(255,255,255,0.10)", 1);
  softEllipseFill(cx + 58, cy + 20, 42, 22, "rgba(255,255,255,0.06)", 1);
  softEllipseFill(cx, cy + 12, 18, 36, "rgba(255,255,255,0.05)", 1);
}

// IMPORTANT: this is what your webrtc.js calls.
// ✅ assistant drives mouth; user does NOT.
export function drawAvatarFromLevels({ user = 0, assistant = 0 }) {
  const asst = clamp(assistant, 0, 1);

  // idle baseline so she doesn’t look “frozen”
  const idle = 0.015;
  const energy = asst;
  const mouthOpen = clamp(idle + asst * 1.05, 0, 1);

  drawFrame({ mouthOpen, energy });
}

// initial
drawAvatarFromLevels({ user: 0, assistant: 0 });
