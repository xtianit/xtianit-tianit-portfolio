require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// 1. Load environment variables with secure defaults
const { 
  PAYSTACK_SECRET_KEY, 
  SITE_URL = 'https://www.tianit.online', 
  ENABLED_CURRENCIES = 'NGN,USD',
  BREVO_API_KEY, 
  SENDER_EMAIL, 
  SENDER_NAME = 'Ohore Christian', 
  OWNER_EMAIL = SENDER_EMAIL, 
  PORT = 3000 
} = process.env;

// 2. Define pricing catalog on the server so clients cannot tamper with prices
const PLANS = {
  starter:  { name: 'Starter Website',  prices: { USD: 25000,  NGN: 15000000 } },   // $250    / N150,000
  business: { name: 'Business Website', prices: { USD: 75000,  NGN: 45000000 } },   // $750    / N450,000
  webapp:   { name: 'Custom Web App',   prices: { USD: 200000, NGN: 120000000 } },  // $2,000  / N1,200,000
};

// 3. Helper function to send emails via Brevo's HTTPS API
const send = async (to, subject, text) => {
  if (!BREVO_API_KEY || !SENDER_EMAIL) return console.error('Email skipped: set BREVO_API_KEY and SENDER_EMAIL');
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 
        'api-key': BREVO_API_KEY, 
        'content-type': 'application/json', 
        accept: 'application/json' 
      },
      body: JSON.stringify({ 
        sender: { name: SENDER_NAME, email: SENDER_EMAIL }, 
        replyTo: { email: OWNER_EMAIL },
        to: [{ email: to }], 
        subject, 
        textContent: text 
      }),
    });
    if (!r.ok) console.error('Brevo email failed:', r.status, await r.text());
  } catch (err) { 
    console.error('Email failed:', err.message); 
  }
};

// 4. Initialize Express application and security middleware
const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: [SITE_URL, SITE_URL.replace('://www.', '://')] }));

// 5. Paystack Webhook route: reads raw body to verify cryptographic signatures
app.post('/api/paystack-webhook', express.raw({ type: '*/*' }), async (req, res) => {
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(req.body).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) return res.sendStatus(401);
  
  res.sendStatus(200); // Acknowledge receipt immediately so Paystack doesn't retry
  
  const event = JSON.parse(req.body.toString());
  if (event.event !== 'charge.success') return;
  
  const d = event.data;
  const m = d.metadata || {};
  const amount = `${(d.amount / 100).toFixed(2)} ${d.currency}`;
  
  // Notify site owner
  await send(
    OWNER_EMAIL, 
    `Payment received: ${m.planName || 'order'} (${amount})`,
    `Package: ${m.planName}\nAmount: ${amount}\nCustomer: ${m.name} <${d.customer.email}>\nReference: ${d.reference}\nPaid at: ${d.paid_at}\n\nNotes:\n${m.note || '(none)'}`
  );
  
  // Notify customer
  await send(
    d.customer.email, 
    'Payment received - next steps',
    `Hi ${m.name || ''},\n\nThank you. I received your payment (${amount}) for the ${m.planName}.\nI will email you shortly to confirm scope and next steps. Please keep reference ${d.reference} for your records.\n\nOhore Christian\n${SITE_URL}`
  );
});

// 6. Apply body parsing limits and rate limiting for checkout
app.use(express.json({ limit: '10kb' }));
app.use('/api/checkout', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }));

// 7. Checkout endpoint: validates orders and initializes Paystack transactions
app.post('/api/checkout', async (req, res) => {
  const { plan, name, email, note, currency } = req.body || {};
  const p = PLANS[plan];
  const cur = String(currency || 'USD').toUpperCase();
  const enabled = ENABLED_CURRENCIES.split(',').map(c => c.trim().toUpperCase());
  
  // Validate request inputs and currency support
  if (!p || !p.prices[cur] || !enabled.includes(cur) || !name || !/^\S+@\S+\.\S+$/.test(email || '')) {
    return res.status(400).json({ error: 'Invalid order' });
  }
  
  try {
    const r = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        email, 
        amount: p.prices[cur], 
        currency: cur,
        callback_url: `${SITE_URL}/#thanks`,
        metadata: { 
          plan, 
          planName: p.name, 
          name: String(name).slice(0, 100), 
          note: String(note || '').slice(0, 1000) 
        },
      }),
    });
    
    const j = await r.json();
    if (!j.status) { 
      console.error(j.message); 
      return res.status(502).json({ error: 'Payment provider error' }); 
    }
    
    res.json({ url: j.data.authorization_url });
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ error: 'Server error' }); 
  }
});

// 8. Health check and server listener
app.get('/health', (_, res) => res.send('ok'));
app.listen(PORT, () => console.log(`API listening on ${PORT}`));

// 9. Export app for Vercel serverless deployment support
module.exports = app;