/**
 * /shop route — geo-aware redirect to shop
 * - US visitors → https://calmkept.etsy.com (302)
 * - Others → https://payhip.com/Calmkept (302)
 * - Preserves utm_source parameter if present
 */

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // Get the visitor's country from Cloudflare header
  const country = request.headers.get('cf-ipcountry') || 'US';

  // Get utm_source parameter if present
  const utmSource = url.searchParams.get('utm_source');

  // Determine destination based on country
  let destination;
  if (country === 'US') {
    destination = 'https://calmkept.etsy.com';
  } else {
    destination = 'https://payhip.com/Calmkept';
  }

  // Append utm_source if present
  if (utmSource) {
    destination += `?utm_source=${encodeURIComponent(utmSource)}`;
  }

  // Redirect (302 Found)
  return Response.redirect(destination, 302);
}
