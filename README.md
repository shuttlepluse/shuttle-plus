# Shuttle Plus - Airport Transfer Service

Premium airport transfer service platform for Addis Ababa, Ethiopia. A full-stack Progressive Web Application (PWA) built with Express.js, MongoDB, and vanilla JavaScript.

## Design Philosophy

At ShuttlePlus, we appreciate the small and subtle details that elevate user experience. From using distinct plane departure (✈️↗) and arrival (✈️↘) icons to thoughtful micro-interactions, we believe these touches make the difference between a good product and a great one.

## Recent Updates (December 2025)

### Flight Tracker Integration
- **AviationStack API**: Look up flight arrivals with real-time status and delays
- **Demo Mode**: Enabled by default to conserve API quota (100 free requests/month)
- **Auto-fill Booking**: Click "Use This Time" to auto-fill date/time from flight arrival (+30 min buffer)
- **30-Minute Cache**: Responses cached to minimize API calls
- **Flight Info Card**: Shows airline, route, scheduled time, delays, and status

### Real Road Routing
- **OSRM Integration**: Routes now follow actual roads via Leaflet Routing Machine
- **Accurate ETAs**: Distance and time calculated from real driving routes
- **Free & Unlimited**: Uses Open Source Routing Machine (no API key required)

### Bug Fixes & Improvements
- **Tickets Page**: Click handlers fixed with event delegation (works after hard refresh)
- **Payment Auto-Select**: Payment method chosen in review page now auto-selected
- **Telebirr Validation**: Ethiopian phone numbers validated (9 digits, starts with 9 or 7)
- **Payment Cancellation**: Cancel button now properly aborts payment processing
- **Driver Verification Code**: 4-digit code displayed on ticket for passenger verification
- **Tracking Route Display**: Fixed [object Object] issue - now shows proper location names

### Live Tracking Page Improvements
- **Collapsible Receipt Card**: Toggle button to collapse/expand booking confirmation receipt
- **Side Panel Layout (Desktop)**: Driver section displays as left side panel on screens ≥768px
- **Improved Bottom Sheet (Mobile)**: Enhanced touch/drag handling for the driver info sheet
- **My Location Button**: Geolocation-powered button to zoom map to passenger's current location
- **User Location Marker**: Pulsing blue marker shows your position on the map

### Free Map Integration
- **Leaflet + OpenStreetMap**: Replaced Mapbox with 100% free OpenStreetMap tiles
- No API key required, no usage limits
- Full driver tracking, route display, and location markers

### Payment Page Enhancements
- **Enhanced Visual Design**: Improved layout with better spacing, shadows, and visual hierarchy
- **Payment Method Tabs**: Hover effects and active states for Card, Telebirr, Cash options
- **Form Field Styling**: Better input focus states and validation feedback
- **Price Display**: More prominent pricing section with clear breakdowns

### Booking Flow Redesign
- **Modern Dark Theme**: Booking pages now feature a dark gradient background matching the home page hero section
- **Simplified 3-Step Process**: Vehicle Selection → Contact Details → Confirmation
- **Smart Navigation**: Proper handling when returning from payment page (preserves form data)
- **State Management**: `returningFromPayment` flag prevents fresh bookings from skipping steps

### Vehicle System Overhaul
- **Separate Vehicle Types**: SUV and Van now distinct options (previously combined)
- **Vehicle Classes**:
  - Standard Sedan ($30) - Up to 3 passengers
  - Executive Sedan ($45) - Up to 3 passengers, premium
  - SUV ($55) - Up to 5 passengers
  - Van/Minibus ($70) - Up to 11 passengers
  - Luxury Class ($87) - Up to 3 passengers, Mercedes E-Class

### Passenger & Luggage System
- **Grouped Dropdown**: Single dropdown for passenger/luggage selection
- **Smart Options**: Options filtered based on vehicle capacity
- **Capacity Rules**:
  - Sedans: 1-3 passengers, 1-3 bags
  - SUV: 1-5 passengers, 1-5 bags
  - Van: 1-11 passengers, 1-11 bags

### Technical Improvements
- **Edit Route Flow**: Preserved extras (child seat, meet & greet) when returning from route edit
- **State Persistence**: Session storage for booking data survives navigation
- **Cache Busting**: Version parameters on CSS/JS files for reliable updates
- **Error Handling**: Better error messages and fallbacks throughout booking flow

## Branch Structure

| Branch | Purpose | Key Files |
|--------|---------|-----------|
| `master` | Production-ready code | All files |
| `develop` | Development integration | All files |
| `feature/public-website` | Landing page & booking | `index.html`, `pages/booking.html`, `pages/tickets.html`, `css/style.css`, `css/booking.css` |
| `feature/driver-app` | Driver mobile app | `pages/driver/*`, `js/driver.js`, `css/driver.css` |
| `feature/admin-dashboard` | Admin panel | `pages/admin.html`, `js/admin.js`, `css/admin.css` |
| `feature/backend-api` | Server & API | `server/*` |

### Workflow
1. Create feature branches from `develop`
2. Merge completed features into `develop`
3. Release to `master` when stable

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
- **Leaflet + OpenStreetMap** - Real-time maps (free, no API key)
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

### Render.com (Current)

The frontend is deployed as a static site on Render:
- **Live URL**: https://shuttle-plus-1.onrender.com
- Auto-deploys on push to `master` branch
- Static site configuration with custom headers

### Manual Deployment

1. Set all environment variables
2. Install dependencies: `cd server && npm install --production`
3. Start server: `npm start`

### Alternative: Railway.app

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
