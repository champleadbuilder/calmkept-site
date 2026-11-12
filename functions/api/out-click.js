// N1110-U-1 / W2-U2-2: counts outbound Etsy/Payhip clicks. Record carries store,
// product, page path, the link's "from" tag, and the time only -- no cookie, no
// user agent, no IP, nothing derived from either. Durable count: one KV increment
// per click under key click:<YYYY-MM-DD>:<store>:<pid>:<from>, via the OUT_CLICKS
// binding (the binding is set in the Cloudflare dashboard). The console.log line
// stays as a live-tail fallback and is kept even once the binding is wired -- it
// costs nothing and some nights only a tail is open.
//
// N1112-U-5 (Edith's opus-gate-night-2026-11-11.md condition (e)): store, pid and
// from go straight into the KV key, so an unchecked value could stuff anything
// (an email address, say) into it. tagOk() keeps only the shapes the page code
// ever sends and replaces anything else with "other" before it reaches the key.
const TAG_RE = /^[a-z0-9_-]{1,32}$/;
function tagOk(v) {
  return typeof v === "string" && TAG_RE.test(v) ? v : "other";
}

export async function onRequestPost(context) {
  let body = {};
  try {
    body = await context.request.json();
  } catch (e) {
    console.log("OUT_CLICK_ERR " + String(e));
    return new Response(null, { status: 204 });
  }
  const rec = {
    t: new Date().toISOString(),
    store: tagOk(body.store),
    pid: tagOk(body.pid),
    path: body.path || "",
    from: tagOk(body.from),
  };
  console.log("OUT_CLICK " + JSON.stringify(rec));

  const kv = context.env.OUT_CLICKS;
  if (kv) {
    try {
      const day = rec.t.slice(0, 10);
      const key = "click:" + day + ":" + rec.store + ":" + rec.pid + ":" + rec.from;
      const current = parseInt((await kv.get(key)) || "0", 10) || 0;
      await kv.put(key, String(current + 1));
    } catch (e) {
      console.log("OUT_CLICK_KV_ERR " + String(e));
    }
  } else {
    console.log("OUT_CLICK_NO_KV_BINDING");
  }
  return new Response(null, { status: 204 });
}
