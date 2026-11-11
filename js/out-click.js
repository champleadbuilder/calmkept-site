/* N1110-U-1 / W2-U2-1: records a click on a product page's Etsy/Payhip buy button.
 * Fires a beacon to /api/out-click then lets the link navigate normally. The record
 * carries store, product, page path, the link's own "from" tag, and the time only —
 * no cookie, no user agent, no IP, nothing derived from either. */
(function () {
  document.addEventListener(
    "click",
    function (e) {
      var link = e.target.closest("[data-store]");
      if (!link) return;
      var buy = link.closest("[data-buy]");
      var from = "";
      try {
        from = new URL(link.href, location.href).searchParams.get("from") || "";
      } catch (err) {}
      var payload = JSON.stringify({
        store: link.getAttribute("data-store"),
        pid: buy ? buy.getAttribute("data-pid") || "" : "",
        path: location.pathname,
        from: from,
        ts: Date.now(),
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/out-click", payload);
      } else {
        fetch("/api/out-click", { method: "POST", body: payload, keepalive: true }).catch(
          function () {}
        );
      }
    },
    true
  );
})();
