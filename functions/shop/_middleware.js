/**
 * /shop and /shop/<slug> — server-side store ordering by visitor country (cf-ipcountry).
 * Replaces the old functions/shop.js redirect: /shop is now a real page.
 * - US, AU  → Etsy button first (primary style)
 * - AU      → Payhip button removed (AU = Etsy-only rule; Payhip AU GST unconfirmed)
 * - elsewhere (known country) → Payhip button first (primary style), Etsy kept as the alternative
 * - unknown (missing / XX / T1) → page unchanged: Etsy first, both visible
 * Static pages always carry both links, so a failure here degrades to "both visible".
 */
export async function onRequest(context) {
  const res = await context.next();
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html')) return res;

  const c = context.request.headers.get('cf-ipcountry');
  if (!c || c === 'XX' || c === 'T1' || c === 'US') return res;

  const isAU = c === 'AU';
  return new HTMLRewriter()
    .on('a[data-store="payhip"]', {
      element(el) {
        if (isAU) { el.remove(); return; }
        el.setAttribute('class', 'buy__btn');
      },
    })
    .on('a[data-store="etsy"]', {
      element(el) {
        if (!isAU) el.setAttribute('class', 'buy__btn buy__btn--alt');
      },
    })
    .on('div[data-buy]', {
      element(el) {
        if (!isAU) el.setAttribute('style', 'flex-direction: column-reverse');
      },
    })
    .transform(res);
}
