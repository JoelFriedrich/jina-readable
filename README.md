# Readable

Paste a URL, get a clean reading view. The page is fetched through [Jina Reader](https://jina.ai/reader/) (`r.jina.ai`), converted from markdown to HTML in the browser, and styled for reading.

No build step, no backend, no API key.

## Run

```bash
python3 -m http.server 8765
```

Open <http://localhost:8765/>, or link straight to an article with `?u=`:

```
http://localhost:8765/?u=https://example.com
```

## Features

- Serif / sans / mono, size and column-width controls
- Auto, light, sepia and dark themes (preferences saved in `localStorage`)
- "Show raw markdown" toggle
- Shareable `?u=` links with working back/forward
- Output sanitized with DOMPurify; article links open in a new tab

## Layout

| File | Purpose |
| --- | --- |
| `index.html` | page shell |
| `style.css` | themes and the reading typography |
| `app.js` | fetch, parse Jina's header, render, preferences |
| `vendor/` | pinned copies of `marked` 12.0.2 and `dompurify` 3.1.6 |

## Deploy

Any static host works (GitHub Pages, Netlify, Cloudflare Pages). Serve the repo root.

## Notes

Jina's free tier is rate limited without an API key. Pages that need login or heavy client-side rendering may come back thin.
