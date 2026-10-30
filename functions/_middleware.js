/**
 * Site-wide sale banner (Luis 17:06 via Cowork 17:35, Jarvis WAKE 13): one line at the
 * top of every HTML page — home, /shop hub, every product page, legal pages.
 * Not on /tiktok/* (TikTok app authorize/callback pages, not shop pages).
 *
 * --- SALE CONFIG: edit this block only to change or end the sale manually ---
 * Single source for the sale; functions/shop/_middleware.js imports it.
 * - `banner`: the site-wide banner. Set false to end it early (one edit).
 * - `active`: the per-card strikethrough sale price on /shop pages. HELD false until
 *   Etsy's and Payhip's sale rounding is read off a live listing (Edith gate 4a, cond. 2;
 *   Jarvis WAKE 13 item 2). Payhip is 50% off too now, so the old "Payhip at full price"
 *   card assumption is void; the banner carries the message until then.
 * - `end` is checked on every request, so both hide themselves after 8 Nov 23:59 ET.
 * - The banner carries no discount code (Cowork ruling, Jarvis 17:31 ET relay); codes
 *   stay the stores' own targeted offers and are never published here.
 */
export const SALE = {
  active: false,
  banner: true,
  percent: 50,
  end: '2026-11-08T23:59:59-05:00',
  label: '50% off through Nov 8',
  // Shop slugs NOT in the sale (per Cowork's report): the per-card sale price skips them,
  // and their /shop/<slug> page gets no banner (Edith FIX). ADHD planner seeded until
  // Luis rules.
  excludeSlugs: ['adhd-daily-planner'],
};

export function saleOpen() {
  return Date.now() < new Date(SALE.end).getTime();
}

function endDay() {
  // "Nov 8", read from SALE.end in Eastern time.
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })
    .format(new Date(SALE.end));
}

export function bannerText() {
  return `${SALE.percent}% off every binder and card through ${endDay()}`;
}

function bannerHtml() {
  return `<div class="sale-banner" role="note" style="background:#5F6F54;color:#F5EDDB;text-align:center;padding:10px 16px;font-size:15px;line-height:1.4;">${bannerText()}</div>`;
}

export async function onRequest(context) {
  const res = await context.next();
  if (!SALE.banner || !saleOpen()) return res;
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html')) return res;
  const path = new URL(context.request.url).pathname;
  if (path.startsWith('/tiktok')) return res;
  const slug = path.match(/^\/shop\/([a-z0-9-]+)\/?$/);
  if (slug && SALE.excludeSlugs.includes(slug[1])) return res;

  return new HTMLRewriter()
    .on('body', {
      element(el) {
        el.prepend(bannerHtml(), { html: true });
      },
    })
    .transform(res);
}
