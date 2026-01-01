// public/webrtc.js
import { exchangeSDP } from "./openai.js";
import { setupMic, monitorAudio } from "./audio.js";
import { drawAvatarFromLevels } from "./lipsync.js";

let pc, dc;

// levels for avatar
let userLevel = 0;
let asstLevel = 0;

// subtitles
let asstText = "";
const userSubEl = document.getElementById("userSub");
const asstSubEl = document.getElementById("asstSub");

function setUserSub(t) {
  if (!userSubEl) return;
  userSubEl.textContent = t && t.trim() ? t : "—";
}

function setAsstSub(t) {
  if (!asstSubEl) return;
  asstSubEl.textContent = t && t.trim() ? t : "—";
}

function animateAvatar() {
  drawAvatarFromLevels({ user: userLevel, assistant: asstLevel });
  requestAnimationFrame(animateAvatar);
}

function sendEvent(obj) {
  if (dc && dc.readyState === "open") dc.send(JSON.stringify(obj));
}

function handleAssistantTextDelta(delta) {
  if (typeof delta !== "string" || !delta.trim()) return;
  asstText += delta;
  setAsstSub(asstText);
}

function parseEvent(log, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }

  const type = msg?.type;

  if (type === "response.output_text.delta") {
    handleAssistantTextDelta(msg?.delta);
    return;
  }

  if (type === "response.text.delta") {
    handleAssistantTextDelta(msg?.delta);
    return;
  }

  if (type === "response.created") {
    asstText = "";
    setAsstSub("…");
    return;
  }

  if (type === "response.done") {
    const resp = msg?.response;
    const out = resp?.output;

    let finalText = "";
    if (Array.isArray(out)) {
      for (const o of out) {
        const content = o?.content;
        if (Array.isArray(content)) {
          for (const part of content) {
            if (typeof part?.text === "string") finalText += part.text;
            if (typeof part?.transcript === "string") finalText += part.transcript;
          }
        }
      }
    }

    if (finalText.trim()) {
      asstText = finalText.trim();
      setAsstSub(asstText);
    }
    return;
  }

  if (type === "error" || msg?.error) {
    const e = msg?.error || msg?.response?.status_details?.error;
    const m = e?.message || e?.code || "error";
    log(`[error] ${m}`);
  }
}

export async function initWebRTC(log) {
  asstText = "";
  setAsstSub("—");

  if (!initWebRTC._animStarted) {
    initWebRTC._animStarted = true;
    requestAnimationFrame(animateAvatar);
  }

  pc = new RTCPeerConnection();

  // Data channel
  dc = pc.createDataChannel("oai-events");

  dc.onopen = () => {
    log("[dc] open");

    // Keep audio + text enabled for server replies (subtitles)
    sendEvent({
      type: "session.update",
      session: {
        output_modalities: ["audio", "text"],
        instructions: "You are a helpful voice assistant. Always speak your replies."
      }
    });

    const el = document.getElementById("dcState");
    if (el) el.textContent = "open";
  };

  dc.onclose = () => {
    log("[dc] closed");
    const el = document.getElementById("dcState");
    if (el) el.textContent = "closed";
  };

  dc.onmessage = (e) => {
    log(`[event] ${e.data}`);
    parseEvent(log, e.data);
  };

  pc.onconnectionstatechange = () => {
    const el = document.getElementById("pcState");
    if (el) el.textContent = pc.connectionState;
  };

  pc.oniceconnectionstatechange = () => {
    const el = document.getElementById("iceState");
    if (el) el.textContent = pc.iceConnectionState;
  };

  // Mic stream + user captions (browser STT handled in audio.js)
  const stream = await setupMic(
    (level) => {
      userLevel = level;
      const micBar = document.getElementById("micBar");
      const micLevelEl = document.getElementById("micLevel");
      if (micBar) micBar.style.width = `${level * 100}%`;
      if (micLevelEl) micLevelEl.textContent = level.toFixed(2);
    },
    (text) => setUserSub(text)
  );

  stream.getTracks().forEach((t) => pc.addTrack(t, stream));

  // Assistant audio
  pc.ontrack = (e) => {
    const audio = document.getElementById("assistantAudio");
    if (audio) audio.srcObject = e.streams[0];

    const asstStatus = document.getElementById("asstStatus");
    if (asstStatus) asstStatus.textContent = "receiving";

    monitorAudio(e.streams[0], (v) => {
      asstLevel = v;
      const asstBar = document.getElementById("asstBar");
      if (asstBar) asstBar.style.width = `${v * 100}%`;
    });
  };

  // SDP exchange
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  try {
    const answerSdp = await exchangeSDP(offer.sdp);
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  } catch (e) {
    try { dc?.close(); } catch {}
    try { pc?.close(); } catch {}
    dc = null;
    pc = null;
    throw e;
  }

  log("[webrtc] connected");
}

initWebRTC._animStarted = false;

export function closeWebRTC() {
  try { dc?.close(); } catch {}
  try { pc?.close(); } catch {}
  dc = null;
  pc = null;

  userLevel = 0;
  asstLevel = 0;
  asstText = "";
  setAsstSub("—");

  const asstStatus = document.getElementById("asstStatus");
  if (asstStatus) asstStatus.textContent = "waiting";

  const asstBar = document.getElementById("asstBar");
  if (asstBar) asstBar.style.width = "0%";
}
