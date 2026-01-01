// public/openai.js
export async function exchangeSDP(offerSdp) {
  const r = await fetch("/session", {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: offerSdp
  });

  const ct = r.headers.get("content-type") || "";

  if (ct.includes("application/json")) {
    const j = await r.json();
    if (!r.ok) throw new Error(j?.message || j?.error || "Server error");
    if (j?.sdp) return j.sdp;
    throw new Error("Unexpected JSON response");
  }

  const t = await r.text();

  if (!r.ok) {
    if (t.trim().startsWith("<!DOCTYPE html")) throw new Error("OpenAI gateway timeout (504). Retry Connect.");
    throw new Error(t);
  }

  return t;
}
