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

            // Use exact passenger count from popup if available, otherwise use dropdown value
            const exactPassengers = passengerSelect?.dataset.exactPassengers;
            const exactLuggage = passengerSelect?.dataset.exactLuggage;

            const passengers = exactPassengers || passengerSelect?.value || '2';
            const luggage = exactLuggage || passengers;

            const quickBookingData = {
                flightNumber: flightInput?.value || '',
                destination: destinationSelect?.value || '',
                date: dateInput?.value || '',
                time: timeInput?.value || '',
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

    // Show popup when dropdown changes
    passengerSelect.addEventListener('change', function() {
        popupConfirmed = false; // Reset on change
        showPopupForSelection();
    });

    // Also show popup on focus (for re-editing same selection)
    passengerSelect.addEventListener('focus', function(e) {
        // Only show popup if user explicitly clicks to re-edit after confirming
        if (popupConfirmed && !popup.classList.contains('active')) {
            // Small delay to prevent immediate trigger
            setTimeout(() => {
                if (!popup.classList.contains('active')) {
                    showPopupForSelection();
                }
            }, 200);
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
