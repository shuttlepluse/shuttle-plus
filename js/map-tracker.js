// ========================================
// Map Tracker - Leaflet + OpenStreetMap Integration
// ========================================

(function() {
    'use strict';

    // ========================================
    // Configuration
    // ========================================
    // Addis Ababa coordinates
    const ADDIS_ABABA = {
        center: [8.9806, 38.7578], // [lat, lng] for Leaflet
        zoom: 13
    };

    // Bole Airport coordinates [lat, lng]
    const BOLE_AIRPORT = [8.9778, 38.7993];

    // ========================================
    // State
    // ========================================
    let map = null;
    let driverMarker = null;
    let pickupMarker = null;
    let dropoffMarker = null;
    let userLocationMarker = null;
    let routeLine = null;
    let routeControl = null;  // OSRM routing control
    let booking = null;
    let updateInterval = null;
    let isExpanded = false;
    let isReceiptCollapsed = false;

    // ========================================
    // DOM Elements
    // ========================================
    const elements = {
        map: document.getElementById('map'),
        trackingLoading: document.getElementById('trackingLoading'),
        noTracking: document.getElementById('noTracking'),
        bottomSheet: document.getElementById('bottomSheet'),
        statusBanner: document.getElementById('statusBanner'),
        statusLabel: document.getElementById('statusLabel'),
        statusETA: document.getElementById('statusETA'),
        bookingRef: document.getElementById('bookingRef'),
        driverName: document.getElementById('driverName'),
        driverAvatar: document.getElementById('driverAvatar'),
        vehicleModel: document.getElementById('vehicleModel'),
        vehiclePlate: document.getElementById('vehiclePlate'),
        pickupAddress: document.getElementById('pickupAddress'),
        dropoffAddress: document.getElementById('dropoffAddress'),
        pickupTime: document.getElementById('pickupTime'),
        callDriver: document.getElementById('callDriver'),
        messageDriver: document.getElementById('messageDriver'),
        shareLocation: document.getElementById('shareLocation'),
        emergencyBtn: document.getElementById('emergencyBtn'),
        toast: document.getElementById('toast'),
        // New elements for post-payment flow
        receiptCard: document.getElementById('receiptCard'),
        receiptRef: document.getElementById('receiptRef'),
        receiptRoute: document.getElementById('receiptRoute'),
        receiptDateTime: document.getElementById('receiptDateTime'),
        receiptVehicle: document.getElementById('receiptVehicle'),
        receiptPayment: document.getElementById('receiptPayment'),
        receiptTotal: document.getElementById('receiptTotal'),
        driverSearchState: document.getElementById('driverSearchState'),
        searchMicrocopy: document.getElementById('searchMicrocopy'),
        searchEta: document.getElementById('searchEta'),
        driverSection: document.getElementById('driverSection'),
        // New elements
        receiptToggle: document.getElementById('receiptToggle'),
        myLocationBtn: document.getElementById('myLocationBtn')
    };

    // User location icon for Leaflet
    const userLocationIcon = L.divIcon({
        className: 'user-location-marker',
        html: `<div class="user-location-marker-pulse"></div><div class="user-location-marker-inner"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    // ========================================
    // Custom Marker Icons
    // ========================================
    const driverIcon = L.divIcon({
        className: 'driver-marker',
        html: `<div class="driver-marker-inner">
            <svg viewBox="0 0 24 24" fill="#183251">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
        </div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
    });

    const pickupIcon = L.divIcon({
        className: 'pickup-marker',
        html: '<div class="pickup-marker-inner"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const dropoffIcon = L.divIcon({
        className: 'dropoff-marker',
        html: `<div class="dropoff-marker-inner">
            <svg viewBox="0 0 24 24" fill="#597B87">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3" fill="white"/>
            </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });

    // ========================================
    // Initialize
    // ========================================
    async function init() {
        setupEventListeners();

        // Get booking ID or reference from URL
        const urlParams = new URLSearchParams(window.location.search);
        const bookingId = urlParams.get('id');
        const bookingRef = urlParams.get('ref');

        // Check for completed booking from payment page
        const completedBookingData = sessionStorage.getItem('completedBooking');

        if (completedBookingData) {
            // Coming from payment - show receipt and search for driver
            await handlePostPaymentFlow(JSON.parse(completedBookingData));
        } else if (bookingId || bookingRef) {
            // Direct tracking link
            await loadBooking(bookingId || bookingRef);
        } else {
            showNoTracking();
            return;
        }
    }

    // ========================================
    // Handle Post-Payment Flow
    // ========================================
    async function handlePostPaymentFlow(completedBooking) {
        // Show receipt card
        showReceiptCard(completedBooking);

        // Show driver search state
        showDriverSearchState();

        // Hide bottom sheet and status banner initially
        if (elements.statusBanner) elements.statusBanner.style.display = 'none';
        if (elements.bottomSheet) elements.bottomSheet.style.display = 'none';

        // Hide loading
        hideLoading();

        // Initialize map
        initMap();

        // Update header booking ref
        if (elements.bookingRef) {
            elements.bookingRef.textContent = completedBooking.bookingReference;
        }

        // Extract location strings properly (handle both string and object formats)
        const pickupLocation = typeof completedBooking.pickup === 'object'
            ? completedBooking.pickup?.location || 'Bole International Airport'
            : completedBooking.pickup || 'Bole International Airport';
        const dropoffLocation = typeof completedBooking.dropoff === 'object'
            ? completedBooking.dropoff?.location || 'Destination'
            : completedBooking.dropoff || 'Destination';

        // Store booking data
        booking = {
            bookingReference: completedBooking.bookingReference,
            status: 'confirmed',
            pickup: {
                location: pickupLocation,
                scheduledTime: completedBooking.pickupTime,
                coordinates: BOLE_AIRPORT
            },
            dropoff: {
                location: dropoffLocation,
                coordinates: [9.0107, 38.7467] // Default: Sheraton
            },
            vehicleClass: completedBooking.vehicleClass,
            pricing: completedBooking.pricing,
            contact: completedBooking.contact
        };

        // Start polling for driver assignment
        startDriverSearch(completedBooking);
    }

    // ========================================
    // Show Receipt Card
    // ========================================
    function showReceiptCard(data) {
        if (!elements.receiptCard) return;

        elements.receiptCard.style.display = 'block';

        if (elements.receiptRef) {
            elements.receiptRef.textContent = data.bookingReference;
        }

        if (elements.receiptRoute) {
            // Handle both string and object formats for pickup/dropoff
            const pickup = typeof data.pickup === 'object'
                ? data.pickup?.location || 'Bole Airport'
                : data.pickup || 'Bole Airport';
            const dropoff = typeof data.dropoff === 'object'
                ? data.dropoff?.location || 'Destination'
                : data.dropoff || 'Destination';
            elements.receiptRoute.textContent = `${pickup} → ${dropoff}`;
        }

        if (elements.receiptDateTime) {
            elements.receiptDateTime.textContent = formatDateTime(data.pickupTime);
        }

        if (elements.receiptVehicle) {
            elements.receiptVehicle.textContent = getVehicleLabel(data.vehicleClass);
        }

        if (elements.receiptPayment) {
            const methodLabels = {
                card: 'Card •••• 4242',
                telebirr: 'Telebirr',
                cash: 'Cash on arrival'
            };
            elements.receiptPayment.textContent = methodLabels[data.paymentMethod] || 'Card';
        }

        if (elements.receiptTotal && data.pricing) {
            elements.receiptTotal.textContent = `$${data.pricing.totalUSD?.toFixed(2) || '30.00'}`;
        }
    }

    // ========================================
    // Show Driver Search State
    // ========================================
    function showDriverSearchState() {
        if (!elements.driverSearchState) return;

        elements.driverSearchState.style.display = 'block';

        // Rotate microcopy messages
        const microcopyMessages = [
            "We're matching you with the best available driver nearby.",
            "Checking driver availability in your area...",
            "Contacting nearby drivers for your ride...",
            "Almost there! Finding the perfect match...",
            "Your driver is being notified now..."
        ];

        let messageIndex = 0;
        const microcopyInterval = setInterval(() => {
            if (!elements.searchMicrocopy) {
                clearInterval(microcopyInterval);
                return;
            }
            messageIndex = (messageIndex + 1) % microcopyMessages.length;
            elements.searchMicrocopy.textContent = microcopyMessages[messageIndex];
        }, 4000);

        // Store interval for cleanup
        window.microcopyInterval = microcopyInterval;
    }

    // ========================================
    // Start Driver Search Polling
    // ========================================
    function startDriverSearch(completedBooking) {
        let searchTime = 0;
        const maxSearchTime = 120; // 2 minutes

        const searchInterval = setInterval(async () => {
            searchTime += 5;

            // Demo: Assign driver after 15-30 seconds
            const assignTime = Math.floor(Math.random() * 15) + 15;

            if (searchTime >= assignTime) {
                clearInterval(searchInterval);
                if (window.microcopyInterval) {
                    clearInterval(window.microcopyInterval);
                }

                // Assign demo driver
                assignDriver(completedBooking);
            }

            // Timeout after max search time
            if (searchTime >= maxSearchTime) {
                clearInterval(searchInterval);
                showToast('Still searching for a driver...');
            }
        }, 5000);
    }

    // ========================================
    // Assign Driver
    // ========================================
    function assignDriver(completedBooking) {
        // Hide search state
        if (elements.driverSearchState) {
            elements.driverSearchState.style.display = 'none';
        }

        // Show status banner
        if (elements.statusBanner) {
            elements.statusBanner.style.display = 'flex';
        }

        // Show bottom sheet
        if (elements.bottomSheet) {
            elements.bottomSheet.style.display = 'block';
        }

        // Update booking with driver info
        booking.driver = {
            name: 'Abebe Bekele',
            phone: '+251911234567',
            vehicle: getVehicleModel(completedBooking.vehicleClass),
            vehiclePlate: '3-AA-' + Math.floor(10000 + Math.random() * 90000),
            rating: 4.9,
            currentLocation: {
                lat: BOLE_AIRPORT[0] + 0.01,
                lng: BOLE_AIRPORT[1] - 0.02
            }
        };
        booking.status = 'driver_assigned';

        // Update UI
        updateUI();

        // Add markers now that driver is assigned
        addMarkers();

        // Show notification
        showToast('Driver assigned! Abebe is on the way.');

        // Start tracking simulation
        startTracking();

        // Clear completed booking from session
        sessionStorage.removeItem('completedBooking');
    }

    // ========================================
    // Get Vehicle Label
    // ========================================
    function getVehicleLabel(vehicleClass) {
        const labels = {
            standard: 'Standard Sedan',
            executive: 'Executive Sedan',
            suv: 'SUV',
            van: 'Van / Minibus',
            luxury: 'Luxury Class'
        };
        return labels[vehicleClass] || 'Standard Sedan';
    }

    // ========================================
    // Get Vehicle Model
    // ========================================
    function getVehicleModel(vehicleClass) {
        const models = {
            standard: 'Toyota Corolla',
            executive: 'Toyota Camry',
            suv: 'Toyota Land Cruiser',
            van: 'Toyota HiAce',
            luxury: 'Mercedes E-Class'
        };
        return models[vehicleClass] || 'Toyota Corolla';
    }

    // ========================================
    // Event Listeners
    // ========================================
    function setupEventListeners() {
        // Receipt toggle
        if (elements.receiptToggle) {
            elements.receiptToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleReceipt();
            });
        }

        // Receipt header click to toggle
        const receiptHeader = document.querySelector('.receipt-header');
        if (receiptHeader) {
            receiptHeader.addEventListener('click', toggleReceipt);
        }

        // My location button
        if (elements.myLocationBtn) {
            elements.myLocationBtn.addEventListener('click', goToMyLocation);
        }

        if (!elements.bottomSheet) return;

        // Bottom sheet drag (improved touch handling)
        const sheetHandle = elements.bottomSheet.querySelector('.sheet-handle');
        if (!sheetHandle) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        sheetHandle.addEventListener('touchstart', (e) => {
            isDragging = true;
            startY = e.touches[0].clientY;
            currentY = startY;
            elements.bottomSheet.style.transition = 'none';
        }, { passive: true });

        sheetHandle.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            // Get current position
            const sheetHeight = elements.bottomSheet.offsetHeight;
            const viewportHeight = window.innerHeight;
            const minShow = 180; // Show at least this much
            const maxTranslate = sheetHeight - minShow;

            // Calculate new position
            let newTranslate;
            if (elements.bottomSheet.classList.contains('expanded')) {
                newTranslate = Math.max(0, Math.min(maxTranslate, deltaY));
            } else {
                const baseTranslate = sheetHeight - minShow;
                newTranslate = Math.max(0, Math.min(maxTranslate, baseTranslate + deltaY));
            }

            elements.bottomSheet.style.transform = `translateY(${newTranslate}px)`;
        }, { passive: true });

        sheetHandle.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            elements.bottomSheet.style.transition = '';

            const deltaY = currentY - startY;
            const threshold = 50;

            if (deltaY > threshold) {
                // Swiped down - collapse
                elements.bottomSheet.classList.remove('expanded');
                isExpanded = false;
            } else if (deltaY < -threshold) {
                // Swiped up - expand
                elements.bottomSheet.classList.add('expanded');
                isExpanded = true;
            }

            elements.bottomSheet.style.transform = '';
        });

        // Click to expand/collapse
        sheetHandle.addEventListener('click', () => {
            elements.bottomSheet.classList.toggle('expanded');
            isExpanded = elements.bottomSheet.classList.contains('expanded');
        });

        // Driver actions
        if (elements.callDriver) elements.callDriver.addEventListener('click', callDriver);
        if (elements.messageDriver) elements.messageDriver.addEventListener('click', messageDriver);
        if (elements.shareLocation) elements.shareLocation.addEventListener('click', shareLocation);
        if (elements.emergencyBtn) elements.emergencyBtn.addEventListener('click', showEmergencyOptions);
    }

    // ========================================
    // Toggle Receipt Card
    // ========================================
    function toggleReceipt() {
        if (!elements.receiptCard) return;

        isReceiptCollapsed = !isReceiptCollapsed;
        elements.receiptCard.classList.toggle('collapsed', isReceiptCollapsed);
    }

    // ========================================
    // Go to My Location
    // ========================================
    function goToMyLocation() {
        if (!map) {
            showToast('Map not ready');
            return;
        }

        if (!navigator.geolocation) {
            showToast('Geolocation not supported');
            return;
        }

        // Show loading state
        if (elements.myLocationBtn) {
            elements.myLocationBtn.classList.add('locating');
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Remove loading state
                if (elements.myLocationBtn) {
                    elements.myLocationBtn.classList.remove('locating');
                }

                // Update or create user location marker
                if (userLocationMarker) {
                    userLocationMarker.setLatLng([lat, lng]);
                } else {
                    userLocationMarker = L.marker([lat, lng], { icon: userLocationIcon }).addTo(map);
                    userLocationMarker.bindPopup('<b>You are here</b>');
                }

                // Zoom to user location
                map.setView([lat, lng], 16, { animate: true });

                showToast('Showing your location');
            },
            (error) => {
                // Remove loading state
                if (elements.myLocationBtn) {
                    elements.myLocationBtn.classList.remove('locating');
                }

                let message = 'Could not get location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location permission denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location unavailable';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out';
                        break;
                }
                showToast(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    // ========================================
    // Load Booking
    // ========================================
    async function loadBooking(bookingId) {
        try {
            // Try to fetch from API
            if (navigator.onLine && typeof BookingsAPI !== 'undefined') {
                const response = await BookingsAPI.getBooking(bookingId);
                if (response.success && response.data) {
                    booking = response.data;
                }
            }

            // Fallback to offline storage
            if (!booking && typeof BookingStorage !== 'undefined') {
                booking = await BookingStorage.getById(bookingId);
            }

            // Demo booking for development
            if (!booking) {
                booking = getDemoBooking(bookingId);
            }

            // Check if tracking is available
            if (!booking || !booking.driver || booking.status === 'pending') {
                showNoTracking();
                return;
            }

            // Initialize map and UI
            initMap();
            addMarkers();
            updateUI();
            startTracking();

        } catch (error) {
            console.error('[Tracker] Error loading booking:', error);
            showNoTracking();
        } finally {
            hideLoading();
        }
    }

    // ========================================
    // Initialize Map (Leaflet + OpenStreetMap)
    // ========================================
    function initMap() {
        if (map) return; // Already initialized

        // Create map centered on Addis Ababa
        map = L.map('map', {
            zoomControl: false // We'll add custom position
        }).setView(ADDIS_ABABA.center, ADDIS_ABABA.zoom);

        // Add OpenStreetMap tiles (completely free)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(map);

        // Add zoom control to top-right
        L.control.zoom({
            position: 'topright'
        }).addTo(map);

        console.log('[Tracker] Map initialized with OpenStreetMap');
    }

    // ========================================
    // Add Markers
    // ========================================
    function addMarkers() {
        if (!map || !booking) return;

        // Get coordinates
        const pickupCoords = booking.pickup?.coordinates || BOLE_AIRPORT;
        const dropoffCoords = booking.dropoff?.coordinates || [9.0107, 38.7467];
        const driverLocation = booking.driver?.currentLocation || {
            lat: BOLE_AIRPORT[0] + 0.01,
            lng: BOLE_AIRPORT[1] - 0.02
        };

        // Pickup marker
        if (!pickupMarker) {
            pickupMarker = L.marker(pickupCoords, { icon: pickupIcon }).addTo(map);
            pickupMarker.bindPopup('<b>Pickup</b><br>' + (booking.pickup?.location || 'Bole Airport'));
        }

        // Dropoff marker
        if (!dropoffMarker) {
            dropoffMarker = L.marker(dropoffCoords, { icon: dropoffIcon }).addTo(map);
            dropoffMarker.bindPopup('<b>Drop-off</b><br>' + (booking.dropoff?.location || 'Destination'));
        }

        // Driver marker
        if (!driverMarker) {
            driverMarker = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon }).addTo(map);
            driverMarker.bindPopup('<b>' + (booking.driver?.name || 'Driver') + '</b><br>' + (booking.driver?.vehicle || 'Vehicle'));
        }

        // Draw route line
        drawRoute();

        // Fit bounds to show all markers
        fitBounds();
    }

    // ========================================
    // Draw Route
    // ========================================
    function drawRoute() {
        if (!map || !booking) return;

        const pickupCoords = booking.pickup?.coordinates || BOLE_AIRPORT;
        const dropoffCoords = booking.dropoff?.coordinates || [9.0107, 38.7467];
        const driverLocation = booking.driver?.currentLocation || {
            lat: BOLE_AIRPORT[0] + 0.01,
            lng: BOLE_AIRPORT[1] - 0.02
        };

        // Remove existing route control
        if (routeControl) {
            map.removeControl(routeControl);
            routeControl = null;
        }

        // Remove legacy polyline if exists
        if (routeLine) {
            map.removeLayer(routeLine);
            routeLine = null;
        }

        // Check if Leaflet Routing Machine is available
        if (typeof L.Routing === 'undefined') {
            // Fallback to simple polyline if routing library not loaded
            routeLine = L.polyline([
                [driverLocation.lat, driverLocation.lng],
                pickupCoords,
                dropoffCoords
            ], {
                color: '#597B87',
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 10'
            }).addTo(map);
            return;
        }

        // Create OSRM route with real roads
        try {
            routeControl = L.Routing.control({
                waypoints: [
                    L.latLng(driverLocation.lat, driverLocation.lng),
                    L.latLng(pickupCoords[0], pickupCoords[1]),
                    L.latLng(dropoffCoords[0], dropoffCoords[1])
                ],
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1',
                    profile: 'driving'
                }),
                lineOptions: {
                    styles: [{ color: '#597B87', weight: 5, opacity: 0.8 }],
                    extendToWaypoints: true,
                    missingRouteTolerance: 0
                },
                show: false,  // Hide turn-by-turn instructions panel
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: false,
                createMarker: () => null  // We use our own custom markers
            }).addTo(map);

            // Listen for route found to update ETA
            routeControl.on('routesfound', (e) => {
                const route = e.routes[0];
                if (route && route.summary) {
                    const durationMinutes = Math.round(route.summary.totalTime / 60);
                    const distanceKm = (route.summary.totalDistance / 1000).toFixed(1);
                    updateETADisplay(durationMinutes, distanceKm);
                }
            });

            // Handle routing errors gracefully
            routeControl.on('routingerror', (e) => {
                console.warn('[Map] Routing error, falling back to straight line:', e.error);
                // Fallback to polyline on error
                if (routeControl) {
                    map.removeControl(routeControl);
                    routeControl = null;
                }
                routeLine = L.polyline([
                    [driverLocation.lat, driverLocation.lng],
                    pickupCoords,
                    dropoffCoords
                ], {
                    color: '#597B87',
                    weight: 4,
                    opacity: 0.8,
                    dashArray: '10, 10'
                }).addTo(map);
            });
        } catch (error) {
            console.error('[Map] Error creating route:', error);
            // Fallback to simple polyline
            routeLine = L.polyline([
                [driverLocation.lat, driverLocation.lng],
                pickupCoords,
                dropoffCoords
            ], {
                color: '#597B87',
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 10'
            }).addTo(map);
        }
    }

    // ========================================
    // Update ETA Display
    // ========================================
    function updateETADisplay(minutes, distanceKm) {
        // Update ETA in driver card if available
        if (elements.driverETA) {
            elements.driverETA.textContent = `${minutes} min`;
        }
        // Update any other ETA displays
        const etaElements = document.querySelectorAll('.eta-value, .driver-eta');
        etaElements.forEach(el => {
            if (el.classList.contains('distance')) {
                el.textContent = `${distanceKm} km`;
            } else {
                el.textContent = `${minutes} min`;
            }
        });
        console.log(`[Map] Route: ${distanceKm} km, ETA: ${minutes} min`);
    }

    // ========================================
    // Fit Map Bounds
    // ========================================
    function fitBounds() {
        if (!map || !booking) return;

        const pickupCoords = booking.pickup?.coordinates || BOLE_AIRPORT;
        const dropoffCoords = booking.dropoff?.coordinates || [9.0107, 38.7467];
        const driverLocation = booking.driver?.currentLocation || {
            lat: BOLE_AIRPORT[0] + 0.01,
            lng: BOLE_AIRPORT[1] - 0.02
        };

        const bounds = L.latLngBounds([
            [driverLocation.lat, driverLocation.lng],
            pickupCoords,
            dropoffCoords
        ]);

        map.fitBounds(bounds, {
            padding: [80, 80]
        });
    }

    // ========================================
    // Update UI
    // ========================================
    function updateUI() {
        if (!booking) return;

        // Booking reference
        if (elements.bookingRef) {
            elements.bookingRef.textContent = booking.bookingReference || 'SP-2025-XXXXXX';
        }

        // Driver info
        if (elements.driverName) elements.driverName.textContent = booking.driver?.name || 'Driver';
        if (elements.driverAvatar) elements.driverAvatar.textContent = getInitials(booking.driver?.name);
        if (elements.vehicleModel) elements.vehicleModel.textContent = booking.driver?.vehicle || 'Toyota Corolla';
        if (elements.vehiclePlate) elements.vehiclePlate.textContent = booking.driver?.vehiclePlate || '3-AA-XXXXX';

        // Trip details
        if (elements.pickupAddress) elements.pickupAddress.textContent = booking.pickup?.location || 'Bole International Airport';
        if (elements.dropoffAddress) elements.dropoffAddress.textContent = booking.dropoff?.location || booking.dropoff?.zone || 'Destination';
        if (elements.pickupTime) elements.pickupTime.textContent = formatDateTime(booking.pickup?.scheduledTime);

        // Status
        updateStatus();
    }

    // ========================================
    // Update Status
    // ========================================
    function updateStatus() {
        if (!booking) return;

        const statusMessages = {
            confirmed: { label: 'Driver confirmed', eta: 'Preparing for pickup' },
            driver_assigned: { label: 'Driver assigned', eta: 'On the way to pickup' },
            en_route_pickup: { label: 'Driver en route', eta: 'Arriving in ~15 min' },
            arrived_pickup: { label: 'Driver arrived', eta: 'Waiting at pickup point' },
            in_progress: { label: 'Trip in progress', eta: 'En route to destination' },
            completed: { label: 'Trip completed', eta: 'Thank you for riding!' }
        };

        const status = statusMessages[booking.status] || statusMessages.driver_assigned;

        if (elements.statusLabel) elements.statusLabel.textContent = status.label;
        if (elements.statusETA) elements.statusETA.textContent = status.eta;

        // Update status icon for arrived
        if (booking.status === 'arrived_pickup' && elements.statusBanner) {
            const statusIcon = elements.statusBanner.querySelector('.status-icon');
            if (statusIcon) statusIcon.classList.add('arrived');
        }

        // Update timeline
        updateTimeline();
    }

    // ========================================
    // Update Timeline
    // ========================================
    function updateTimeline() {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;

        const items = timeline.querySelectorAll('.timeline-item');

        const statusOrder = ['pending', 'confirmed', 'driver_assigned', 'en_route_pickup', 'arrived_pickup', 'completed'];
        const currentIndex = statusOrder.indexOf(booking.status);

        items.forEach((item, index) => {
            item.classList.remove('completed', 'active');

            if (index < currentIndex || (index === currentIndex && booking.status === 'completed')) {
                item.classList.add('completed');
            } else if (index === currentIndex || (index === 2 && currentIndex === 3)) {
                item.classList.add('active');
            }
        });
    }

    // ========================================
    // Start Real-time Tracking
    // ========================================
    function startTracking() {
        // Update every 10 seconds
        updateInterval = setInterval(async () => {
            if (!navigator.onLine) return;

            try {
                // Fetch latest tracking data
                if (typeof BookingsAPI !== 'undefined') {
                    const response = await BookingsAPI.getTracking(booking._id || booking.bookingReference);
                    if (response.success && response.data) {
                        updateDriverLocation(response.data.driverLocation);
                        updateETA(response.data.eta);
                    }
                } else {
                    // Simulate driver movement for demo
                    simulateDriverMovement();
                }
            } catch (error) {
                console.error('[Tracker] Error updating location:', error);
            }
        }, 10000);
    }

    // ========================================
    // Update Driver Location
    // ========================================
    function updateDriverLocation(location) {
        if (!driverMarker || !location) return;

        driverMarker.setLatLng([location.lat, location.lng]);

        // Update route line
        drawRoute();
    }

    // ========================================
    // Update ETA
    // ========================================
    function updateETA(eta) {
        if (eta && eta.minutes && elements.statusETA) {
            elements.statusETA.textContent = `Arriving in ~${eta.minutes} min`;
        }
    }

    // ========================================
    // Simulate Driver Movement (Demo)
    // ========================================
    let simulationStep = 0;
    function simulateDriverMovement() {
        simulationStep++;

        const startLat = BOLE_AIRPORT[0] + 0.01;
        const startLng = BOLE_AIRPORT[1] - 0.02;
        const endLat = BOLE_AIRPORT[0];
        const endLng = BOLE_AIRPORT[1];

        // Move towards pickup over 30 steps
        const progress = Math.min(simulationStep / 30, 1);
        const currentLat = startLat + (endLat - startLat) * progress;
        const currentLng = startLng + (endLng - startLng) * progress;

        // Update booking driver location
        if (booking.driver) {
            booking.driver.currentLocation = { lat: currentLat, lng: currentLng };
        }

        updateDriverLocation({ lat: currentLat, lng: currentLng });

        const eta = Math.max(1, Math.round(15 * (1 - progress)));
        updateETA({ minutes: eta });

        if (progress >= 1 && booking.status !== 'arrived_pickup') {
            booking.status = 'arrived_pickup';
            updateStatus();
            showToast('Your driver has arrived!');
        }
    }

    // ========================================
    // Driver Actions
    // ========================================
    function callDriver() {
        const phone = booking?.driver?.phone;
        if (phone) {
            window.location.href = `tel:${phone}`;
        } else {
            showToast('Driver phone not available');
        }
    }

    function messageDriver() {
        const phone = booking?.driver?.phone;
        if (phone) {
            // Try WhatsApp
            const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
            window.open(whatsappUrl, '_blank');
        } else {
            showToast('Driver contact not available');
        }
    }

    async function shareLocation() {
        const shareData = {
            title: 'Track my Shuttle Plus ride',
            text: `Track my airport transfer: ${booking?.bookingReference}`,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    copyToClipboard(window.location.href);
                }
            }
        } else {
            copyToClipboard(window.location.href);
        }
    }

    function showEmergencyOptions() {
        if (confirm('Do you need emergency assistance?')) {
            // Ethiopian emergency number
            window.location.href = 'tel:911';
        }
    }

    // ========================================
    // Helper Functions
    // ========================================
    function hideLoading() {
        if (elements.trackingLoading) {
            elements.trackingLoading.style.display = 'none';
        }
    }

    function showNoTracking() {
        if (elements.trackingLoading) elements.trackingLoading.style.display = 'none';
        if (elements.noTracking) elements.noTracking.style.display = 'flex';
        if (elements.bottomSheet) elements.bottomSheet.style.display = 'none';
        if (elements.statusBanner) elements.statusBanner.style.display = 'none';
    }

    function showToast(message) {
        if (!elements.toast) return;
        const messageEl = elements.toast.querySelector('.toast-message');
        if (messageEl) messageEl.textContent = message;
        elements.toast.classList.add('show');
        setTimeout(() => elements.toast.classList.remove('show'), 3000);
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Link copied to clipboard');
        }).catch(() => {
            showToast('Failed to copy link');
        });
    }

    function getInitials(name) {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    function formatDateTime(dateString) {
        if (!dateString) return 'Today';

        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (date.toDateString() === today.toDateString()) {
            dayLabel = 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            dayLabel = 'Tomorrow';
        }

        const time = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        return `${dayLabel}, ${time}`;
    }

    // ========================================
    // Demo Booking
    // ========================================
    function getDemoBooking(id) {
        return {
            _id: id,
            bookingReference: 'SP-2025-ABC123',
            status: 'driver_assigned',
            pickup: {
                location: 'Bole International Airport',
                coordinates: BOLE_AIRPORT,
                scheduledTime: new Date(Date.now() + 30 * 60 * 1000).toISOString()
            },
            dropoff: {
                location: 'Sheraton Addis',
                zone: 'City Center',
                coordinates: [9.0107, 38.7467]
            },
            driver: {
                name: 'Abebe Bekele',
                phone: '+251911234567',
                vehicle: 'Toyota Camry',
                vehiclePlate: '3-AA-12345',
                currentLocation: {
                    lat: BOLE_AIRPORT[0] + 0.01,
                    lng: BOLE_AIRPORT[1] - 0.02
                }
            }
        };
    }

    // ========================================
    // Cleanup
    // ========================================
    window.addEventListener('beforeunload', () => {
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        if (window.microcopyInterval) {
            clearInterval(window.microcopyInterval);
        }
    });

    // ========================================
    // Initialize
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
