// server.js
import "dotenv/config";
import express from "express";
import { fetch, FormData, Agent, setGlobalDispatcher } from "undici";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// Keep-alive + better network behavior
setGlobalDispatcher(
  new Agent({
    keepAliveTimeout: 30_000,
    keepAliveMaxTimeout: 120_000,
    connections: 50,
    connectTimeout: 15_000,
  })
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function fetchWithRetry(url, options, { tries = 8, timeoutMs = 45_000 } = {}) {
  let last = { status: 500, text: "unknown error" };

  for (let attempt = 1; attempt <= tries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const r = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      const text = await r.text();

      if (r.ok) return { ok: true, status: r.status, text };

      last = { status: r.status, text };

      if (isRetryableStatus(r.status) && attempt < tries) {
        const backoff = Math.round(800 * Math.pow(2, attempt - 1) + Math.random() * 400);
        console.log(`[retry] ${r.status} attempt ${attempt}/${tries} backoff ${backoff}ms`);
        await sleep(backoff);
        continue;
      }

      return { ok: false, status: r.status, text };
    } catch (e) {
      clearTimeout(timeout);
      last = { status: 500, text: String(e?.message || e) };

      if (attempt < tries) {
        const backoff = Math.round(900 * Math.pow(2, attempt - 1) + Math.random() * 500);
        console.log(`[retry] network/timeout attempt ${attempt}/${tries} backoff ${backoff}ms (${last.text})`);
        await sleep(backoff);
        continue;
      }

      return { ok: false, status: 500, text: last.text };
    }
  }

  return { ok: false, status: last.status, text: last.text };
}

// Optional debug endpoint (NOT used during connect)
app.get("/models", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    const r = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const j = await r.json();
    if (!r.ok) return res.status(r.status).json(j);

    res.json({ count: (j.data || []).length, models: (j.data || []).map((m) => m.id) });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// SDP exchange endpoint
app.post(
  "/session",
  express.text({ type: ["application/sdp", "text/plain"] }),
  async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "missing_api_key", message: "Missing OPENAI_API_KEY in .env" });

      const offerSdp = req.body;
      if (!offerSdp || typeof offerSdp !== "string") {
        return res.status(400).json({ error: "missing_sdp", message: "Missing SDP offer (body must be SDP text)" });
      }

      const model = process.env.REALTIME_MODEL;
      if (!model) {
        return res.status(500).json({
          error: "missing_realtime_model",
          message: "Set REALTIME_MODEL in .env (e.g., gpt-realtime-mini-2025-12-15)",
        });
      }

      const sessionConfig = {
    type: "realtime",
    model: process.env.REALTIME_MODEL || "gpt-realtime-mini-2025-12-15",
    instructions: "You are a helpful voice assistant. Always speak your replies.",
    output_modalities: ["audio", "text"],
    audio: { output: { voice: process.env.REALTIME_VOICE || "ash" } }
  };


      console.log("[/session] using model:", model);

      const fd = new FormData();
      fd.set("sdp", offerSdp);
      fd.set("session", JSON.stringify(sessionConfig));

      const result = await fetchWithRetry(
        "https://api.openai.com/v1/realtime/calls",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: fd,
        },
        { tries: 8, timeoutMs: 45_000 }
      );

      if (!result.ok) {
        const isHtml = typeof result.text === "string" && result.text.trim().startsWith("<!DOCTYPE html");
        if (isHtml || result.status === 504) {
          return res.status(504).json({
            error: "openai_gateway_timeout",
            message: "OpenAI gateway timeout (504). Please retry Connect.",
          });
        }
        return res.status(result.status || 500).json({
          error: "openai_error",
          message: result.text || "OpenAI error",
        });
      }

      res.setHeader("Content-Type", "application/sdp");
      return res.status(200).send(result.text);
    } catch (e) {
      return res.status(500).json({ error: "server_error", message: String(e?.stack || e) });
    }
  }
);

app.listen(PORT, () => console.log(`server running → http://localhost:${PORT}`));
