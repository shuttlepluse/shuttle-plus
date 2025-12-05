// ========================================
// SHUTTLE PLUS - Booking Flow (Simplified 3-Step)
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
        destination: '',
        customAddress: '',
        date: '',
        time: '',
        vehicleClass: 'standard',
        passengers: 2,
        luggage: 2,
        childSeat: false,
        meetGreet: false,
        contact: {},
        pricing: null
    };

    let exchangeRate = 158; // Default, will be fetched
    const TOTAL_STEPS = 3; // Simplified from 4 to 3

    // Elements
    const form = document.getElementById('bookingForm');
    const steps = document.querySelectorAll('.booking-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const successSection = document.getElementById('bookingSuccess');

    // ========================================
    // State Persistence (survives hard refresh)
    // ========================================
    function saveBookingState() {
        const state = {
            currentStep: currentStep,
            bookingData: bookingData,
            formValues: {
                vehicleClass: document.querySelector('input[name="vehicleClass"]:checked')?.value,
                childSeat: document.getElementById('childSeat')?.checked,
                meetGreet: document.getElementById('meetGreet')?.checked,
                contactName: document.getElementById('contactName')?.value,
                contactPhone: document.getElementById('contactPhone')?.value,
                contactEmail: document.getElementById('contactEmail')?.value,
                specialRequests: document.getElementById('specialRequests')?.value,
                paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value,
                termsAccepted: document.getElementById('termsAccepted')?.checked
            }
        };
        sessionStorage.setItem('bookingState', JSON.stringify(state));
        console.log('[Booking] State saved, step:', currentStep);
    }

    function restoreBookingState() {
        const stateJson = sessionStorage.getItem('bookingState');
        if (!stateJson) return false;

        try {
            const state = JSON.parse(stateJson);
            console.log('[Booking] Restoring state, step:', state.currentStep);

            // Restore bookingData
            bookingData = { ...bookingData, ...state.bookingData };

            // Restore form values
            const fv = state.formValues;
            if (fv.vehicleClass) {
                const radio = document.querySelector(`input[name="vehicleClass"][value="${fv.vehicleClass}"]`);
                if (radio) radio.checked = true;
            }
            if (fv.childSeat !== undefined) {
                const cb = document.getElementById('childSeat');
                if (cb) cb.checked = fv.childSeat;
            }
            if (fv.meetGreet !== undefined) {
                const cb = document.getElementById('meetGreet');
                if (cb) cb.checked = fv.meetGreet;
            }
            if (fv.contactName) {
                const el = document.getElementById('contactName');
                if (el) el.value = fv.contactName;
            }
            if (fv.contactPhone) {
                const el = document.getElementById('contactPhone');
                if (el) el.value = fv.contactPhone;
            }
            if (fv.contactEmail) {
                const el = document.getElementById('contactEmail');
                if (el) el.value = fv.contactEmail;
            }
            if (fv.specialRequests) {
                const el = document.getElementById('specialRequests');
                if (el) el.value = fv.specialRequests;
            }
            if (fv.paymentMethod) {
                const radio = document.querySelector(`input[name="paymentMethod"][value="${fv.paymentMethod}"]`);
                if (radio) radio.checked = true;
            }
            if (fv.termsAccepted !== undefined) {
                const cb = document.getElementById('termsAccepted');
                if (cb) cb.checked = fv.termsAccepted;
            }

            // Navigate to saved step (do this after a small delay to ensure DOM is ready)
            if (state.currentStep && state.currentStep >= 1) {
                setTimeout(() => {
                    goToStep(state.currentStep);
                }, 50);
            }

            return true;
        } catch (error) {
            console.error('[Booking] Failed to restore state:', error);
            sessionStorage.removeItem('bookingState');
            return false;
        }
    }

    // ========================================
    // Initialize
    // ========================================
    function init() {
        if (!form) return;

        setupNavigationButtons();
        setupFormListeners();
        fetchExchangeRate();

        // PRIORITY: If quickBookingData exists, use it (fresh from home page)
        // Only use bookingState for hard refresh recovery (when no quickBookingData)
        const quickData = sessionStorage.getItem('quickBookingData');

        if (quickData) {
            // Fresh data from home page - clear any old state to start fresh
            console.log('[Booking] Fresh booking data detected - using it');
            sessionStorage.removeItem('bookingState');

            const dataLoaded = loadQuickBookingData();
            if (dataLoaded) {
                filterVehiclesByCapacity(bookingData.passengers);
                saveBookingState();
            }
        } else {
            // No fresh data - try to restore saved state (hard refresh case)
            const stateRestored = restoreBookingState();

            if (stateRestored) {
                filterVehiclesByCapacity(bookingData.passengers);
                updateRouteSummaryCard();
            } else {
                // No state at all - show error
                showMissingDataError();
            }
        }
    }

    // ========================================
    // Load Quick Booking Data from Home Page
    // ========================================
    function loadQuickBookingData() {
        const quickData = sessionStorage.getItem('quickBookingData');
        if (!quickData) {
            // No data from home page - show error instead of redirect
            console.log('[Booking] No booking data found');
            showMissingDataError();
            return false;
        }

        try {
            const data = JSON.parse(quickData);
            console.log('[Booking] Loading quick booking data:', data);

            // Store transfer type
            bookingData.type = data.transferType || 'arrival';
            document.getElementById('transferType').value = bookingData.type;

            // Store flight number
            if (data.flightNumber) {
                document.getElementById('flightNumber').value = data.flightNumber;
                bookingData.flight.number = data.flightNumber;
            }

            // Store destination
            bookingData.destination = data.destination || '';
            document.getElementById('destination').value = bookingData.destination;

            // Store date
            bookingData.date = data.date || '';
            document.getElementById('flightDate').value = bookingData.date;

            // Store time
            bookingData.time = data.time || '';
            document.getElementById('flightTimeInput').value = bookingData.time;

            // Parse and store passengers
            let passengerCount = 2;
            if (data.passengers) {
                if (/^\d+$/.test(data.passengers)) {
                    passengerCount = parseInt(data.passengers) || 2;
                } else {
                    const match = data.passengers.match(/(\d+)(?:-(\d+))?\s*Passengers?/i);
                    if (match) {
                        passengerCount = parseInt(match[2] || match[1]) || 2;
                    }
                }
            }
            bookingData.passengers = passengerCount;
            document.getElementById('passengers').value = passengerCount;

            // Parse and store luggage (max 1 per passenger)
            let luggageCount = passengerCount; // Default to passenger count
            if (data.luggage !== undefined) {
                // Direct luggage value from new dropdown
                luggageCount = parseInt(data.luggage) || passengerCount;
            } else {
                // Legacy format: parse from passengersText
                const textToParse = data.passengersText || data.passengers || '';
                const luggageMatch = textToParse.match(/(\d+)\s*Bags?/i);
                if (luggageMatch) {
                    luggageCount = parseInt(luggageMatch[1]) || passengerCount;
                }
            }
            // Enforce max 1 luggage per passenger
            luggageCount = Math.min(luggageCount, passengerCount);
            bookingData.luggage = luggageCount;
            document.getElementById('luggage').value = luggageCount;

            // Update the route summary card display
            updateRouteSummaryCard();

            // Restore extras from editRouteData if returning from edit
            const editData = sessionStorage.getItem('editRouteData');
            if (editData) {
                try {
                    const extras = JSON.parse(editData);
                    if (extras.vehicleClass) {
                        bookingData.vehicleClass = extras.vehicleClass;
                    }
                    if (extras.childSeat !== undefined) {
                        bookingData.childSeat = extras.childSeat;
                        const cb = document.getElementById('childSeat');
                        if (cb) cb.checked = extras.childSeat;
                    }
                    if (extras.meetGreet !== undefined) {
                        bookingData.meetGreet = extras.meetGreet;
                        const cb = document.getElementById('meetGreet');
                        if (cb) cb.checked = extras.meetGreet;
                    }
                    console.log('[Booking] Extras restored:', extras.childSeat, extras.meetGreet);
                } catch (e) {
                    console.error('[Booking] Failed to restore extras:', e);
                }
                sessionStorage.removeItem('editRouteData');
            }

            // Clear quickBookingData to prevent stale data on future edits
            sessionStorage.removeItem('quickBookingData');

            console.log('[Booking] Data loaded successfully:', bookingData);
            return true;
        } catch (error) {
            console.error('[Booking] Failed to load quick booking data:', error);
            showMissingDataError();
            return false;
        }
    }

    // ========================================
    // Show Missing Data Error
    // ========================================
    function showMissingDataError() {
        const container = document.querySelector('.booking-container');
        if (container) {
            container.innerHTML = `
                <div class="error-card" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;"></i>
                    <h2 style="margin-bottom: 1rem;">Booking Data Not Found</h2>
                    <p style="color: #6b7280; margin-bottom: 2rem;">Please start your booking from the home page.</p>
                    <a href="../index.html" class="btn btn-primary" style="display: inline-block; padding: 0.75rem 2rem; background: var(--primary); color: white; text-decoration: none; border-radius: 8px;">Go to Home Page</a>
                </div>
            `;
        }
    }

    // ========================================
    // Update Route Summary Card Display
    // ========================================
    function updateRouteSummaryCard() {
        const routeText = document.getElementById('routeText');
        const routeIcon = document.getElementById('routeIcon');
        const routeDate = document.getElementById('routeDate');
        const routeTime = document.getElementById('routeTime');
        const routePassengers = document.getElementById('routePassengers');
        const routeLuggage = document.getElementById('routeLuggage');

        // Update route direction
        const location = bookingData.customAddress || bookingData.destination || 'Your Destination';
        if (bookingData.type === 'arrival') {
            if (routeText) routeText.textContent = `Bole Airport → ${location}`;
            if (routeIcon) {
                routeIcon.classList.remove('fa-plane-departure');
                routeIcon.classList.add('fa-plane-arrival');
            }
        } else {
            if (routeText) routeText.textContent = `${location} → Bole Airport`;
            if (routeIcon) {
                routeIcon.classList.remove('fa-plane-arrival');
                routeIcon.classList.add('fa-plane-departure');
            }
        }

        // Update date
        if (routeDate && bookingData.date) {
            routeDate.textContent = formatDate(bookingData.date);
        }

        // Update time
        if (routeTime && bookingData.time) {
            routeTime.textContent = bookingData.time;
        }

        // Update passengers
        if (routePassengers) {
            routePassengers.textContent = `${bookingData.passengers} passenger${bookingData.passengers > 1 ? 's' : ''}`;
        }

        // Update luggage
        if (routeLuggage) {
            routeLuggage.textContent = `${bookingData.luggage} bag${bookingData.luggage > 1 ? 's' : ''}`;
        }
    }

    // ========================================
    // Edit Route - Return to Home Page
    // ========================================
    window.editRoute = function() {
        // Save current booking data back to sessionStorage for home page to load
        // Include extras so they can be restored when returning
        const editData = {
            flightNumber: bookingData.flight?.number || document.getElementById('flightNumber')?.value || '',
            destination: bookingData.destination || document.getElementById('destination')?.value || '',
            date: bookingData.date || document.getElementById('flightDate')?.value || '',
            time: bookingData.time || document.getElementById('flightTimeInput')?.value || '',
            passengers: bookingData.passengers,
            transferType: bookingData.type,
            // Preserve extras and vehicle selection
            vehicleClass: bookingData.vehicleClass,
            childSeat: bookingData.childSeat,
            meetGreet: bookingData.meetGreet,
            luggage: bookingData.luggage
        };

        sessionStorage.setItem('editRouteData', JSON.stringify(editData));
        window.location.href = '../index.html#booking';
    };

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
                    console.log('[Booking] Next button clicked, current:', currentStep, 'next:', nextStep);
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
        // Vehicle class - save on change
        document.querySelectorAll('input[name="vehicleClass"]').forEach(input => {
            input.addEventListener('change', (e) => {
                bookingData.vehicleClass = e.target.value;
                updatePricing();
                saveBookingState();
            });
        });

        // Child seat - save on change
        const childSeatCheckbox = document.getElementById('childSeat');
        if (childSeatCheckbox) {
            childSeatCheckbox.addEventListener('change', (e) => {
                bookingData.childSeat = e.target.checked;
                updatePricing();
                saveBookingState();
            });
        }

        // Meet & Greet - save on change
        const meetGreetCheckbox = document.getElementById('meetGreet');
        if (meetGreetCheckbox) {
            meetGreetCheckbox.addEventListener('change', (e) => {
                bookingData.meetGreet = e.target.checked;
                updatePricing();
                saveBookingState();
            });
        }

        // Phone input - real-time validation (digits only, max 9)
        const phoneInput = document.getElementById('contactPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                // Only allow digits, strip non-digits, limit to 9
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
            });
        }

        // Contact fields - save on blur
        ['contactName', 'contactPhone', 'contactEmail', 'specialRequests'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('blur', saveBookingState);
                el.addEventListener('change', saveBookingState);
            }
        });

        // Payment method - save on change
        document.querySelectorAll('input[name="paymentMethod"]').forEach(input => {
            input.addEventListener('change', saveBookingState);
        });

        // Terms checkbox - save on change
        const termsCheckbox = document.getElementById('termsAccepted');
        if (termsCheckbox) {
            termsCheckbox.addEventListener('change', saveBookingState);
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

        // Filter vehicles on step 1
        if (step === 1) {
            filterVehiclesByCapacity(bookingData.passengers);
        }

        // Update summary on step 3 (final step)
        if (step === 3) {
            updateSummary();
        }

        // Save state after step change (for hard refresh persistence)
        saveBookingState();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
            // Validate that a vehicle is selected
            const selectedVehicle = document.querySelector('input[name="vehicleClass"]:checked:not(:disabled)');
            if (!selectedVehicle) {
                showError('Please select a vehicle');
                isValid = false;
            }
        }

        if (step === 2) {
            // Validate name
            const name = document.getElementById('contactName')?.value.trim();
            if (!name) {
                showError('Please enter your full name');
                isValid = false;
            }

            // Validate email (optional, but if provided must be valid format)
            const email = document.getElementById('contactEmail')?.value.trim();
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showError('Please enter a valid email address');
                isValid = false;
            }

            // Validate Ethiopian phone number (9 digits starting with 9 or 7)
            const phone = document.getElementById('contactPhone')?.value.trim();
            const cleanPhone = phone.replace(/[\s-]/g, '');
            if (!cleanPhone) {
                showError('Please enter your phone number');
                isValid = false;
            } else if (!/^[97]\d{8}$/.test(cleanPhone)) {
                showError('Please enter a valid Ethiopian phone number (9 digits starting with 9 or 7)');
                isValid = false;
            }
        }

        if (step === 3) {
            // Validate terms accepted
            if (!document.getElementById('termsAccepted')?.checked) {
                showError('Please accept the terms and conditions');
                isValid = false;
            }
        }

        return isValid;
    }

    // ========================================
    // Filter Vehicles by Passenger Capacity
    // ========================================
    function filterVehiclesByCapacity(passengers) {
        passengers = parseInt(passengers) || 2;
        const luggage = bookingData.luggage || passengers;
        console.log('[Booking] Filtering vehicles for', passengers, 'passengers,', luggage, 'luggage');

        // Vehicle capacities:
        // Sedan (standard, executive, luxury): 1-3 passengers max
        // SUV: 1-5 passengers max
        // Van: 1-11 passengers max
        const vehicleCapacities = {
            standard: 3,    // Sedan - max 3 passengers
            executive: 3,   // Sedan - max 3 passengers
            suv: 5,         // SUV - max 5 passengers
            van: 11,        // Van - max 11 passengers
            luxury: 3       // Sedan - max 3 passengers
        };

        // Preferred vehicles by passenger count:
        // 1-2: Sedan preferred (standard, executive, luxury), but can use SUV or Van
        // 3-5: SUV preferred, can use Van
        // 6+: Van only
        const getPreferredVehicle = (count) => {
            if (count <= 2) return 'standard';
            if (count <= 5) return 'suv';
            return 'van';
        };

        const preferredVehicle = getPreferredVehicle(passengers);

        const vehicleOptions = document.querySelectorAll('.vehicle-option');
        let firstAvailable = null;
        let preferredOption = null;

        vehicleOptions.forEach(option => {
            const input = option.querySelector('input[name="vehicleClass"]');
            if (!input) return;

            const vehicleType = input.value;
            const capacity = vehicleCapacities[vehicleType] || 3;

            if (passengers > capacity) {
                // Vehicle cannot fit the passengers
                option.style.display = 'none';
                option.classList.add('capacity-hidden');
                input.disabled = true;
                if (input.checked) {
                    input.checked = false;
                }
            } else {
                // Vehicle can fit the passengers
                option.style.display = '';
                option.classList.remove('capacity-hidden');
                input.disabled = false;

                if (!firstAvailable) {
                    firstAvailable = input;
                }

                // Track preferred option
                if (vehicleType === preferredVehicle) {
                    preferredOption = input;
                }
            }
        });

        // Auto-select preferred or first available vehicle if current selection is hidden
        const currentSelected = document.querySelector('input[name="vehicleClass"]:checked');
        if (!currentSelected || currentSelected.disabled) {
            const toSelect = preferredOption || firstAvailable;
            if (toSelect) {
                toSelect.checked = true;
                bookingData.vehicleClass = toSelect.value;
                updatePricing();
            }
        }

        // Reset to preferred vehicle when passenger count changes
        if (passengers <= 2) {
            const standardOption = document.querySelector('input[name="vehicleClass"][value="standard"]');
            const suvOption = document.querySelector('input[name="vehicleClass"][value="suv"]');
            const vanOption = document.querySelector('input[name="vehicleClass"][value="van"]');

            // If SUV or Van is currently selected but standard is preferred and available
            if ((suvOption?.checked || vanOption?.checked) && standardOption && !standardOption.disabled) {
                standardOption.checked = true;
                bookingData.vehicleClass = 'standard';
                updatePricing();
                console.log('[Booking] Reset vehicle to standard for', passengers, 'passengers');
            }
        } else if (passengers >= 3 && passengers <= 5) {
            const suvOption = document.querySelector('input[name="vehicleClass"][value="suv"]');
            const standardOption = document.querySelector('input[name="vehicleClass"][value="standard"]');
            const vanOption = document.querySelector('input[name="vehicleClass"][value="van"]');

            // If standard is selected but SUV is preferred
            if (standardOption?.checked && suvOption && !suvOption.disabled) {
                suvOption.checked = true;
                bookingData.vehicleClass = 'suv';
                updatePricing();
                console.log('[Booking] Switched to SUV for', passengers, 'passengers');
            }
        }

        // Show info message for vehicle recommendations
        const vehicleSection = document.querySelector('.vehicle-options');
        let capacityWarning = document.getElementById('suvOnlyWarning');

        if (vehicleSection) {
            if (!capacityWarning) {
                capacityWarning = document.createElement('div');
                capacityWarning.id = 'suvOnlyWarning';
                capacityWarning.className = 'capacity-warning';
                vehicleSection.parentNode.insertBefore(capacityWarning, vehicleSection);
            }

            if (passengers >= 6) {
                capacityWarning.innerHTML = '<i class="fas fa-info-circle"></i> For 6 and above passengers, only Van is available';
                capacityWarning.style.display = 'block';
            } else if (passengers >= 3) {
                capacityWarning.innerHTML = '<i class="fas fa-info-circle"></i> For 3-5 passengers, SUV is recommended';
                capacityWarning.style.display = 'block';
            } else {
                capacityWarning.style.display = 'none';
            }
        }
    }

    // ========================================
    // Pricing
    // ========================================
    async function updatePricing() {
        const destination = bookingData.destination;
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
            updateFallbackPricing();
        }
    }

    function updatePriceDisplays() {
        const basePrices = {
            standard: 30,
            executive: 45,
            suv: 55,
            van: 63,
            luxury: 87
        };

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
            suv: { usd: 55, multiplier: 1.83 },
            van: { usd: 63, multiplier: 2.1 },
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
        if (!bookingData.pricing) {
            updateFallbackPricing();
        }

        // Transfer details - with null checks
        const summaryType = document.getElementById('summaryType');
        if (summaryType) {
            summaryType.textContent = bookingData.type === 'arrival' ? 'Airport Pickup' : 'Airport Drop-off';
        }

        const flightNumber = document.getElementById('flightNumber')?.value?.trim();
        const summaryFlight = document.getElementById('summaryFlight');
        if (summaryFlight) {
            summaryFlight.textContent = flightNumber || 'Not provided';
        }

        const date = bookingData.date;
        const time = bookingData.time;
        const summaryDateTime = document.getElementById('summaryDateTime');
        if (summaryDateTime) {
            summaryDateTime.textContent = date && time ? `${formatDate(date)} at ${time}` : '-';
        }

        const location = bookingData.customAddress || bookingData.destination;
        const summaryRoute = document.getElementById('summaryRoute');
        if (summaryRoute) {
            summaryRoute.textContent = bookingData.type === 'arrival'
                ? `Airport → ${location || 'Destination'}`
                : `${location || 'Pickup'} → Airport`;
        }

        // Vehicle - updated with van
        const vehicleNames = {
            standard: 'Standard Sedan',
            executive: 'Executive Sedan',
            suv: 'SUV',
            van: 'Van',
            luxury: 'Luxury Class'
        };
        const summaryVehicle = document.getElementById('summaryVehicle');
        if (summaryVehicle) {
            summaryVehicle.textContent = vehicleNames[bookingData.vehicleClass] || 'Standard';
        }

        const summaryPassengers = document.getElementById('summaryPassengers');
        if (summaryPassengers) {
            summaryPassengers.textContent = `${bookingData.passengers} passenger(s), ${bookingData.luggage} bag(s)`;
        }

        // Contact
        const summaryName = document.getElementById('summaryName');
        if (summaryName) {
            summaryName.textContent = document.getElementById('contactName')?.value || '-';
        }
        const summaryPhone = document.getElementById('summaryPhone');
        if (summaryPhone) {
            summaryPhone.textContent = document.getElementById('contactPhone')?.value || '-';
        }

        // Special Requests
        const specialRequests = document.getElementById('specialRequests')?.value?.trim();
        const specialRequestsRow = document.getElementById('summarySpecialRequestsRow');
        const summarySpecialRequests = document.getElementById('summarySpecialRequests');
        if (specialRequests && specialRequestsRow && summarySpecialRequests) {
            specialRequestsRow.style.display = 'flex';
            summarySpecialRequests.textContent = specialRequests;
        } else if (specialRequestsRow) {
            specialRequestsRow.style.display = 'none';
        }

        // Pricing
        if (bookingData.pricing) {
            const summaryBaseFare = document.getElementById('summaryBaseFare');
            if (summaryBaseFare) {
                summaryBaseFare.textContent = `$${bookingData.pricing.baseFare}`;
            }

            const childSeatRow = document.getElementById('summaryChildSeatRow');
            const meetGreetRow = document.getElementById('summaryMeetGreetRow');

            if (childSeatRow) {
                childSeatRow.style.display = bookingData.childSeat ? 'flex' : 'none';
            }

            if (meetGreetRow) {
                meetGreetRow.style.display = bookingData.meetGreet ? 'flex' : 'none';
            }

            const summaryTotal = document.getElementById('summaryTotal');
            if (summaryTotal) {
                summaryTotal.innerHTML = `$${bookingData.pricing.totalUSD} <small>(${bookingData.pricing.totalETB?.toLocaleString() || '-'} ETB)</small>`;
            }
        }
    }

    // ========================================
    // Submit
    // ========================================
    async function handleSubmit(e) {
        e.preventDefault();

        if (!validateStep(3)) return;

        showLoading();

        try {
            const formData = collectFormData();

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
                    formData.pricing = bookingData.pricing;
                }
            } catch (error) {
                console.log('[Booking] Using local pricing data');
                formData.pricing = bookingData.pricing;
            }

            sessionStorage.setItem('pendingBooking', JSON.stringify(formData));
            // Clear booking state on successful form submission
            sessionStorage.removeItem('quickBookingData');
            sessionStorage.removeItem('bookingState');
            hideLoading();
            window.location.href = 'payment.html';
        } catch (error) {
            console.error('[Booking] Submit error:', error);
            hideLoading();
            showError('An error occurred. Please check your information and try again.');
        }
    }

    function collectFormData() {
        const date = bookingData.date;
        const time = bookingData.time;
        const flightDateTime = new Date(`${date}T${time}`);

        const pickupTime = bookingData.type === 'arrival'
            ? new Date(flightDateTime.getTime() + 60 * 60 * 1000)
            : flightDateTime;

        const destination = bookingData.customAddress || bookingData.destination;
        const flightNumber = document.getElementById('flightNumber')?.value?.trim() || '';

        return {
            type: bookingData.type,
            flight: {
                number: flightNumber ? flightNumber.toUpperCase().replace(/\s/g, '') : null,
                scheduledTime: flightDateTime.toISOString()
            },
            pickup: {
                location: bookingData.type === 'arrival' ? 'Bole International Airport' : destination,
                scheduledTime: pickupTime.toISOString()
            },
            dropoff: {
                location: bookingData.type === 'arrival' ? destination : 'Bole International Airport'
            },
            vehicleClass: bookingData.vehicleClass,
            passengers: bookingData.passengers,
            luggage: bookingData.luggage,
            childSeat: bookingData.childSeat,
            meetGreet: bookingData.meetGreet,
            contact: {
                name: document.getElementById('contactName')?.value?.trim() || '',
                phone: document.getElementById('contactPhone')?.value?.trim() || '',
                email: document.getElementById('contactEmail')?.value?.trim() || null
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
        form.style.display = 'none';
        document.querySelector('.booking-progress').style.display = 'none';
        successSection.style.display = 'block';

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

    // ========================================
    // Initialize on DOM Ready
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
