# Shuttle Plus - Airport Transfer Service

Premium airport transfer service platform for Addis Ababa, Ethiopia. A full-stack Progressive Web Application (PWA) built with Express.js, MongoDB, and vanilla JavaScript.

## Project Structure

```
rideshare-website/
├── index.html              # Landing page
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── css/                    # Stylesheets
│   ├── style.css           # Main styles (landing page)
│   ├── booking.css         # Booking flow styles
│   ├── tickets.css         # Tickets page styles
│   ├── admin.css           # Admin dashboard styles
│   ├── driver.css          # Driver app styles
│   ├── account.css         # User account styles
│   ├── payment.css         # Payment page styles
│   ├── tracking.css        # Live tracking styles
│   ├── blog.css            # Blog page styles
│   └── doc.css             # Documentation pages styles
├── js/                     # Frontend JavaScript
│   ├── app.js              # PWA core (service worker, install)
│   ├── main.js             # Navigation & DOM interactions
│   ├── booking.js          # Booking form wizard
│   ├── tickets.js          # Ticket viewing & actions
│   ├── admin.js            # Admin dashboard
│   ├── driver.js           # Driver app functionality
│   ├── payment-handler.js  # Payment processing (Stripe/Telebirr)
│   ├── flight-tracker.js   # Flight status tracking
│   ├── map-tracker.js      # Live map tracking
│   ├── api-client.js       # API communication utility
│   ├── offline-storage.js  # Offline data persistence
│   ├── push-notifications.js # Web Push handling
│   └── i18n.js             # Internationalization (EN/Amharic)
├── pages/                  # HTML pages
│   ├── booking.html        # Booking wizard
│   ├── tickets.html        # View bookings/tickets
│   ├── payment.html        # Payment processing
│   ├── tracking.html       # Live trip tracking
│   ├── about.html          # About page
│   ├── contact.html        # Contact form
│   ├── blog.html           # Blog/news
│   ├── 404.html            # Error page
│   ├── admin.html          # Admin dashboard
│   ├── account/            # User account pages
│   │   ├── login.html
│   │   ├── signup.html
│   │   ├── dashboard.html
│   │   └── forgot-password.html
│   ├── driver/             # Driver app pages
│   │   ├── index.html
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── trips.html
│   │   ├── earnings.html
│   │   └── profile.html
│   └── doc/                # Documentation pages
│       ├── index.html
│       ├── terms.html
│       ├── privacy.html
│       ├── faq.html
│       ├── cancellation.html
│       ├── corporate.html
│       └── driver-guidelines.html
├── images/                 # Static assets
│   ├── logo.png
│   └── icons/              # App icons & payment icons
├── emails/                 # Email templates
│   ├── booking-confirmation.html
│   ├── driver-assigned.html
│   ├── receipt.html
│   └── trip-reminder.html
├── docs/                   # Documentation
│   ├── company-overview.md
│   ├── destinations.md
│   ├── operations-guide.md
│   ├── pricing-guide.md
│   └── services.md
├── scripts/                # Utility scripts
│   └── generate-icons.js
└── server/                 # Backend (Express.js)
    ├── server.js           # Main entry point
    ├── package.json        # Dependencies
    ├── .env.example        # Environment template
    ├── config/
    │   └── database.js     # MongoDB configuration
    ├── middleware/
    │   ├── auth.js         # JWT authentication
    │   ├── errorHandler.js # Error handling
    │   └── rateLimit.js    # Rate limiting
    ├── models/             # MongoDB schemas
    │   ├── User.js
    │   ├── Booking.js
    │   ├── Driver.js
    │   ├── Vehicle.js
    │   ├── CorporateAccount.js
    │   ├── GroupBooking.js
    │   ├── HotelPartner.js
    │   └── AuditLog.js
    ├── routes/             # API endpoints
    │   ├── auth.js
    │   ├── bookings.js
    │   ├── drivers.js
    │   ├── users.js
    │   ├── payments.js
    │   ├── flights.js
    │   ├── pricing.js
    │   ├── notifications.js
    │   ├── corporate.js
    │   ├── groups.js
    │   ├── partners.js
    │   ├── analytics.js
    │   ├── audit.js
    │   └── config.js
    └── services/           # Business logic
        ├── pricingService.js
        ├── corporatePricingService.js
        ├── emailService.js
        ├── notificationService.js
        ├── aviationService.js
        ├── telebirrService.js
        ├── pdfService.js
        ├── twoFactorService.js
        ├── cacheService.js
        ├── analyticsService.js
        ├── auditService.js
        └── smsTemplates.js
```

## Features

### Public Website
- Responsive landing page with service showcase
- Multi-step booking wizard with flight tracking
- Real-time pricing with ETB/USD support
- Multilingual support (English & Amharic)

### Customer Features
- User account management
- Booking history & ticket viewing
- PDF ticket download
- Live trip tracking with driver ETA
- Push notifications
- Calendar integration (Google Calendar)

### Driver App
- Driver authentication & profile
- Trip assignments & acceptance
- Real-time location tracking (GPS)
- Earnings dashboard
- Trip history

### Admin Dashboard
- Booking management
- Driver management
- Vehicle fleet management
- Customer management
- Analytics & reporting
- Notifications center

### Payment Integration
- **Stripe** - International card payments
- **Telebirr** - Ethiopian mobile money
- Demo mode for development

### API Integrations
- **AviationStack** - Flight tracking
- **Twilio** - SMS & WhatsApp messaging
- **SendGrid** - Email delivery
- **Mapbox** - Real-time maps
- **Web Push** - Browser notifications

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/shuttle-plus.git
cd shuttle-plus
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Start the server:
```bash
npm start
```

5. Open http://localhost:3000

### Environment Variables

Key variables in `server/.env`:

```env
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=your-secret-key

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
TELEBIRR_APP_ID=...
TELEBIRR_SECRET_KEY=...

# Communications
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
SENDGRID_API_KEY=SG...

# Flight Tracking
AVIATIONSTACK_API_KEY=...

# Web Push
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

See `SETUP-GUIDE.md` for detailed configuration.

## Demo Credentials

### Admin Dashboard
- URL: `/pages/admin.html`
- Email: `admin@shuttleplus.com`
- Password: `admin123`

### Driver App
- URL: `/pages/driver/login.html`
- Demo mode available

## API Documentation

API endpoints are documented in `server/API-DOCS.md`.

Key endpoints:
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Get booking details
- `GET /api/bookings/:id/ticket` - Download PDF ticket
- `POST /api/drivers/login` - Driver authentication
- `PATCH /api/drivers/:id/location` - Update driver location
- `POST /api/payments/stripe/create-intent` - Create payment intent

## Deployment

### Railway.app (Recommended)

Configuration in `railway.json`:
```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "cd server && npm start",
    "healthcheckPath": "/api/health"
  }
}
```

### Manual Deployment

1. Set all environment variables
2. Install dependencies: `cd server && npm install --production`
3. Start server: `npm start`

## PWA Features

- Installable on home screen (mobile & desktop)
- Offline support with service worker caching
- Push notifications
- App shortcuts (Book Transfer, My Tickets)
- Background sync

## Technology Stack

### Frontend
- HTML5, CSS3, Vanilla JavaScript
- PWA (Service Worker, Web App Manifest)
- Responsive design (mobile-first)

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT authentication
- bcrypt password hashing

### External Services
- Stripe, Telebirr (payments)
- Twilio (SMS), SendGrid (email)
- AviationStack (flights)
- PDFKit (PDF generation)

## Security Features

- JWT-based authentication
- bcrypt password hashing
- Helmet.js security headers
- Rate limiting
- Input validation
- Two-factor authentication (OTP)
- Audit logging
- CORS configuration

## License

Proprietary - Shuttle Plus Ethiopia

## Support

- Email: support@shuttleplus.et
- Phone: +251 91 234 5678
- Website: www.shuttleplus.et
