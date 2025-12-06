# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend (from project root)
cd server && npm install     # Install dependencies
cd server && npm run dev     # Development with auto-reload
cd server && npm start       # Production mode
cd server && npm test        # Run Jest tests

# Frontend
# No build step - vanilla JS PWA
# Serve with any HTTP server (python -m http.server, etc.)
```

## Architecture

**Frontend**: Vanilla HTML/CSS/JavaScript Progressive Web App
- No framework, no build tools, no transpilation
- Service Worker (`sw.js`) handles offline caching
- CSS files use `?v=N` query params for cache busting - increment when editing

**Backend**: Node.js + Express + MongoDB
- Entry point: `server/server.js`
- Routes in `server/routes/` (15 modules)
- Models in `server/models/` (8 MongoDB schemas)
- Services in `server/services/` (12 business logic modules)

**Deployment**: Render.com
- Auto-deploys on push to `master`
- Config in `render.yaml`

## Key Files

| Purpose | Files |
|---------|-------|
| Booking flow | `pages/booking.html`, `js/booking.js` |
| Payments | `pages/payment.html`, `js/payment-handler.js` |
| Live tracking | `pages/tracking.html`, `js/map-tracker.js` |
| Tickets | `pages/tickets.html`, `js/tickets.js` |
| Flight lookup | `js/flight-tracker.js` |
| API client | `js/api-client.js` |
| PWA core | `js/app.js`, `sw.js`, `manifest.json` |
| Admin | `pages/admin.html`, `js/admin.js` |
| Driver app | `pages/driver/`, `js/driver.js` |

## Integrations

- **Mapping**: Leaflet + OpenStreetMap (free, no API key)
- **Routing**: OSRM (free, no API key)
- **Payments**: Stripe (cards), Telebirr (Ethiopian mobile money)
- **Flights**: AviationStack API
- **Email**: SendGrid
- **SMS**: Twilio

## Conventions

- Color scheme: `#183251` (navy), `#597B87` (teal), `#00b4d8` (cyan accent)
- Always update CSS version param after edits: `style.css?v=14` → `style.css?v=15`
- Frontend state uses `sessionStorage` for booking data persistence
- API calls go through `js/api-client.js` with retry logic

## Demo Access

- Admin: `/pages/admin.html` - admin@shuttleplus.com / admin123
- Driver: `/pages/driver/login.html` - demo mode available
