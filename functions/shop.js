/**
 * /shop route — geo-aware redirect to shop
 * - US visitors → https://calmkept.etsy.com
 * - Others → https://payhip.com/Calmkept
 * - Preserves utm_source parameter if present
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Get the visitor's country from Cloudflare header
    const country = request.headers.get('cf-ipcountry') || 'US';

    // Get utm_source parameter if present
    const utmSource = url.searchParams.get('utm_source') || '';

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

    // Return HTML with meta-refresh redirect + fallback links
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calmkept — Shop</title>
    <meta http-equiv="refresh" content="0; url=${destination}">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 2rem; }
        h1 { font-size: 1.5rem; margin: 0 0 1rem 0; }
        p { color: #666; margin: 1rem 0; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <p>Taking you to the right place to shop.</p>

    <h1>Where to shop</h1>
    <p>Shopping from the United States? <a href="https://calmkept.etsy.com">Shop on Etsy</a></p>
    <p>Shopping from anywhere else? <a href="https://payhip.com/Calmkept">Shop on Payhip</a></p>

    <script>
        // Redirect immediately (fallback for meta-refresh)
        window.location.href = '${destination}';
    </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
};
