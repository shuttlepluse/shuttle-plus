# Shuttle Plus - Operations Guide

## Booking Workflow

### 1. Customer Books Transfer

**Online Booking Flow:**
1. Customer selects transfer type (arrival/departure)
2. Enters flight details
3. Chooses destination
4. Selects vehicle class
5. Enters passenger info
6. Completes payment
7. Receives confirmation email/SMS

**Booking Reference Format:** `SP-YYYY-XXXXXX`
- SP = Shuttle Plus
- YYYY = Year
- XXXXXX = Unique 6-digit number

### 2. Booking Confirmation

**System Actions:**
- Generate booking reference
- Send confirmation email
- Send confirmation SMS
- Add to driver dispatch queue
- Set up flight tracking (for arrivals)

**Customer Receives:**
- Booking reference number
- Driver assignment (when available)
- Vehicle details
- Contact information
- Pickup instructions

### 3. Driver Assignment

**Assignment Criteria:**
- Vehicle class availability
- Driver proximity
- Driver rating
- Load balancing

**Driver Receives:**
- Booking details
- Customer contact
- Pickup location/time
- Destination
- Special instructions

### 4. Day of Service

**For Arrivals:**
1. System monitors flight status
2. Driver notified of any delays
3. Driver departs for airport
4. Arrives 15 min before landing
5. Positions at arrivals hall with name sign
6. Meets customer
7. Assists with luggage
8. Transfers to destination

**For Departures:**
1. Driver arrives 10 min early
2. Contacts customer on arrival
3. Assists with luggage
4. Transfers to airport
5. Drop-off at terminal

### 5. Trip Completion

**Driver Actions:**
- Mark trip as completed
- Record actual distance
- Note any extras
- Submit trip report

**System Actions:**
- Update booking status
- Send receipt to customer
- Request feedback/rating
- Process final payment

---

## Status Codes

| Status | Description |
|--------|-------------|
| `pending` | Booking received, awaiting confirmation |
| `confirmed` | Payment received, booking confirmed |
| `driver_assigned` | Driver allocated to booking |
| `en_route` | Driver heading to pickup |
| `arrived` | Driver at pickup location |
| `in_progress` | Trip underway |
| `completed` | Trip finished successfully |
| `cancelled` | Booking cancelled |
| `no_show` | Customer did not appear |

---

## Driver Management

### Driver Onboarding

**Requirements:**
1. Valid driver's license
2. Minimum 5 years experience
3. Clean driving record
4. Background check passed
5. Vehicle inspection passed
6. English proficiency test
7. Customer service training

**Documentation:**
- Driver's license copy
- National ID
- Vehicle registration
- Insurance documents
- Tax clearance
- Photo for ID badge

### Driver Status

| Status | Description |
|--------|-------------|
| `available` | Ready to accept trips |
| `assigned` | Has upcoming booking |
| `en_route` | Heading to pickup |
| `on_trip` | Currently with passenger |
| `break` | On scheduled break |
| `offline` | Not working |

### Performance Metrics

- **Rating:** Average customer rating (1-5 stars)
- **Completion Rate:** % of trips completed successfully
- **On-Time Rate:** % of pickups within 5 min window
- **Acceptance Rate:** % of offered trips accepted
- **Cancellation Rate:** % of trips cancelled by driver

---

## Vehicle Management

### Vehicle Requirements

**General:**
- Maximum 5 years old
- Air conditioning functional
- Clean interior/exterior
- Working seatbelts
- Valid registration
- Comprehensive insurance

**By Class:**

| Class | Model Examples | Min Requirements |
|-------|----------------|------------------|
| Standard | Corolla, Elantra | AC, clean, 4-door |
| Executive | Camry, Accord | Leather, extra legroom |
| SUV | Fortuner, H1 | 6+ seats, cargo space |
| Luxury | Mercedes E, BMW 5 | Premium brand, top condition |

### Maintenance Schedule

- **Daily:** Interior clean, fluid check
- **Weekly:** Exterior wash, tire check
- **Monthly:** Full inspection
- **Quarterly:** Service and maintenance

---

## Pricing Engine

### Base Calculation

```
Base Fare = Zone Rate × Vehicle Multiplier

Vehicle Multipliers:
- Standard: 1.0x
- Executive: 1.4x
- SUV: 1.8x
- Luxury: 2.6x
```

### Additional Charges

```
Extra Waiting = (Minutes - 60) / 30 × $10
Additional Stop (same zone) = $5
Additional Stop (different zone) = $10
Night Surcharge (23:00-05:00) = Base × 1.15
```

### Currency Conversion

```
ETB Price = USD Price × Exchange Rate
Exchange Rate: Updated daily from API
```

---

## Customer Communication

### Automated Messages

**Booking Confirmed:**
```
Your Shuttle Plus transfer is confirmed!
Ref: SP-2025-123456
Pickup: [Date] [Time]
Vehicle: [Class]
We'll send driver details before your trip.
```

**Driver Assigned:**
```
Your driver for SP-2025-123456:
Driver: [Name]
Vehicle: [Make/Model]
Plate: [Number]
Contact: [Phone]
```

**Driver En Route:**
```
Your driver is on the way!
ETA: [X] minutes
Track live: [Link]
```

**Trip Completed:**
```
Thank you for riding with Shuttle Plus!
Trip Ref: SP-2025-123456
Total: $[Amount]
Rate your experience: [Link]
```

### Support Escalation

1. **Level 1:** Automated responses, FAQs
2. **Level 2:** Customer service agent
3. **Level 3:** Operations manager
4. **Level 4:** Management escalation

---

## Emergency Procedures

### Vehicle Breakdown

1. Driver contacts dispatch immediately
2. Ensures passenger safety
3. Dispatch arranges backup vehicle
4. Passenger notified with new ETA
5. Incident logged for follow-up

### Traffic/Delay

1. Driver notifies of significant delay
2. Customer notified via SMS/app
3. Updated ETA provided
4. If >30 min delay, options discussed

### Customer Complaint

1. Log complaint with booking reference
2. Investigate within 24 hours
3. Contact customer with resolution
4. Document outcome
5. Follow up if needed

### Accident/Safety Issue

1. Ensure all parties safe
2. Contact emergency services if needed
3. Document scene (photos)
4. Report to dispatch
5. File incident report
6. Insurance notification
7. Management review

---

## Reporting & Analytics

### Daily Reports
- Total bookings
- Revenue
- Completion rate
- Average rating
- Active drivers

### Weekly Reports
- Booking trends
- Popular routes
- Peak times
- Driver performance
- Customer feedback summary

### Monthly Reports
- Revenue analysis
- Growth metrics
- Customer retention
- Driver fleet status
- Operational costs
