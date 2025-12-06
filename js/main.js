// ========================================
// ABEBA RIDE - Main JavaScript
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    initNavbar();
    initMobileMenu();
    initBookingTabs();
    initCounterAnimation();
    initSmoothScroll();
    initFormHandlers();
    initPassengerPopup();
    initFlightLookup();
    initFleetSelection();
    initContactForm();
    initScrollAnimations();
});

// ----------------------------------------
// Navbar Scroll Effect
// ----------------------------------------
function initNavbar() {
    const navbar = document.getElementById('navbar');

    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
}

// ----------------------------------------
// Mobile Menu Toggle
// ----------------------------------------
function initMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');

    if (!menuBtn || !navLinks) return;

    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menuBtn.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Add mobile menu styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 992px) {
            .nav-links {
                position: fixed;
                top: 70px;
                left: 0;
                right: 0;
                background: white;
                flex-direction: column;
                padding: 2rem;
                gap: 1rem;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                transform: translateY(-100%);
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .nav-links.active {
                transform: translateY(0);
                opacity: 1;
                visibility: visible;
                display: flex;
            }

            .nav-links a {
                color: var(--dark) !important;
                padding: 0.5rem 0;
            }

            .mobile-menu-btn.active span:nth-child(1) {
                transform: rotate(45deg) translate(5px, 5px);
            }

            .mobile-menu-btn.active span:nth-child(2) {
                opacity: 0;
            }

            .mobile-menu-btn.active span:nth-child(3) {
                transform: rotate(-45deg) translate(5px, -5px);
            }
        }
    `;
    document.head.appendChild(style);
}

// ----------------------------------------
// Booking Form Tabs
// ----------------------------------------
function initBookingTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const destinationLabel = document.getElementById('destinationLabel');
    const destinationPlaceholder = document.getElementById('destinationPlaceholder');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update labels based on transfer type (arrival vs departure)
            const isArrival = tab.dataset.tab === 'arrival';

            if (destinationLabel) {
                destinationLabel.innerHTML = isArrival
                    ? '<i class="fas fa-map-marker-alt"></i> Drop-off Location'
                    : '<i class="fas fa-map-marker-alt"></i> Pickup Location';
            }

            if (destinationPlaceholder) {
                destinationPlaceholder.textContent = isArrival
                    ? 'Select destination'
                    : 'Select pickup location';
            }
        });
    });
}

// ----------------------------------------
// Counter Animation
// ----------------------------------------
function initCounterAnimation() {
    const counters = document.querySelectorAll('.stat-number');

    // Fetch dynamic transfer count from API
    fetchTransferCount();

    const animateCounter = (counter) => {
        const target = parseInt(counter.getAttribute('data-count'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        const updateCounter = () => {
            current += step;
            if (current < target) {
                counter.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        };

        updateCounter();
    };

    // Use Intersection Observer to trigger animation when in view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

// Fetch completed transfer count from API
async function fetchTransferCount() {
    const transferCountEl = document.getElementById('transferCount');
    if (!transferCountEl) return;

    try {
        const response = await fetch('/api/bookings/stats/completed-count');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.count) {
                // Convert to K format (e.g., 1234 -> 1.2)
                const count = data.data.count;
                const kValue = count >= 1000 ? (count / 1000).toFixed(count >= 10000 ? 0 : 1) : count;
                transferCountEl.setAttribute('data-count', kValue);
            }
        }
    } catch (error) {
        // Silently fail - will use default value of 1
        console.log('[Stats] Using default transfer count');
    }
}

// ----------------------------------------
// Smooth Scrolling
// ----------------------------------------
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));

            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Check if this link should auto-select a booking tab
                const selectTab = this.getAttribute('data-select-tab');
                if (selectTab) {
                    setTimeout(() => {
                        const tabBtn = document.querySelector(`.tab-btn[data-tab="${selectTab}"]`);
                        if (tabBtn) {
                            tabBtn.click();
                        }
                    }, 300);
                }
            }
        });
    });

    // Update active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.pageYOffset >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

// ----------------------------------------
// Form Handlers
// ----------------------------------------
function initFormHandlers() {
    // Booking Form (Home page quick form)
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm && window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        // Check if user is returning from booking page to edit route
        loadEditRouteData();

        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Get form data using IDs for reliable selection
            const flightInput = document.getElementById('homeFlightNumber');
            const destinationSelect = document.getElementById('homeDestination');
            const dateInput = document.getElementById('homeDate');
            const timeInput = document.getElementById('homeTime');
            const passengerSelect = document.getElementById('homePassengers');

            const flightNumber = flightInput?.value?.trim() || '';
            const flightTime = timeInput?.value || '';

            // Validate: if flight number is provided, time is required
            if (flightNumber && !flightTime) {
                timeInput?.focus();
                alert('Please enter the flight time');
                return;
            }

            // Use exact passenger count from popup if available, otherwise use dropdown value
            const exactPassengers = passengerSelect?.dataset.exactPassengers;
            const exactLuggage = passengerSelect?.dataset.exactLuggage;

            const passengers = exactPassengers || passengerSelect?.value || '2';
            const luggage = exactLuggage || passengers;

            const quickBookingData = {
                flightNumber: flightNumber,
                destination: destinationSelect?.value || '',
                date: dateInput?.value || '',
                time: flightTime,
                passengers: passengers,
                luggage: luggage,
                transferType: document.querySelector('.tab-btn.active')?.dataset.tab || 'arrival'
            };

            sessionStorage.setItem('quickBookingData', JSON.stringify(quickBookingData));

            // Redirect to booking page
            window.location.href = 'pages/booking.html';
        });
    }
}

// ----------------------------------------
// Passenger Popup Handler
// ----------------------------------------
function initPassengerPopup() {
    const passengerSelect = document.getElementById('homePassengers');
    const popup = document.getElementById('passengerPopup');
    const popupClose = document.getElementById('popupClose');
    const passengerMinus = document.getElementById('passengerMinus');
    const passengerPlus = document.getElementById('passengerPlus');
    const exactPassengers = document.getElementById('exactPassengers');
    const luggageCount = document.getElementById('luggageCount');
    const popupHint = document.getElementById('popupHint');
    const popupError = document.getElementById('popupError');
    const popupTitle = document.getElementById('popupTitle');
    const confirmBtn = document.getElementById('confirmPassengers');

    if (!passengerSelect || !popup) return;

    let currentMin = 1;
    let currentMax = 3;
    let currentValue = 1;

    // Group configuration
    const groupConfig = {
        '3': { min: 1, max: 3, hint: 'Recommended for solo travelers or couples', title: '1-3 Passengers' },
        '5': { min: 4, max: 5, hint: 'Recommended for small groups', title: '4-5 Passengers' },
        '11': { min: 6, max: 11, hint: 'Recommended for large groups', title: '6-11 Passengers' }
    };

    // Function to show popup with current selection
    function showPopupForSelection() {
        const selectedValue = passengerSelect.value;
        const config = groupConfig[selectedValue];

        if (config) {
            currentMin = config.min;
            currentMax = config.max;

            // Use existing exact value if within range, otherwise use min
            const existingValue = parseInt(passengerSelect.dataset.exactPassengers) || 0;
            if (existingValue >= currentMin && existingValue <= currentMax) {
                currentValue = existingValue;
            } else {
                currentValue = currentMin;
            }

            // Update popup
            popupTitle.textContent = config.title;
            popupHint.textContent = config.hint;
            exactPassengers.value = currentValue;
            exactPassengers.min = currentMin;
            exactPassengers.max = currentMax;
            updateLuggage();
            hideError();

            // Show popup
            popup.classList.add('active');
        }
    }

    // Track if popup was already confirmed (to allow re-editing)
    let popupConfirmed = false;
    let hasInteracted = false;

    // Show popup when dropdown changes
    passengerSelect.addEventListener('change', function() {
        popupConfirmed = false; // Reset on change
        hasInteracted = true;
        showPopupForSelection();
    });

    // Show popup on click (first interaction or re-editing)
    passengerSelect.addEventListener('click', function(e) {
        // Show popup on first interaction OR if already confirmed (re-editing)
        if ((!hasInteracted || popupConfirmed) && !popup.classList.contains('active')) {
            hasInteracted = true;
            showPopupForSelection();
        }
    });

    // Close popup
    popupClose?.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.classList.remove('active');
    });

    // Minus button
    passengerMinus?.addEventListener('click', () => {
        if (currentValue > currentMin) {
            currentValue--;
            exactPassengers.value = currentValue;
            updateLuggage();
            hideError();
        } else {
            showError(`Minimum ${currentMin} passenger${currentMin > 1 ? 's' : ''} for this group`);
        }
    });

    // Plus button
    passengerPlus?.addEventListener('click', () => {
        if (currentValue < currentMax) {
            currentValue++;
            exactPassengers.value = currentValue;
            updateLuggage();
            hideError();
        } else {
            showError(`Maximum ${currentMax} passengers for this group`);
        }
    });

    // Update luggage display
    function updateLuggage() {
        if (luggageCount) {
            luggageCount.textContent = `${currentValue} bag${currentValue > 1 ? 's' : ''}`;
        }
    }

    // Show error message
    function showError(message) {
        if (popupError) {
            popupError.textContent = message;
            popupError.classList.add('active');
            setTimeout(() => hideError(), 2000);
        }
    }

    // Hide error message
    function hideError() {
        if (popupError) {
            popupError.classList.remove('active');
        }
    }

    // Confirm button
    confirmBtn?.addEventListener('click', () => {
        // Store the exact passenger count
        passengerSelect.dataset.exactPassengers = currentValue;
        passengerSelect.dataset.exactLuggage = currentValue;

        // Update the select display text (optional visual feedback)
        const selectedOption = passengerSelect.options[passengerSelect.selectedIndex];
        if (selectedOption) {
            // Store original text if not already stored
            if (!selectedOption.dataset.originalText) {
                selectedOption.dataset.originalText = selectedOption.textContent;
            }
            // Show selected count in dropdown
            const groupLabel = currentMax <= 3 ? 'Solo/Couples' : currentMax <= 5 ? 'Small Groups' : 'Large Groups';
            selectedOption.textContent = `${currentValue} Passenger${currentValue > 1 ? 's' : ''}, ${currentValue} Bag${currentValue > 1 ? 's' : ''} (${groupLabel})`;
        }

        popupConfirmed = true; // Mark as confirmed for re-edit detection
        popup.classList.remove('active');
    });

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
        if (popup.classList.contains('active') &&
            !popup.contains(e.target) &&
            !passengerSelect.contains(e.target)) {
            popup.classList.remove('active');
        }
    });

    // Prevent invalid input in number field
    exactPassengers?.addEventListener('input', (e) => {
        let value = parseInt(e.target.value) || currentMin;

        // Remove any non-numeric characters
        e.target.value = e.target.value.replace(/[^0-9]/g, '');

        if (value < currentMin) {
            showError(`Minimum ${currentMin} passenger${currentMin > 1 ? 's' : ''} allowed`);
            value = currentMin;
        } else if (value > currentMax) {
            showError(`Maximum ${currentMax} passengers allowed`);
            value = currentMax;
        } else if (value <= 0) {
            showError('Passengers cannot be zero or negative');
            value = currentMin;
        }

        currentValue = value;
        e.target.value = currentValue;
        updateLuggage();
    });
}

// ----------------------------------------
// Flight Lookup Handler
// ----------------------------------------
function initFlightLookup() {
    // Use event delegation to handle dynamically loaded elements
    const bookingSection = document.getElementById('home');
    if (!bookingSection) return;

    const flightInput = document.getElementById('homeFlightNumber');
    const lookupBtn = document.getElementById('flightLookupBtn');
    const flightInfoCard = document.getElementById('flightInfoCard');
    const flightNumberGroup = document.getElementById('flightNumberGroup');
    const dateInput = document.getElementById('homeDate');
    const timeInput = document.getElementById('homeTime');

    if (!flightInput || !lookupBtn || !flightInfoCard) {
        // Retry after a short delay if elements not found (handles race conditions)
        setTimeout(initFlightLookup, 100);
        return;
    }

    // Track current flight data for autofill
    let currentFlightData = null;

    // Lookup button click handler
    lookupBtn.addEventListener('click', async () => {
        const flightNumber = flightInput.value.trim().toUpperCase().replace(/\s/g, '');

        if (!flightNumber || flightNumber.length < 4) {
            showFlightError('Enter a valid flight number (e.g., ET302)');
            return;
        }

        // Show loading state
        lookupBtn.disabled = true;
        lookupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        flightInfoCard.style.display = 'none';

        try {
            // Check if FlightTracker is available
            if (!window.FlightTracker) {
                throw new Error('Flight tracker not loaded');
            }

            const flight = await window.FlightTracker.lookup(flightNumber);

            if (flight) {
                currentFlightData = flight;
                displayFlightInfo(flight);
            } else {
                showFlightError('Flight not found. Check the flight number and try again.');
            }
        } catch (error) {
            console.error('[Flight] Lookup error:', error);
            showFlightError('Unable to look up flight. Please try again.');
        } finally {
            lookupBtn.disabled = false;
            lookupBtn.innerHTML = '<i class="fas fa-search"></i>';
        }
    });

    // Also trigger lookup on Enter key in flight input
    flightInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            lookupBtn.click();
        }
    });

    // Display flight info card
    function displayFlightInfo(flight) {
        const statusDisplay = window.FlightTracker.getStatusDisplay(flight.status);
        const arrivalTime = flight.arrival.actual || flight.arrival.scheduled;
        const arrivalDate = new Date(arrivalTime);
        const suggestedPickup = new Date(flight.suggestedPickupTime);

        flightInfoCard.className = 'flight-info-card';
        flightInfoCard.innerHTML = `
            <div class="flight-info-header">
                <span class="flight-info-airline">${flight.airline.name} ${flight.flightNumber}</span>
                <span class="flight-info-status ${flight.status}">${statusDisplay.label}</span>
            </div>
            <div class="flight-info-route">
                <i class="fas fa-plane"></i>
                <span>${flight.departure.airport} → ${flight.arrival.airport}</span>
            </div>
            <div class="flight-info-times">
                <div class="time-item">
                    <span class="time-label">Scheduled</span>
                    <span class="time-value ${flight.delay > 0 ? 'delayed' : ''}">${formatTime(flight.arrival.scheduled)}</span>
                </div>
                ${flight.delay > 0 ? `
                <div class="time-item">
                    <span class="time-label">Delay</span>
                    <span class="time-value" style="color: #d97706;">+${flight.delay} min</span>
                </div>
                <div class="time-item">
                    <span class="time-label">New Arrival</span>
                    <span class="time-value updated">${formatTime(arrivalTime)}</span>
                </div>
                ` : ''}
            </div>
            <div class="flight-info-autofill">
                <span><i class="fas fa-clock"></i> Suggested pickup: ${formatTime(suggestedPickup)}</span>
                <button type="button" id="autofillFlightBtn">Use This Time</button>
            </div>
            ${flight.isMockData ? '<div class="flight-info-mock">Demo data - actual times may vary</div>' : ''}
        `;

        flightInfoCard.style.display = 'block';

        // Autofill button handler
        document.getElementById('autofillFlightBtn')?.addEventListener('click', () => {
            autofillFromFlight(flight);
        });
    }

    // Show error in flight info card
    function showFlightError(message) {
        flightInfoCard.className = 'flight-info-card error';
        flightInfoCard.innerHTML = `
            <div class="flight-error-msg">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
        flightInfoCard.style.display = 'block';

        // Auto-hide error after 5 seconds
        setTimeout(() => {
            if (flightInfoCard.classList.contains('error')) {
                flightInfoCard.style.display = 'none';
            }
        }, 5000);
    }

    // Auto-fill date and time from flight data
    function autofillFromFlight(flight) {
        const suggestedPickup = new Date(flight.suggestedPickupTime);

        // Set date (YYYY-MM-DD format for input[type="date"])
        const dateStr = suggestedPickup.toISOString().split('T')[0];
        if (dateInput) {
            dateInput.value = dateStr;
        }

        // Set time (HH:MM format for input[type="time"])
        const hours = String(suggestedPickup.getHours()).padStart(2, '0');
        const minutes = String(suggestedPickup.getMinutes()).padStart(2, '0');
        if (timeInput) {
            timeInput.value = `${hours}:${minutes}`;
        }

        // Show confirmation
        const autofillBtn = document.getElementById('autofillFlightBtn');
        if (autofillBtn) {
            autofillBtn.innerHTML = '<i class="fas fa-check"></i> Applied!';
            autofillBtn.style.background = '#059669';
            setTimeout(() => {
                autofillBtn.innerHTML = 'Use This Time';
                autofillBtn.style.background = '';
            }, 2000);
        }

        console.log('[Flight] Autofilled date:', dateStr, 'time:', `${hours}:${minutes}`);
    }

    // Format time for display
    function formatTime(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    // Update flight lookup visibility based on tab (arrival vs departure)
    function updateFlightLookupVisibility(isArrival) {
        if (flightNumberGroup) {
            // Always show flight input, but emphasize it more for arrivals
            const label = flightNumberGroup.querySelector('label');
            if (label) {
                if (isArrival) {
                    label.innerHTML = '<i class="fas fa-plane-arrival"></i> Flight Number <span class="optional-label">(optional)</span>';
                } else {
                    label.innerHTML = '<i class="fas fa-plane-departure"></i> Flight Number <span class="optional-label">(optional)</span>';
                }
            }
        }

        // Hide flight info card when switching tabs
        if (flightInfoCard) {
            flightInfoCard.style.display = 'none';
        }
    }

    // Listen for tab changes
    document.querySelectorAll('.booking-tabs .tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            const isArrival = tab.dataset.tab === 'arrival';
            updateFlightLookupVisibility(isArrival);
        });
    });
}

// ----------------------------------------
// Fleet Vehicle Selection Handler
// ----------------------------------------
function initFleetSelection() {
    const fleetButtons = document.querySelectorAll('.fleet-select-btn');

    fleetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const vehicleClass = btn.getAttribute('data-vehicle');
            if (vehicleClass) {
                // Store the vehicle preference
                sessionStorage.setItem('fleetVehiclePreference', vehicleClass);
                console.log('[Fleet] Vehicle preference saved:', vehicleClass);
            }
        });
    });
}

// ----------------------------------------
// Load Edit Route Data (when returning from booking page)
// ----------------------------------------
function loadEditRouteData() {
    const editData = sessionStorage.getItem('editRouteData');
    if (!editData) return;

    // Use setTimeout to ensure DOM is fully ready
    setTimeout(() => {
        try {
            const data = JSON.parse(editData);
            console.log('[Main] Loading edit route data:', data);

            const bookingForm = document.getElementById('bookingForm');
            if (!bookingForm) {
                console.log('[Main] Booking form not found, retrying...');
                // Retry once more after another delay
                setTimeout(() => loadEditRouteDataInner(editData), 200);
                return;
            }

            loadEditRouteDataInner(editData);
        } catch (error) {
            console.error('[Main] Failed to load edit route data:', error);
            sessionStorage.removeItem('editRouteData');
        }
    }, 100);
}

function loadEditRouteDataInner(editData) {
    try {
        const data = JSON.parse(editData);
        const bookingForm = document.getElementById('bookingForm');
        if (!bookingForm) return;

        // Use IDs for reliable element selection
        const flightInput = document.getElementById('homeFlightNumber');
        const destinationSelect = document.getElementById('homeDestination');
        const dateInput = document.getElementById('homeDate');
        const timeInput = document.getElementById('homeTime');
        const passengerSelect = document.getElementById('homePassengers');

        // Set flight number
        if (flightInput && data.flightNumber) {
            flightInput.value = data.flightNumber;
        }

        // Set destination
        if (destinationSelect && data.destination) {
            destinationSelect.value = data.destination;
        }

        // Set date
        if (dateInput && data.date) {
            dateInput.value = data.date;
        }

        // Set time
        if (timeInput && data.time) {
            timeInput.value = data.time;
        }

        // Set passengers using grouped dropdown (new groups: 1-3, 4-5, 6-11)
        if (passengerSelect && data.passengers) {
            const passengerCount = parseInt(data.passengers) || 2;
            // Select the appropriate group based on passenger count
            if (passengerCount <= 3) {
                passengerSelect.value = '3';
            } else if (passengerCount <= 5) {
                passengerSelect.value = '5';
            } else {
                passengerSelect.value = '11';
            }
            // Store exact values for popup
            passengerSelect.dataset.exactPassengers = passengerCount;
            passengerSelect.dataset.exactLuggage = passengerCount;

            // Update dropdown text to show exact count
            const selectedOption = passengerSelect.options[passengerSelect.selectedIndex];
            if (selectedOption) {
                const groupLabel = passengerCount <= 3 ? 'Solo/Couples' : passengerCount <= 5 ? 'Small Groups' : 'Large Groups';
                selectedOption.textContent = `${passengerCount} Passenger${passengerCount > 1 ? 's' : ''}, ${passengerCount} Bag${passengerCount > 1 ? 's' : ''} (${groupLabel})`;
            }
        }

        // Set transfer type tab
        if (data.transferType) {
            const tabs = document.querySelectorAll('.tab-btn');
            tabs.forEach(tab => {
                if (tab.dataset.tab === data.transferType) {
                    tab.click();
                }
            });

            // Also update destination label explicitly
            const destinationLabel = document.getElementById('destinationLabel');
            const destinationPlaceholder = document.getElementById('destinationPlaceholder');
            const isArrival = data.transferType === 'arrival';

            if (destinationLabel) {
                destinationLabel.innerHTML = isArrival
                    ? '<i class="fas fa-map-marker-alt"></i> Drop-off Location'
                    : '<i class="fas fa-map-marker-alt"></i> Pickup Location';
            }

            if (destinationPlaceholder) {
                destinationPlaceholder.textContent = isArrival
                    ? 'Select destination'
                    : 'Select pickup location';
            }
        }

        // Scroll to booking form
        const bookingSection = document.getElementById('booking');
        if (bookingSection) {
            setTimeout(() => {
                bookingSection.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }

        // IMPORTANT: Also create quickBookingData so it's ready when user clicks "See Prices"
        // Use exact passenger count from data, not the dropdown group value
        const exactPassengers = data.passengers || '2';
        const exactLuggage = data.luggage || exactPassengers;
        const quickBookingData = {
            flightNumber: flightInput?.value || '',
            destination: destinationSelect?.value || '',
            date: dateInput?.value || '',
            time: timeInput?.value || '',
            passengers: exactPassengers,
            luggage: exactLuggage,
            transferType: data.transferType || 'arrival'
        };
        sessionStorage.setItem('quickBookingData', JSON.stringify(quickBookingData));

        // Remove editRouteData after loading to prevent stale data on hard refresh
        // booking.js should get extras from quickBookingData via a different mechanism
        sessionStorage.removeItem('editRouteData');

        console.log('[Main] Edit route data loaded successfully, quickBookingData created');
    } catch (error) {
        console.error('[Main] Failed to load edit route data:', error);
        sessionStorage.removeItem('editRouteData');
    }
}

// ----------------------------------------
// Contact Form Handler
// ----------------------------------------
function initContactForm() {
    // Contact Form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Show success message
            showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');

            // Reset form
            contactForm.reset();
        });
    }

    // Set minimum date to today for date inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    dateInputs.forEach(input => {
        input.setAttribute('min', today);
        input.value = today;
    });
}

// ----------------------------------------
// Notification System
// ----------------------------------------
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 100px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        }

        .notification-success {
            border-left: 4px solid #10b981;
        }

        .notification-success i {
            color: #10b981;
        }

        .notification-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #9ca3af;
            padding: 0;
            margin-left: 10px;
        }

        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    // Add to DOM
    document.body.appendChild(notification);

    // Close button handler
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ----------------------------------------
// Scroll Animations
// ----------------------------------------
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll(
        '.service-card, .step, .fleet-card, .feature, .testimonial-card'
    );

    // Add initial styles
    const style = document.createElement('style');
    style.textContent = `
        .animate-on-scroll {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .animate-on-scroll.animated {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);

    // Add class to elements
    animatedElements.forEach((el, index) => {
        el.classList.add('animate-on-scroll');
        el.style.transitionDelay = `${index % 4 * 0.1}s`;
    });

    // Create observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    animatedElements.forEach(el => observer.observe(el));
}

// ----------------------------------------
// Utility Functions
// ----------------------------------------

// Debounce function for performance
function debounce(func, wait = 100) {
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

// Format currency
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Format date
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
}
