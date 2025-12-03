// ========================================
// Driver App JavaScript
// ========================================

(function() {
    'use strict';

    // ========================================
    // Configuration
    // ========================================
    const API_BASE = '/api/drivers';
    const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds

    // ========================================
    // State
    // ========================================
    let driver = null;
    let token = null;
    let locationWatchId = null;
    let trips = [];
    let currentTrip = null;

    // ========================================
    // Initialization
    // ========================================
    function init() {
        // Check for stored token
        token = localStorage.getItem('driver_token');
        const storedDriver = localStorage.getItem('driver_data');

        if (token && storedDriver) {
            driver = JSON.parse(storedDriver);
            startLocationTracking();
            loadDashboardData();
        } else if (window.location.pathname.includes('dashboard') ||
                   window.location.pathname.includes('trips') ||
                   window.location.pathname.includes('earnings') ||
                   window.location.pathname.includes('profile')) {
            // Redirect to login if not authenticated
            window.location.href = '/pages/driver/login.html';
        }

        setupEventListeners();
    }

    // ========================================
    // Authentication
    // ========================================
    async function login(email, password) {
        try {
            showLoading();
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                token = data.token;
                driver = data.driver;
                localStorage.setItem('driver_token', token);
                localStorage.setItem('driver_data', JSON.stringify(driver));
                localStorage.setItem('driver_logged_in', 'true');
                window.location.href = '/pages/driver/dashboard.html';
            } else {
                showToast(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Connection error. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }

    async function register(formData) {
        try {
            showLoading();
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Registration successful! Please wait for admin approval.', 'success');
                setTimeout(() => {
                    window.location.href = '/pages/driver/login.html';
                }, 2000);
            } else {
                showToast(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showToast('Connection error. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }

    function logout() {
        localStorage.removeItem('driver_token');
        localStorage.removeItem('driver_data');
        localStorage.removeItem('driver_logged_in');
        stopLocationTracking();
        window.location.href = '/pages/driver/login.html';
    }

    // ========================================
    // API Helpers
    // ========================================
    async function apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: { ...defaultOptions.headers, ...options.headers }
        });

        if (response.status === 401) {
            logout();
            throw new Error('Session expired');
        }

        return response;
    }

    // ========================================
    // Dashboard Data
    // ========================================
    async function loadDashboardData() {
        try {
            const [statsResponse, tripsResponse] = await Promise.all([
                apiRequest('/stats'),
                apiRequest('/trips/available')
            ]);

            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                updateDashboardStats(stats);
            }

            if (tripsResponse.ok) {
                const data = await tripsResponse.json();
                trips = data.trips || [];
                renderTripRequests(trips);
            }

            // Load assigned trips
            const assignedResponse = await apiRequest('/trips?status=driver_assigned');
            if (assignedResponse.ok) {
                const data = await assignedResponse.json();
                renderScheduledTrips(data.trips || []);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Use demo data as fallback
            useDemoData();
        }
    }

    function updateDashboardStats(stats) {
        const elements = {
            'totalEarnings': stats.today?.earnings || 0,
            'completedTrips': stats.today?.trips || 0,
            'statTotalTrips': stats.overall?.completedTrips || 0,
            'statRating': stats.overall?.rating?.toFixed(2) || '5.00'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    }

    function useDemoData() {
        // Use demo data already in HTML
        console.log('Using demo data');
    }

    // ========================================
    // Trip Management
    // ========================================
    function renderTripRequests(trips) {
        const container = document.getElementById('tripRequests');
        if (!container || trips.length === 0) return;

        container.innerHTML = trips.map(trip => createTripCard(trip, true)).join('');
    }

    function renderScheduledTrips(trips) {
        const container = document.querySelector('.section-header + .trip-card')?.parentElement;
        if (!container) return;

        // Keep existing scheduled trips section header
        const scheduledSection = trips.map(trip => createTripCard(trip, false)).join('');
        // Insert after section header
    }

    function createTripCard(trip, isRequest = false) {
        const pickupTime = new Date(trip.pickup?.scheduledTime);
        const isArrival = trip.type === 'arrival';

        return `
            <div class="trip-card ${isRequest ? 'new-request' : ''}" data-id="${trip._id}">
                <div class="trip-card-header">
                    <div class="trip-type">
                        <i class="fas fa-plane-${isArrival ? 'arrival' : 'departure'}"></i>
                        <div class="trip-type-info">
                            <h4>${isArrival ? 'Airport Pickup' : 'Airport Dropoff'}</h4>
                            <span>${formatTimeAgo(pickupTime)}</span>
                        </div>
                    </div>
                    <div class="trip-fare">
                        <div class="amount">ETB ${trip.pricing?.totalETB || (trip.pricing?.totalUSD * 154)}</div>
                        <div class="distance">${trip.dropoff?.zone || 2} zone</div>
                    </div>
                </div>
                <div class="trip-route">
                    <div class="route-point">
                        <div class="route-dot pickup"></div>
                        <div class="route-info">
                            <h5>${trip.pickup?.location || 'Bole International Airport'}</h5>
                            <p>${trip.pickup?.address || ''}</p>
                        </div>
                    </div>
                    <div class="route-point">
                        <div class="route-dot dropoff"></div>
                        <div class="route-info">
                            <h5>${trip.dropoff?.location || 'Destination'}</h5>
                            <p>${trip.dropoff?.address || ''}</p>
                        </div>
                    </div>
                </div>
                <div class="trip-meta">
                    <div class="meta-item">
                        <i class="fas fa-user"></i>
                        <span>${trip.contact?.name || 'Passenger'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-suitcase"></i>
                        <span>${trip.luggage || 0} bags</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${formatDateTime(pickupTime)}</span>
                    </div>
                </div>
                <div class="trip-actions">
                    ${isRequest ? `
                        <button class="btn-trip decline" onclick="driverApp.declineTrip('${trip._id}', this)">
                            <i class="fas fa-times"></i>
                            Decline
                        </button>
                        <button class="btn-trip accept" onclick="driverApp.acceptTrip('${trip._id}', this)">
                            <i class="fas fa-check"></i>
                            Accept
                        </button>
                    ` : `
                        <button class="btn-trip call" onclick="driverApp.callPassenger('${trip.contact?.phone}')">
                            <i class="fas fa-phone"></i>
                            Call
                        </button>
                        <button class="btn-trip navigate" onclick="driverApp.navigate('${trip.pickup?.location}')">
                            <i class="fas fa-navigation"></i>
                            Navigate
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    async function acceptTrip(tripId, btn) {
        try {
            btn.disabled = true;
            const response = await apiRequest(`/trips/${tripId}/accept`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                currentTrip = data.booking;

                // Update UI
                const card = btn.closest('.trip-card');
                card.classList.remove('new-request');
                card.style.borderLeftColor = 'var(--driver-primary)';

                card.querySelector('.trip-actions').innerHTML = `
                    <button class="btn-trip call" onclick="driverApp.callPassenger('${currentTrip.contact?.phone}')">
                        <i class="fas fa-phone"></i>
                        Call
                    </button>
                    <button class="btn-trip navigate" onclick="driverApp.startNavigation()">
                        <i class="fas fa-navigation"></i>
                        Navigate
                    </button>
                `;

                // Show active trip banner
                const banner = document.getElementById('activeTripBanner');
                if (banner) {
                    banner.style.display = 'flex';
                    banner.querySelector('.active-trip-details p').textContent =
                        `Heading to ${currentTrip.pickup?.location}`;
                }

                showToast('Trip accepted! Navigate to pickup location.', 'success');
            } else {
                const data = await response.json();
                showToast(data.error || 'Failed to accept trip', 'error');
            }
        } catch (error) {
            console.error('Accept trip error:', error);
            showToast('Failed to accept trip', 'error');
        } finally {
            btn.disabled = false;
        }
    }

    function declineTrip(tripId, btn) {
        const card = btn.closest('.trip-card');
        card.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => card.remove(), 300);
        showToast('Trip declined');
    }

    async function updateTripStatus(tripId, status, note = '') {
        try {
            const response = await apiRequest(`/trips/${tripId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status, note })
            });

            if (response.ok) {
                const data = await response.json();
                currentTrip = data.booking;
                showToast(`Status updated: ${formatStatus(status)}`, 'success');

                if (status === 'completed') {
                    // Hide active trip banner
                    const banner = document.getElementById('activeTripBanner');
                    if (banner) banner.style.display = 'none';
                    currentTrip = null;
                }

                return true;
            } else {
                const data = await response.json();
                showToast(data.error || 'Failed to update status', 'error');
                return false;
            }
        } catch (error) {
            console.error('Update status error:', error);
            showToast('Failed to update status', 'error');
            return false;
        }
    }

    // ========================================
    // Status Management
    // ========================================
    async function toggleOnlineStatus() {
        const newStatus = driver.onlineStatus === 'online' ? 'offline' : 'online';

        try {
            const response = await apiRequest('/status', {
                method: 'PUT',
                body: JSON.stringify({ onlineStatus: newStatus })
            });

            if (response.ok) {
                driver.onlineStatus = newStatus;
                localStorage.setItem('driver_data', JSON.stringify(driver));
                updateStatusUI(newStatus);

                if (newStatus === 'online') {
                    startLocationTracking();
                } else {
                    stopLocationTracking();
                }
            }
        } catch (error) {
            console.error('Toggle status error:', error);
            showToast('Failed to update status', 'error');
        }
    }

    function updateStatusUI(status) {
        const indicator = document.getElementById('statusIndicator');
        const text = document.getElementById('statusText');

        if (indicator) {
            indicator.classList.remove('online', 'offline', 'busy');
            indicator.classList.add(status);
        }

        if (text) {
            text.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
    }

    // ========================================
    // Location Tracking
    // ========================================
    function startLocationTracking() {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            return;
        }

        // Initial location update
        updateLocation();

        // Periodic updates
        locationWatchId = setInterval(updateLocation, LOCATION_UPDATE_INTERVAL);
    }

    function stopLocationTracking() {
        if (locationWatchId) {
            clearInterval(locationWatchId);
            locationWatchId = null;
        }
    }

    async function updateLocation() {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { longitude, latitude, heading, speed } = position.coords;

                try {
                    await apiRequest('/location', {
                        method: 'PUT',
                        body: JSON.stringify({
                            longitude,
                            latitude,
                            heading: heading || 0,
                            speed: speed || 0
                        })
                    });
                } catch (error) {
                    console.error('Location update error:', error);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
            },
            { enableHighAccuracy: true }
        );
    }

    // ========================================
    // Navigation
    // ========================================
    function navigate(destination) {
        const encodedDest = encodeURIComponent(destination);
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedDest}`, '_blank');
    }

    function startNavigation() {
        if (currentTrip) {
            navigate(currentTrip.pickup?.location || 'Bole International Airport');
        }
    }

    function callPassenger(phone) {
        if (phone) {
            window.location.href = `tel:${phone}`;
        } else {
            showToast('Phone number not available', 'error');
        }
    }

    // ========================================
    // Earnings
    // ========================================
    async function loadEarnings(period = 'today') {
        try {
            const response = await apiRequest(`/earnings?period=${period}`);

            if (response.ok) {
                const data = await response.json();
                updateEarningsUI(data);
            }
        } catch (error) {
            console.error('Load earnings error:', error);
        }
    }

    function updateEarningsUI(data) {
        const elements = {
            'totalEarnings': data.earnings?.total?.toLocaleString() || '0',
            'completedTrips': data.earnings?.trips || '0'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    }

    // ========================================
    // Event Listeners
    // ========================================
    function setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('driverLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                login(email, password);
            });
        }

        // Registration form
        const registerForm = document.getElementById('driverRegisterForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = {
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value,
                    phone: document.getElementById('phone').value,
                    firstName: document.getElementById('firstName').value,
                    lastName: document.getElementById('lastName').value
                };
                register(formData);
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }

        // Earnings period selector
        const earningsPeriod = document.getElementById('earningsPeriod');
        if (earningsPeriod) {
            earningsPeriod.addEventListener('change', (e) => {
                loadEarnings(e.target.value);
            });
        }
    }

    // ========================================
    // Utility Functions
    // ========================================
    function formatTimeAgo(date) {
        const now = new Date();
        const diff = date - now;
        const minutes = Math.abs(Math.floor(diff / 60000));

        if (diff > 0) {
            // Future
            if (minutes < 60) return `In ${minutes} min`;
            if (minutes < 1440) return `In ${Math.floor(minutes / 60)} hours`;
            return `In ${Math.floor(minutes / 1440)} days`;
        } else {
            // Past
            if (minutes < 60) return `${minutes} min ago`;
            if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
            return `${Math.floor(minutes / 1440)} days ago`;
        }
    }

    function formatDateTime(date) {
        return new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatStatus(status) {
        const statusMap = {
            'driver_enroute': 'En Route',
            'driver_arrived': 'Arrived',
            'passenger_picked_up': 'Passenger Picked Up',
            'in_progress': 'In Progress',
            'completed': 'Completed'
        };
        return statusMap[status] || status;
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `driver-toast ${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#1a73e8'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideUp 0.3s ease;
            max-width: 90%;
            text-align: center;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function showLoading() {
        const loader = document.createElement('div');
        loader.id = 'driverLoader';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
    }

    function hideLoading() {
        const loader = document.getElementById('driverLoader');
        if (loader) loader.remove();
    }

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%); }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #1a73e8;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // ========================================
    // Expose Public API
    // ========================================
    window.driverApp = {
        login,
        logout,
        acceptTrip,
        declineTrip,
        updateTripStatus,
        toggleOnlineStatus,
        navigate,
        startNavigation,
        callPassenger,
        loadEarnings
    };

    // ========================================
    // Initialize on Load
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
