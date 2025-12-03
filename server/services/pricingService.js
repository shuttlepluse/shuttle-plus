// ========================================
// Pricing Service
// ========================================

const axios = require('axios');
const NodeCache = require('node-cache');

// Cache exchange rate for 1 hour
const rateCache = new NodeCache({ stdTTL: 3600 });

// Default/fallback exchange rate
let ETB_USD_RATE = 158; // Will be updated dynamically

// ========================================
// Fetch Live Exchange Rate
// ========================================
async function fetchExchangeRate() {
    const cached = rateCache.get('etb_usd');
    if (cached) {
        ETB_USD_RATE = cached;
        return cached;
    }

    try {
        // Try ExchangeRate-API (free tier: 1500 requests/month)
        const response = await axios.get(
            'https://api.exchangerate-api.com/v4/latest/USD',
            { timeout: 5000 }
        );

        if (response.data?.rates?.ETB) {
            ETB_USD_RATE = Math.round(response.data.rates.ETB);
            rateCache.set('etb_usd', ETB_USD_RATE);
            console.log(`[Pricing] Exchange rate updated: 1 USD = ${ETB_USD_RATE} ETB`);
            return ETB_USD_RATE;
        }
    } catch (error) {
        console.error('[Pricing] Failed to fetch exchange rate:', error.message);
    }

    // Fallback: Try another free API
    try {
        const response = await axios.get(
            'https://open.er-api.com/v6/latest/USD',
            { timeout: 5000 }
        );

        if (response.data?.rates?.ETB) {
            ETB_USD_RATE = Math.round(response.data.rates.ETB);
            rateCache.set('etb_usd', ETB_USD_RATE);
            console.log(`[Pricing] Exchange rate (fallback) updated: 1 USD = ${ETB_USD_RATE} ETB`);
            return ETB_USD_RATE;
        }
    } catch (error) {
        console.error('[Pricing] Fallback exchange rate fetch failed:', error.message);
    }

    console.log(`[Pricing] Using default exchange rate: 1 USD = ${ETB_USD_RATE} ETB`);
    return ETB_USD_RATE;
}

// Fetch rate on startup and periodically
fetchExchangeRate();
setInterval(fetchExchangeRate, 60 * 60 * 1000); // Refresh every hour

// Get current exchange rate
function getExchangeRate() {
    return ETB_USD_RATE;
}

// ========================================
// Zone Definitions (based on shuttle-plus-fares.md)
// ========================================
// Zones with USD prices only - ETB calculated dynamically
const ZONES = {
    1: {
        name: 'Bole District',
        description: 'Hotels and destinations near the airport',
        locations: [
            'Ethiopian Skylight Hotel',
            'Golden Tulip Hotel',
            'Capital Hotel & Spa',
            'Bole District',
            'Bole Rwanda',
            'Bole Medhanialem'
        ],
        baseFareUSD: 20
    },
    2: {
        name: 'Kazanchis / Business',
        description: 'Kazanchis business district and nearby areas',
        locations: [
            'Kazanchis',
            'African Union HQ',
            'UN ECA',
            'Friendship Park',
            'Atlas Area'
        ],
        baseFareUSD: 25
    },
    3: {
        name: 'City Center',
        description: 'Central Addis Ababa and Piazza area',
        locations: [
            'City Center',
            'Piazza',
            'Sheraton Addis',
            'Radisson Blu',
            'Hyatt Regency',
            'Best Western Plus',
            'Meskel Square',
            '4 Kilo',
            '6 Kilo'
        ],
        baseFareUSD: 30
    },
    4: {
        name: 'Merkato / West',
        description: 'Merkato market and western areas',
        locations: [
            'Merkato',
            'Merkato Market',
            'Lideta',
            'Mexico',
            'Autobus Tera'
        ],
        baseFareUSD: 38
    },
    5: {
        name: 'Entoto / Outskirts',
        description: 'Entoto hills and outer areas',
        locations: [
            'Entoto',
            'Entoto Hill',
            'Shiro Meda',
            'Gullele',
            'CMC',
            'Summit'
        ],
        baseFareUSD: 45
    }
};

// ========================================
// Vehicle Classes with Multipliers
// ========================================
const VEHICLE_CLASSES = {
    standard: {
        name: 'Standard Sedan',
        description: 'Toyota Corolla or similar',
        multiplier: 1.0,
        capacity: { passengers: 3, luggage: 3 },
        features: ['AC', 'Professional Driver']
    },
    executive: {
        name: 'Executive Sedan',
        description: 'Toyota Camry, Mercedes E-Class',
        multiplier: 1.5,
        capacity: { passengers: 3, luggage: 3 },
        features: ['AC', 'Leather Seats', 'WiFi', 'Water']
    },
    suv: {
        name: 'SUV / Minivan',
        description: 'Toyota Land Cruiser, Hiace',
        multiplier: 2.1,
        capacity: { passengers: 6, luggage: 6 },
        features: ['AC', 'Extra Space', 'Group Friendly']
    },
    luxury: {
        name: 'Luxury Class',
        description: 'Mercedes S-Class, BMW 7-Series',
        multiplier: 2.9,
        capacity: { passengers: 3, luggage: 3 },
        features: ['AC', 'Luxury Interior', 'WiFi', 'Refreshments', 'Privacy']
    }
};

// ========================================
// Additional Charges
// ========================================
// Additional charges - USD only, ETB calculated dynamically
const ADDITIONAL_CHARGES = {
    lateNight: {
        startHour: 22, // 10 PM
        endHour: 6,    // 6 AM
        surchargePercent: 25
    },
    childSeat: {
        feeUSD: 5
    },
    additionalStop: {
        feeUSD: 8
    },
    waitingTime: {
        freeMinutes: 60, // After flight landing
        perHourUSD: 10
    }
};

// ========================================
// Calculate Price
// ========================================
async function calculate({ pickup, dropoff, vehicleClass, pickupTime, additionalStops = 0, childSeat = false }) {
    // Ensure we have the latest exchange rate
    await fetchExchangeRate();
    const rate = getExchangeRate();

    // Determine zone from dropoff location
    const zone = getZoneForLocation(dropoff);

    if (!zone) {
        // Default to zone 3 if not found
        console.log(`[Pricing] Unknown location: ${dropoff}, using Zone 3 default`);
    }

    const zoneData = zone || ZONES[3];
    const vehicle = VEHICLE_CLASSES[vehicleClass] || VEHICLE_CLASSES.standard;

    // Base fare in USD
    let baseFareUSD = zoneData.baseFareUSD * vehicle.multiplier;
    baseFareUSD = Math.round(baseFareUSD);

    // Calculate ETB dynamically from current exchange rate
    let baseFareETB = Math.round(baseFareUSD * rate / 10) * 10; // Round to nearest 10

    // Calculate surcharges
    let lateNightSurchargeUSD = 0;
    let lateNightSurchargeETB = 0;

    if (pickupTime) {
        const hour = new Date(pickupTime).getHours();
        if (hour >= ADDITIONAL_CHARGES.lateNight.startHour || hour < ADDITIONAL_CHARGES.lateNight.endHour) {
            lateNightSurchargeUSD = Math.round(baseFareUSD * ADDITIONAL_CHARGES.lateNight.surchargePercent / 100);
            lateNightSurchargeETB = Math.round(lateNightSurchargeUSD * rate / 10) * 10;
        }
    }

    // Additional stops - calculate ETB dynamically
    const additionalStopsUSD = additionalStops * ADDITIONAL_CHARGES.additionalStop.feeUSD;
    const additionalStopsETB = Math.round(additionalStopsUSD * rate);

    // Child seat - calculate ETB dynamically
    const childSeatFeeUSD = childSeat ? ADDITIONAL_CHARGES.childSeat.feeUSD : 0;
    const childSeatFeeETB = Math.round(childSeatFeeUSD * rate);

    // Calculate totals
    const totalUSD = baseFareUSD + lateNightSurchargeUSD + additionalStopsUSD + childSeatFeeUSD;
    const totalETB = baseFareETB + lateNightSurchargeETB + additionalStopsETB + childSeatFeeETB;

    return {
        baseFare: baseFareUSD,
        baseFareETB: baseFareETB,
        lateNightSurcharge: lateNightSurchargeUSD,
        lateNightSurchargeETB: lateNightSurchargeETB,
        additionalStops: additionalStopsUSD,
        additionalStopsETB: additionalStopsETB,
        childSeatFee: childSeatFeeUSD,
        childSeatFeeETB: childSeatFeeETB,
        discount: 0,
        totalUSD,
        totalETB,
        currency: 'USD',
        exchangeRate: rate,
        zone: {
            number: Object.keys(ZONES).find(key => ZONES[key] === zoneData) || 3,
            name: zoneData.name
        },
        vehicle: {
            class: vehicleClass,
            name: vehicle.name,
            capacity: vehicle.capacity
        }
    };
}

// ========================================
// Get Zone for Location
// ========================================
function getZoneForLocation(location) {
    if (!location) return null;

    const normalizedLocation = location.toLowerCase();

    for (const [zoneNum, zoneData] of Object.entries(ZONES)) {
        for (const loc of zoneData.locations) {
            if (normalizedLocation.includes(loc.toLowerCase()) ||
                loc.toLowerCase().includes(normalizedLocation)) {
                return zoneData;
            }
        }
    }

    return null;
}

// ========================================
// Get Zone Data (with dynamic ETB pricing)
// ========================================
function getZones() {
    const rate = getExchangeRate();
    return Object.entries(ZONES).map(([number, data]) => ({
        zone: parseInt(number),
        name: data.name,
        description: data.description,
        baseFareUSD: data.baseFareUSD,
        baseFareETB: Math.round(data.baseFareUSD * rate / 10) * 10,
        sampleLocations: data.locations.slice(0, 3),
        exchangeRate: rate
    }));
}

// ========================================
// Get Vehicle Classes (with dynamic ETB pricing)
// ========================================
function getVehicleClasses() {
    const rate = getExchangeRate();
    return Object.entries(VEHICLE_CLASSES).map(([key, data]) => ({
        id: key,
        name: data.name,
        description: data.description,
        capacity: data.capacity,
        features: data.features,
        priceMultiplier: data.multiplier,
        // Sample pricing (Zone 3 - City Center) with dynamic ETB
        samplePriceUSD: Math.round(ZONES[3].baseFareUSD * data.multiplier),
        samplePriceETB: Math.round(ZONES[3].baseFareUSD * data.multiplier * rate / 10) * 10,
        exchangeRate: rate
    }));
}

// ========================================
// Get Destinations (with dynamic ETB pricing)
// ========================================
function getDestinations() {
    const rate = getExchangeRate();
    const destinations = [];

    for (const [zoneNum, zoneData] of Object.entries(ZONES)) {
        for (const location of zoneData.locations.slice(0, 2)) {
            destinations.push({
                name: location,
                zone: parseInt(zoneNum),
                zoneName: zoneData.name,
                priceUSD: zoneData.baseFareUSD,
                priceETB: Math.round(zoneData.baseFareUSD * rate / 10) * 10,
                exchangeRate: rate
            });
        }
    }

    return destinations;
}

module.exports = {
    calculate,
    getZones,
    getVehicleClasses,
    getDestinations,
    getZoneForLocation,
    getExchangeRate,
    fetchExchangeRate,
    ZONES,
    VEHICLE_CLASSES,
    ADDITIONAL_CHARGES
};
