// ========================================
// Admin Dashboard JavaScript
// ========================================

(function() {
    'use strict';

    // ========================================
    // Configuration
    // ========================================
    const API_BASE = '/api';
    const DEMO_CREDENTIALS = {
        email: 'admin@shuttleplus.com',
        password: 'admin123'
    };

    // ========================================
    // State
    // ========================================
    let currentPage = 'overview';
    let bookings = [];
    let drivers = [];
    let vehicles = [];
    let customers = [];
    let notifications = [];
    let selectedBooking = null;
    let selectedDriver = null;
    let selectedVehicle = null;
    let charts = {};

    // ========================================
    // DOM Elements
    // ========================================
    const loginScreen = document.getElementById('loginScreen');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.admin-sidebar');
    const navItems = document.querySelectorAll('.nav-item');
    const pageTitle = document.getElementById('pageTitle');
    const pageSections = document.querySelectorAll('.page-section');
    const refreshBtn = document.getElementById('refreshBtn');
    const globalSearch = document.getElementById('globalSearch');

    // ========================================
    // Initialize
    // ========================================
    function init() {
        // Check if already logged in
        if (localStorage.getItem('admin_logged_in')) {
            showDashboard();
        }

        setupEventListeners();
    }

    // ========================================
    // Event Listeners
    // ========================================
    function setupEventListeners() {
        // Login
        loginForm.addEventListener('submit', handleLogin);
        logoutBtn.addEventListener('click', handleLogout);

        // Sidebar
        sidebarToggle.addEventListener('click', toggleSidebar);
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                navigateToPage(page);
            });
        });

        // View all links
        document.querySelectorAll('.view-all').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateToPage(link.dataset.page);
            });
        });

        // Refresh
        refreshBtn.addEventListener('click', refreshData);

        // Global search
        globalSearch.addEventListener('input', debounce(handleSearch, 300));

        // Filters
        document.getElementById('statusFilter')?.addEventListener('change', filterBookings);
        document.getElementById('dateFilter')?.addEventListener('change', filterBookings);

        // Quick actions
        document.getElementById('newBookingBtn')?.addEventListener('click', () => navigateToPage('bookings'));
        document.getElementById('addBookingBtn')?.addEventListener('click', showNewBookingModal);

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeModals);
        });

        // Click outside modal
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModals();
            });
        });
    }

    // ========================================
    // Authentication
    // ========================================
    function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Demo authentication
        if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
            localStorage.setItem('admin_logged_in', 'true');
            localStorage.setItem('admin_email', email);
            showDashboard();
        } else {
            showToast('Invalid credentials. Try demo credentials.', 'error');
        }
    }

    function handleLogout() {
        localStorage.removeItem('admin_logged_in');
        localStorage.removeItem('admin_email');
        dashboard.style.display = 'none';
        loginScreen.style.display = 'flex';
    }

    function showDashboard() {
        loginScreen.style.display = 'none';
        dashboard.style.display = 'flex';
        loadDashboardData();
    }

    // ========================================
    // Navigation
    // ========================================
    function navigateToPage(page) {
        currentPage = page;

        // Update nav
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update title
        const titles = {
            overview: 'Overview',
            bookings: 'Bookings',
            drivers: 'Drivers',
            customers: 'Customers',
            vehicles: 'Vehicles',
            reports: 'Reports',
            settings: 'Settings'
        };
        pageTitle.textContent = titles[page] || page;

        // Show page
        pageSections.forEach(section => {
            section.classList.toggle('active', section.id === `page-${page}`);
        });

        // Load page data
        loadPageData(page);
    }

    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('open');
    }

    // ========================================
    // Data Loading
    // ========================================
    async function loadDashboardData() {
        await Promise.all([
            loadBookings(),
            loadDrivers(),
            loadStats()
        ]);
    }

    function loadPageData(page) {
        switch (page) {
            case 'overview':
                loadStats();
                break;
            case 'bookings':
                renderBookingsTable();
                break;
            case 'drivers':
                renderDriversGrid();
                break;
            case 'customers':
                renderCustomersTable();
                break;
            case 'vehicles':
                renderVehiclesGrid();
                break;
        }
    }

    async function loadBookings() {
        try {
            const response = await fetch(`${API_BASE}/bookings`);
            if (response.ok) {
                const result = await response.json();
                // Handle both array and object with data property
                const fetchedBookings = Array.isArray(result) ? result : (result.data || []);
                // Map API response to expected format
                bookings = fetchedBookings.map(b => ({
                    ...b,
                    customer: b.contact ? { name: b.contact.name, phone: b.contact.phone, email: b.contact.email } : b.customer
                }));
                if (bookings.length === 0) {
                    bookings = generateDemoBookings();
                }
            } else {
                bookings = generateDemoBookings();
            }
            updatePendingBadge();
            renderRecentBookings();
            renderScheduleTimeline();
        } catch (error) {
            console.error('Failed to load bookings:', error);
            bookings = generateDemoBookings();
            updatePendingBadge();
            renderRecentBookings();
        }
    }

    async function loadDrivers() {
        // Demo drivers data
        drivers = generateDemoDrivers();
        renderDriversGrid();
    }

    async function loadStats() {
        try {
            // Try to fetch real stats from analytics API
            const response = await fetch(`${API_BASE}/analytics/quick-stats`);
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('statTodayBookings').textContent = stats.todayBookings || 0;
                document.getElementById('statTodayRevenue').textContent = '$' + (stats.todayRevenue || 0);
                document.getElementById('statPending').textContent = stats.pendingBookings || 0;
                document.getElementById('statActiveDrivers').textContent = stats.activeDrivers || drivers.filter(d => d.status === 'available' || d.status === 'on_trip').length;
                return;
            }
        } catch (error) {
            console.log('Analytics API not available, using local calculations');
        }

        // Fallback to local calculations
        const today = new Date().toDateString();
        const todayBookings = bookings.filter(b =>
            new Date(b.createdAt).toDateString() === today
        );

        document.getElementById('statTodayBookings').textContent = todayBookings.length || Math.floor(Math.random() * 15) + 5;
        document.getElementById('statTodayRevenue').textContent = '$' + (todayBookings.reduce((sum, b) => sum + (b.pricing?.totalUSD || 0), 0) || Math.floor(Math.random() * 500) + 200);
        document.getElementById('statPending').textContent = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length || Math.floor(Math.random() * 8) + 2;
        document.getElementById('statActiveDrivers').textContent = drivers.filter(d => d.status === 'available' || d.status === 'on_trip').length || Math.floor(Math.random() * 6) + 3;
    }

    function refreshData() {
        refreshBtn.querySelector('i').classList.add('fa-spin');
        loadDashboardData().then(() => {
            setTimeout(() => {
                refreshBtn.querySelector('i').classList.remove('fa-spin');
                showToast('Data refreshed', 'success');
            }, 500);
        });
    }

    // ========================================
    // Render Functions
    // ========================================
    function renderRecentBookings() {
        const tbody = document.getElementById('recentBookingsTable');
        const recent = bookings.slice(0, 5);

        if (recent.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="loading-cell">No bookings found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = recent.map(booking => `
            <tr>
                <td><strong>${booking.bookingReference}</strong></td>
                <td>${booking.customer?.name || 'Guest'}</td>
                <td>${formatTime(booking.pickup?.scheduledTime)}</td>
                <td><span class="status-badge ${booking.status}">${formatStatus(booking.status)}</span></td>
            </tr>
        `).join('');
    }

    function renderScheduleTimeline() {
        const timeline = document.getElementById('scheduleTimeline');
        const today = new Date().toDateString();
        const todayTrips = bookings.filter(b => {
            const pickupDate = new Date(b.pickup?.scheduledTime).toDateString();
            return pickupDate === today && b.status !== 'cancelled' && b.status !== 'completed';
        }).sort((a, b) => new Date(a.pickup?.scheduledTime) - new Date(b.pickup?.scheduledTime));

        if (todayTrips.length === 0) {
            timeline.innerHTML = `
                <div class="timeline-empty">
                    <i class="fas fa-calendar-day"></i>
                    <p>No scheduled trips for today</p>
                </div>
            `;
            return;
        }

        timeline.innerHTML = todayTrips.map(trip => `
            <div class="timeline-item">
                <div class="timeline-time">${formatTime(trip.pickup?.scheduledTime)}</div>
                <div class="timeline-content">
                    <div class="timeline-title">${trip.bookingReference}</div>
                    <div class="timeline-subtitle">${trip.dropoff?.location || 'Unknown destination'}</div>
                </div>
            </div>
        `).join('');
    }

    function renderBookingsTable() {
        const tbody = document.getElementById('bookingsTableBody');

        if (bookings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="loading-cell">No bookings found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = bookings.map(booking => `
            <tr data-id="${booking._id || booking.bookingReference}">
                <td><strong>${booking.bookingReference}</strong></td>
                <td>${booking.customer?.name || 'Guest'}</td>
                <td>${booking.type === 'arrival' ? '<i class="fas fa-plane-arrival"></i>' : '<i class="fas fa-plane-departure"></i>'} ${booking.type || 'arrival'}</td>
                <td>${formatDateTime(booking.pickup?.scheduledTime)}</td>
                <td>${truncate(booking.dropoff?.location || '-', 20)}</td>
                <td>${booking.vehicleClass || 'standard'}</td>
                <td>${booking.driver?.name || '<em>Unassigned</em>'}</td>
                <td>$${booking.pricing?.totalUSD || 0}</td>
                <td><span class="status-badge ${booking.status}">${formatStatus(booking.status)}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-action" onclick="viewBooking('${booking.bookingReference}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action" onclick="assignDriver('${booking.bookingReference}')" title="Assign Driver">
                            <i class="fas fa-user-plus"></i>
                        </button>
                        <button class="btn-action danger" onclick="cancelBooking('${booking.bookingReference}')" title="Cancel">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderDriversGrid() {
        const grid = document.getElementById('driversGrid');

        if (!grid) return;

        if (drivers.length === 0) {
            grid.innerHTML = '<p class="loading-cell">No drivers found</p>';
            return;
        }

        grid.innerHTML = drivers.map(driver => `
            <div class="driver-card">
                <div class="driver-card-header">
                    <div class="driver-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="driver-info">
                        <h4>${driver.name}</h4>
                        <p>${driver.vehicle} • ${driver.plate}</p>
                    </div>
                    <span class="status-badge ${driver.status}">${formatStatus(driver.status)}</span>
                </div>
                <div class="driver-stats">
                    <div class="driver-stat">
                        <span class="driver-stat-value">${driver.trips}</span>
                        <span class="driver-stat-label">Trips</span>
                    </div>
                    <div class="driver-stat">
                        <span class="driver-stat-value">${driver.rating}</span>
                        <span class="driver-stat-label">Rating</span>
                    </div>
                    <div class="driver-stat">
                        <span class="driver-stat-value">$${driver.earnings}</span>
                        <span class="driver-stat-label">Today</span>
                    </div>
                </div>
                <div class="driver-actions">
                    <button class="btn-secondary" onclick="viewDriver('${driver.id}')">View</button>
                    <button class="btn-secondary" onclick="callDriver('${driver.phone}')">
                        <i class="fas fa-phone"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    function renderCustomersTable() {
        const tbody = document.getElementById('customersTableBody');

        // Generate demo customers
        customers = generateDemoCustomers();

        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td><strong>${customer.name}</strong></td>
                <td>${customer.phone}</td>
                <td>${customer.email || '-'}</td>
                <td>${customer.totalTrips}</td>
                <td>$${customer.totalSpent}</td>
                <td>${formatDate(customer.lastTrip)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-action" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action" title="Message">
                            <i class="fas fa-envelope"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderVehiclesGrid() {
        const grid = document.getElementById('vehiclesGrid');

        if (!grid) return;

        const vehicles = [
            { type: 'standard', name: 'Toyota Corolla', plate: '3-AA-12345', driver: 'Abebe Kebede', status: 'available' },
            { type: 'standard', name: 'Hyundai Accent', plate: '3-AA-23456', driver: 'Dawit Mengistu', status: 'on_trip' },
            { type: 'executive', name: 'Toyota Camry', plate: '3-AA-34567', driver: 'Tekle Hailu', status: 'available' },
            { type: 'suv', name: 'Toyota Land Cruiser', plate: '3-AA-45678', driver: 'Solomon Tadesse', status: 'available' },
            { type: 'luxury', name: 'Mercedes E-Class', plate: '3-AA-56789', driver: 'Yohannes Girma', status: 'offline' }
        ];

        grid.innerHTML = vehicles.map(vehicle => `
            <div class="vehicle-card">
                <div class="vehicle-image">
                    <i class="fas fa-car"></i>
                </div>
                <div class="vehicle-details">
                    <h4>${vehicle.name}</h4>
                    <span class="vehicle-plate">${vehicle.plate}</span>
                    <p><i class="fas fa-user"></i> ${vehicle.driver}</p>
                    <span class="status-badge ${vehicle.status}">${formatStatus(vehicle.status)}</span>
                </div>
            </div>
        `).join('');
    }

    // ========================================
    // Booking Actions
    // ========================================
    window.viewBooking = function(ref) {
        const booking = bookings.find(b => b.bookingReference === ref);
        if (!booking) return;

        selectedBooking = booking;
        const modal = document.getElementById('bookingModal');
        const content = document.getElementById('bookingModalContent');

        content.innerHTML = `
            <div class="booking-detail-grid">
                <div class="detail-section">
                    <h4>Booking Information</h4>
                    <div class="detail-row">
                        <span class="label">Reference:</span>
                        <span class="value">${booking.bookingReference}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Status:</span>
                        <span class="value"><span class="status-badge ${booking.status}">${formatStatus(booking.status)}</span></span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Type:</span>
                        <span class="value">${booking.type === 'arrival' ? 'Airport Arrival' : 'Airport Departure'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Vehicle:</span>
                        <span class="value">${booking.vehicleClass || 'Standard'}</span>
                    </div>
                </div>
                <div class="detail-section">
                    <h4>Customer</h4>
                    <div class="detail-row">
                        <span class="label">Name:</span>
                        <span class="value">${booking.customer?.name || 'Guest'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Phone:</span>
                        <span class="value">${booking.customer?.phone || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Email:</span>
                        <span class="value">${booking.customer?.email || '-'}</span>
                    </div>
                </div>
                <div class="detail-section">
                    <h4>Trip Details</h4>
                    <div class="detail-row">
                        <span class="label">Flight:</span>
                        <span class="value">${booking.flight?.number || '-'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Pickup:</span>
                        <span class="value">${formatDateTime(booking.pickup?.scheduledTime)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Destination:</span>
                        <span class="value">${booking.dropoff?.location || '-'}</span>
                    </div>
                </div>
                <div class="detail-section">
                    <h4>Payment</h4>
                    <div class="detail-row">
                        <span class="label">Amount (USD):</span>
                        <span class="value">$${booking.pricing?.totalUSD || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Amount (ETB):</span>
                        <span class="value">${booking.pricing?.totalETB || 0} ETB</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Method:</span>
                        <span class="value">${booking.payment?.method || 'Pending'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Status:</span>
                        <span class="value">${booking.payment?.status || 'Unpaid'}</span>
                    </div>
                </div>
            </div>
            <div class="detail-section" style="grid-column: 1 / -1; margin-top: 1rem;">
                <h4>Update Status</h4>
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                    <select id="updateStatusSelect" class="form-control" style="flex: 1; min-width: 200px;">
                        <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="driver_assigned" ${booking.status === 'driver_assigned' ? 'selected' : ''}>Driver Assigned</option>
                        <option value="driver_enroute" ${booking.status === 'driver_enroute' ? 'selected' : ''}>Driver En Route</option>
                        <option value="driver_arrived" ${booking.status === 'driver_arrived' ? 'selected' : ''}>Driver Arrived</option>
                        <option value="passenger_picked_up" ${booking.status === 'passenger_picked_up' ? 'selected' : ''}>Passenger Picked Up</option>
                        <option value="in_progress" ${booking.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        <option value="no_show" ${booking.status === 'no_show' ? 'selected' : ''}>No Show</option>
                    </select>
                    <button class="btn-primary" onclick="updateBookingStatus('${booking.bookingReference}')">
                        <i class="fas fa-save"></i> Update Status
                    </button>
                </div>
            </div>
            <style>
                .booking-detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
                .detail-section h4 { margin: 0 0 1rem 0; font-size: 0.9rem; color: var(--admin-primary); border-bottom: 1px solid var(--admin-border); padding-bottom: 0.5rem; }
                .detail-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; }
                .detail-row .label { color: var(--admin-text-muted); }
                .detail-row .value { font-weight: 500; }
            </style>
        `;

        modal.classList.add('show');
    };

    window.assignDriver = function(ref) {
        const booking = bookings.find(b => b.bookingReference === ref);
        if (!booking) return;

        selectedBooking = booking;
        const modal = document.getElementById('assignDriverModal');
        const driversList = document.getElementById('availableDriversList');
        document.getElementById('assignBookingRef').textContent = ref;

        const availableDrivers = drivers.filter(d => d.status === 'available');

        if (availableDrivers.length === 0) {
            driversList.innerHTML = '<p>No available drivers</p>';
        } else {
            driversList.innerHTML = availableDrivers.map(driver => `
                <div class="driver-select-item" data-id="${driver.id}" onclick="selectDriver(this, '${driver.id}')">
                    <div class="driver-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="driver-info">
                        <h4>${driver.name}</h4>
                        <p>${driver.vehicle} • ${driver.plate}</p>
                    </div>
                </div>
            `).join('');
        }

        modal.classList.add('show');
    };

    window.selectDriver = function(element, driverId) {
        document.querySelectorAll('.driver-select-item').forEach(item => {
            item.classList.remove('selected');
        });
        element.classList.add('selected');
        selectedDriver = drivers.find(d => d.id === driverId);
    };

    document.getElementById('confirmAssignDriver')?.addEventListener('click', async () => {
        if (!selectedDriver || !selectedBooking) {
            showToast('Please select a driver', 'error');
            return;
        }

        const driverData = {
            name: selectedDriver.name,
            phone: selectedDriver.phone,
            vehiclePlate: selectedDriver.plate,
            vehicleModel: selectedDriver.vehicle
        };

        try {
            // Try to update via API
            const response = await fetch(`${API_BASE}/bookings/${selectedBooking._id || selectedBooking.bookingReference}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'driver_assigned',
                    driver: driverData
                })
            });

            if (response.ok) {
                // Update local state
                const bookingIndex = bookings.findIndex(b => b.bookingReference === selectedBooking.bookingReference);
                if (bookingIndex !== -1) {
                    bookings[bookingIndex].driver = driverData;
                    bookings[bookingIndex].status = 'driver_assigned';
                }
                closeModals();
                renderBookingsTable();
                renderRecentBookings();
                showToast(`Driver ${selectedDriver.name} assigned to ${selectedBooking.bookingReference}`, 'success');
            } else {
                // Fallback to local-only update
                const bookingIndex = bookings.findIndex(b => b.bookingReference === selectedBooking.bookingReference);
                if (bookingIndex !== -1) {
                    bookings[bookingIndex].driver = driverData;
                    bookings[bookingIndex].status = 'driver_assigned';
                }
                closeModals();
                renderBookingsTable();
                renderRecentBookings();
                showToast(`Driver ${selectedDriver.name} assigned (offline)`, 'success');
            }
        } catch (error) {
            console.error('Error assigning driver:', error);
            // Fallback to local-only update
            const bookingIndex = bookings.findIndex(b => b.bookingReference === selectedBooking.bookingReference);
            if (bookingIndex !== -1) {
                bookings[bookingIndex].driver = driverData;
                bookings[bookingIndex].status = 'driver_assigned';
            }
            closeModals();
            renderBookingsTable();
            renderRecentBookings();
            showToast(`Driver ${selectedDriver.name} assigned (offline)`, 'success');
        }

        selectedDriver = null;
        selectedBooking = null;
    });

    window.cancelBooking = async function(ref) {
        if (!confirm(`Cancel booking ${ref}?`)) return;

        try {
            // Find the booking to get its ID
            const booking = bookings.find(b => b.bookingReference === ref);
            if (!booking) {
                showToast('Booking not found', 'error');
                return;
            }

            // Try to update via API
            const response = await fetch(`${API_BASE}/bookings/${booking._id || ref}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled' })
            });

            if (response.ok) {
                // Update local state
                const bookingIndex = bookings.findIndex(b => b.bookingReference === ref);
                if (bookingIndex !== -1) {
                    bookings[bookingIndex].status = 'cancelled';
                }
                renderBookingsTable();
                renderRecentBookings();
                updatePendingBadge();
                showToast(`Booking ${ref} cancelled`, 'success');
            } else {
                // Fallback to local-only update
                const bookingIndex = bookings.findIndex(b => b.bookingReference === ref);
                if (bookingIndex !== -1) {
                    bookings[bookingIndex].status = 'cancelled';
                    renderBookingsTable();
                    renderRecentBookings();
                    updatePendingBadge();
                    showToast(`Booking ${ref} cancelled (offline)`, 'success');
                }
            }
        } catch (error) {
            console.error('Error cancelling booking:', error);
            // Fallback to local-only update
            const bookingIndex = bookings.findIndex(b => b.bookingReference === ref);
            if (bookingIndex !== -1) {
                bookings[bookingIndex].status = 'cancelled';
                renderBookingsTable();
                renderRecentBookings();
                updatePendingBadge();
                showToast(`Booking ${ref} cancelled (offline)`, 'success');
            }
        }
    };

    window.updateBookingStatus = async function(ref) {
        const newStatus = document.getElementById('updateStatusSelect')?.value;
        if (!newStatus) {
            showToast('Please select a status', 'error');
            return;
        }

        const booking = bookings.find(b => b.bookingReference === ref);
        if (!booking) {
            showToast('Booking not found', 'error');
            return;
        }

        if (booking.status === newStatus) {
            showToast('Status unchanged', 'info');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/bookings/${booking._id || ref}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                const bookingIndex = bookings.findIndex(b => b.bookingReference === ref);
                if (bookingIndex !== -1) {
                    bookings[bookingIndex].status = newStatus;
                }
                closeModals();
                renderBookingsTable();
                renderRecentBookings();
                updatePendingBadge();
                showToast(`Booking ${ref} updated to ${formatStatus(newStatus)}`, 'success');
            } else {
                const bookingIndex = bookings.findIndex(b => b.bookingReference === ref);
                if (bookingIndex !== -1) {
                    bookings[bookingIndex].status = newStatus;
                }
                closeModals();
                renderBookingsTable();
                renderRecentBookings();
                updatePendingBadge();
                showToast(`Booking ${ref} updated (offline)`, 'success');
            }
        } catch (error) {
            console.error('Error updating booking:', error);
            const bookingIndex = bookings.findIndex(b => b.bookingReference === ref);
            if (bookingIndex !== -1) {
                bookings[bookingIndex].status = newStatus;
            }
            closeModals();
            renderBookingsTable();
            renderRecentBookings();
            updatePendingBadge();
            showToast(`Booking ${ref} updated (offline)`, 'success');
        }
    };

    window.viewDriver = function(id) {
        showToast('Driver details modal - coming soon', 'info');
    };

    window.callDriver = function(phone) {
        window.location.href = `tel:${phone}`;
    };

    // ========================================
    // Filters
    // ========================================
    function filterBookings() {
        const statusFilter = document.getElementById('statusFilter')?.value;
        const dateFilter = document.getElementById('dateFilter')?.value;

        let filtered = [...bookings];

        if (statusFilter) {
            filtered = filtered.filter(b => b.status === statusFilter);
        }

        if (dateFilter === 'today') {
            const today = new Date().toDateString();
            filtered = filtered.filter(b => new Date(b.pickup?.scheduledTime).toDateString() === today);
        } else if (dateFilter === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            filtered = filtered.filter(b => new Date(b.pickup?.scheduledTime).toDateString() === tomorrow.toDateString());
        }

        // Re-render with filtered data
        const originalBookings = bookings;
        bookings = filtered;
        renderBookingsTable();
        bookings = originalBookings;
    }

    function handleSearch(e) {
        const query = e.target.value.toLowerCase();

        if (!query) {
            renderBookingsTable();
            return;
        }

        const filtered = bookings.filter(b =>
            b.bookingReference?.toLowerCase().includes(query) ||
            b.customer?.name?.toLowerCase().includes(query) ||
            b.customer?.phone?.includes(query)
        );

        const originalBookings = bookings;
        bookings = filtered;
        renderBookingsTable();
        bookings = originalBookings;
    }

    // ========================================
    // Modals
    // ========================================
    function closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    function showNewBookingModal() {
        showToast('New booking modal - redirecting to booking page', 'info');
        window.open('/pages/booking.html', '_blank');
    }

    // ========================================
    // Demo Data Generators
    // ========================================
    function generateDemoBookings() {
        const statuses = ['pending', 'confirmed', 'driver_assigned', 'in_progress', 'completed'];
        const destinations = [
            'Sheraton Addis', 'Hilton Hotel', 'Skylight Hotel', 'Radisson Blu',
            'Bole Atlas', 'Kazanchis', 'Piassa', 'Meskel Square', 'Mexico Area'
        ];
        const names = [
            'John Smith', 'Sarah Johnson', 'Mohammed Ali', 'Elena Petrova',
            'David Chen', 'Maria Garcia', 'James Brown', 'Anna Mueller'
        ];

        return Array.from({ length: 15 }, (_, i) => {
            const pickupTime = new Date();
            pickupTime.setHours(pickupTime.getHours() + Math.floor(Math.random() * 48) - 12);

            return {
                _id: `booking_${i}`,
                bookingReference: `SP-2025-${String(Math.floor(Math.random() * 900000) + 100000).slice(0, 6)}`,
                customer: {
                    name: names[Math.floor(Math.random() * names.length)],
                    phone: `+251 9${Math.floor(Math.random() * 90000000) + 10000000}`,
                    email: `customer${i}@email.com`
                },
                type: Math.random() > 0.5 ? 'arrival' : 'departure',
                flight: {
                    number: `ET${Math.floor(Math.random() * 900) + 100}`,
                    scheduledArrival: pickupTime.toISOString()
                },
                pickup: {
                    location: 'Bole International Airport',
                    scheduledTime: pickupTime.toISOString()
                },
                dropoff: {
                    location: destinations[Math.floor(Math.random() * destinations.length)]
                },
                vehicleClass: ['standard', 'executive', 'suv', 'luxury'][Math.floor(Math.random() * 4)],
                passengers: Math.floor(Math.random() * 4) + 1,
                pricing: {
                    totalUSD: Math.floor(Math.random() * 50) + 25,
                    totalETB: Math.floor(Math.random() * 7000) + 3500
                },
                status: statuses[Math.floor(Math.random() * statuses.length)],
                payment: {
                    method: ['stripe', 'telebirr', 'cash'][Math.floor(Math.random() * 3)],
                    status: Math.random() > 0.3 ? 'paid' : 'pending'
                },
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString()
            };
        });
    }

    function generateDemoDrivers() {
        const driverNames = [
            'Abebe Kebede', 'Dawit Mengistu', 'Tekle Hailu', 'Solomon Tadesse',
            'Yohannes Girma', 'Samuel Bekele', 'Daniel Alemu', 'Michael Tesfaye'
        ];
        const vehicles = [
            { name: 'Toyota Corolla', type: 'standard' },
            { name: 'Hyundai Accent', type: 'standard' },
            { name: 'Toyota Camry', type: 'executive' },
            { name: 'Toyota Land Cruiser', type: 'suv' },
            { name: 'Mercedes E-Class', type: 'luxury' }
        ];
        const statuses = ['available', 'available', 'available', 'on_trip', 'offline'];

        return driverNames.map((name, i) => {
            const vehicle = vehicles[i % vehicles.length];
            return {
                id: `driver_${i}`,
                name,
                phone: `+251 9${Math.floor(Math.random() * 90000000) + 10000000}`,
                vehicle: vehicle.name,
                vehicleType: vehicle.type,
                plate: `3-AA-${String(Math.floor(Math.random() * 90000) + 10000)}`,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                trips: Math.floor(Math.random() * 500) + 50,
                rating: (Math.random() * 1 + 4).toFixed(1),
                earnings: Math.floor(Math.random() * 200) + 50
            };
        });
    }

    function generateDemoCustomers() {
        const names = [
            'John Smith', 'Sarah Johnson', 'Mohammed Ali', 'Elena Petrova',
            'David Chen', 'Maria Garcia', 'James Brown', 'Anna Mueller',
            'Robert Wilson', 'Lisa Anderson'
        ];

        return names.map((name, i) => ({
            id: `customer_${i}`,
            name,
            phone: `+251 9${Math.floor(Math.random() * 90000000) + 10000000}`,
            email: i % 2 === 0 ? `${name.toLowerCase().replace(' ', '.')}@email.com` : null,
            totalTrips: Math.floor(Math.random() * 20) + 1,
            totalSpent: Math.floor(Math.random() * 1000) + 100,
            lastTrip: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString()
        }));
    }

    // ========================================
    // Utility Functions
    // ========================================
    function updatePendingBadge() {
        const pending = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length;
        document.getElementById('pendingBadge').textContent = pending;
    }

    function formatStatus(status) {
        const statusMap = {
            pending: 'Pending',
            confirmed: 'Confirmed',
            driver_assigned: 'Driver Assigned',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled',
            available: 'Available',
            on_trip: 'On Trip',
            offline: 'Offline'
        };
        return statusMap[status] || status;
    }

    function formatTime(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    function formatDateTime(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    function truncate(str, length) {
        if (!str) return '-';
        return str.length > length ? str.substring(0, length) + '...' : str;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // ========================================
    // Driver Management
    // ========================================
    window.showAddDriverModal = function() {
        document.getElementById('driverModalTitle').textContent = 'Add New Driver';
        document.getElementById('driverForm').reset();
        document.getElementById('driverId').value = '';
        document.getElementById('driverModal').classList.add('show');
    };

    window.showEditDriverModal = function(driverId) {
        const driver = drivers.find(d => d.id === driverId);
        if (!driver) return;

        document.getElementById('driverModalTitle').textContent = 'Edit Driver';
        document.getElementById('driverId').value = driver.id;
        document.getElementById('driverName').value = driver.name;
        document.getElementById('driverPhone').value = driver.phone;
        document.getElementById('driverEmail').value = driver.email || '';
        document.getElementById('driverLicense').value = driver.license || 'DL-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        document.getElementById('driverStatus').value = driver.status;
        document.getElementById('driverModal').classList.add('show');
    };

    window.viewDriver = function(driverId) {
        const driver = drivers.find(d => d.id === driverId);
        if (!driver) return;

        selectedDriver = driver;
        const content = document.getElementById('viewDriverContent');

        content.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="profile-info">
                    <h3>${driver.name}</h3>
                    <p>${driver.vehicle} • ${driver.plate}</p>
                    <div class="profile-badges">
                        <span class="status-badge ${driver.status}">${formatStatus(driver.status)}</span>
                        <span class="profile-badge verified"><i class="fas fa-check"></i> Verified</span>
                    </div>
                </div>
            </div>
            <div class="profile-stats">
                <div class="profile-stat">
                    <span class="profile-stat-value">${driver.trips}</span>
                    <span class="profile-stat-label">Total Trips</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-value">${driver.rating}</span>
                    <span class="profile-stat-label">Rating</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-value">$${driver.earnings}</span>
                    <span class="profile-stat-label">Today's Earnings</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-value">98%</span>
                    <span class="profile-stat-label">On-Time</span>
                </div>
            </div>
            <div class="profile-details">
                <div class="detail-group">
                    <h4><i class="fas fa-user"></i> Personal Information</h4>
                    <div class="detail-item">
                        <span class="label">Phone</span>
                        <span class="value">${driver.phone}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Email</span>
                        <span class="value">${driver.email || 'Not provided'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">License</span>
                        <span class="value">DL-${Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">License Expiry</span>
                        <span class="value">Dec 2025</span>
                    </div>
                </div>
                <div class="detail-group">
                    <h4><i class="fas fa-car"></i> Vehicle Information</h4>
                    <div class="detail-item">
                        <span class="label">Vehicle</span>
                        <span class="value">${driver.vehicle}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Plate</span>
                        <span class="value">${driver.plate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Type</span>
                        <span class="value">${driver.vehicleType || 'Standard'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Color</span>
                        <span class="value">White</span>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('viewDriverModal').classList.add('show');
    };

    function saveDriver() {
        const driverId = document.getElementById('driverId').value;
        const driverData = {
            id: driverId || 'driver_' + Date.now(),
            name: document.getElementById('driverName').value,
            phone: document.getElementById('driverPhone').value,
            email: document.getElementById('driverEmail').value,
            license: document.getElementById('driverLicense').value,
            status: document.getElementById('driverStatus').value,
            vehicle: document.getElementById('driverVehicle').options[document.getElementById('driverVehicle').selectedIndex]?.text || 'Unassigned',
            plate: document.getElementById('driverPlate').value || 'N/A',
            trips: Math.floor(Math.random() * 500) + 50,
            rating: (Math.random() * 1 + 4).toFixed(1),
            earnings: Math.floor(Math.random() * 200) + 50
        };

        if (driverId) {
            // Update existing
            const index = drivers.findIndex(d => d.id === driverId);
            if (index !== -1) {
                drivers[index] = { ...drivers[index], ...driverData };
            }
            showToast('Driver updated successfully', 'success');
        } else {
            // Add new
            drivers.push(driverData);
            showToast('Driver added successfully', 'success');
            addNotification('driver', 'New Driver Added', `${driverData.name} has been added to the team`);
        }

        closeModals();
        renderDriversGrid();
    }

    // ========================================
    // Vehicle Management
    // ========================================
    window.showAddVehicleModal = function() {
        document.getElementById('vehicleModalTitle').textContent = 'Add New Vehicle';
        document.getElementById('vehicleForm').reset();
        document.getElementById('vehicleId').value = '';
        populateDriverSelect();
        document.getElementById('vehicleModal').classList.add('show');
    };

    window.showEditVehicleModal = function(vehicleId) {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle) return;

        document.getElementById('vehicleModalTitle').textContent = 'Edit Vehicle';
        document.getElementById('vehicleId').value = vehicle.id;
        document.getElementById('vehicleMake').value = vehicle.make || '';
        document.getElementById('vehicleModel').value = vehicle.model || '';
        document.getElementById('vehicleYear').value = vehicle.year || '';
        document.getElementById('vehiclePlate').value = vehicle.plate;
        document.getElementById('vehicleColor').value = vehicle.color || '';
        document.getElementById('vehicleType').value = vehicle.type;
        document.getElementById('vehicleStatus').value = vehicle.status;
        populateDriverSelect();
        document.getElementById('vehicleModal').classList.add('show');
    };

    window.viewVehicle = function(vehicleId) {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle) return;

        selectedVehicle = vehicle;
        const content = document.getElementById('viewVehicleContent');

        content.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar">
                    <i class="fas fa-car"></i>
                </div>
                <div class="profile-info">
                    <h3>${vehicle.name}</h3>
                    <p>${vehicle.plate}</p>
                    <div class="profile-badges">
                        <span class="status-badge ${vehicle.status}">${formatStatus(vehicle.status)}</span>
                        <span class="profile-badge verified"><i class="fas fa-shield-alt"></i> Insured</span>
                    </div>
                </div>
            </div>
            <div class="profile-stats">
                <div class="profile-stat">
                    <span class="profile-stat-value">${Math.floor(Math.random() * 300) + 100}</span>
                    <span class="profile-stat-label">Total Trips</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-value">${Math.floor(Math.random() * 50000) + 20000}</span>
                    <span class="profile-stat-label">KM Driven</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-value">4.${Math.floor(Math.random() * 3) + 7}</span>
                    <span class="profile-stat-label">Avg Rating</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-value">$${Math.floor(Math.random() * 5000) + 2000}</span>
                    <span class="profile-stat-label">Revenue</span>
                </div>
            </div>
            <div class="profile-details">
                <div class="detail-group">
                    <h4><i class="fas fa-car"></i> Vehicle Details</h4>
                    <div class="detail-item">
                        <span class="label">Type</span>
                        <span class="value">${vehicle.type}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Capacity</span>
                        <span class="value">4 Passengers</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Color</span>
                        <span class="value">White</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Year</span>
                        <span class="value">2022</span>
                    </div>
                </div>
                <div class="detail-group">
                    <h4><i class="fas fa-clipboard-check"></i> Maintenance</h4>
                    <div class="detail-item">
                        <span class="label">Last Service</span>
                        <span class="value">Nov 15, 2024</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Next Service</span>
                        <span class="value">Feb 15, 2025</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Insurance Expiry</span>
                        <span class="value">Jun 30, 2025</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Assigned Driver</span>
                        <span class="value">${vehicle.driver}</span>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('viewVehicleModal').classList.add('show');
    };

    function populateDriverSelect() {
        const select = document.getElementById('vehicleDriver');
        select.innerHTML = '<option value="">Unassigned</option>';
        drivers.forEach(driver => {
            select.innerHTML += `<option value="${driver.id}">${driver.name}</option>`;
        });
    }

    function saveVehicle() {
        const vehicleId = document.getElementById('vehicleId').value;
        const driverSelect = document.getElementById('vehicleDriver');
        const selectedDriverId = driverSelect.value;
        const selectedDriverName = selectedDriverId ?
            drivers.find(d => d.id === selectedDriverId)?.name || 'Unassigned' : 'Unassigned';

        const vehicleData = {
            id: vehicleId || 'vehicle_' + Date.now(),
            make: document.getElementById('vehicleMake').value,
            model: document.getElementById('vehicleModel').value,
            name: `${document.getElementById('vehicleMake').value} ${document.getElementById('vehicleModel').value}`,
            year: document.getElementById('vehicleYear').value,
            plate: document.getElementById('vehiclePlate').value,
            color: document.getElementById('vehicleColor').value,
            type: document.getElementById('vehicleType').value,
            status: document.getElementById('vehicleStatus').value,
            driver: selectedDriverName,
            driverId: selectedDriverId
        };

        if (vehicleId) {
            const index = vehicles.findIndex(v => v.id === vehicleId);
            if (index !== -1) {
                vehicles[index] = { ...vehicles[index], ...vehicleData };
            }
            showToast('Vehicle updated successfully', 'success');
        } else {
            vehicles.push(vehicleData);
            showToast('Vehicle added successfully', 'success');
            addNotification('system', 'New Vehicle Added', `${vehicleData.name} (${vehicleData.plate}) has been added to the fleet`);
        }

        closeModals();
        renderVehiclesGrid();
    }

    // ========================================
    // Notification System
    // ========================================
    function initNotifications() {
        // Generate demo notifications
        notifications = [
            {
                id: 'notif_1',
                type: 'booking',
                title: 'New Booking',
                message: 'John Smith booked a transfer from Airport to Sheraton',
                time: new Date(Date.now() - 5 * 60000),
                read: false
            },
            {
                id: 'notif_2',
                type: 'payment',
                title: 'Payment Received',
                message: '$45.00 received for booking SP-2025-482910',
                time: new Date(Date.now() - 15 * 60000),
                read: false
            },
            {
                id: 'notif_3',
                type: 'driver',
                title: 'Driver Online',
                message: 'Abebe Kebede is now available for trips',
                time: new Date(Date.now() - 30 * 60000),
                read: true
            },
            {
                id: 'notif_4',
                type: 'alert',
                title: 'Flight Delayed',
                message: 'ET 505 delayed by 45 minutes - pickup adjusted',
                time: new Date(Date.now() - 45 * 60000),
                read: true
            },
            {
                id: 'notif_5',
                type: 'system',
                title: 'System Update',
                message: 'New features available in the dashboard',
                time: new Date(Date.now() - 60 * 60000),
                read: true
            }
        ];

        renderNotifications();
        updateNotificationBadge();
    }

    function renderNotifications() {
        const list = document.getElementById('notificationList');
        if (!list) return;

        if (notifications.length === 0) {
            list.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications</p>
                </div>
            `;
            return;
        }

        list.innerHTML = notifications.map(notif => `
            <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif.id}" onclick="markNotificationRead('${notif.id}')">
                <div class="notification-icon ${notif.type}">
                    <i class="fas fa-${getNotificationIcon(notif.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-time">${formatTimeAgo(notif.time)}</div>
                </div>
            </div>
        `).join('');
    }

    function getNotificationIcon(type) {
        const icons = {
            booking: 'calendar-check',
            payment: 'dollar-sign',
            driver: 'user',
            alert: 'exclamation-triangle',
            system: 'cog'
        };
        return icons[type] || 'bell';
    }

    function formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    }

    function updateNotificationBadge() {
        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.querySelector('.notification-dot');
        const countEl = document.querySelector('.notification-count');

        if (badge) {
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }

        if (countEl) {
            countEl.textContent = unreadCount;
            countEl.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }

    window.markNotificationRead = function(notifId) {
        const notif = notifications.find(n => n.id === notifId);
        if (notif) {
            notif.read = true;
            renderNotifications();
            updateNotificationBadge();
        }
    };

    window.markAllNotificationsRead = function() {
        notifications.forEach(n => n.read = true);
        renderNotifications();
        updateNotificationBadge();
        showToast('All notifications marked as read', 'success');
    };

    function addNotification(type, title, message) {
        const notif = {
            id: 'notif_' + Date.now(),
            type,
            title,
            message,
            time: new Date(),
            read: false
        };
        notifications.unshift(notif);
        renderNotifications();
        updateNotificationBadge();

        // Show toast for new notification
        showToast(title, 'info', message);
    }

    function toggleNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.toggle('open');
        }
    }

    // ========================================
    // Charts & Reports
    // ========================================
    function initCharts() {
        if (typeof Chart === 'undefined') return;

        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
        if (revenueCtx) {
            charts.revenue = new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Revenue',
                        data: [1200, 1900, 1500, 2100, 2400, 1800, 2200],
                        borderColor: '#597B87',
                        backgroundColor: 'rgba(89, 123, 135, 0.1)',
                        fill: true,
                        tension: 0.4
                    }, {
                        label: 'Profit',
                        data: [800, 1400, 1100, 1600, 1900, 1300, 1700],
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // Bookings Status Chart
        const bookingsCtx = document.getElementById('bookingsChart')?.getContext('2d');
        if (bookingsCtx) {
            charts.bookings = new Chart(bookingsCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'In Progress', 'Pending', 'Cancelled'],
                    datasets: [{
                        data: [65, 15, 12, 8],
                        backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 20 }
                        }
                    }
                }
            });
        }

        // Vehicle Distribution Chart
        const vehicleCtx = document.getElementById('vehicleChart')?.getContext('2d');
        if (vehicleCtx) {
            charts.vehicle = new Chart(vehicleCtx, {
                type: 'pie',
                data: {
                    labels: ['Standard', 'Executive', 'SUV', 'Luxury'],
                    datasets: [{
                        data: [45, 25, 20, 10],
                        backgroundColor: ['#597B87', '#183251', '#f59e0b', '#8b5cf6'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 20 }
                        }
                    }
                }
            });
        }

        // Peak Hours Chart
        const peakCtx = document.getElementById('peakHoursChart')?.getContext('2d');
        if (peakCtx) {
            charts.peak = new Chart(peakCtx, {
                type: 'bar',
                data: {
                    labels: ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM'],
                    datasets: [{
                        label: 'Bookings',
                        data: [8, 25, 15, 12, 10, 18, 30, 22, 12],
                        backgroundColor: 'rgba(89, 123, 135, 0.8)',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // Populate top destinations
        renderTopDestinations();
        renderTopDrivers();
        updateReportSummary();
    }

    function renderTopDestinations() {
        const container = document.getElementById('topDestinations');
        if (!container) return;

        const destinations = [
            { name: 'Sheraton Addis', trips: 145, percentage: 100 },
            { name: 'Radisson Blu', trips: 98, percentage: 68 },
            { name: 'Hilton Hotel', trips: 76, percentage: 52 },
            { name: 'African Union HQ', trips: 54, percentage: 37 },
            { name: 'Bole Atlas', trips: 42, percentage: 29 }
        ];

        container.innerHTML = destinations.map((dest, i) => `
            <div class="top-item">
                <span class="top-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
                <div class="top-info">
                    <div class="top-name">${dest.name}</div>
                </div>
                <div class="top-bar">
                    <div class="top-bar-fill" style="width: ${dest.percentage}%"></div>
                </div>
                <span class="top-value">${dest.trips}</span>
            </div>
        `).join('');
    }

    function renderTopDrivers() {
        const container = document.getElementById('topDrivers');
        if (!container) return;

        const topDrivers = [
            { name: 'Abebe Kebede', trips: 89, rating: 4.9 },
            { name: 'Dawit Mengistu', trips: 76, rating: 4.8 },
            { name: 'Tekle Hailu', trips: 65, rating: 4.9 },
            { name: 'Solomon Tadesse', trips: 58, rating: 4.7 },
            { name: 'Yohannes Girma', trips: 52, rating: 4.8 }
        ];

        container.innerHTML = topDrivers.map((driver, i) => `
            <div class="top-item">
                <span class="top-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
                <div class="top-info">
                    <div class="top-name">${driver.name}</div>
                    <div class="top-subtitle"><i class="fas fa-star" style="color: #f59e0b"></i> ${driver.rating}</div>
                </div>
                <span class="top-value">${driver.trips} trips</span>
            </div>
        `).join('');
    }

    function updateReportSummary() {
        document.getElementById('reportTotalRevenue').textContent = '$12,450';
        document.getElementById('reportTotalBookings').textContent = '248';
        document.getElementById('reportCompletedTrips').textContent = '215';
        document.getElementById('reportAvgRating').textContent = '4.8';
    }

    // ========================================
    // Enhanced Toast System
    // ========================================
    function showToast(title, type = 'info', message = '') {
        const container = document.getElementById('toastContainer') || createToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation' : 'info'}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    // ========================================
    // Event Listeners Setup - Extended
    // ========================================
    function setupExtendedEventListeners() {
        // Add Driver button
        const addDriverBtns = document.querySelectorAll('[onclick*="showAddDriverModal"], .page-section#page-drivers .btn-primary');
        addDriverBtns.forEach(btn => {
            if (!btn.hasAttribute('data-listener')) {
                btn.setAttribute('data-listener', 'true');
                btn.addEventListener('click', showAddDriverModal);
            }
        });

        // Save Driver
        document.getElementById('saveDriverBtn')?.addEventListener('click', saveDriver);

        // Edit driver from view modal
        document.getElementById('editDriverFromViewBtn')?.addEventListener('click', () => {
            closeModals();
            if (selectedDriver) {
                setTimeout(() => showEditDriverModal(selectedDriver.id), 100);
            }
        });

        // Add Vehicle button
        const addVehicleBtns = document.querySelectorAll('.page-section#page-vehicles .btn-primary');
        addVehicleBtns.forEach(btn => {
            if (!btn.hasAttribute('data-listener')) {
                btn.setAttribute('data-listener', 'true');
                btn.addEventListener('click', showAddVehicleModal);
            }
        });

        // Save Vehicle
        document.getElementById('saveVehicleBtn')?.addEventListener('click', saveVehicle);

        // Edit vehicle from view modal
        document.getElementById('editVehicleFromViewBtn')?.addEventListener('click', () => {
            closeModals();
            if (selectedVehicle) {
                setTimeout(() => showEditVehicleModal(selectedVehicle.id), 100);
            }
        });

        // Notification panel toggle
        const notifBtn = document.querySelector('.btn-icon[title="Notifications"]');
        if (notifBtn) {
            notifBtn.addEventListener('click', toggleNotificationPanel);
        }

        // Mark all notifications read
        document.getElementById('markAllReadBtn')?.addEventListener('click', markAllNotificationsRead);

        // Period selector for reports
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                // Could update charts based on period here
                showToast('Report period updated', 'info');
            });
        });

        // Close notification panel when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notificationPanel');
            const notifBtn = document.querySelector('.btn-icon[title="Notifications"]');
            if (panel && panel.classList.contains('open') &&
                !panel.contains(e.target) &&
                !notifBtn?.contains(e.target)) {
                panel.classList.remove('open');
            }
        });
    }

    // ========================================
    // Generate Demo Vehicles
    // ========================================
    function generateDemoVehicles() {
        return [
            { id: 'v1', name: 'Toyota Corolla', make: 'Toyota', model: 'Corolla', plate: '3-AA-12345', type: 'standard', status: 'available', driver: 'Abebe Kebede' },
            { id: 'v2', name: 'Hyundai Accent', make: 'Hyundai', model: 'Accent', plate: '3-AA-23456', type: 'standard', status: 'in_use', driver: 'Dawit Mengistu' },
            { id: 'v3', name: 'Toyota Camry', make: 'Toyota', model: 'Camry', plate: '3-AA-34567', type: 'executive', status: 'available', driver: 'Tekle Hailu' },
            { id: 'v4', name: 'Toyota Land Cruiser', make: 'Toyota', model: 'Land Cruiser', plate: '3-AA-45678', type: 'suv', status: 'available', driver: 'Solomon Tadesse' },
            { id: 'v5', name: 'Mercedes E-Class', make: 'Mercedes', model: 'E-Class', plate: '3-AA-56789', type: 'luxury', status: 'maintenance', driver: 'Yohannes Girma' }
        ];
    }

    // Override renderVehiclesGrid to use new data
    const originalRenderVehiclesGrid = renderVehiclesGrid;
    renderVehiclesGrid = function() {
        const grid = document.getElementById('vehiclesGrid');
        if (!grid) return;

        if (vehicles.length === 0) {
            vehicles = generateDemoVehicles();
        }

        grid.innerHTML = vehicles.map(vehicle => `
            <div class="vehicle-card">
                <div class="vehicle-image">
                    <i class="fas fa-car"></i>
                </div>
                <div class="vehicle-details">
                    <h4>${vehicle.name}</h4>
                    <span class="vehicle-plate">${vehicle.plate}</span>
                    <p><i class="fas fa-user"></i> ${vehicle.driver}</p>
                    <span class="status-badge ${vehicle.status}">${formatStatus(vehicle.status)}</span>
                    <div class="driver-actions" style="margin-top: 0.75rem;">
                        <button class="btn-secondary" onclick="viewVehicle('${vehicle.id}')">View</button>
                        <button class="btn-secondary" onclick="showEditVehicleModal('${vehicle.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    };

    // Override renderDriversGrid to add action buttons
    const originalRenderDriversGrid = renderDriversGrid;
    renderDriversGrid = function() {
        const grid = document.getElementById('driversGrid');
        if (!grid) return;

        if (drivers.length === 0) {
            drivers = generateDemoDrivers();
        }

        grid.innerHTML = drivers.map(driver => `
            <div class="driver-card">
                <div class="driver-card-header">
                    <div class="driver-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="driver-info">
                        <h4>${driver.name}</h4>
                        <p>${driver.vehicle} • ${driver.plate}</p>
                    </div>
                    <span class="status-badge ${driver.status}">${formatStatus(driver.status)}</span>
                </div>
                <div class="driver-stats">
                    <div class="driver-stat">
                        <span class="driver-stat-value">${driver.trips}</span>
                        <span class="driver-stat-label">Trips</span>
                    </div>
                    <div class="driver-stat">
                        <span class="driver-stat-value">${driver.rating}</span>
                        <span class="driver-stat-label">Rating</span>
                    </div>
                    <div class="driver-stat">
                        <span class="driver-stat-value">$${driver.earnings}</span>
                        <span class="driver-stat-label">Today</span>
                    </div>
                </div>
                <div class="driver-actions">
                    <button class="btn-secondary" onclick="viewDriver('${driver.id}')">View</button>
                    <button class="btn-secondary" onclick="showEditDriverModal('${driver.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-secondary" onclick="callDriver('${driver.phone}')">
                        <i class="fas fa-phone"></i>
                    </button>
                </div>
            </div>
        `).join('');
    };

    // ========================================
    // Extended Init
    // ========================================
    const originalInit = init;
    init = function() {
        // Check if already logged in
        if (localStorage.getItem('admin_logged_in')) {
            showDashboard();
        }

        setupEventListeners();
        setupExtendedEventListeners();
        initNotifications();

        // Initialize charts when reports page is shown
        setTimeout(() => {
            if (typeof Chart !== 'undefined') {
                initCharts();
            }
        }, 500);
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
