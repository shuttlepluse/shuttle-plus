# Shuttle Plus Partner API

**Base URL:** `http://localhost:3000/api`

## Endpoints

### Health Check
```
GET /health
```

### Create Booking
```
POST /bookings
Content-Type: application/json

{
  "type": "arrival",
  "flight": {
    "number": "ET302",
    "scheduledTime": "2025-12-15T14:30:00Z"
  },
  "pickup": {
    "location": "Bole International Airport",
    "scheduledTime": "2025-12-15T15:00:00Z"
  },
  "dropoff": {
    "location": "Hilton Hotel",
    "zone": 2
  },
  "passengers": 2,
  "vehicleClass": "standard",
  "contact": {
    "name": "John Doe",
    "phone": "+251911234567",
    "email": "john@example.com"
  }
}
```

### Get Booking
```
GET /bookings/:bookingReference
```

### Calculate Price
```
POST /pricing/calculate

{
  "zone": 2,
  "vehicleClass": "standard",
  "passengers": 2
}
```

### Get Zones
```
GET /pricing/zones
```

### Get Vehicle Classes
```
GET /pricing/vehicles
```

## Vehicle Classes
- `standard` - Toyota Corolla (1.0x)
- `executive` - Toyota Camry (1.5x)
- `suv` - Toyota Land Cruiser (2.1x)
- `luxury` - Mercedes E-Class (2.9x)

## Zones
- Zone 1: Airport Area ($20)
- Zone 2: Central Addis ($30)
- Zone 3: Greater Addis ($45)
- Zone 4: Outer Areas ($65)
- Zone 5: Long Distance ($90)

## Booking Status Flow
`pending` -> `confirmed` -> `driver_assigned` -> `driver_enroute` -> `driver_arrived` -> `in_progress` -> `completed`
