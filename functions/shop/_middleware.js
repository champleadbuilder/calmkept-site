/**
 * /shop and /shop/<slug> — server-side store ordering by visitor country (cf-ipcountry),
 * the FIRSTSALES50 Etsy sale banner/strikethrough price, ?from pass-through on the
 * /shop hub's two store-wide links (Rhodey's source read, ledger #102), and the
 * Pinterest Ads conversion tag (Luis's Pinterest Ads launch, ledger #105).
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

// --- PINTEREST TAG CONFIG ---
// HELD inert: PINTEREST_TAG_ID is a placeholder until Cowork reads the real ID in
// Luis's Chrome (Pinterest Ads → Conversions → Pinterest tag) — our API token lacks
// ads:read (workspace-shared/inter-agent-log.md; that entry is mis-stamped 17:38, it
// was written ~17:03 ET). Swap the ID (digits only) to arm.
// Scope per Edith's gate-4b deploy conditions (17:06/17:08/17:11 ET,
// calmkept/edith-gate-fury-wording-2026-10-30.md):
//   1. US visitors only (cf-ipcountry header === 'US'; missing/XX/T1 get no tag) — no
//      consent banner, so UK/EU/
//      Quebec can't get this tag; the ad campaign is US-only anyway.
//   2. /shop (the hub) ONLY, never /shop/<slug> or any other page — a pagevisit on a
//      health-specific product page would tell Pinterest about a likely health
//      interest (FTC GoodRx/BetterHelp pattern, WA My Health My Data Act).
//   3. No Enhanced Match (no `em` param) — Cowork confirms Automatic Enhanced Match
//      is OFF in Pinterest Ads Manager's own tag settings (can't be set from here).
//   4. Limited Data Processing: Edith's 17:11 ET ruling corrected my earlier comment
//      here, which wrongly called this an Ads-Manager-only toggle. Per Pinterest's
//      developer docs (https://developers.pinterest.com/docs/track-conversions/
//      use-limited-data-processing-flag/, read 2026-10-30), the JS Tag enables it
//      with `pintrk('set', { opt_out_type: 'LDP', st: '<sha256>', country: '<sha256>' })`
//      run before any event code; st/country are SHA-256 hashes of the two-letter
//      state/country code in UPPER case (the docs' examples: CA → 4b650e5c…,
//      US → 9b202ecb…; a lower-case hash matches neither). The docs say to "leave
//      st and country blank... if you don't have the user's location information."
//      We gate this whole script to
//      cf-ipcountry === 'US' already, so country is always "US"; we have no
//      per-visitor state, so st is omitted. PINTEREST_LDP_COUNTRY_HASH is sha256("US").
//   5. Ships only in the same deploy as Edith's gate-4b privacy text, never before.
const PINTEREST_TAG_ID = 'PENDING_TAG_ID';
const PINTEREST_LDP_COUNTRY_HASH = '9b202ecbc6d45c6d8901d989a918878397a3eb9d00e8f48022fc051b19d21a1d';

function pinterestTagScript(tagId) {
  return `<script>
!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
n=window.pintrk;n.queue=[],n.version="3.0";var
t=document.createElement("script");t.async=!0,t.src=e;var
r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load', '${tagId}', {});
pintrk('set', { opt_out_type: 'LDP', country: '${PINTEREST_LDP_COUNTRY_HASH}' });
pintrk('page');
pintrk('track', 'pagevisit');
document.addEventListener('click', function (ev) {
  var el = ev.target.closest('a[href^="https://calmkept.etsy.com"], a[href^="https://payhip.com/Calmkept"]');
  if (!el) return;
  if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
  var href = el.href;
  ev.preventDefault();
  try { pintrk('track', 'lead', { lead_type: 'checkout_click' }); } catch (e) {}
  setTimeout(function () { window.location = href; }, 250);
});
</script>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://ct.pinterest.com/v3/?tid=${tagId}&event=init&noscript=1" /></noscript>`;
}

function applyPinterestTag(res) {
  const script = pinterestTagScript(PINTEREST_TAG_ID);
  return new HTMLRewriter()
    .on('head', {
      element(el) {
        el.append(script, { html: true });
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

  const c = context.request.headers.get('cf-ipcountry');

  if (path === '/shop' || path === '/shop/') {
    const from = url.searchParams.get('from');
    if (from) {
      res = applyHubPassThrough(res, from);
    }
    if (c === 'US' && PINTEREST_TAG_ID !== 'PENDING_TAG_ID') {
      res = applyPinterestTag(res);
    }
  }

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
