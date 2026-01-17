// server.js
import "dotenv/config";
import express from "express";
import { fetch, FormData } from "undici";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

app.get("/health", (req, res) => res.json({ ok: true, port: PORT }));

function withTimeout(ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(t) };
}

app.post("/session", express.text({ type: ["application/sdp", "text/plain"] }), async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "missing_api_key", message: "Missing OPENAI_API_KEY in .env" });

    const offerSdp = req.body;
    if (!offerSdp || typeof offerSdp !== "string") {
      return res.status(400).json({ error: "missing_sdp", message: "Missing SDP offer (body must be SDP text)" });
    }

    // IMPORTANT: force stable model unless you explicitly override it
    // Try "gpt-realtime" first (docs example), and only then try mini.
    const model = process.env.REALTIME_MODEL || "gpt-realtime";
    const voice = process.env.REALTIME_VOICE || "marin";

    console.log("[/session] model:", model, "voice:", voice);

    const sessionConfig = {
      type: "realtime",
      model,
      audio: { output: { voice } }
    };

    const fd = new FormData();
    fd.set("sdp", offerSdp);
    fd.set("session", JSON.stringify(sessionConfig));

    const { controller, clear } = withTimeout(25000);

    let r;
    try {
      r = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: fd,
        signal: controller.signal
      });
    } finally {
      clear();
    }

    const text = await r.text();
    const reqId = r.headers.get("x-request-id") || r.headers.get("request-id") || null;

    if (!r.ok) {
      console.error("[/session] OpenAI error status:", r.status, "request_id:", reqId);
      console.error("[/session] OpenAI error body (first 800 chars):", (text || "").slice(0, 800));

      return res.status(r.status).json({
        error: r.status === 504 ? "openai_gateway_timeout" : "openai_error",
        status: r.status,
        request_id: reqId,
        message: text || `OpenAI error (${r.status})`
      });
    }

    res.setHeader("Content-Type", "application/sdp");
    return res.status(200).send(text);
  } catch (e) {
    const msg = String(e?.message || e);
    console.error("[/session] server exception:", msg);

    if (msg.toLowerCase().includes("aborted") || msg.toLowerCase().includes("aborterror")) {
      return res.status(504).json({
        error: "openai_gateway_timeout",
        status: 504,
        message: "Timed out waiting for OpenAI (aborted after 25s)"
      });
    }

    return res.status(500).json({ error: "server_error", message: String(e?.stack || e) });
  }
});

app.listen(PORT, () => console.log(`server running → http://localhost:${PORT}`));
  