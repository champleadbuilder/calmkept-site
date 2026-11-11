/* N1110-U-1: records a click on a product page's Etsy/Payhip buy button.
 * Fires a beacon to /api/out-click (Cloudflare Pages Function, console.log only,
 * no storage write) then lets the link navigate normally. */
(function () {
  document.addEventListener(
    "click",
    function (e) {
      var link = e.target.closest("[data-store]");
      if (!link) return;
      var buy = link.closest("[data-buy]");
      var payload = JSON.stringify({
        store: link.getAttribute("data-store"),
        pid: buy ? buy.getAttribute("data-pid") || "" : "",
        path: location.pathname,
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
