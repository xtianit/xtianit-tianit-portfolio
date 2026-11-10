# tianit.online

Static site (`index.html`) plus an optional payment backend in `server/` (see `server/README.md`).

## Go live on https://www.tianit.online
Upload everything except `server/` to your host (GitHub Pages, Netlify or Vercel). `CNAME` is set for GitHub Pages.
At your domain registrar point `www` to your host (CNAME) and enable HTTPS. Then in Google Search Console add the
site and submit `https://www.tianit.online/sitemap.xml`.

## Configure (top of the script in index.html)
- `FORM_ENDPOINT`: Formspree/Getform URL so the contact form delivers directly.
- `API_BASE`: your deployed backend, which turns on card payment with email notification.
- `PAY_LINKS`: alternative to the backend, hosted payment links per package.
- Prices appear in the pricing cards, `PLANS`, the JSON-LD block and `server/server.js`; change all four together.
