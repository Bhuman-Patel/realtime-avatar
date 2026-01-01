// public/audio.js
export async function setupMic(onLevel, onUserText) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  monitorAudio(stream, onLevel);

  // Local user subtitles (Chrome)
  startBrowserSTT(onUserText);

  return stream;
}

export function monitorAudio(stream, cb) {
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  src.connect(analyser);

  const buf = new Uint8Array(analyser.fftSize);

  function loop() {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += Math.abs(buf[i] - 128);
    cb(Math.min(sum / buf.length / 40, 1));
    requestAnimationFrame(loop);
  }
  loop();
}

// -------- Browser SpeechRecognition (user subtitles) --------
let rec;
let sttStarted = false;

function startBrowserSTT(onText) {
  if (sttStarted) return;
  sttStarted = true;

  if (!onText) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    onText("—");
    return;
  }

  rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "en-US";

  let finalText = "";

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const t = r[0]?.transcript || "";
      if (r.isFinal) finalText += (finalText ? " " : "") + t.trim();
      else interim += t;
    }
    const combined = (finalText + " " + interim).trim();
    if (combined) onText(combined);
  };

  rec.onerror = () => {};
  rec.onend = () => {
    // auto-restart
    try { rec.start(); } catch {}
  };

  try { rec.start(); } catch {}
}
