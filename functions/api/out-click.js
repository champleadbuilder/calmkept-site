// N1110-U-1 / W2-U2-2: counts outbound Etsy/Payhip clicks. Record carries store,
// product, page path, the link's "from" tag, and the time only -- no cookie, no
// user agent, no IP, nothing derived from either. Durable count: one KV increment
// per click under key click:<YYYY-MM-DD>:<store>:<pid>, via the OUT_CLICKS binding
// (see wrangler.toml). The console.log line stays as a live-tail fallback and is
// kept even once the binding is wired -- it costs nothing and some nights only a
// tail is open.
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
    store: body.store || "",
    pid: body.pid || "",
    path: body.path || "",
    from: body.from || "",
  };
  console.log("OUT_CLICK " + JSON.stringify(rec));

  const kv = context.env.OUT_CLICKS;
  if (kv) {
    try {
      const day = rec.t.slice(0, 10);
      const key = "click:" + day + ":" + rec.store + ":" + rec.pid;
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
