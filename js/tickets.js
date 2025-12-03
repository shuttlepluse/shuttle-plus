// ========================================
// Tickets Page JavaScript
// ========================================

(function() {
    'use strict';

    // ========================================
    // State
    // ========================================
    let currentTab = 'upcoming';
    let tickets = [];
    let selectedTicket = null;

    // ========================================
    // DOM Elements
    // ========================================
    const elements = {
        ticketsLoading: document.getElementById('ticketsLoading'),
        ticketsEmpty: document.getElementById('ticketsEmpty'),
        ticketsList: document.getElementById('ticketsList'),
        ticketModal: document.getElementById('ticketModal'),
        ticketDetail: document.getElementById('ticketDetail'),
        closeModal: document.getElementById('closeModal'),
        actionSheet: document.getElementById('actionSheet'),
        refreshBtn: document.getElementById('refreshTickets'),
        upcomingCount: document.getElementById('upcomingCount'),
        pastCount: document.getElementById('pastCount'),
        offlineBanner: document.getElementById('offlineBanner'),
        toast: document.getElementById('toast')
    };

    // ========================================
    // Initialize
    // ========================================
    async function init() {
        setupEventListeners();
        setupOnlineStatus();
        await loadTickets();
    }

    // ========================================
    // Event Listeners
    // ========================================
    function setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // Refresh button
        elements.refreshBtn.addEventListener('click', refreshTickets);

        // Modal close
        elements.closeModal.addEventListener('click', closeModal);
        elements.ticketModal.querySelector('.modal-overlay').addEventListener('click', closeModal);

        // Action sheet
        elements.actionSheet.querySelector('.action-sheet-overlay').addEventListener('click', closeActionSheet);
        elements.actionSheet.querySelector('.action-sheet-cancel').addEventListener('click', closeActionSheet);
        elements.actionSheet.querySelectorAll('.action-item').forEach(item => {
            item.addEventListener('click', () => handleAction(item.dataset.action));
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (elements.actionSheet.classList.contains('open')) {
                    closeActionSheet();
                } else if (elements.ticketModal.classList.contains('open')) {
                    closeModal();
                }
            }
        });
    }

    // ========================================
    // Online/Offline Status
    // ========================================
    function setupOnlineStatus() {
        function updateStatus() {
            if (navigator.onLine) {
                document.body.classList.remove('offline');
            } else {
                document.body.classList.add('offline');
            }
        }

        window.addEventListener('online', () => {
            updateStatus();
            showToast('You\'re back online');
            refreshTickets();
        });

        window.addEventListener('offline', () => {
            updateStatus();
            showToast('You\'re offline - viewing cached tickets');
        });

        updateStatus();
    }

    // ========================================
    // Load Tickets
    // ========================================
    async function loadTickets() {
        showLoading(true);

        try {
            // Try to fetch from API first
            if (navigator.onLine && typeof BookingsAPI !== 'undefined') {
                const response = await BookingsAPI.getMyBookings();
                if (response.success) {
                    tickets = response.data;
                    // Cache tickets offline
                    if (typeof BookingStorage !== 'undefined') {
                        for (const ticket of tickets) {
                            await BookingStorage.save(ticket);
                        }
                    }
                }
            } else {
                // Load from offline storage
                if (typeof BookingStorage !== 'undefined') {
                    tickets = await BookingStorage.getAll();
                }
            }
        } catch (error) {
            console.error('[Tickets] Error loading tickets:', error);
            // Fallback to offline storage
            if (typeof BookingStorage !== 'undefined') {
                tickets = await BookingStorage.getAll();
            }
        }

        // If still no tickets, use demo data for development
        if (!tickets || tickets.length === 0) {
            tickets = getDemoTickets();
        }

        updateTabCounts();
        renderTickets();
        showLoading(false);
    }

    // ========================================
    // Refresh Tickets
    // ========================================
    async function refreshTickets() {
        elements.refreshBtn.classList.add('loading');
        await loadTickets();
        elements.refreshBtn.classList.remove('loading');
        showToast('Tickets refreshed');
    }

    // ========================================
    // Switch Tab
    // ========================================
    function switchTab(tab) {
        currentTab = tab;

        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        renderTickets();
    }

    // ========================================
    // Update Tab Counts
    // ========================================
    function updateTabCounts() {
        const now = new Date();
        const upcoming = tickets.filter(t => new Date(t.pickup?.scheduledTime) > now && t.status !== 'cancelled');
        const past = tickets.filter(t => new Date(t.pickup?.scheduledTime) <= now || t.status === 'cancelled' || t.status === 'completed');

        elements.upcomingCount.textContent = upcoming.length;
        elements.pastCount.textContent = past.length;
    }

    // ========================================
    // Render Tickets
    // ========================================
    function renderTickets() {
        const now = new Date();
        let filteredTickets;

        if (currentTab === 'upcoming') {
            filteredTickets = tickets.filter(t =>
                new Date(t.pickup?.scheduledTime) > now &&
                t.status !== 'cancelled' &&
                t.status !== 'completed'
            );
        } else {
            filteredTickets = tickets.filter(t =>
                new Date(t.pickup?.scheduledTime) <= now ||
                t.status === 'cancelled' ||
                t.status === 'completed'
            );
        }

        if (filteredTickets.length === 0) {
            elements.ticketsList.style.display = 'none';
            elements.ticketsEmpty.style.display = 'block';
            elements.ticketsEmpty.querySelector('h2').textContent =
                currentTab === 'upcoming' ? 'No upcoming trips' : 'No past trips';
            elements.ticketsEmpty.querySelector('p').textContent =
                currentTab === 'upcoming'
                    ? 'Book your next airport transfer and it will appear here.'
                    : 'Your completed trips will appear here.';
        } else {
            elements.ticketsEmpty.style.display = 'none';
            elements.ticketsList.style.display = 'flex';
            elements.ticketsList.innerHTML = filteredTickets.map(ticket => renderTicketCard(ticket)).join('');

            // Add click listeners
            elements.ticketsList.querySelectorAll('.ticket-card').forEach(card => {
                card.addEventListener('click', () => openTicketDetail(card.dataset.id));
            });
        }
    }

    // ========================================
    // Render Ticket Card
    // ========================================
    function renderTicketCard(ticket) {
        const pickupTime = new Date(ticket.pickup?.scheduledTime);
        const isPast = pickupTime <= new Date() || ticket.status === 'completed' || ticket.status === 'cancelled';
        const statusLabel = getStatusLabel(ticket.status);

        return `
            <article class="ticket-card ${isPast ? 'past' : ''}" data-id="${ticket._id || ticket.bookingReference}">
                <div class="ticket-header">
                    <div class="ticket-reference">
                        Booking Reference
                        <strong>${ticket.bookingReference || 'SP-2025-XXXXXX'}</strong>
                    </div>
                    <div class="ticket-status ${ticket.status}">
                        <span class="status-dot"></span>
                        ${statusLabel}
                    </div>
                </div>
                <div class="ticket-body">
                    <div class="ticket-route">
                        <div class="route-line">
                            <div class="route-dot"></div>
                            <div class="route-dash"></div>
                            <div class="route-dot end"></div>
                        </div>
                        <div class="route-points">
                            <div class="route-point">
                                <span class="point-label">Pickup</span>
                                <span class="point-value">${ticket.pickup?.location || 'Bole International Airport'}</span>
                            </div>
                            <div class="route-point">
                                <span class="point-label">Drop-off</span>
                                <span class="point-value">${ticket.dropoff?.location || ticket.dropoff?.zone || 'Destination'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="ticket-info">
                        <div class="info-item">
                            <div class="info-label">Date</div>
                            <div class="info-value">${formatDate(pickupTime)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Time</div>
                            <div class="info-value">${formatTime(pickupTime)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Passengers</div>
                            <div class="info-value">${ticket.passengers || 1}</div>
                        </div>
                    </div>
                </div>
                <div class="ticket-footer">
                    <div class="ticket-price">
                        $${ticket.pricing?.totalUSD || 30}
                        <span>(${formatETB(ticket.pricing?.totalETB || 4740)} ETB)</span>
                    </div>
                    <div class="ticket-action">
                        View Details
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </div>
                </div>
            </article>
        `;
    }

    // ========================================
    // Open Ticket Detail
    // ========================================
    function openTicketDetail(ticketId) {
        selectedTicket = tickets.find(t => (t._id || t.bookingReference) === ticketId);
        if (!selectedTicket) return;

        renderTicketDetail();
        elements.ticketModal.classList.add('open');
        document.body.style.overflow = 'hidden';

        // Generate QR code
        setTimeout(() => {
            const qrContainer = document.getElementById('ticketQR');
            if (qrContainer && typeof QRCode !== 'undefined') {
                qrContainer.innerHTML = '';
                QRCode.toCanvas(qrContainer, selectedTicket.bookingReference || 'SP-2025-DEMO', {
                    width: 150,
                    margin: 0,
                    color: {
                        dark: '#183251',
                        light: '#ffffff'
                    }
                });
            }
        }, 100);
    }

    // ========================================
    // Render Ticket Detail
    // ========================================
    function renderTicketDetail() {
        if (!selectedTicket) return;

        const pickupTime = new Date(selectedTicket.pickup?.scheduledTime);
        const statusLabel = getStatusLabel(selectedTicket.status);
        const hasDriver = selectedTicket.driver?.name;

        elements.ticketDetail.innerHTML = `
            <div class="detail-header">
                <div class="detail-logo">Shuttle+</div>
                <div class="detail-reference">${selectedTicket.bookingReference || 'SP-2025-XXXXXX'}</div>
                <div class="detail-status ${selectedTicket.status}">
                    <span class="status-dot"></span>
                    ${statusLabel}
                </div>
            </div>

            <div class="detail-qr">
                <div class="qr-container">
                    <canvas id="ticketQR"></canvas>
                </div>
                <p class="qr-hint">Show this code to your driver</p>
            </div>

            <div class="detail-section">
                <h3 class="section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Trip Details
                </h3>
                <div class="detail-route">
                    <div class="route-line">
                        <div class="route-dot"></div>
                        <div class="route-dash"></div>
                        <div class="route-dot end"></div>
                    </div>
                    <div class="route-points">
                        <div class="route-point">
                            <span class="point-label">Pickup</span>
                            <span class="point-value">${selectedTicket.pickup?.location || 'Bole International Airport'}</span>
                            <span class="point-time">${formatDate(pickupTime)} at ${formatTime(pickupTime)}</span>
                        </div>
                        <div class="route-point">
                            <span class="point-label">Drop-off</span>
                            <span class="point-value">${selectedTicket.dropoff?.location || selectedTicket.dropoff?.zone || 'Destination'}</span>
                        </div>
                    </div>
                </div>
            </div>

            ${selectedTicket.flight?.number ? `
            <div class="detail-section">
                <h3 class="section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 2L11 13"/>
                        <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                    Flight Information
                </h3>
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <div class="info-label">Flight Number</div>
                        <div class="info-value">${selectedTicket.flight.number}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="info-label">Status</div>
                        <div class="info-value">${selectedTicket.flight.status || 'Scheduled'}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="info-label">Scheduled Arrival</div>
                        <div class="info-value">${formatTime(new Date(selectedTicket.flight.scheduledArrival))}</div>
                    </div>
                    ${selectedTicket.flight.actualArrival ? `
                    <div class="detail-info-item">
                        <div class="info-label">Actual Arrival</div>
                        <div class="info-value">${formatTime(new Date(selectedTicket.flight.actualArrival))}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <div class="detail-section">
                <h3 class="section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="1" y="3" width="15" height="13" rx="2" ry="2"/>
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                        <circle cx="5.5" cy="18.5" r="2.5"/>
                        <circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                    Vehicle & Passengers
                </h3>
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <div class="info-label">Vehicle Class</div>
                        <div class="info-value">${getVehicleLabel(selectedTicket.vehicleClass)}</div>
                    </div>
                    <div class="detail-info-item">
                        <div class="info-label">Passengers</div>
                        <div class="info-value">${selectedTicket.passengers || 1}</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3 class="section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Driver
                </h3>
                ${hasDriver ? `
                <div class="driver-card">
                    <div class="driver-avatar">${getInitials(selectedTicket.driver.name)}</div>
                    <div class="driver-info">
                        <div class="driver-name">${selectedTicket.driver.name}</div>
                        <div class="driver-vehicle">${selectedTicket.driver.vehicle || 'Toyota Corolla'}</div>
                        <div class="driver-plate">${selectedTicket.driver.vehiclePlate || '3-AA-12345'}</div>
                    </div>
                    <div class="driver-actions">
                        <button onclick="callDriver('${selectedTicket.driver.phone}')" aria-label="Call driver">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                        </button>
                        <button onclick="messageDriver('${selectedTicket.driver.phone}')" aria-label="Message driver">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                ` : `
                <div class="no-driver">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <p>Driver will be assigned soon</p>
                </div>
                `}
            </div>

            <div class="detail-section">
                <h3 class="section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    Payment
                </h3>
                <div class="payment-summary">
                    <div class="payment-row">
                        <span>Base Fare</span>
                        <span>$${selectedTicket.pricing?.baseFare || 30}</span>
                    </div>
                    ${selectedTicket.pricing?.lateNightSurcharge ? `
                    <div class="payment-row">
                        <span>Late Night Surcharge</span>
                        <span>$${selectedTicket.pricing.lateNightSurcharge}</span>
                    </div>
                    ` : ''}
                    ${selectedTicket.pricing?.additionalStops ? `
                    <div class="payment-row">
                        <span>Additional Stops</span>
                        <span>$${selectedTicket.pricing.additionalStops}</span>
                    </div>
                    ` : ''}
                    <div class="payment-row total">
                        <span>Total</span>
                        <span>$${selectedTicket.pricing?.totalUSD || 30} (${formatETB(selectedTicket.pricing?.totalETB || 4740)} ETB)</span>
                    </div>
                    <div class="payment-method">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                            <line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                        <span>Paid via ${getPaymentMethodLabel(selectedTicket.payment?.method)}</span>
                    </div>
                </div>
            </div>

            <div class="detail-actions">
                ${selectedTicket.status === 'driver_assigned' || selectedTicket.status === 'confirmed' ? `
                <a href="tracking.html?id=${selectedTicket._id || selectedTicket.bookingReference}" class="action-btn primary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Track Driver
                </a>
                ` : `
                <button class="action-btn primary" onclick="shareTicket()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"/>
                        <circle cx="6" cy="12" r="3"/>
                        <circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    Share Ticket
                </button>
                `}
                <button class="action-btn secondary" onclick="openActionSheet()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="1"/>
                        <circle cx="19" cy="12" r="1"/>
                        <circle cx="5" cy="12" r="1"/>
                    </svg>
                    More Options
                </button>
            </div>
        `;
    }

    // ========================================
    // Close Modal
    // ========================================
    function closeModal() {
        elements.ticketModal.classList.remove('open');
        document.body.style.overflow = '';
        selectedTicket = null;
    }

    // ========================================
    // Action Sheet
    // ========================================
    window.openActionSheet = function() {
        elements.actionSheet.classList.add('open');
    };

    function closeActionSheet() {
        elements.actionSheet.classList.remove('open');
    }

    function handleAction(action) {
        closeActionSheet();

        switch (action) {
            case 'share':
                shareTicket();
                break;
            case 'download':
                downloadTicket();
                break;
            case 'calendar':
                addToCalendar();
                break;
            case 'contact':
                contactSupport();
                break;
            case 'cancel':
                cancelBooking();
                break;
        }
    }

    // ========================================
    // Ticket Actions
    // ========================================
    window.shareTicket = async function() {
        if (!selectedTicket) return;

        const shareData = {
            title: 'Shuttle Plus Booking',
            text: `My airport transfer booking: ${selectedTicket.bookingReference}`,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                showToast('Ticket shared');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    copyToClipboard(shareData.text);
                }
            }
        } else {
            copyToClipboard(`Shuttle Plus Booking\nReference: ${selectedTicket.bookingReference}\n${window.location.href}`);
        }
    };

    async function downloadTicket() {
        if (!selectedTicket) return;

        const bookingId = selectedTicket._id || selectedTicket.bookingReference;
        showToast('Generating PDF...');

        try {
            // Fetch PDF from API
            const response = await fetch(`/api/bookings/${bookingId}/ticket`);

            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }

            // Get the PDF blob
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ShuttlePlus-Ticket-${selectedTicket.bookingReference}.pdf`;
            document.body.appendChild(a);
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showToast('Ticket downloaded');
        } catch (error) {
            console.error('Download error:', error);
            showToast('Failed to download ticket. Please try again.');
        }
    }

    function addToCalendar() {
        if (!selectedTicket) return;

        const pickupTime = new Date(selectedTicket.pickup?.scheduledTime);
        const endTime = new Date(pickupTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

        const event = {
            title: 'Airport Transfer - Shuttle Plus',
            description: `Booking: ${selectedTicket.bookingReference}\nFrom: ${selectedTicket.pickup?.location}\nTo: ${selectedTicket.dropoff?.location}`,
            start: pickupTime.toISOString(),
            end: endTime.toISOString(),
            location: selectedTicket.pickup?.location
        };

        // Google Calendar URL
        const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&details=${encodeURIComponent(event.description)}&dates=${event.start.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${event.end.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}&location=${encodeURIComponent(event.location)}`;

        window.open(googleUrl, '_blank');
        showToast('Opening calendar');
    }

    function contactSupport() {
        window.location.href = 'tel:+251911234567';
    }

    async function cancelBooking() {
        if (!selectedTicket) return;

        if (confirm('Are you sure you want to cancel this booking?')) {
            try {
                if (navigator.onLine && typeof BookingsAPI !== 'undefined') {
                    await BookingsAPI.cancelBooking(selectedTicket._id || selectedTicket.bookingReference);
                }
                selectedTicket.status = 'cancelled';
                closeModal();
                renderTickets();
                updateTabCounts();
                showToast('Booking cancelled');
            } catch (error) {
                showToast('Failed to cancel booking');
            }
        }
    }

    window.callDriver = function(phone) {
        if (phone) {
            window.location.href = `tel:${phone}`;
        }
    };

    window.messageDriver = function(phone) {
        if (phone) {
            // Try WhatsApp first
            const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
            window.open(whatsappUrl, '_blank');
        }
    };

    // ========================================
    // Helper Functions
    // ========================================
    function showLoading(show) {
        elements.ticketsLoading.style.display = show ? 'flex' : 'none';
        if (show) {
            elements.ticketsList.style.display = 'none';
            elements.ticketsEmpty.style.display = 'none';
        }
    }

    function showToast(message) {
        elements.toast.querySelector('.toast-message').textContent = message;
        elements.toast.classList.add('show');
        setTimeout(() => elements.toast.classList.remove('show'), 3000);
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard');
        }).catch(() => {
            showToast('Failed to copy');
        });
    }

    function formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    }

    function formatTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(date);
    }

    function formatETB(amount) {
        return new Intl.NumberFormat('en-US').format(amount);
    }

    function getStatusLabel(status) {
        const labels = {
            pending: 'Pending',
            confirmed: 'Confirmed',
            driver_assigned: 'Driver Assigned',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled'
        };
        return labels[status] || status;
    }

    function getVehicleLabel(vehicleClass) {
        const labels = {
            standard: 'Standard Sedan',
            executive: 'Executive Sedan',
            suv: 'SUV / Minivan',
            luxury: 'Luxury Class'
        };
        return labels[vehicleClass] || vehicleClass;
    }

    function getPaymentMethodLabel(method) {
        const labels = {
            stripe: 'Card',
            telebirr: 'Telebirr',
            cash: 'Cash'
        };
        return labels[method] || 'Card';
    }

    function getInitials(name) {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    // ========================================
    // Demo Tickets (for development)
    // ========================================
    function getDemoTickets() {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        return [
            {
                _id: 'demo-1',
                bookingReference: 'SP-2025-ABC123',
                status: 'driver_assigned',
                pickup: {
                    location: 'Bole International Airport',
                    scheduledTime: tomorrow.toISOString()
                },
                dropoff: {
                    location: 'Sheraton Addis',
                    zone: 'City Center'
                },
                flight: {
                    number: 'ET500',
                    scheduledArrival: tomorrow.toISOString(),
                    status: 'On Time'
                },
                vehicleClass: 'executive',
                passengers: 2,
                pricing: {
                    baseFare: 45,
                    totalUSD: 45,
                    totalETB: 7110
                },
                driver: {
                    name: 'Abebe Bekele',
                    phone: '+251911234567',
                    vehicle: 'Toyota Camry',
                    vehiclePlate: '3-AA-12345'
                },
                payment: {
                    method: 'stripe',
                    status: 'paid'
                }
            },
            {
                _id: 'demo-2',
                bookingReference: 'SP-2025-DEF456',
                status: 'confirmed',
                pickup: {
                    location: 'Bole International Airport',
                    scheduledTime: nextWeek.toISOString()
                },
                dropoff: {
                    location: 'Hyatt Regency',
                    zone: 'City Center'
                },
                flight: {
                    number: 'ET302',
                    scheduledArrival: nextWeek.toISOString(),
                    status: 'Scheduled'
                },
                vehicleClass: 'standard',
                passengers: 1,
                pricing: {
                    baseFare: 30,
                    totalUSD: 30,
                    totalETB: 4740
                },
                payment: {
                    method: 'telebirr',
                    status: 'paid'
                }
            },
            {
                _id: 'demo-3',
                bookingReference: 'SP-2025-GHI789',
                status: 'completed',
                pickup: {
                    location: 'Bole International Airport',
                    scheduledTime: lastWeek.toISOString()
                },
                dropoff: {
                    location: 'Golden Tulip Hotel',
                    zone: 'Bole District'
                },
                vehicleClass: 'suv',
                passengers: 4,
                pricing: {
                    baseFare: 42,
                    totalUSD: 42,
                    totalETB: 6636
                },
                driver: {
                    name: 'Tadesse Worku',
                    phone: '+251922345678',
                    vehicle: 'Toyota Hiace',
                    vehiclePlate: '3-AA-67890'
                },
                payment: {
                    method: 'cash',
                    status: 'paid'
                }
            }
        ];
    }

    // ========================================
    // Initialize on DOM Ready
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
