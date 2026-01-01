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
let nextBlinkAt = 900 + Math.random() * 1800;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, k) { return a + (b - a) * k; }

function drawFace({ mouthOpen = 0, energy = 0 }) {
  const w = canvas.width;
  const h = canvas.height;

  const now = performance.now();
  const dt = Math.min(0.05, (now - t0) / 1000);
  t0 = now;

  // Smooth mouth
  mouth = lerp(mouth, clamp(mouthOpen, 0, 1), 0.25);

  // Random gaze changes (more lively when energy)
  const gazeSpeed = 0.7 + energy * 2.2;
  if (Math.random() < dt * (0.8 + energy * 4)) {
    targetGazeX = (Math.random() * 2 - 1) * (0.3 + energy * 0.25);
    targetGazeY = (Math.random() * 2 - 1) * (0.18 + energy * 0.18);
  }
  gazeX = lerp(gazeX, targetGazeX, dt * gazeSpeed);
  gazeY = lerp(gazeY, targetGazeY, dt * gazeSpeed);

  // Blink logic (more frequent while talking)
  blinkTimer += dt * 1000;
  if (blinkTimer > nextBlinkAt) {
    // blink curve ~120ms
    const phase = (blinkTimer - nextBlinkAt);
    const x = phase / 120;
    if (x <= 1) {
      // closing then opening
      const b = x < 0.5 ? (x / 0.5) : (1 - (x - 0.5) / 0.5);
      eyeOpen = 1 - b;
    } else {
      eyeOpen = 1;
      blinkTimer = 0;
      nextBlinkAt = (700 + Math.random() * 2200) / (1 + energy * 0.9);
    }
  } else {
    // subtle squint with energy
    eyeOpen = lerp(eyeOpen, clamp(1 - energy * 0.12, 0.75, 1), 0.08);
  }

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Background circle plate
  ctx.fillStyle = "#020617";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.48, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = "#ffd7b5";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 - 10, 150, 0, Math.PI * 2);
  ctx.fill();

  // Cheeks (subtle)
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#fb7185";
  ctx.beginPath();
  ctx.ellipse(w / 2 - 70, h / 2 + 40, 34, 22, 0, 0, Math.PI * 2);
  ctx.ellipse(w / 2 + 70, h / 2 + 40, 34, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Eyes positions
  const eyeY = h / 2 - 40;
  const eyeLX = w / 2 - 55;
  const eyeRX = w / 2 + 55;

  function drawEye(cx, cy) {
    // Eye white
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 32, 22 * eyeOpen, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris/pupil offset
    const px = cx + gazeX * 10;
    const py = cy + gazeY * 7;

    // Iris
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(px - 3, py - 4, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Upper lid line
    ctx.strokeStyle = "rgba(15,23,42,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy - 5, 28, Math.PI, 0);
    ctx.stroke();
  }

  drawEye(eyeLX, eyeY);
  drawEye(eyeRX, eyeY);

  // Nose (simple)
  ctx.strokeStyle = "rgba(15,23,42,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2, h / 2 - 10);
  ctx.lineTo(w / 2 - 6, h / 2 + 20);
  ctx.lineTo(w / 2 + 6, h / 2 + 20);
  ctx.stroke();

  // Mouth (talking)
  const mY = h / 2 + 85;
  const open = 10 + mouth * 42;
  const wide = 54 + mouth * 8;

  // Mouth shadow
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.ellipse(w / 2, mY + 7, wide, open * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Mouth interior
  ctx.fillStyle = "#0b1020";
  ctx.beginPath();
  ctx.ellipse(w / 2, mY, wide, Math.max(8, open), 0, 0, Math.PI * 2);
  ctx.fill();

  // Tongue (only when open)
  if (mouth > 0.25) {
    ctx.globalAlpha = clamp((mouth - 0.25) / 0.6, 0, 1) * 0.9;
    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.ellipse(w / 2, mY + 14, wide * 0.55, open * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Simple jaw bounce
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(w / 2 - 120, h / 2 + 120, 12 + mouth * 4, 0, Math.PI * 2);
  ctx.arc(w / 2 + 120, h / 2 + 120, 12 + mouth * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawAvatarFromLevels({ user = 0, assistant = 0 }) {
  // Combine both sources so avatar moves for either speaker
  const energy = clamp(Math.max(user, assistant), 0, 1);

  // Mouth open follows energy, but keep a small baseline so it looks alive
  const mouthOpen = clamp(energy * 1.05, 0, 1);

  drawFace({ mouthOpen, energy });
}

// initial
drawAvatarFromLevels({ user: 0, assistant: 0 });
