// public/app.js
import { initWebRTC, closeWebRTC } from "./webrtc.js";

const logEl = document.getElementById("log");
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const testBtn = document.getElementById("testBtn");
const speakerBtn = document.getElementById("speakerBtn");

function log(msg) {
  if (!logEl) return;
  logEl.textContent += `\n${msg}`;
  logEl.scrollTop = logEl.scrollHeight;
}

// Disable unused buttons
if (testBtn) testBtn.disabled = true;
if (speakerBtn) speakerBtn.disabled = true;

if (connectBtn) {
  connectBtn.onclick = async () => {
    connectBtn.disabled = true;
    try {
      log("[ui] connecting...");
      await initWebRTC(log);
      if (disconnectBtn) disconnectBtn.disabled = false;
      log("[ui] connected ✅");
    } catch (e) {
      log(`[ui] connect failed: ${String(e?.message || e)}`);
    } finally {
      connectBtn.disabled = false;
    }
  };
}

if (disconnectBtn) {
  disconnectBtn.onclick = () => {
    closeWebRTC();
    log("[ui] disconnected");
  };
}
