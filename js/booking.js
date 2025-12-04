// ========================================
// SHUTTLE PLUS - Booking Flow
// ========================================

(function() {
    'use strict';

    // State
    let currentStep = 1;
    let bookingData = {
        type: 'arrival',
        flight: {},
        pickup: {},
        dropoff: {},
        vehicleClass: 'standard',
        passengers: 2,
        luggage: 2,
        childSeat: false,
        meetGreet: false,
        contact: {},
        pricing: null
    };

    let exchangeRate = 158; // Default, will be fetched
    const TOTAL_STEPS = 4; // Updated from 5 to 4

    // Elements
    const form = document.getElementById('bookingForm');
    const steps = document.querySelectorAll('.booking-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const successSection = document.getElementById('bookingSuccess');

    // ========================================
    // Initialize
    // ========================================
    function init() {
        if (!form) return;

        setupNavigationButtons();
        setupFormListeners();
        setupDateDefaults();
        fetchExchangeRate();
        loadDraftBooking();
        loadQuickBookingData(); // Load data from home page form
    }

    // ========================================
    // Load Quick Booking Data from Home Page
    // ========================================
    function loadQuickBookingData() {
        const quickData = sessionStorage.getItem('quickBookingData');
        if (!quickData) return;

        try {
            const data = JSON.parse(quickData);

            // Set transfer type
            if (data.transferType) {
                const typeInput = document.querySelector(`input[name="transferType"][value="${data.transferType}"]`);
                if (typeInput) {
                    typeInput.checked = true;
                    bookingData.type = data.transferType;
                    updateLabelsForType(data.transferType);
                }
            }

            // Set flight number
            const flightInput = document.getElementById('flightNumber');
            if (flightInput && data.flightNumber) {
                flightInput.value = data.flightNumber;
            }

            // Set date
            const dateInput = document.getElementById('flightDate');
            if (dateInput && data.date) {
                dateInput.value = data.date;
            }

            // Set time
            const timeInput = document.getElementById('flightTimeInput');
            if (timeInput && data.time) {
                timeInput.value = data.time;
            }

            // Set destination
            const destInput = document.getElementById('destination');
            if (destInput && data.destination) {
                // Check if destination exists in the select options
                const options = Array.from(destInput.options);
                const matchingOption = options.find(opt => opt.value === data.destination || opt.text === data.destination);
                if (matchingOption) {
                    destInput.value = matchingOption.value;
                } else if (data.destination) {
                    // Set to "other" and fill custom address
                    destInput.value = 'other';
                    const customGroup = document.getElementById('customAddressGroup');
                    const customInput = document.getElementById('customAddress');
                    if (customGroup) customGroup.style.display = 'block';
                    if (customInput) customInput.value = data.destination;
                }
            }

            // Set passengers - handle both numeric values ("6") and text format ("5-6 Passengers, 6 Bags")
            if (data.passengers) {
                let passengerCount = 2; // default

                // Check if it's a plain number
                if (/^\d+$/.test(data.passengers)) {
                    passengerCount = parseInt(data.passengers) || 2;
                } else {
                    // Try to parse text format "5-6 Passengers, 6 Bags"
                    const match = data.passengers.match(/(\d+)(?:-(\d+))?\s*Passengers?/i);
                    if (match) {
                        // Use the higher number if range (e.g., "5-6" -> 6)
                        passengerCount = parseInt(match[2] || match[1]) || 2;
                    }
                }

                const passengersSelect = document.getElementById('passengers');
                if (passengersSelect) {
                    // Find best matching option
                    const options = Array.from(passengersSelect.options);
                    let bestOption = options.find(opt => parseInt(opt.value) === passengerCount);
                    if (!bestOption && passengerCount >= 6) {
                        bestOption = options.find(opt => parseInt(opt.value) >= 6);
                    }
                    if (bestOption) {
                        passengersSelect.value = bestOption.value;
                        bookingData.passengers = parseInt(bestOption.value);
                    }
                }
            }

            // Filter vehicles based on passenger count (important for when user goes to step 2)
            if (bookingData.passengers > 3) {
                // Will be applied when user navigates to step 2
                console.log('[Booking] Passenger count requires vehicle filtering:', bookingData.passengers);
            }

            // Clear the quick booking data after loading
            sessionStorage.removeItem('quickBookingData');

            console.log('[Booking] Quick booking data loaded:', data);
        } catch (error) {
            console.error('[Booking] Failed to load quick booking data:', error);
            sessionStorage.removeItem('quickBookingData');
        }
    }

    // ========================================
    // Fetch Exchange Rate
    // ========================================
    async function fetchExchangeRate() {
        try {
            const response = await fetch('/api/pricing/zones');
            if (response.ok) {
                const data = await response.json();
                if (data.data?.[0]?.exchangeRate) {
                    exchangeRate = data.data[0].exchangeRate;
                    updatePriceDisplays();
                }
            }
        } catch (error) {
            console.log('[Booking] Using default exchange rate');
        }
    }

    // ========================================
    // Navigation Buttons
    // ========================================
    function setupNavigationButtons() {
        // Next buttons
        document.querySelectorAll('.btn-next').forEach(btn => {
            btn.addEventListener('click', () => {
                try {
                    const nextStep = parseInt(btn.dataset.next);
                    console.log('[Booking] Next button clicked, current step:', currentStep, 'next step:', nextStep);
                    if (validateStep(currentStep)) {
                        goToStep(nextStep);
                    }
                } catch (error) {
                    console.error('[Booking] Navigation error:', error);
                    showError('An error occurred. Please try again.');
                }
            });
        });

        // Previous buttons
        document.querySelectorAll('.btn-prev').forEach(btn => {
            btn.addEventListener('click', () => {
                try {
                    const prevStep = parseInt(btn.dataset.prev);
                    console.log('[Booking] Back button clicked, going to step:', prevStep);
                    goToStep(prevStep);
                } catch (error) {
                    console.error('[Booking] Navigation error:', error);
                }
            });
        });

        // Form submit
        form.addEventListener('submit', handleSubmit);
    }

    // ========================================
    // Form Listeners
    // ========================================
    function setupFormListeners() {
        // Transfer type
        document.querySelectorAll('input[name="transferType"]').forEach(input => {
            input.addEventListener('change', (e) => {
                bookingData.type = e.target.value;
                updateLabelsForType(e.target.value);
            });
        });

        // Flight number - lookup flight
        const flightInput = document.getElementById('flightNumber');
        if (flightInput) {
            let debounceTimer;
            flightInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                const value = e.target.value.trim();

                if (value.length >= 4) {
                    debounceTimer = setTimeout(() => lookupFlight(value), 500);
                } else {
                    hideFlightInfo();
                }
            });
        }

        // Destination - show custom address field
        const destinationSelect = document.getElementById('destination');
        if (destinationSelect) {
            destinationSelect.addEventListener('change', (e) => {
                const customGroup = document.getElementById('customAddressGroup');
                if (e.target.value === 'other') {
                    customGroup.style.display = 'block';
                } else {
                    customGroup.style.display = 'none';
                }
                updatePricing();
            });
        }

        // Vehicle class
        document.querySelectorAll('input[name="vehicleClass"]').forEach(input => {
            input.addEventListener('change', (e) => {
                bookingData.vehicleClass = e.target.value;
                updatePricing();
            });
        });

        // Passengers - filter vehicles by capacity
        const passengersSelect = document.getElementById('passengers');
        if (passengersSelect) {
            passengersSelect.addEventListener('change', (e) => {
                bookingData.passengers = parseInt(e.target.value) || 2;
                filterVehiclesByCapacity(bookingData.passengers);
            });
        }

        // Luggage
        const luggageSelect = document.getElementById('luggage');
        if (luggageSelect) {
            luggageSelect.addEventListener('change', (e) => {
                bookingData.luggage = parseInt(e.target.value) || 2;
            });
        }

        // Child seat
        const childSeatCheckbox = document.getElementById('childSeat');
        if (childSeatCheckbox) {
            childSeatCheckbox.addEventListener('change', (e) => {
                bookingData.childSeat = e.target.checked;
                updatePricing();
            });
        }

        // Meet & Greet
        const meetGreetCheckbox = document.getElementById('meetGreet');
        if (meetGreetCheckbox) {
            meetGreetCheckbox.addEventListener('change', (e) => {
                bookingData.meetGreet = e.target.checked;
                updatePricing();
            });
        }

        // Auto-save on input changes
        form.addEventListener('input', debounce(saveDraftBooking, 1000));
    }

    // ========================================
    // Date Defaults
    // ========================================
    function setupDateDefaults() {
        const dateInput = document.getElementById('flightDate');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
            dateInput.value = today;
        }
    }

    // ========================================
    // Step Navigation
    // ========================================
    function goToStep(step) {
        // Hide current step
        steps.forEach(s => s.classList.remove('active'));
        progressSteps.forEach(p => p.classList.remove('active', 'completed'));

        // Show new step
        const newStep = document.querySelector(`.booking-step[data-step="${step}"]`);
        if (newStep) {
            newStep.classList.add('active');
        }

        // Update progress
        progressSteps.forEach((p, index) => {
            const stepNum = index + 1;
            if (stepNum < step) {
                p.classList.add('completed');
            } else if (stepNum === step) {
                p.classList.add('active');
            }
        });

        currentStep = step;

        // Update route summary banner on step 2 and filter vehicles
        if (step === 2) {
            updateRouteSummary();
            filterVehiclesByCapacity(bookingData.passengers);
        }

        // Update summary on step 4 (final step)
        if (step === 4) {
            updateSummary();
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update route summary banner in step 2
    function updateRouteSummary() {
        const destination = document.getElementById('destination')?.value;
        const customAddress = document.getElementById('customAddress')?.value;
        const date = document.getElementById('flightDate')?.value;
        const time = document.getElementById('flightTimeInput')?.value;

        const routeText = document.getElementById('routeSummaryText');
        const dateText = document.getElementById('dateSummaryText');

        if (routeText) {
            const location = destination === 'other' ? customAddress : destination;
            if (bookingData.type === 'arrival') {
                routeText.textContent = `Bole Airport → ${location || 'Destination'}`;
            } else {
                routeText.textContent = `${location || 'Pickup'} → Bole Airport`;
            }
        }

        if (dateText && date && time) {
            dateText.textContent = `${formatDate(date)} at ${time}`;
        }
    }

    // ========================================
    // Validation
    // ========================================
    function validateStep(step) {
        const stepElement = document.querySelector(`.booking-step[data-step="${step}"]`);
        const inputs = stepElement.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.checkValidity()) {
                input.reportValidity();
                isValid = false;
            }
        });

        // Custom validations per step
        if (step === 1) {
            // Validate destination is selected
            const destination = document.getElementById('destination')?.value;
            if (!destination) {
                showError('Please select a destination');
                isValid = false;
            }

            // If "other" selected, validate custom address
            if (destination === 'other') {
                const customAddress = document.getElementById('customAddress')?.value.trim();
                if (!customAddress) {
                    showError('Please enter your address');
                    isValid = false;
                }
            }

            // Validate flight number format if provided
            const flightNumber = document.getElementById('flightNumber')?.value.trim();
            if (flightNumber && !/^[A-Za-z]{2}\s?\d{1,4}$/.test(flightNumber)) {
                showError('Please enter a valid flight number (e.g., ET 500)');
                isValid = false;
            }
        }

        if (step === 2) {
            // Validate that a vehicle is selected
            const selectedVehicle = document.querySelector('input[name="vehicleClass"]:checked:not(:disabled)');
            if (!selectedVehicle) {
                showError('Please select a vehicle');
                isValid = false;
            }
        }

        if (step === 3) {
            // Validate phone number (more flexible format)
            const phone = document.getElementById('contactPhone')?.value.trim();
            if (phone && !/^(\+251|0)?[97]\d{8}$/.test(phone.replace(/\s/g, ''))) {
                showError('Please enter a valid phone number');
                isValid = false;
            }
        }

        if (step === 4) {
            // Validate terms accepted
            if (!document.getElementById('termsAccepted')?.checked) {
                showError('Please accept the terms and conditions');
                isValid = false;
            }
        }

        return isValid;
    }

    // ========================================
    // Flight Lookup
    // ========================================
    async function lookupFlight(flightNumber) {
        const infoGroup = document.getElementById('flightInfoGroup');

        try {
            const response = await fetch(`/api/flights/${encodeURIComponent(flightNumber)}`);

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    showFlightInfo(data.data);
                    bookingData.flight = data.data;

                    // Auto-fill date and time
                    if (data.data.scheduledTime) {
                        const date = new Date(data.data.scheduledTime);
                        document.getElementById('flightDate').value = date.toISOString().split('T')[0];
                        document.getElementById('flightTimeInput').value = date.toTimeString().substring(0, 5);
                    }
                } else {
                    hideFlightInfo();
                }
            } else {
                hideFlightInfo();
            }
        } catch (error) {
            console.error('[Booking] Flight lookup error:', error);
            hideFlightInfo();
        }
    }

    function showFlightInfo(flight) {
        const infoGroup = document.getElementById('flightInfoGroup');
        if (!infoGroup) return;

        document.getElementById('airlineName').textContent = flight.airline?.name || 'Unknown Airline';
        document.getElementById('flightStatus').textContent = flight.status || 'Scheduled';
        document.getElementById('flightOrigin').textContent = flight.origin?.city || 'Origin';

        const time = flight.scheduledTime ? new Date(flight.scheduledTime).toLocaleString('en-GB', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }) : 'TBD';
        document.getElementById('flightTime').textContent = time;

        // Update status color
        const statusEl = document.getElementById('flightStatus');
        statusEl.classList.remove('delayed');
        if (flight.status === 'delayed') {
            statusEl.classList.add('delayed');
        }

        infoGroup.style.display = 'block';
    }

    function hideFlightInfo() {
        const infoGroup = document.getElementById('flightInfoGroup');
        if (infoGroup) {
            infoGroup.style.display = 'none';
        }
    }

    // ========================================
    // Update Labels for Transfer Type
    // ========================================
    function updateLabelsForType(type) {
        const dateLabel = document.getElementById('dateLabel');
        const timeLabel = document.getElementById('timeLabel');
        const destLabel = document.getElementById('destinationLabel');

        if (type === 'arrival') {
            dateLabel.textContent = 'Arrival Date';
            timeLabel.textContent = 'Arrival Time';
            destLabel.textContent = 'Drop-off Location';
        } else {
            dateLabel.textContent = 'Departure Date';
            timeLabel.textContent = 'Pickup Time';
            destLabel.textContent = 'Pickup Location';
        }
    }

    // ========================================
    // Filter Vehicles by Passenger Capacity
    // ========================================
    function filterVehiclesByCapacity(passengers) {
        // Ensure passengers is a number
        passengers = parseInt(passengers) || 2;
        console.log('[Booking] Filtering vehicles for', passengers, 'passengers');

        // Vehicle capacities: standard=3, executive=3, suv=6, luxury=3
        const vehicleCapacities = {
            standard: 3,
            executive: 3,
            suv: 6,
            luxury: 3
        };

        const vehicleOptions = document.querySelectorAll('.vehicle-option');
        let firstAvailable = null;
        let hiddenCount = 0;

        vehicleOptions.forEach(option => {
            const input = option.querySelector('input[name="vehicleClass"]');
            if (!input) return;

            const vehicleType = input.value;
            const capacity = vehicleCapacities[vehicleType] || 3;

            if (passengers > capacity) {
                // Hide vehicles that can't accommodate passenger count
                option.style.display = 'none';
                option.classList.add('capacity-hidden');
                // Also disable the input to prevent selection
                input.disabled = true;
                if (input.checked) {
                    input.checked = false;
                }
                hiddenCount++;
                console.log('[Booking] Hiding vehicle:', vehicleType, '(capacity:', capacity, ')');
            } else {
                // Show available vehicles
                option.style.display = '';
                option.classList.remove('capacity-hidden');
                input.disabled = false;
                if (!firstAvailable) {
                    firstAvailable = input;
                }
            }
        });

        console.log('[Booking] Hidden', hiddenCount, 'vehicles, first available:', firstAvailable?.value);

        // Select first available vehicle if current selection is hidden
        const currentSelected = document.querySelector('input[name="vehicleClass"]:checked');
        if (!currentSelected || currentSelected.disabled) {
            if (firstAvailable) {
                firstAvailable.checked = true;
                bookingData.vehicleClass = firstAvailable.value;
                console.log('[Booking] Auto-selected vehicle:', firstAvailable.value);
                updatePricing();
            }
        }

        // Show warning if only SUV available (passengers > 3)
        const vehicleSection = document.querySelector('.vehicle-options');
        let suvWarning = document.getElementById('suvOnlyWarning');

        if (passengers > 3 && vehicleSection) {
            if (!suvWarning) {
                suvWarning = document.createElement('div');
                suvWarning.id = 'suvOnlyWarning';
                suvWarning.className = 'capacity-warning';
                vehicleSection.parentNode.insertBefore(suvWarning, vehicleSection);
            }
            suvWarning.innerHTML = '<i class="fas fa-info-circle"></i> For ' + passengers + ' passengers, only SUV/Minivan is available';
            suvWarning.style.display = 'block';
        } else if (suvWarning) {
            suvWarning.style.display = 'none';
        }
    }

    // ========================================
    // Pricing
    // ========================================
    async function updatePricing() {
        const destination = document.getElementById('destination')?.value;
        if (!destination) return;

        try {
            const response = await fetch('/api/pricing/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pickup: 'Bole International Airport',
                    dropoff: destination,
                    vehicleClass: bookingData.vehicleClass,
                    childSeat: bookingData.childSeat
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    bookingData.pricing = data.data;
                    exchangeRate = data.data.exchangeRate;
                    updatePriceDisplays();
                }
            }
        } catch (error) {
            console.error('[Booking] Pricing error:', error);
            // Use fallback pricing
            updateFallbackPricing();
        }
    }

    function updatePriceDisplays() {
        const basePrices = {
            standard: 30,
            executive: 45,
            suv: 63,
            luxury: 87
        };

        // Update vehicle prices
        Object.keys(basePrices).forEach(cls => {
            const priceEl = document.getElementById(`price-${cls}`);
            if (priceEl) {
                const usd = basePrices[cls];
                const etb = Math.round(usd * exchangeRate / 10) * 10;
                priceEl.innerHTML = `$${usd} <small>(${etb.toLocaleString()} ETB)</small>`;
            }
        });
    }

    function updateFallbackPricing() {
        const prices = {
            standard: { usd: 30, multiplier: 1 },
            executive: { usd: 45, multiplier: 1.5 },
            suv: { usd: 63, multiplier: 2.1 },
            luxury: { usd: 87, multiplier: 2.9 }
        };

        const selected = prices[bookingData.vehicleClass];
        const extras = (bookingData.childSeat ? 5 : 0) + (bookingData.meetGreet ? 5 : 0);
        bookingData.pricing = {
            baseFare: selected.usd,
            baseFareETB: Math.round(selected.usd * exchangeRate),
            extras: extras,
            totalUSD: selected.usd + extras,
            totalETB: Math.round((selected.usd + extras) * exchangeRate),
            exchangeRate
        };
    }

    // ========================================
    // Summary
    // ========================================
    function updateSummary() {
        // Ensure pricing is calculated
        if (!bookingData.pricing) {
            updateFallbackPricing();
        }

        // Transfer details
        document.getElementById('summaryType').textContent =
            bookingData.type === 'arrival' ? 'Airport Pickup' : 'Airport Drop-off';

        const flightNumber = document.getElementById('flightNumber')?.value?.trim();
        document.getElementById('summaryFlight').textContent = flightNumber || 'Not provided';

        const date = document.getElementById('flightDate')?.value;
        const time = document.getElementById('flightTimeInput')?.value;
        document.getElementById('summaryDateTime').textContent =
            date && time ? `${formatDate(date)} at ${time}` : '-';

        const destination = document.getElementById('destination')?.value;
        const customAddress = document.getElementById('customAddress')?.value;
        const location = destination === 'other' ? customAddress : destination;
        document.getElementById('summaryRoute').textContent =
            bookingData.type === 'arrival'
                ? `Airport → ${location || 'Destination'}`
                : `${location || 'Pickup'} → Airport`;

        // Vehicle
        const vehicleNames = {
            standard: 'Standard Sedan',
            executive: 'Executive Sedan',
            suv: 'SUV / Minivan',
            luxury: 'Luxury Class'
        };
        document.getElementById('summaryVehicle').textContent =
            vehicleNames[bookingData.vehicleClass] || 'Standard';

        document.getElementById('summaryPassengers').textContent =
            `${bookingData.passengers} passenger(s), ${bookingData.luggage} bag(s)`;

        // Contact
        document.getElementById('summaryName').textContent =
            document.getElementById('contactName')?.value || '-';
        document.getElementById('summaryPhone').textContent =
            document.getElementById('contactPhone')?.value || '-';

        // Pricing
        if (bookingData.pricing) {
            document.getElementById('summaryBaseFare').textContent =
                `$${bookingData.pricing.baseFare}`;

            const childSeatRow = document.getElementById('summaryChildSeatRow');
            const meetGreetRow = document.getElementById('summaryMeetGreetRow');

            if (childSeatRow) {
                childSeatRow.style.display = bookingData.childSeat ? 'flex' : 'none';
            }

            if (meetGreetRow) {
                meetGreetRow.style.display = bookingData.meetGreet ? 'flex' : 'none';
            }

            document.getElementById('summaryTotal').innerHTML =
                `$${bookingData.pricing.totalUSD} <small>(${bookingData.pricing.totalETB?.toLocaleString() || '-'} ETB)</small>`;
        }
    }

    // ========================================
    // Submit
    // ========================================
    async function handleSubmit(e) {
        e.preventDefault();

        if (!validateStep(4)) return;

        showLoading();

        // Collect form data
        const formData = collectFormData();

        // Calculate pricing
        try {
            const pricingResponse = await fetch('/api/pricing/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pickup: formData.pickup.location,
                    dropoff: formData.dropoff.location,
                    vehicleClass: formData.vehicleClass,
                    pickupTime: formData.pickup.scheduledTime,
                    additionalStops: 0,
                    childSeat: formData.childSeat
                })
            });

            if (pricingResponse.ok) {
                const pricingData = await pricingResponse.json();
                formData.pricing = pricingData.data;
            } else {
                // Use current bookingData pricing if API fails
                formData.pricing = bookingData.pricing;
            }
        } catch (error) {
            console.log('[Booking] Using local pricing data');
            formData.pricing = bookingData.pricing;
        }

        // Store booking data for payment page
        sessionStorage.setItem('pendingBooking', JSON.stringify(formData));

        // Clear draft
        localStorage.removeItem('booking_draft');

        hideLoading();

        // Redirect to payment page
        window.location.href = 'payment.html';
    }

    function collectFormData() {
        const date = document.getElementById('flightDate').value;
        const time = document.getElementById('flightTimeInput').value;
        const flightDateTime = new Date(`${date}T${time}`);

        // Calculate pickup time (arrival + 60 min buffer for arrivals)
        const pickupTime = bookingData.type === 'arrival'
            ? new Date(flightDateTime.getTime() + 60 * 60 * 1000)
            : flightDateTime;

        const destination = document.getElementById('destination').value;
        const customAddress = document.getElementById('customAddress')?.value;
        const flightNumber = document.getElementById('flightNumber')?.value?.trim() || '';

        return {
            type: bookingData.type,
            flight: {
                number: flightNumber ? flightNumber.toUpperCase().replace(/\s/g, '') : null,
                scheduledTime: flightDateTime.toISOString()
            },
            pickup: {
                location: bookingData.type === 'arrival' ? 'Bole International Airport' : (destination === 'other' ? customAddress : destination),
                scheduledTime: pickupTime.toISOString()
            },
            dropoff: {
                location: bookingData.type === 'arrival' ? (destination === 'other' ? customAddress : destination) : 'Bole International Airport'
            },
            vehicleClass: bookingData.vehicleClass,
            passengers: bookingData.passengers,
            luggage: bookingData.luggage,
            childSeat: bookingData.childSeat,
            meetGreet: bookingData.meetGreet,
            contact: {
                name: document.getElementById('contactName').value.trim(),
                phone: document.getElementById('contactPhone').value.trim(),
                email: document.getElementById('contactEmail')?.value.trim() || null
            },
            specialRequests: document.getElementById('specialRequests')?.value.trim() || null,
            payment: {
                method: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash'
            }
        };
    }

    // ========================================
    // Success State
    // ========================================
    function showSuccess(booking) {
        hideLoading();

        // Hide form
        form.style.display = 'none';
        document.querySelector('.booking-progress').style.display = 'none';

        // Show success section
        successSection.style.display = 'block';

        // Populate success details
        document.getElementById('bookingRef').textContent = booking.bookingReference;

        const pickupDate = new Date(booking.pickup.scheduledTime);
        document.getElementById('successDate').textContent = formatDate(pickupDate);
        document.getElementById('successTime').textContent = pickupDate.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const vehicleNames = {
            standard: 'Standard Sedan',
            executive: 'Executive Sedan',
            suv: 'SUV / Minivan',
            luxury: 'Luxury Class'
        };
        document.getElementById('successVehicle').textContent = vehicleNames[booking.vehicleClass] || 'Vehicle';

        // Update ticket link
        const ticketLink = successSection.querySelector('a[href="tickets.html"]');
        if (ticketLink) {
            ticketLink.href = `tickets.html?id=${booking.bookingReference}`;
        }
    }

    // ========================================
    // Draft Booking (Local Storage)
    // ========================================
    function saveDraftBooking() {
        const draft = {
            type: bookingData.type,
            vehicleClass: bookingData.vehicleClass,
            childSeat: bookingData.childSeat,
            meetGreet: bookingData.meetGreet,
            flightNumber: document.getElementById('flightNumber')?.value,
            flightDate: document.getElementById('flightDate')?.value,
            flightTime: document.getElementById('flightTimeInput')?.value,
            destination: document.getElementById('destination')?.value,
            customAddress: document.getElementById('customAddress')?.value,
            passengers: document.getElementById('passengers')?.value,
            luggage: document.getElementById('luggage')?.value,
            contactName: document.getElementById('contactName')?.value,
            contactPhone: document.getElementById('contactPhone')?.value,
            contactEmail: document.getElementById('contactEmail')?.value,
            specialRequests: document.getElementById('specialRequests')?.value,
            savedAt: new Date().toISOString()
        };

        localStorage.setItem('booking_draft', JSON.stringify(draft));
    }

    function loadDraftBooking() {
        const draft = localStorage.getItem('booking_draft');
        if (!draft) return;

        try {
            const data = JSON.parse(draft);

            // Check if draft is less than 24 hours old
            const savedAt = new Date(data.savedAt);
            const now = new Date();
            if ((now - savedAt) > 24 * 60 * 60 * 1000) {
                localStorage.removeItem('booking_draft');
                return;
            }

            // Restore form values
            if (data.type) {
                const typeInput = document.querySelector(`input[name="transferType"][value="${data.type}"]`);
                if (typeInput) {
                    typeInput.checked = true;
                    bookingData.type = data.type;
                    updateLabelsForType(data.type);
                }
            }

            if (data.flightNumber) {
                const flightInput = document.getElementById('flightNumber');
                if (flightInput) flightInput.value = data.flightNumber;
            }
            if (data.flightDate) document.getElementById('flightDate').value = data.flightDate;
            if (data.flightTime) document.getElementById('flightTimeInput').value = data.flightTime;
            if (data.destination) {
                document.getElementById('destination').value = data.destination;
                if (data.destination === 'other' && data.customAddress) {
                    document.getElementById('customAddressGroup').style.display = 'block';
                    document.getElementById('customAddress').value = data.customAddress;
                }
            }
            if (data.passengers) {
                document.getElementById('passengers').value = data.passengers;
                bookingData.passengers = parseInt(data.passengers) || 2;
            }
            if (data.luggage) {
                const luggageInput = document.getElementById('luggage');
                if (luggageInput) {
                    luggageInput.value = data.luggage;
                    bookingData.luggage = parseInt(data.luggage) || 2;
                }
            }

            if (data.vehicleClass) {
                const vehicleInput = document.querySelector(`input[name="vehicleClass"][value="${data.vehicleClass}"]`);
                if (vehicleInput) {
                    vehicleInput.checked = true;
                    bookingData.vehicleClass = data.vehicleClass;
                }
            }

            if (data.childSeat) {
                const childSeatInput = document.getElementById('childSeat');
                if (childSeatInput) {
                    childSeatInput.checked = true;
                    bookingData.childSeat = true;
                }
            }

            if (data.meetGreet) {
                const meetGreetInput = document.getElementById('meetGreet');
                if (meetGreetInput) {
                    meetGreetInput.checked = true;
                    bookingData.meetGreet = true;
                }
            }

            if (data.contactName) document.getElementById('contactName').value = data.contactName;
            if (data.contactPhone) document.getElementById('contactPhone').value = data.contactPhone;
            if (data.contactEmail) document.getElementById('contactEmail').value = data.contactEmail;
            if (data.specialRequests) document.getElementById('specialRequests').value = data.specialRequests;

            console.log('[Booking] Draft restored');

        } catch (error) {
            console.error('[Booking] Failed to load draft:', error);
            localStorage.removeItem('booking_draft');
        }
    }

    // ========================================
    // Utilities
    // ========================================
    function showLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }
    }

    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
    }

    function showError(message) {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification('error', message);
        } else {
            alert(message);
        }
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
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

    // ========================================
    // Initialize on DOM Ready
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
