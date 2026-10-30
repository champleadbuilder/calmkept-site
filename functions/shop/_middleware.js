/**
 * /shop and /shop/<slug> — server-side store ordering by visitor country (cf-ipcountry),
 * the FIRSTSALES50 Etsy sale banner/strikethrough price, and ?from pass-through on the
 * /shop hub's two store-wide links (Rhodey's source read, ledger #102).
 *
 * --- SALE CONFIG: edit this block only to change or end the sale manually ---
 * `end` is also checked every request, so the banner disappears on its own after that
 * instant with no code change needed.
 */
// HELD: Edith's 2026-10-30 17:00 ET gate (gate 4a) — the rounding below is unverified
// against a live Etsy listing page and must be gated separately before this goes live.
// Flip to true only after her sale-line PASS lands in inter-agent-log.md.
const SALE = { active: false, percent: 50, end: '2026-11-08T23:59:59-05:00', label: '50% off through Nov 8' };

// Etsy price per slug, USD. Source: shop/products.json (kept in sync by hand — the
// sale math needs the real listing price, not a guess).
const PRICES = {
  'family-emergency-binder': 8.99,
  'personal-medical-history-binder': 11.99,
  'caregiver-binder': 14.99,
  'special-needs-child-care-binder': 14.99,
  'senior-downsizing-moving-binder': 17.99,
  'new-homeowner-binder': 8.99,
  'just-in-case-binder': 14.99,
  'end-of-life-planner': 14.99,
  'property-binder': 17.40,
  'emergency-contact-card': 2.99,
  'medical-id-medication-card': 2.99,
  'caregiver-medication-card': 2.99,
  'special-needs-child-care-card': 2.99,
  'senior-downsizing-move-card': 2.99,
  'just-in-case-card': 2.99,
  'final-wishes-document-locator-card': 2.99,
  'property-info-access-card': 2.99,
  'adhd-daily-planner': 6.99,
};

function fmt(n) {
  return n.toFixed(2);
}

// Etsy's own sale-price rounding is unverified against a live listing page (Etsy's
// product pages require a JS-capable browser to read, which this task didn't have
// without spend) — this applies standard half-up rounding to the cent. Flag for a
// spot-check against a real Etsy listing next time someone is in Luis's Chrome.
function salePrice(base) {
  return Math.round(base * (1 - SALE.percent / 100) * 100) / 100;
}

function saleLive() {
  return SALE.active && Date.now() < new Date(SALE.end).getTime();
}

function applySaleRewrite(res, path) {
  const slugMatch = path.match(/^\/shop\/([a-z0-9-]+)\/?$/);
  let currentSlug = slugMatch ? slugMatch[1] : null;

  return new HTMLRewriter()
    .on('a.shop-card', {
      element(el) {
        const href = el.getAttribute('href') || '';
        const m = href.match(/^\/shop\/([a-z0-9-]+)\/?$/);
        currentSlug = m ? m[1] : null;
      },
    })
    .on('span.shop-card__price', {
      element(el) {
        if (!currentSlug || !(currentSlug in PRICES)) return;
        const base = PRICES[currentSlug];
        const sale = salePrice(base);
        el.setInnerContent(`<del>$${fmt(base)}</del> $${fmt(sale)} on Etsy · ${SALE.label}`, { html: true });
      },
    })
    .on('a[data-store="etsy"] span.buy__price', {
      element(el) {
        if (!currentSlug || !(currentSlug in PRICES)) return;
        const base = PRICES[currentSlug];
        const sale = salePrice(base);
        el.setInnerContent(`<del>$${fmt(base)}</del> $${fmt(sale)} USD · ${SALE.label}`, { html: true });
      },
    })
    .transform(res);
}

// Hub pass-through: /shop's two store-wide footer links (not per-product buy buttons)
// carry the visitor's ?from on to the store, so Rhodey's source read can see where
// hub traffic that doesn't land on one product page came from.
// - Etsy: standard UTM params (same scheme the drip/MailerLite links already use).
// - Payhip: no query-parameter tracking exists on a Payhip product/shop link (checked
//   help.payhip.com and our own Payhip read, calmkept/payhip-read-2026-10-28.md, which
//   shows Payhip attributes traffic by the HTTP Referer header, not a URL parameter).
//   Nothing to append; the referer already carries through because our links use
//   rel="noopener" (which preserves Referer), not rel="noreferrer".
function applyHubPassThrough(res, fromValue) {
  return new HTMLRewriter()
    .on('a[href="https://calmkept.etsy.com"]', {
      element(el) {
        el.setAttribute(
          'href',
          `https://calmkept.etsy.com?utm_source=${encodeURIComponent(fromValue)}&utm_medium=referral&utm_campaign=shop_hub`
        );
      },
    })
    .transform(res);
}

export async function onRequest(context) {
  let res = await context.next();
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html')) return res;

  const url = new URL(context.request.url);
  const path = url.pathname;

  if (saleLive()) {
    res = applySaleRewrite(res, path);
  }

  if (path === '/shop' || path === '/shop/') {
    const from = url.searchParams.get('from');
    if (from) {
      res = applyHubPassThrough(res, from);
    }
  }

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
