// N1110-U-1: counts outbound Etsy/Payhip clicks. Logs only (console.log), no storage
// write, no new account/service. Read with `wrangler pages deployment tail` on the
// preview deployment, or the Cloudflare dashboard's Pages project -> deployment ->
// Functions -> Real-time Logs, filtering for lines starting "OUT_CLICK".
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const line = JSON.stringify({
      t: new Date().toISOString(),
      store: body.store || "",
      pid: body.pid || "",
      path: body.path || "",
      ip: context.request.headers.get("cf-connecting-ip") || "",
    });
    console.log("OUT_CLICK " + line);
  } catch (e) {
    console.log("OUT_CLICK_ERR " + String(e));
  }
  return new Response(null, { status: 204 });
}
