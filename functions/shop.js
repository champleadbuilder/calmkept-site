/**
 * /shop route — geo-aware redirect to shop
 * - US visitors → https://calmkept.etsy.com, with a small "not the right store?" link to Payhip
 * - Everyone else → https://payhip.com/Calmkept, with a small "not the right store?" link to Etsy
 * - Unknown country (cf-ipcountry missing or "XX"/"T1") → show both links, no auto-redirect
 * - Preserves utm_source parameter if present
 */

const ETSY = 'https://calmkept.etsy.com';
const PAYHIP = 'https://payhip.com/Calmkept';

function withUtm(destination, utmSource) {
  return utmSource ? `${destination}?utm_source=${encodeURIComponent(utmSource)}` : destination;
}

function pageShell(bodyHtml, redirectTo) {
  const refresh = redirectTo
    ? `<meta http-equiv="refresh" content="0; url=${redirectTo}">`
    : '';
  const script = redirectTo
    ? `<script>window.location.href = ${JSON.stringify(redirectTo)};</script>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calmkept — Shop</title>
    ${refresh}
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 2rem; }
        h1 { font-size: 1.5rem; margin: 0 0 1rem 0; }
        p { color: #666; margin: 1rem 0; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .secondary { font-size: 0.9rem; color: #888; margin-top: 2rem; }
    </style>
</head>
<body>
    ${bodyHtml}
    ${script}
</body>
</html>`;
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const utmSource = url.searchParams.get('utm_source');

  const rawCountry = request.headers.get('cf-ipcountry');
  const known = Boolean(rawCountry) && rawCountry !== 'XX' && rawCountry !== 'T1';

  if (!known) {
    // Unknown country: show both links, no auto-redirect, no bias.
    const html = pageShell(`
    <h1>Where to shop</h1>
    <p>Shopping from the United States? <a href="${withUtm(ETSY, utmSource)}">Shop on Etsy</a></p>
    <p>Shopping from anywhere else? <a href="${withUtm(PAYHIP, utmSource)}">Shop on Payhip</a></p>
    `, null);
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-cache, no-store, must-revalidate',
      },
    });
  }

  const isUS = rawCountry === 'US';
  const primary = withUtm(isUS ? ETSY : PAYHIP, utmSource);
  const other = withUtm(isUS ? PAYHIP : ETSY, utmSource);
  const otherLabel = isUS ? 'Payhip' : 'Etsy';

  const html = pageShell(`
    <p>Taking you to the right place to shop.</p>
    <p class="secondary">Not the right store? <a href="${other}">Shop on ${otherLabel} instead</a></p>
    `, primary);

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-cache, no-store, must-revalidate',
    },
  });
}
