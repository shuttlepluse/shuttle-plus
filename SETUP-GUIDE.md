# Shuttle Plus - Setup & Configuration Guide

## Quick Start (Development)

The application works out-of-the-box in development mode with:
- MongoDB Atlas (already configured)
- Mock SMS/Email notifications (logs to console)
- Mock payment processing

```bash
cd server
npm install
npm start
```

Server runs at: http://localhost:3000

---

## Production Configuration

### 1. MongoDB (Already Configured)

Your MongoDB Atlas connection is set up in `.env`:
```
MONGODB_URI=mongodb+srv://shuttleplus:***@cluster0.mf93yb7.mongodb.net/shuttleplus
```

### 2. Twilio (SMS & WhatsApp)

**Sign up:** https://www.twilio.com/try-twilio

1. Create account and verify phone number
2. Get credentials from Console Dashboard
3. Buy a phone number (~$1/month)
4. Update `.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Pricing:** ~$0.0075/SMS to Ethiopia

### 3. Stripe (International Card Payments)

**Sign up:** https://dashboard.stripe.com/register

1. Create account (no business verification needed for test mode)
2. Get API keys from Developers > API Keys
3. Update `.env`:

```env
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

**Test Cards:**
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002

### 4. Telebirr (Ethiopian Mobile Money)

**Register:** https://telebirr.et/merchant

Requirements:
- Ethiopian business license
- Tax ID (TIN)
- Bank account in Ethiopia

```env
TELEBIRR_APP_ID=your_app_id
TELEBIRR_APP_KEY=your_app_key
TELEBIRR_SHORT_CODE=your_short_code
TELEBIRR_PUBLIC_KEY=your_public_key
TELEBIRR_API_URL=https://api.ethiotelecom.et/v1
```

### 5. Email (SendGrid)

**Sign up:** https://sendgrid.com/

```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=bookings@shuttleplus.et
EMAIL_FROM_NAME=Shuttle Plus
```

### 6. Flight Tracking (AviationStack)

**Sign up:** https://aviationstack.com/ (Free: 100 requests/month)

```env
AVIATIONSTACK_API_KEY=your_api_key
```

### 7. Maps (Mapbox)

**Sign up:** https://www.mapbox.com/ (Free: 50,000 loads/month)

```env
MAPBOX_ACCESS_TOKEN=pk.xxxxxxxxxxxxxxxxxxxx
```

---

## Feature Flags

Enable/disable features in `.env`:

```env
ENABLE_FLIGHT_TRACKING=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_TELEBIRR=true
ENABLE_STRIPE=true
```

---

## Deployment Options

### Option 1: Railway (Recommended - Easy)

1. Push to GitHub
2. Connect at https://railway.app
3. Add environment variables
4. Deploy

### Option 2: Render

1. Create Web Service at https://render.com
2. Connect GitHub repo
3. Set build command: `cd server && npm install`
4. Set start command: `cd server && npm start`

### Option 3: DigitalOcean App Platform

1. Create app at https://cloud.digitalocean.com/apps
2. Connect repo, configure environment

### Option 4: VPS (Ubuntu)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone and setup
git clone https://github.com/your-repo/shuttleplus.git
cd shuttleplus/server
npm install --production

# Use PM2 for process management
sudo npm install -g pm2
pm2 start server.js --name shuttleplus
pm2 save
pm2 startup
```

---

## Security Checklist

Before going to production:

- [ ] Change JWT_SECRET to a new random value
- [ ] Regenerate VAPID keys: `npx web-push generate-vapid-keys`
- [ ] Set NODE_ENV=production
- [ ] Configure CORS_ORIGIN with your domain
- [ ] Enable HTTPS (use reverse proxy like nginx)
- [ ] Set up rate limiting
- [ ] Configure firewall rules
- [ ] Set up monitoring (PM2, UptimeRobot)

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/bookings` | POST | Create booking |
| `/api/bookings/:id` | GET | Get booking |
| `/api/pricing/calculate` | POST | Calculate price |
| `/api/pricing/zones` | GET | Get zone info |
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |

---

## Support

- Issues: https://github.com/your-repo/issues
- Email: support@shuttleplus.et
