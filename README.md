# calmkept-site

Static brand landing site for [Calmkept](https://calmkept.etsy.com) at `calmkept.com`.

## Structure

```
calmkept-site/
├── index.html        Landing page
├── privacy.html      Privacy policy page
├── style.css         Shared stylesheet (Cormorant Garamond Italic + Inter, self-hosted)
├── fonts/            Self-hosted woff2 (no third-party origins)
├── favicon.*         Brand favicons
└── README.md
```

## Stack

- Pure static HTML + CSS — zero JS, zero analytics, zero tracking pixels
- Self-hosted Cormorant Garamond Italic 500 + Inter (variable) — no Google Fonts CDN
- Deployed via Cloudflare Pages, auto-rebuilds on push to `main`
- Custom domain: `calmkept.com` (apex)

## Brand

Tagline: *"Every important thing your family would need to know — in one calm, organized place."*

Voice: warm, calm, plainspoken. No exclamations, no emojis, no banned terms. Full brand brief lives in the private `workspace-shared/calmkept/calmkept-brand-brief.md`.

## License

See `LICENSE`.
