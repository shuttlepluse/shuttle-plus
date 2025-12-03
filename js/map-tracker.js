// ========================================
// Map Tracker - Mapbox Integration
// ========================================

(function() {
    'use strict';

    // ========================================
    // Configuration
    // ========================================
    // Note: Replace with your Mapbox token from https://mapbox.com
    const MAPBOX_TOKEN = 'YOUR_MAPBOX_TOKEN'; // Will be loaded from API

    // Addis Ababa coordinates
    const ADDIS_ABABA = {
        center: [38.7578, 8.9806],
        zoom: 12
    };

    // Bole Airport coordinates
    const BOLE_AIRPORT = [38.7993, 8.9778];

    // ========================================
    // State
    // ========================================
    let map = null;
    let driverMarker = null;
    let pickupMarker = null;
    let dropoffMarker = null;
    let routeLine = null;
    let booking = null;
    let updateInterval = null;
    let isExpanded = false;

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
        toast: document.getElementById('toast')
    };

    // ========================================
    // Initialize
    // ========================================
    async function init() {
        setupEventListeners();

        // Get booking ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const bookingId = urlParams.get('id');

        if (!bookingId) {
            showNoTracking();
            return;
        }

        await loadBooking(bookingId);
    }

    // ========================================
    // Event Listeners
    // ========================================
    function setupEventListeners() {
        // Bottom sheet drag
        const sheetHandle = elements.bottomSheet.querySelector('.sheet-handle');
        let startY = 0;
        let startTransform = 0;

        sheetHandle.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            const transform = window.getComputedStyle(elements.bottomSheet).transform;
            const matrix = new DOMMatrix(transform);
            startTransform = matrix.m42;
        });

        sheetHandle.addEventListener('touchmove', (e) => {
            const deltaY = e.touches[0].clientY - startY;
            const newTransform = Math.max(0, startTransform + deltaY);
            elements.bottomSheet.style.transform = `translateY(${newTransform}px)`;
        });

        sheetHandle.addEventListener('touchend', () => {
            const transform = window.getComputedStyle(elements.bottomSheet).transform;
            const matrix = new DOMMatrix(transform);
            const translateY = matrix.m42;

            if (translateY > 100) {
                elements.bottomSheet.classList.remove('expanded');
            } else {
                elements.bottomSheet.classList.add('expanded');
            }
            elements.bottomSheet.style.transform = '';
        });

        // Click to expand/collapse
        sheetHandle.addEventListener('click', () => {
            elements.bottomSheet.classList.toggle('expanded');
            isExpanded = elements.bottomSheet.classList.contains('expanded');
        });

        // Driver actions
        elements.callDriver.addEventListener('click', callDriver);
        elements.messageDriver.addEventListener('click', messageDriver);
        elements.shareLocation.addEventListener('click', shareLocation);
        elements.emergencyBtn.addEventListener('click', showEmergencyOptions);
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
            await initMap();
            updateUI();
            startTracking();

        } catch (error) {
            console.error('[Tracker] Error loading booking:', error);
            showNoTracking();
        }
    }

    // ========================================
    // Initialize Map
    // ========================================
    async function initMap() {
        // Try to get Mapbox token from backend
        let token = MAPBOX_TOKEN;

        if (token === 'YOUR_MAPBOX_TOKEN' && navigator.onLine) {
            try {
                const response = await fetch('/api/config/mapbox');
                if (response.ok) {
                    const data = await response.json();
                    token = data.token;
                }
            } catch (e) {
                console.log('[Tracker] Using demo mode without Mapbox token');
            }
        }

        // If no token, show demo map
        if (token === 'YOUR_MAPBOX_TOKEN') {
            showDemoMap();
            hideLoading();
            return;
        }

        mapboxgl.accessToken = token;

        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: ADDIS_ABABA.center,
            zoom: ADDIS_ABABA.zoom
        });

        map.on('load', () => {
            hideLoading();
            addMarkers();
            drawRoute();
            fitBounds();
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add geolocation control
        map.addControl(new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true
        }), 'top-right');
    }

    // ========================================
    // Demo Map (when no Mapbox token)
    // ========================================
    function showDemoMap() {
        elements.map.innerHTML = `
            <div style="
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #e8f4f8 0%, #f0f7f9 100%);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                text-align: center;
            ">
                <svg viewBox="0 0 24 24" fill="none" stroke="#597B87" stroke-width="1.5" style="width: 80px; height: 80px; margin-bottom: 1rem; opacity: 0.5;">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
                <p style="color: #666; font-size: 0.9rem; max-width: 300px;">
                    Map preview requires Mapbox configuration.<br>
                    Driver location updates are simulated.
                </p>
            </div>
        `;
    }

    // ========================================
    // Add Markers
    // ========================================
    function addMarkers() {
        if (!map) return;

        // Driver marker
        const driverEl = document.createElement('div');
        driverEl.className = 'driver-marker';
        driverEl.innerHTML = `
            <div class="driver-marker-inner">
                <svg viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                </svg>
            </div>
        `;

        const driverLocation = booking.driver?.currentLocation || {
            lng: BOLE_AIRPORT[0] - 0.02,
            lat: BOLE_AIRPORT[1] + 0.01
        };

        driverMarker = new mapboxgl.Marker(driverEl)
            .setLngLat([driverLocation.lng, driverLocation.lat])
            .addTo(map);

        // Pickup marker
        const pickupEl = document.createElement('div');
        pickupEl.className = 'pickup-marker';
        pickupEl.innerHTML = '<div class="pickup-marker-inner"></div>';

        pickupMarker = new mapboxgl.Marker(pickupEl)
            .setLngLat(booking.pickup?.coordinates || BOLE_AIRPORT)
            .addTo(map);

        // Dropoff marker
        const dropoffEl = document.createElement('div');
        dropoffEl.className = 'dropoff-marker';
        dropoffEl.innerHTML = '<div class="dropoff-marker-inner"></div>';

        const dropoffCoords = booking.dropoff?.coordinates || [38.7467, 9.0107]; // Default: Sheraton
        dropoffMarker = new mapboxgl.Marker(dropoffEl)
            .setLngLat(dropoffCoords)
            .addTo(map);
    }

    // ========================================
    // Draw Route
    // ========================================
    function drawRoute() {
        if (!map) return;

        const driverLocation = booking.driver?.currentLocation || {
            lng: BOLE_AIRPORT[0] - 0.02,
            lat: BOLE_AIRPORT[1] + 0.01
        };

        const pickupCoords = booking.pickup?.coordinates || BOLE_AIRPORT;
        const dropoffCoords = booking.dropoff?.coordinates || [38.7467, 9.0107];

        // Simple line from driver to pickup to dropoff
        map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [driverLocation.lng, driverLocation.lat],
                        pickupCoords,
                        dropoffCoords
                    ]
                }
            }
        });

        map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            paint: {
                'line-color': '#597B87',
                'line-width': 4,
                'line-dasharray': [2, 1]
            }
        });
    }

    // ========================================
    // Fit Map Bounds
    // ========================================
    function fitBounds() {
        if (!map) return;

        const driverLocation = booking.driver?.currentLocation || {
            lng: BOLE_AIRPORT[0] - 0.02,
            lat: BOLE_AIRPORT[1] + 0.01
        };

        const pickupCoords = booking.pickup?.coordinates || BOLE_AIRPORT;
        const dropoffCoords = booking.dropoff?.coordinates || [38.7467, 9.0107];

        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([driverLocation.lng, driverLocation.lat]);
        bounds.extend(pickupCoords);
        bounds.extend(dropoffCoords);

        map.fitBounds(bounds, {
            padding: { top: 150, bottom: 250, left: 50, right: 50 }
        });
    }

    // ========================================
    // Update UI
    // ========================================
    function updateUI() {
        if (!booking) return;

        // Booking reference
        elements.bookingRef.textContent = booking.bookingReference || 'SP-2025-XXXXXX';

        // Driver info
        elements.driverName.textContent = booking.driver?.name || 'Driver';
        elements.driverAvatar.textContent = getInitials(booking.driver?.name);
        elements.vehicleModel.textContent = booking.driver?.vehicle || 'Toyota Corolla';
        elements.vehiclePlate.textContent = booking.driver?.vehiclePlate || '3-AA-XXXXX';

        // Trip details
        elements.pickupAddress.textContent = booking.pickup?.location || 'Bole International Airport';
        elements.dropoffAddress.textContent = booking.dropoff?.location || booking.dropoff?.zone || 'Destination';
        elements.pickupTime.textContent = formatDateTime(booking.pickup?.scheduledTime);

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

        elements.statusLabel.textContent = status.label;
        elements.statusETA.textContent = status.eta;

        // Update status icon for arrived
        if (booking.status === 'arrived_pickup') {
            elements.statusBanner.querySelector('.status-icon').classList.add('arrived');
        }

        // Update timeline
        updateTimeline();
    }

    // ========================================
    // Update Timeline
    // ========================================
    function updateTimeline() {
        const timeline = document.getElementById('timeline');
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

        driverMarker.setLngLat([location.lng, location.lat]);

        // Update route line
        if (map && map.getSource('route')) {
            const pickupCoords = booking.pickup?.coordinates || BOLE_AIRPORT;
            const dropoffCoords = booking.dropoff?.coordinates || [38.7467, 9.0107];

            map.getSource('route').setData({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [location.lng, location.lat],
                        pickupCoords,
                        dropoffCoords
                    ]
                }
            });
        }
    }

    // ========================================
    // Update ETA
    // ========================================
    function updateETA(eta) {
        if (eta && eta.minutes) {
            elements.statusETA.textContent = `Arriving in ~${eta.minutes} min`;
        }
    }

    // ========================================
    // Simulate Driver Movement (Demo)
    // ========================================
    let simulationStep = 0;
    function simulateDriverMovement() {
        simulationStep++;

        const startLng = BOLE_AIRPORT[0] - 0.02;
        const startLat = BOLE_AIRPORT[1] + 0.01;
        const endLng = BOLE_AIRPORT[0];
        const endLat = BOLE_AIRPORT[1];

        // Move towards pickup over 30 steps
        const progress = Math.min(simulationStep / 30, 1);
        const currentLng = startLng + (endLng - startLng) * progress;
        const currentLat = startLat + (endLat - startLat) * progress;

        updateDriverLocation({ lng: currentLng, lat: currentLat });

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
        const phone = booking.driver?.phone;
        if (phone) {
            window.location.href = `tel:${phone}`;
        } else {
            showToast('Driver phone not available');
        }
    }

    function messageDriver() {
        const phone = booking.driver?.phone;
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
            text: `Track my airport transfer: ${booking.bookingReference}`,
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
        elements.trackingLoading.style.display = 'none';
    }

    function showNoTracking() {
        elements.trackingLoading.style.display = 'none';
        elements.noTracking.style.display = 'flex';
        elements.bottomSheet.style.display = 'none';
        elements.statusBanner.style.display = 'none';
    }

    function showToast(message) {
        elements.toast.querySelector('.toast-message').textContent = message;
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
                coordinates: [38.7467, 9.0107]
            },
            driver: {
                name: 'Abebe Bekele',
                phone: '+251911234567',
                vehicle: 'Toyota Camry',
                vehiclePlate: '3-AA-12345',
                currentLocation: {
                    lng: BOLE_AIRPORT[0] - 0.02,
                    lat: BOLE_AIRPORT[1] + 0.01
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
