# Payment backend (Paystack + email)

The website calls this server to start a payment. The server sets the price, sends the customer to Paystack's
hosted checkout, and when Paystack confirms the payment it emails you and the customer through Brevo.

0. In Brevo: create an API key (SMTP & API > API Keys) and verify a sender address (Senders). Use that address as `SENDER_EMAIL`.
1. `cd server && npm install && cp .env.example .env`, then fill in `.env`. Start with the **test** key (`sk_test_...`).
2. Deploy to Render or Railway (Node, start command `npm start`). Add the same values as environment variables there.
3. In the Paystack dashboard > Settings > API Keys & Webhooks, set the webhook URL to
   `https://YOUR-API-URL/api/paystack-webhook`.
4. In `index.html` set `API_BASE` to `https://YOUR-API-URL` and redeploy the site.
5. Make a test payment with Paystack test cards, confirm both emails arrive, then switch to the live key.

Notes: Nigerian visitors see naira by default and everyone can switch currency. USD charges must be enabled on your
Paystack account; until then set `ENABLED_CURRENCIES=NGN` and USD checkouts will be refused with a message to email you.
Change prices in `server.js` and on the page together. If you would rather skip the backend, paste hosted payment links (Paystack, Stripe
or PayPal) into `PAY_LINKS` in `index.html`; the provider emails you each payment.
