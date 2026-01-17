export async function exchangeSDP(offerSdp) {
  const r = await fetch("/session", {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: offerSdp
  });

  const ct = (r.headers.get("content-type") || "").toLowerCase();

  // If JSON error from server, show it clearly
  if (ct.includes("application/json")) {
    const j = await r.json();
    if (!r.ok) {
      throw new Error(`${j?.error || "error"} (${j?.status || r.status}) ${j?.request_id ? `request_id=${j.request_id}` : ""}\n${j?.message || ""}`);
    }
    // If server ever returns {sdp}, handle it too:
    if (j?.sdp) return j.sdp;
    throw new Error("Unexpected JSON response from /session.");
  }

  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}\n${text}`);
  return text;
}
