/**
 * Site-wide sale banner. One line at the top of every HTML page — home, /shop hub,
 * every product page, legal pages. Not on /tiktok/* (TikTok app authorize/callback
 * pages, not shop pages).
 *
 * --- SALE CONFIG: edit this block only to change or end the sale manually ---
 * Single source for the sale; functions/shop/_middleware.js imports it.
 * UPDATED 2026-11-19 (N1119-U-BFSITE, LUIS RULING 34, Edith PASS of N1119-P-BFLINE
 * conditions 1-3): Black Friday replaces the Oct 50%-off sale. Binders/planners are
 * now a flat USD 5.99, cards USD 2.49, not a percent — `percent`/`label` stay only
 * for the dormant per-card strikethrough path in functions/shop/_middleware.js
 * (SALE.active stays false, so that path does not run).
 * - `banner`: the site-wide banner. Set false to end it early (one edit).
 * - `active`: the per-card strikethrough sale price on /shop pages. Stays false —
 *   every shop/*.html and shop.html price was edited directly to the sale price
 *   instead (N1119-U-BFSITE), so the dormant percent-based overlay is not needed.
 * - `end` is checked on every request, so the banner hides itself after the sale ends.
 * - The banner carries no discount code; codes stay the stores' own targeted offers
 *   and are never published here.
 */
export const SALE = {
  active: false,
  banner: true,
  percent: 50,
  end: '2026-11-30T23:59:59-05:00',
  label: '5.99 (cards 2.49) through Nov 30',
  // No slug is excluded from Ruling 34's Black Friday sale.
  excludeSlugs: [],
};

export function saleOpen() {
  return Date.now() < new Date(SALE.end).getTime();
}

export function bannerText() {
  return 'Black Friday sale: binders, planners and journals are $5.99, and cards are $1.49 or $2.49, until Monday 30 November, 11:59 pm ET.';
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
