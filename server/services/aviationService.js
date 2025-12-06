// ========================================
// Aviation Service (AviationStack API)
// ========================================

const axios = require('axios');
const NodeCache = require('node-cache');

// Cache flight data for 15 minutes
const flightCache = new NodeCache({ stdTTL: 900 });

const AVIATION_API_KEY = process.env.AVIATIONSTACK_API_KEY;
const AVIATION_BASE_URL = 'http://api.aviationstack.com/v1';

// Track API usage (free tier: 100 requests/month)
let apiCallsThisMonth = 0;
const API_CALL_LIMIT = 90; // Leave some buffer

// ========================================
// Get Flight Information
// ========================================
async function getFlightInfo(flightNumber) {
    // Check cache first
    const cached = flightCache.get(flightNumber);
    if (cached) {
        console.log(`[Aviation] Cache hit for ${flightNumber}`);
        return cached;
    }

    // Check rate limit
    if (apiCallsThisMonth >= API_CALL_LIMIT) {
        console.warn('[Aviation] API call limit reached');
        throw new Error('RATE_LIMIT_EXCEEDED');
    }

    // If no API key, return mock data for development
    if (!AVIATION_API_KEY) {
        console.log('[Aviation] No API key, returning mock data');
        return getMockFlightData(flightNumber);
    }

    try {
        // Parse flight number (e.g., ET500 -> airline: ET, flight_number: 500)
        const airlineCode = flightNumber.substring(0, 2);
        const flightNum = flightNumber.substring(2);

        const response = await axios.get(`${AVIATION_BASE_URL}/flights`, {
            params: {
                access_key: AVIATION_API_KEY,
                flight_iata: flightNumber,
                // Only get flights to Addis Ababa
                arr_iata: 'ADD'
            },
            timeout: 10000
        });

        apiCallsThisMonth++;
        console.log(`[Aviation] API call made. Total this month: ${apiCallsThisMonth}`);

        const flights = response.data.data;

        if (!flights || flights.length === 0) {
            // Try departure flights
            const depResponse = await axios.get(`${AVIATION_BASE_URL}/flights`, {
                params: {
                    access_key: AVIATION_API_KEY,
                    flight_iata: flightNumber,
                    dep_iata: 'ADD'
                },
                timeout: 10000
            });

            apiCallsThisMonth++;

            if (!depResponse.data.data || depResponse.data.data.length === 0) {
                return null;
            }

            const depFlight = depResponse.data.data[0];
            const flightData = formatFlightData(depFlight, 'departure');
            flightCache.set(flightNumber, flightData);
            return flightData;
        }

        const flight = flights[0];
        const flightData = formatFlightData(flight, 'arrival');
        flightCache.set(flightNumber, flightData);

        return flightData;

    } catch (error) {
        console.error('[Aviation] API error:', error.message);

        // Return mock data on API failure
        if (error.response?.status === 429 || error.code === 'ECONNABORTED') {
            throw new Error('RATE_LIMIT_EXCEEDED');
        }

        return getMockFlightData(flightNumber);
    }
}

// ========================================
// Get Flight Status (Live)
// ========================================
async function getFlightStatus(flightNumber) {
    const flightData = await getFlightInfo(flightNumber);

    if (!flightData) {
        return null;
    }

    return {
        flightNumber: flightData.flightNumber,
        status: flightData.status,
        scheduledTime: flightData.scheduledTime,
        estimatedTime: flightData.estimatedTime,
        actualTime: flightData.actualTime,
        delay: flightData.delay,
        terminal: flightData.terminal,
        gate: flightData.gate,
        lastUpdated: new Date().toISOString()
    };
}

// ========================================
// Format Flight Data
// ========================================
function formatFlightData(flight, type) {
    const isArrival = type === 'arrival';
    const leg = isArrival ? flight.arrival : flight.departure;
    const origin = isArrival ? flight.departure : flight.arrival;

    return {
        flightNumber: flight.flight?.iata || flight.flight_iata,
        airline: {
            code: flight.airline?.iata,
            name: flight.airline?.name
        },
        type,
        origin: {
            airport: origin?.airport,
            iata: origin?.iata,
            city: origin?.timezone?.split('/')[1]?.replace('_', ' ')
        },
        destination: {
            airport: leg?.airport,
            iata: leg?.iata,
            city: leg?.timezone?.split('/')[1]?.replace('_', ' ')
        },
        scheduledTime: leg?.scheduled,
        estimatedTime: leg?.estimated,
        actualTime: leg?.actual,
        status: mapFlightStatus(flight.flight_status),
        delay: leg?.delay || 0,
        terminal: leg?.terminal,
        gate: leg?.gate,
        // Calculate suggested pickup time (arrival + 30 min buffer)
        suggestedPickupTime: isArrival
            ? calculatePickupTime(leg?.estimated || leg?.scheduled)
            : null
    };
}

// ========================================
// Map API Status to Our Status
// ========================================
function mapFlightStatus(status) {
    const statusMap = {
        'scheduled': 'scheduled',
        'active': 'in_flight',
        'landed': 'landed',
        'cancelled': 'cancelled',
        'incident': 'cancelled',
        'diverted': 'delayed',
        'unknown': 'unknown'
    };
    return statusMap[status] || 'unknown';
}

// ========================================
// Calculate Pickup Time
// ========================================
function calculatePickupTime(arrivalTime, bufferMinutes = 30) {
    if (!arrivalTime) return null;

    const arrival = new Date(arrivalTime);
    const pickup = new Date(arrival.getTime() + bufferMinutes * 60 * 1000);

    return pickup.toISOString();
}

// ========================================
// Mock Flight Data (for development)
// ========================================
function getMockFlightData(flightNumber) {
    const airlineCode = flightNumber.substring(0, 2).toUpperCase();
    const flightNum = flightNumber.substring(2);

    const airlines = {
        'ET': 'Ethiopian Airlines',
        'LH': 'Lufthansa',
        'TK': 'Turkish Airlines',
        'EK': 'Emirates',
        'QR': 'Qatar Airways'
    };

    const cities = {
        'ET': ['Dubai', 'London', 'Frankfurt', 'Washington'],
        'LH': ['Frankfurt'],
        'TK': ['Istanbul'],
        'EK': ['Dubai'],
        'QR': ['Doha']
    };

    const airlineName = airlines[airlineCode] || 'Unknown Airline';
    const originCity = cities[airlineCode]?.[0] || 'International';

    // Generate a random arrival time today or tomorrow
    const now = new Date();
    const arrivalDate = new Date(now);
    arrivalDate.setHours(arrivalDate.getHours() + Math.floor(Math.random() * 24) + 2);

    return {
        flightNumber: flightNumber.toUpperCase(),
        airline: {
            code: airlineCode,
            name: airlineName
        },
        type: 'arrival',
        origin: {
            airport: `${originCity} International Airport`,
            iata: airlineCode === 'ET' ? 'DXB' : 'FRA',
            city: originCity
        },
        destination: {
            airport: 'Bole International Airport',
            iata: 'ADD',
            city: 'Addis Ababa'
        },
        scheduledTime: arrivalDate.toISOString(),
        estimatedTime: arrivalDate.toISOString(),
        actualTime: null,
        status: 'scheduled',
        delay: 0,
        terminal: 'Terminal 2',
        gate: `G${Math.floor(Math.random() * 20) + 1}`,
        suggestedPickupTime: calculatePickupTime(arrivalDate.toISOString()),
        _isMock: true
    };
}

// ========================================
// Reset Monthly Counter (call from cron)
// ========================================
function resetMonthlyCounter() {
    apiCallsThisMonth = 0;
    console.log('[Aviation] Monthly API counter reset');
}

// ========================================
// Get API Usage Stats
// ========================================
function getApiUsage() {
    return {
        callsThisMonth: apiCallsThisMonth,
        limit: API_CALL_LIMIT,
        remaining: API_CALL_LIMIT - apiCallsThisMonth
    };
}

module.exports = {
    getFlightInfo,
    getFlightStatus,
    calculatePickupTime,
    resetMonthlyCounter,
    getApiUsage
};
