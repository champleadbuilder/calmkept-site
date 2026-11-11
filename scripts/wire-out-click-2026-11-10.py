import re, sys, pathlib

files = """shop/adhd-daily-planner.html
shop/caregiver-binder.html
shop/caregiver-medication-card.html
shop/emergency-contact-card.html
shop/end-of-life-planner.html
shop/family-emergency-binder.html
shop/final-wishes-document-locator-card.html
shop/home-inventory-warranty-binder.html
shop/just-in-case-binder.html
shop/just-in-case-card.html
shop/medical-id-medication-card.html
shop/new-homeowner-binder.html
shop/personal-medical-history-binder.html
shop/property-binder.html
shop/property-info-access-card.html
shop/senior-downsizing-move-card.html
shop/senior-downsizing-moving-binder.html
shop/special-needs-child-care-binder.html
shop/special-needs-child-care-card.html""".splitlines()

buy_div_re = re.compile(r'(<div class="buy" data-buy>)')
href_re = re.compile(r'href="(https://(?:www\.etsy\.com|payhip\.com)[^"]*)"')

def add_from_param(url):
    sep = '&' if '?' in url else '?'
    return url + sep + 'from=calmkept'

changed = []
for rel in files:
    p = pathlib.Path(rel)
    text = p.read_text()
    slug = p.stem
    orig = text

    def repl_div(m):
        return f'<div class="buy" data-buy data-pid="{slug}">'
    text = buy_div_re.sub(repl_div, text, count=1)

    def repl_href(m):
        return 'href="' + add_from_param(m.group(1)) + '"'
    text = href_re.sub(repl_href, text)

    if '/js/out-click.js' not in text:
        text = text.replace('</body>', '  <script src="/js/out-click.js" defer></script>\n</body>')

    if text != orig:
        p.write_text(text)
        changed.append(rel)

print("changed:", len(changed))
for c in changed:
    print(c)
