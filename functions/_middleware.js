/**
 * Site-wide Pinterest Ads conversion tag (Luis's Pinterest Ads launch, 2026-10-30,
 * ledger #105). Base code + pagevisit on every page; a checkout_click lead event on
 * outbound Etsy/Payhip buy clicks (shop/product pages only, where those links exist).
 *
 * HELD: PINTEREST_TAG_ID is a placeholder until Cowork reads the real ID in Luis's
 * Chrome (Pinterest Ads → Conversions → Pinterest tag) and Jarvis relays it — our
 * API token lacks the `ads:read` scope to read it ourselves (logged 17:38 ET,
 * inter-agent-log.md). The whole injection no-ops while the placeholder is in place,
 * so this ships inert: no broken tag calls go out. Swap PINTEREST_TAG_ID for the real
 * ID (digits only) to arm it — no other code change needed.
 *
 * No enhanced match (no email/phone hashing) per the dispatch.
 */
const PINTEREST_TAG_ID = 'PENDING_TAG_ID';

function tagScript(tagId) {
  // Pinterest's own base code pattern (pintrk loader) + explicit pagevisit event,
  // and a delegated click handler for outbound store buttons that fires a lead-style
  // checkout_click event before navigating. preventDefault + a short setTimeout gives
  // the beacon a chance to send before the browser leaves the page.
  return `<script>
!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
n=window.pintrk;n.queue=[],n.version="3.0";var
t=document.createElement("script");t.async=!0,t.src=e;var
r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load', '${tagId}', {});
pintrk('page');
pintrk('track', 'pagevisit');
document.addEventListener('click', function (ev) {
  var el = ev.target.closest('a[data-store="etsy"], a[data-store="payhip"]');
  if (!el) return;
  var href = el.href;
  ev.preventDefault();
  try { pintrk('track', 'lead', { lead_type: 'checkout_click' }); } catch (e) {}
  setTimeout(function () { window.location = href; }, 250);
});
</script>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://ct.pinterest.com/v3/?tid=${tagId}&event=init&noscript=1" /></noscript>`;
}

export async function onRequest(context) {
  const res = await context.next();
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html')) return res;
  if (PINTEREST_TAG_ID === 'PENDING_TAG_ID') return res;

  const script = tagScript(PINTEREST_TAG_ID);
  return new HTMLRewriter()
    .on('head', {
      element(el) {
        el.append(script, { html: true });
      },
    })
    .transform(res);
}
