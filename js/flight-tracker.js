// ========================================
// Flight Tracker - AviationStack Integration
// ========================================

(function() {
    'use strict';

    // ========================================
    // Configuration
    // ========================================
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    const BOLE_AIRPORT_IATA = 'ADD';

    // ========================================
    // State
    // ========================================
    const flightCache = new Map();

    // ========================================
    // Flight Status Constants
    // ========================================
    const FlightStatus = {
        SCHEDULED: 'scheduled',
        ACTIVE: 'active',
        LANDED: 'landed',
        CANCELLED: 'cancelled',
        INCIDENT: 'incident',
        DIVERTED: 'diverted',
        DELAYED: 'delayed',
        UNKNOWN: 'unknown'
    };

    // ========================================
    // Lookup Flight
    // ========================================
    async function lookupFlight(flightNumber, date = null) {
        // Normalize flight number (remove spaces, uppercase)
        const normalizedFlight = flightNumber.toUpperCase().replace(/\s/g, '');

        // Check cache first
        const cacheKey = `${normalizedFlight}-${date || 'today'}`;
        const cached = flightCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log('[Flight] Returning cached data for', normalizedFlight);
            return cached.data;
        }

        try {
            // Try API endpoint
            const response = await fetch(`/api/flights/${normalizedFlight}${date ? `?date=${date}` : ''}`);

            if (response.ok) {
                const result = await response.json();

                if (result.success && result.data) {
                    // Cache the result
                    flightCache.set(cacheKey, {
                        timestamp: Date.now(),
                        data: result.data
                    });

                    return result.data;
                }
            }

            // If API fails, return mock data for development
            console.log('[Flight] API unavailable, using mock data');
            return getMockFlightData(normalizedFlight, date);

        } catch (error) {
            console.error('[Flight] Lookup failed:', error);
            return getMockFlightData(normalizedFlight, date);
        }
    }

    // ========================================
    // Get Flight Status Display
    // ========================================
    function getStatusDisplay(status) {
        const displays = {
            [FlightStatus.SCHEDULED]: { label: 'Scheduled', color: '#666', icon: 'clock' },
            [FlightStatus.ACTIVE]: { label: 'In Flight', color: '#2196F3', icon: 'plane' },
            [FlightStatus.LANDED]: { label: 'Landed', color: '#4CAF50', icon: 'check-circle' },
            [FlightStatus.CANCELLED]: { label: 'Cancelled', color: '#f44336', icon: 'times-circle' },
            [FlightStatus.DELAYED]: { label: 'Delayed', color: '#ff9800', icon: 'exclamation-triangle' },
            [FlightStatus.DIVERTED]: { label: 'Diverted', color: '#9c27b0', icon: 'directions' },
            [FlightStatus.UNKNOWN]: { label: 'Unknown', color: '#999', icon: 'question-circle' }
        };

        return displays[status] || displays[FlightStatus.UNKNOWN];
    }

    // ========================================
    // Calculate Pickup Time
    // ========================================
    function calculatePickupTime(arrivalTime, bufferMinutes = 60) {
        const arrival = new Date(arrivalTime);
        const pickup = new Date(arrival.getTime() + bufferMinutes * 60 * 1000);
        return pickup;
    }

    // ========================================
    // Format Flight Time
    // ========================================
    function formatFlightTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    // ========================================
    // Format Delay
    // ========================================
    function formatDelay(minutes) {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    // ========================================
    // Parse Flight Number
    // ========================================
    function parseFlightNumber(flightNumber) {
        // Match airline code (2-3 letters) and flight number
        const match = flightNumber.match(/^([A-Z]{2,3})(\d+)$/i);

        if (match) {
            return {
                airlineCode: match[1].toUpperCase(),
                flightNum: match[2],
                full: match[1].toUpperCase() + match[2]
            };
        }

        return null;
    }

    // ========================================
    // Get Airline Name
    // ========================================
    function getAirlineName(code) {
        const airlines = {
            'ET': 'Ethiopian Airlines',
            'EK': 'Emirates',
            'QR': 'Qatar Airways',
            'TK': 'Turkish Airlines',
            'KQ': 'Kenya Airways',
            'MS': 'EgyptAir',
            'WB': 'RwandAir',
            'UA': 'United Airlines',
            'LH': 'Lufthansa',
            'AF': 'Air France',
            'BA': 'British Airways',
            'KL': 'KLM',
            'SV': 'Saudia',
            'GF': 'Gulf Air',
            'FZ': 'flydubai',
            'W5': 'Mahan Air'
        };

        return airlines[code] || code;
    }

    // ========================================
    // Mock Flight Data (Development)
    // ========================================
    function getMockFlightData(flightNumber, date) {
        const parsed = parseFlightNumber(flightNumber);
        if (!parsed) {
            return null;
        }

        const now = new Date();
        const flightDate = date ? new Date(date) : now;

        // Set arrival time based on common Ethiopian Airlines schedules
        let arrivalHour = 14; // Default 2 PM
        const flightNum = parseInt(parsed.flightNum);

        // Simulate different arrival times based on flight number
        if (flightNum < 200) arrivalHour = 6;  // Early morning
        else if (flightNum < 400) arrivalHour = 10; // Morning
        else if (flightNum < 600) arrivalHour = 14; // Afternoon
        else if (flightNum < 800) arrivalHour = 18; // Evening
        else arrivalHour = 22; // Night

        const scheduledArrival = new Date(flightDate);
        scheduledArrival.setHours(arrivalHour, 30, 0, 0);

        // Simulate occasional delays
        const hasDelay = Math.random() > 0.7;
        const delayMinutes = hasDelay ? Math.floor(Math.random() * 90) + 15 : 0;
        const actualArrival = new Date(scheduledArrival.getTime() + delayMinutes * 60 * 1000);

        // Determine status based on time
        let status = FlightStatus.SCHEDULED;
        if (actualArrival < now) {
            status = FlightStatus.LANDED;
        } else if (actualArrival.getTime() - now.getTime() < 3 * 60 * 60 * 1000) {
            status = FlightStatus.ACTIVE;
        }
        if (hasDelay && status !== FlightStatus.LANDED) {
            status = FlightStatus.DELAYED;
        }

        // Common origins for Ethiopian Airlines flights
        const origins = {
            'ET': ['Washington (IAD)', 'Dubai (DXB)', 'London (LHR)', 'Frankfurt (FRA)', 'Nairobi (NBO)', 'Lagos (LOS)', 'Accra (ACC)', 'Beijing (PEK)', 'Tokyo (NRT)'],
            'EK': ['Dubai (DXB)'],
            'QR': ['Doha (DOH)'],
            'TK': ['Istanbul (IST)'],
            'KQ': ['Nairobi (NBO)'],
            'default': ['International']
        };

        const airlineOrigins = origins[parsed.airlineCode] || origins.default;
        const origin = airlineOrigins[flightNum % airlineOrigins.length];

        return {
            flightNumber: parsed.full,
            airline: {
                code: parsed.airlineCode,
                name: getAirlineName(parsed.airlineCode)
            },
            departure: {
                airport: origin,
                scheduled: new Date(scheduledArrival.getTime() - 8 * 60 * 60 * 1000).toISOString() // 8 hours before
            },
            arrival: {
                airport: `Addis Ababa (${BOLE_AIRPORT_IATA})`,
                scheduled: scheduledArrival.toISOString(),
                actual: hasDelay ? actualArrival.toISOString() : null,
                terminal: 'Terminal 2',
                gate: `G${Math.floor(Math.random() * 20) + 1}`
            },
            status: status,
            delay: delayMinutes,
            suggestedPickupTime: calculatePickupTime(hasDelay ? actualArrival : scheduledArrival).toISOString(),
            isMockData: true
        };
    }

    // ========================================
    // Render Flight Card
    // ========================================
    function renderFlightCard(flight) {
        const statusDisplay = getStatusDisplay(flight.status);
        const arrivalTime = flight.arrival.actual || flight.arrival.scheduled;

        return `
            <div class="flight-card ${flight.status}">
                <div class="flight-header">
                    <div class="flight-number">
                        <span class="airline-code">${flight.airline.code}</span>
                        <span class="flight-num">${flight.flightNumber}</span>
                    </div>
                    <div class="flight-status" style="color: ${statusDisplay.color}">
                        <i class="fas fa-${statusDisplay.icon}"></i>
                        ${statusDisplay.label}
                    </div>
                </div>
                <div class="flight-route">
                    <div class="route-origin">
                        <span class="route-label">From</span>
                        <span class="route-airport">${flight.departure.airport}</span>
                    </div>
                    <div class="route-arrow">
                        <i class="fas fa-plane"></i>
                    </div>
                    <div class="route-destination">
                        <span class="route-label">To</span>
                        <span class="route-airport">${flight.arrival.airport}</span>
                    </div>
                </div>
                <div class="flight-times">
                    <div class="time-item">
                        <span class="time-label">Scheduled</span>
                        <span class="time-value">${formatFlightTime(flight.arrival.scheduled)}</span>
                    </div>
                    ${flight.delay > 0 ? `
                    <div class="time-item delay">
                        <span class="time-label">Delay</span>
                        <span class="time-value">+${formatDelay(flight.delay)}</span>
                    </div>
                    ` : ''}
                    <div class="time-item ${flight.delay > 0 ? 'updated' : ''}">
                        <span class="time-label">${flight.delay > 0 ? 'New Arrival' : 'Arrival'}</span>
                        <span class="time-value">${formatFlightTime(arrivalTime)}</span>
                    </div>
                </div>
                <div class="flight-pickup">
                    <i class="fas fa-car"></i>
                    <span>Suggested pickup: <strong>${formatFlightTime(flight.suggestedPickupTime)}</strong></span>
                </div>
                ${flight.isMockData ? '<div class="mock-notice">Sample data - actual times may vary</div>' : ''}
            </div>
        `;
    }

    // ========================================
    // Flight Card Styles
    // ========================================
    function injectStyles() {
        if (document.getElementById('flight-tracker-styles')) return;

        const style = document.createElement('style');
        style.id = 'flight-tracker-styles';
        style.textContent = `
            .flight-card {
                background: white;
                border-radius: 12px;
                padding: 1rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                margin-bottom: 1rem;
            }
            .flight-card.delayed {
                border-left: 4px solid #ff9800;
            }
            .flight-card.landed {
                border-left: 4px solid #4CAF50;
            }
            .flight-card.cancelled {
                border-left: 4px solid #f44336;
                opacity: 0.7;
            }
            .flight-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                padding-bottom: 0.75rem;
                border-bottom: 1px solid #f0f0f0;
            }
            .flight-number {
                font-size: 1.25rem;
                font-weight: 700;
                color: #183251;
            }
            .airline-code {
                color: #597B87;
            }
            .flight-status {
                display: flex;
                align-items: center;
                gap: 0.35rem;
                font-size: 0.85rem;
                font-weight: 600;
            }
            .flight-route {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1rem;
            }
            .route-origin, .route-destination {
                flex: 1;
            }
            .route-destination {
                text-align: right;
            }
            .route-label {
                display: block;
                font-size: 0.7rem;
                color: #888;
                text-transform: uppercase;
                margin-bottom: 0.25rem;
            }
            .route-airport {
                font-weight: 600;
                color: #183251;
                font-size: 0.9rem;
            }
            .route-arrow {
                color: #597B87;
                padding: 0 1rem;
            }
            .flight-times {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
                padding: 0.75rem;
                background: #f8f9fa;
                border-radius: 8px;
            }
            .time-item {
                flex: 1;
                text-align: center;
            }
            .time-item.delay .time-value {
                color: #ff9800;
            }
            .time-item.updated .time-value {
                color: #4CAF50;
                font-weight: 700;
            }
            .time-label {
                display: block;
                font-size: 0.7rem;
                color: #888;
                text-transform: uppercase;
                margin-bottom: 0.25rem;
            }
            .time-value {
                font-size: 1rem;
                font-weight: 600;
                color: #183251;
            }
            .flight-pickup {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem;
                background: linear-gradient(135deg, rgba(89,123,135,0.1) 0%, rgba(24,50,81,0.05) 100%);
                border-radius: 8px;
                font-size: 0.9rem;
                color: #597B87;
            }
            .flight-pickup strong {
                color: #183251;
            }
            .mock-notice {
                margin-top: 0.75rem;
                font-size: 0.75rem;
                color: #888;
                text-align: center;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
    }

    // ========================================
    // Monitor Flight for Updates
    // ========================================
    function monitorFlight(flightNumber, callback, intervalMs = 5 * 60 * 1000) {
        let lastStatus = null;

        const check = async () => {
            const flight = await lookupFlight(flightNumber);

            if (flight && flight.status !== lastStatus) {
                lastStatus = flight.status;
                callback(flight);
            }
        };

        // Initial check
        check();

        // Set up interval
        const intervalId = setInterval(check, intervalMs);

        // Return function to stop monitoring
        return () => clearInterval(intervalId);
    }

    // ========================================
    // Export API
    // ========================================
    window.FlightTracker = {
        lookup: lookupFlight,
        parseFlightNumber,
        getAirlineName,
        getStatusDisplay,
        calculatePickupTime,
        formatFlightTime,
        formatDelay,
        renderFlightCard,
        monitor: monitorFlight,
        FlightStatus,
        injectStyles
    };

    // Inject styles on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectStyles);
    } else {
        injectStyles();
    }

})();
