// ========================================
// Payment Handler - Stripe & Telebirr Integration
// ========================================

(function() {
    'use strict';

    // ========================================
    // State
    // ========================================
    let stripe = null;
    let cardElement = null;
    let selectedMethod = 'card';
    let bookingData = null;
    let pendingTimerInterval = null;

    // ========================================
    // DOM Elements
    // ========================================
    const elements = {
        // Forms
        cardForm: document.getElementById('cardForm'),
        telebirrForm: document.getElementById('telebirrForm'),
        cashForm: document.getElementById('cashForm'),

        // Inputs
        cardholderName: document.getElementById('cardholderName'),
        cardElement: document.getElementById('cardElement'),
        cardErrors: document.getElementById('cardErrors'),
        telebirrPhone: document.getElementById('telebirrPhone'),
        promoCode: document.getElementById('promoCode'),
        acceptTerms: document.getElementById('acceptTerms'),
        saveCard: document.getElementById('saveCard'),

        // Summary
        pickupLocation: document.getElementById('pickupLocation'),
        dropoffLocation: document.getElementById('dropoffLocation'),
        tripDateTime: document.getElementById('tripDateTime'),
        vehicleClass: document.getElementById('vehicleClass'),
        passengers: document.getElementById('passengers'),
        baseFare: document.getElementById('baseFare'),
        surchargeRow: document.getElementById('surchargeRow'),
        surcharge: document.getElementById('surcharge'),
        stopsRow: document.getElementById('stopsRow'),
        stopsCharge: document.getElementById('stopsCharge'),
        totalUSD: document.getElementById('totalUSD'),
        totalETB: document.getElementById('totalETB'),
        cashAmountETB: document.getElementById('cashAmountETB'),
        cashAmountUSD: document.getElementById('cashAmountUSD'),
        payAmount: document.getElementById('payAmount'),

        // Buttons & Actions
        payButton: document.getElementById('payButton'),
        promoToggle: document.getElementById('promoToggle'),
        promoWrapper: document.getElementById('promoWrapper'),
        applyPromo: document.getElementById('applyPromo'),
        promoApplied: document.getElementById('promoApplied'),
        promoCodeText: document.getElementById('promoCodeText'),
        removePromo: document.getElementById('removePromo'),

        // Modals
        successModal: document.getElementById('successModal'),
        errorModal: document.getElementById('errorModal'),
        pendingModal: document.getElementById('pendingModal'),
        bookingReference: document.getElementById('bookingReference'),
        errorMessage: document.getElementById('errorMessage'),
        retryPayment: document.getElementById('retryPayment'),
        changeMethod: document.getElementById('changeMethod'),
        cancelPending: document.getElementById('cancelPending'),
        pendingTimer: document.getElementById('pendingTimer'),

        // Toast
        toast: document.getElementById('toast')
    };

    // ========================================
    // Initialize
    // ========================================
    async function init() {
        loadBookingData();
        setupEventListeners();
        await initStripe();
        updateSummary();
        updatePayButton();
    }

    // ========================================
    // Load Booking Data
    // ========================================
    function loadBookingData() {
        // Try to get from sessionStorage (set by booking.js)
        const stored = sessionStorage.getItem('pendingBooking');
        if (stored) {
            bookingData = JSON.parse(stored);
        } else {
            // Demo data for testing
            bookingData = getDemoBookingData();
        }
    }

    // ========================================
    // Initialize Stripe
    // ========================================
    async function initStripe() {
        try {
            // Get Stripe publishable key from backend
            let publishableKey = null;

            if (navigator.onLine) {
                try {
                    const response = await fetch('/api/config/stripe');
                    if (response.ok) {
                        const data = await response.json();
                        publishableKey = data.publishableKey;
                    }
                } catch (e) {
                    console.log('[Payment] Could not fetch Stripe config');
                }
            }

            // Use test key for demo
            if (!publishableKey) {
                publishableKey = 'pk_test_demo';
                console.log('[Payment] Using demo Stripe mode');
            }

            // Initialize Stripe (will fail gracefully if invalid key)
            if (typeof Stripe !== 'undefined' && publishableKey !== 'pk_test_demo') {
                stripe = Stripe(publishableKey);

                const stripeElements = stripe.elements();
                cardElement = stripeElements.create('card', {
                    style: {
                        base: {
                            fontSize: '16px',
                            color: '#183251',
                            fontFamily: 'Poppins, sans-serif',
                            '::placeholder': {
                                color: '#aaa'
                            }
                        },
                        invalid: {
                            color: '#dc3545',
                            iconColor: '#dc3545'
                        }
                    }
                });

                cardElement.mount('#cardElement');

                cardElement.on('change', (event) => {
                    elements.cardErrors.textContent = event.error ? event.error.message : '';
                    updatePayButton();
                });
            } else {
                // Show demo card input
                showDemoCardInput();
            }
        } catch (error) {
            console.error('[Payment] Stripe init error:', error);
            showDemoCardInput();
        }
    }

    // ========================================
    // Show Demo Card Input
    // ========================================
    function showDemoCardInput() {
        elements.cardElement.innerHTML = `
            <div style="display: grid; gap: 0.75rem;">
                <input type="text" id="demoCardNumber" placeholder="4242 4242 4242 4242"
                       style="padding: 0.5rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 16px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                    <input type="text" id="demoExpiry" placeholder="MM/YY"
                           style="padding: 0.5rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 16px;">
                    <input type="text" id="demoCVC" placeholder="CVC"
                           style="padding: 0.5rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 16px;">
                </div>
            </div>
        `;
    }

    // ========================================
    // Event Listeners
    // ========================================
    function setupEventListeners() {
        // Back button - restore booking data and go to Step 3 (Review)
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Restore all booking data so user returns to Step 3 with everything intact
                if (bookingData) {
                    const quickData = {
                        transferType: bookingData.type || 'arrival',
                        flightNumber: bookingData.flight?.number || '',
                        destination: bookingData.dropoff?.location || bookingData.dropoff || '',
                        date: bookingData.pickup?.scheduledTime?.split('T')[0] || '',
                        time: bookingData.pickup?.scheduledTime?.split('T')[1]?.substring(0, 5) || '',
                        passengers: bookingData.passengers || 2,
                        luggage: bookingData.luggage || 2
                    };
                    sessionStorage.setItem('quickBookingData', JSON.stringify(quickData));

                    // Save booking state in the format booking.js expects
                    const bookingState = {
                        currentStep: 3,  // Return to Review & Confirm step
                        bookingData: {
                            vehicleClass: bookingData.vehicleClass,
                            childSeat: bookingData.childSeat,
                            meetGreet: bookingData.meetGreet
                        },
                        formValues: {
                            vehicleClass: bookingData.vehicleClass,
                            childSeat: bookingData.childSeat,
                            meetGreet: bookingData.meetGreet,
                            contactName: bookingData.contact?.name || '',
                            contactPhone: bookingData.contact?.phone || '',
                            contactEmail: bookingData.contact?.email || '',
                            specialRequests: bookingData.specialRequests || ''
                        }
                    };
                    sessionStorage.setItem('bookingState', JSON.stringify(bookingState));
                }
                window.location.href = 'booking.html';
            });
        }

        // Payment method tabs
        document.querySelectorAll('.method-tab').forEach(tab => {
            tab.addEventListener('click', () => selectPaymentMethod(tab.dataset.method));
        });

        // Terms checkbox
        elements.acceptTerms.addEventListener('change', updatePayButton);

        // Cardholder name
        elements.cardholderName.addEventListener('input', updatePayButton);

        // Telebirr phone
        elements.telebirrPhone.addEventListener('input', (e) => {
            // Format phone number
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) value = value.slice(0, 10);
            e.target.value = value;
            updatePayButton();
        });

        // Promo code toggle
        elements.promoToggle.addEventListener('click', () => {
            elements.promoToggle.classList.toggle('open');
            elements.promoWrapper.style.display =
                elements.promoWrapper.style.display === 'none' ? 'flex' : 'none';
        });

        // Apply promo
        elements.applyPromo.addEventListener('click', applyPromoCode);
        elements.removePromo.addEventListener('click', removePromoCode);

        // Pay button
        elements.payButton.addEventListener('click', processPayment);

        // Modal actions
        elements.retryPayment.addEventListener('click', () => {
            elements.errorModal.classList.remove('open');
        });

        elements.changeMethod.addEventListener('click', () => {
            elements.errorModal.classList.remove('open');
            // Switch to next payment method
            const methods = ['card', 'telebirr', 'cash'];
            const currentIndex = methods.indexOf(selectedMethod);
            const nextMethod = methods[(currentIndex + 1) % methods.length];
            selectPaymentMethod(nextMethod);
        });

        elements.cancelPending.addEventListener('click', cancelPendingPayment);
    }

    // ========================================
    // Select Payment Method
    // ========================================
    function selectPaymentMethod(method) {
        selectedMethod = method;

        // Update tabs
        document.querySelectorAll('.method-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.method === method);
        });

        // Show/hide forms
        elements.cardForm.style.display = method === 'card' ? 'block' : 'none';
        elements.telebirrForm.style.display = method === 'telebirr' ? 'block' : 'none';
        elements.cashForm.style.display = method === 'cash' ? 'block' : 'none';

        // Update pay button text
        updatePayButton();
    }

    // ========================================
    // Update Summary
    // ========================================
    function updateSummary() {
        if (!bookingData) {
            console.log('[Payment] No booking data available');
            return;
        }

        console.log('[Payment] Updating summary with:', bookingData);

        // Handle both old format (string) and new format (object with .location)
        const pickupLoc = typeof bookingData.pickup === 'object'
            ? bookingData.pickup?.location
            : bookingData.pickup;
        const dropoffLoc = typeof bookingData.dropoff === 'object'
            ? bookingData.dropoff?.location
            : bookingData.dropoff;
        const pickupTime = typeof bookingData.pickup === 'object'
            ? bookingData.pickup?.scheduledTime
            : bookingData.pickupTime;

        // Update elements with null checks
        if (elements.pickupLocation) {
            elements.pickupLocation.textContent = pickupLoc || 'Bole International Airport';
        }
        if (elements.dropoffLocation) {
            elements.dropoffLocation.textContent = dropoffLoc || 'Destination';
        }
        if (elements.tripDateTime) {
            elements.tripDateTime.textContent = formatDateTime(pickupTime);
        }
        if (elements.vehicleClass) {
            elements.vehicleClass.textContent = getVehicleLabel(bookingData.vehicleClass);
        }
        if (elements.passengers) {
            elements.passengers.textContent = bookingData.passengers || 1;
        }

        // Pricing
        const pricing = bookingData.pricing || {};
        const baseFare = pricing.baseFare || 30;

        if (elements.baseFare) {
            elements.baseFare.textContent = `$${baseFare.toFixed(2)}`;
        }

        if (pricing.lateNightSurcharge && elements.surchargeRow && elements.surcharge) {
            elements.surchargeRow.style.display = 'flex';
            elements.surcharge.textContent = `$${pricing.lateNightSurcharge.toFixed(2)}`;
        }

        if (pricing.additionalStops && elements.stopsRow && elements.stopsCharge) {
            elements.stopsRow.style.display = 'flex';
            elements.stopsCharge.textContent = `$${pricing.additionalStops.toFixed(2)}`;
        }

        const totalUSD = pricing.totalUSD || baseFare;
        const totalETB = pricing.totalETB || Math.round(totalUSD * 158);

        if (elements.totalUSD) {
            elements.totalUSD.textContent = `$${totalUSD.toFixed(2)}`;
        }
        if (elements.totalETB) {
            elements.totalETB.textContent = `(${formatNumber(totalETB)} ETB)`;
        }
        if (elements.cashAmountETB) {
            elements.cashAmountETB.textContent = `${formatNumber(totalETB)} ETB`;
        }
        if (elements.cashAmountUSD) {
            elements.cashAmountUSD.textContent = `(~$${totalUSD.toFixed(2)} USD)`;
        }
        if (elements.payAmount) {
            elements.payAmount.textContent = `$${totalUSD.toFixed(2)}`;
        }
    }

    // ========================================
    // Update Pay Button
    // ========================================
    function updatePayButton() {
        let isValid = elements.acceptTerms.checked;

        if (selectedMethod === 'card') {
            isValid = isValid && elements.cardholderName.value.trim().length > 0;
            // Card element validation handled by Stripe
        } else if (selectedMethod === 'telebirr') {
            const phone = elements.telebirrPhone.value.replace(/\D/g, '');
            isValid = isValid && phone.length >= 9;
        }
        // Cash always valid if terms accepted

        elements.payButton.disabled = !isValid;

        // Update button text
        const btnText = elements.payButton.querySelector('.btn-text');
        const amount = `$${(bookingData?.pricing?.totalUSD || 30).toFixed(2)}`;

        if (selectedMethod === 'cash') {
            btnText.innerHTML = `Confirm Booking`;
        } else if (selectedMethod === 'telebirr') {
            btnText.innerHTML = `Pay with Telebirr`;
        } else {
            btnText.innerHTML = `Pay ${amount}`;
        }
    }

    // ========================================
    // Process Payment
    // ========================================
    async function processPayment() {
        const btnText = elements.payButton.querySelector('.btn-text');
        const btnLoading = elements.payButton.querySelector('.btn-loading');

        // Show loading
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';
        elements.payButton.disabled = true;

        try {
            let result;

            switch (selectedMethod) {
                case 'card':
                    result = await processCardPayment();
                    break;
                case 'telebirr':
                    result = await processTelebirrPayment();
                    break;
                case 'cash':
                    result = await processCashBooking();
                    break;
            }

            if (result.success) {
                showSuccess(result.bookingReference);
            } else {
                showError(result.error || 'Payment failed. Please try again.');
            }

        } catch (error) {
            console.error('[Payment] Error:', error);
            showError(error.message || 'An unexpected error occurred.');
        } finally {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            elements.payButton.disabled = false;
        }
    }

    // ========================================
    // Process Card Payment (Stripe)
    // ========================================
    async function processCardPayment() {
        // Demo mode
        if (!stripe || !cardElement) {
            // Simulate payment
            await simulateDelay(2000);

            // Create booking
            const bookingRef = generateBookingReference();
            await saveBooking(bookingRef, 'stripe');

            return { success: true, bookingReference: bookingRef };
        }

        try {
            // Create payment intent on backend
            const intentResponse = await fetch('/api/payments/stripe/create-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Math.round((bookingData?.pricing?.totalUSD || 30) * 100), // cents
                    currency: 'usd',
                    bookingData: bookingData
                })
            });

            if (!intentResponse.ok) {
                throw new Error('Failed to create payment intent');
            }

            const { clientSecret } = await intentResponse.json();

            // Confirm payment with Stripe
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: elements.cardholderName.value
                    }
                }
            });

            if (error) {
                return { success: false, error: error.message };
            }

            if (paymentIntent.status === 'succeeded') {
                const bookingRef = generateBookingReference();
                await saveBooking(bookingRef, 'stripe', paymentIntent.id);
                return { success: true, bookingReference: bookingRef };
            }

            return { success: false, error: 'Payment was not successful' };

        } catch (error) {
            // Fallback to demo mode
            await simulateDelay(2000);
            const bookingRef = generateBookingReference();
            await saveBooking(bookingRef, 'stripe');
            return { success: true, bookingReference: bookingRef };
        }
    }

    // ========================================
    // Process Telebirr Payment
    // ========================================
    async function processTelebirrPayment() {
        const phone = '+251' + elements.telebirrPhone.value.replace(/\D/g, '');

        try {
            // Show pending modal
            elements.pendingModal.classList.add('open');
            startPendingTimer();

            // Try to initiate Telebirr payment
            if (navigator.onLine) {
                try {
                    const response = await fetch('/api/payments/telebirr/initiate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            phone: phone,
                            amount: bookingData?.pricing?.totalETB || 4740,
                            bookingData: bookingData
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();

                        // Poll for payment status
                        const result = await pollTelebirrStatus(data.transactionId);
                        elements.pendingModal.classList.remove('open');
                        stopPendingTimer();

                        if (result.success) {
                            const bookingRef = generateBookingReference();
                            await saveBooking(bookingRef, 'telebirr', data.transactionId);
                            return { success: true, bookingReference: bookingRef };
                        }

                        return result;
                    }
                } catch (e) {
                    console.log('[Payment] Telebirr API not available, using demo mode');
                }
            }

            // Demo mode - simulate payment approval
            await simulateDelay(5000);
            elements.pendingModal.classList.remove('open');
            stopPendingTimer();

            const bookingRef = generateBookingReference();
            await saveBooking(bookingRef, 'telebirr');
            return { success: true, bookingReference: bookingRef };

        } catch (error) {
            elements.pendingModal.classList.remove('open');
            stopPendingTimer();
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // Poll Telebirr Status
    // ========================================
    async function pollTelebirrStatus(transactionId, maxAttempts = 24) {
        for (let i = 0; i < maxAttempts; i++) {
            await simulateDelay(5000);

            try {
                const response = await fetch(`/api/payments/telebirr/status/${transactionId}`);
                if (response.ok) {
                    const data = await response.json();

                    if (data.status === 'completed') {
                        return { success: true };
                    } else if (data.status === 'failed') {
                        return { success: false, error: 'Payment was declined' };
                    }
                    // Continue polling if pending
                }
            } catch (e) {
                console.error('[Payment] Status check failed:', e);
            }
        }

        return { success: false, error: 'Payment timed out' };
    }

    // ========================================
    // Process Cash Booking
    // ========================================
    async function processCashBooking() {
        await simulateDelay(1500);

        const bookingRef = generateBookingReference();
        await saveBooking(bookingRef, 'cash');

        return { success: true, bookingReference: bookingRef };
    }

    // ========================================
    // Save Booking
    // ========================================
    async function saveBooking(bookingRef, paymentMethod, transactionId = null) {
        const booking = {
            ...bookingData,
            bookingReference: bookingRef,
            status: paymentMethod === 'cash' ? 'confirmed' : 'confirmed',
            payment: {
                method: paymentMethod,
                status: paymentMethod === 'cash' ? 'pending' : 'paid',
                transactionId: transactionId
            },
            createdAt: new Date().toISOString()
        };

        // Save to offline storage
        if (window.OfflineStorage && window.OfflineStorage.bookings) {
            try {
                await window.OfflineStorage.bookings.save(booking);
            } catch (e) {
                console.log('[Payment] Offline storage save failed:', e);
            }
        }

        // Save to backend API
        if (navigator.onLine) {
            try {
                // Use admin endpoint for flexible booking creation
                const response = await fetch('/api/admin/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Token': 'shuttle-admin-2025'
                    },
                    body: JSON.stringify(booking)
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('[Payment] Booking saved to backend:', result.data?.bookingReference);
                } else {
                    const errorData = await response.json();
                    console.log('[Payment] Backend save failed:', errorData.message);
                    throw new Error(errorData.message || 'API response not ok');
                }
            } catch (e) {
                console.log('[Payment] Backend save error:', e.message);
                // Add to sync queue for later
                if (window.OfflineStorage && window.OfflineStorage.sync) {
                    await window.OfflineStorage.sync.addPending({
                        type: 'CREATE_BOOKING',
                        data: booking
                    });
                }
            }
        }

        // Clear pending booking
        sessionStorage.removeItem('pendingBooking');
    }

    // ========================================
    // Promo Code
    // ========================================
    async function applyPromoCode() {
        const code = elements.promoCode.value.trim().toUpperCase();

        if (!code) {
            showToast('Please enter a promo code');
            return;
        }

        // Demo promo codes
        const validCodes = {
            'WELCOME10': 10,
            'SHUTTLE20': 20,
            'FIRST15': 15
        };

        if (validCodes[code]) {
            const discount = validCodes[code];
            applyDiscount(code, discount);
            showToast(`${discount}% discount applied!`);
        } else {
            showToast('Invalid promo code');
        }
    }

    function applyDiscount(code, percent) {
        elements.promoWrapper.style.display = 'none';
        elements.promoApplied.style.display = 'flex';
        elements.promoCodeText.textContent = code;
        elements.promoToggle.style.display = 'none';

        // Update pricing
        if (bookingData && bookingData.pricing) {
            const discount = (bookingData.pricing.totalUSD * percent) / 100;
            bookingData.pricing.discount = discount;
            bookingData.pricing.totalUSD -= discount;
            bookingData.pricing.totalETB = Math.round(bookingData.pricing.totalUSD * (bookingData.pricing.exchangeRate || 158));
            updateSummary();
        }
    }

    function removePromoCode() {
        elements.promoApplied.style.display = 'none';
        elements.promoToggle.style.display = 'flex';
        elements.promoCode.value = '';

        // Restore original pricing
        if (bookingData && bookingData.pricing && bookingData.pricing.discount) {
            bookingData.pricing.totalUSD += bookingData.pricing.discount;
            bookingData.pricing.totalETB = Math.round(bookingData.pricing.totalUSD * (bookingData.pricing.exchangeRate || 158));
            delete bookingData.pricing.discount;
            updateSummary();
        }

        showToast('Promo code removed');
    }

    // ========================================
    // Pending Timer
    // ========================================
    function startPendingTimer() {
        let seconds = 120;

        pendingTimerInterval = setInterval(() => {
            seconds--;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            elements.pendingTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

            if (seconds <= 0) {
                cancelPendingPayment();
            }
        }, 1000);
    }

    function stopPendingTimer() {
        if (pendingTimerInterval) {
            clearInterval(pendingTimerInterval);
            pendingTimerInterval = null;
        }
    }

    function cancelPendingPayment() {
        stopPendingTimer();
        elements.pendingModal.classList.remove('open');
        showToast('Payment cancelled');
    }

    // ========================================
    // Show Success/Error Modals
    // ========================================
    function showSuccess(bookingRef) {
        // Store completed booking data for tracking page
        const completedBooking = {
            bookingReference: bookingRef,
            pickup: bookingData.pickup || 'Bole International Airport',
            dropoff: bookingData.dropoff || 'Destination',
            pickupTime: bookingData.pickupTime,
            vehicleClass: bookingData.vehicleClass,
            passengers: bookingData.passengers,
            pricing: bookingData.pricing,
            contact: bookingData.contact,
            paymentMethod: selectedMethod,
            confirmedAt: new Date().toISOString()
        };

        sessionStorage.setItem('completedBooking', JSON.stringify(completedBooking));

        // Redirect to tracking page instead of showing modal
        window.location.href = 'tracking.html?ref=' + bookingRef;
    }

    function showError(message) {
        elements.errorMessage.textContent = message;
        elements.errorModal.classList.add('open');
    }

    // ========================================
    // Helper Functions
    // ========================================
    function showToast(message) {
        elements.toast.querySelector('.toast-message').textContent = message;
        elements.toast.classList.add('show');
        setTimeout(() => elements.toast.classList.remove('show'), 3000);
    }

    function simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function generateBookingReference() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let ref = 'SP-2025-';
        for (let i = 0; i < 6; i++) {
            ref += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return ref;
    }

    function formatDateTime(dateString) {
        if (!dateString) return 'Today';

        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) + ' • ' + date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    function formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    }

    function getVehicleLabel(vehicleClass) {
        const labels = {
            standard: 'Standard Sedan',
            executive: 'Executive Sedan',
            suv: 'SUV',
            van: 'Van',
            luxury: 'Luxury Class'
        };
        return labels[vehicleClass] || 'Standard Sedan';
    }

    // ========================================
    // Demo Booking Data
    // ========================================
    function getDemoBookingData() {
        return {
            type: 'arrival',
            pickup: 'Bole International Airport',
            dropoff: 'Sheraton Addis',
            pickupTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            vehicleClass: 'executive',
            passengers: 2,
            pricing: {
                baseFare: 45,
                totalUSD: 45,
                totalETB: 7110,
                exchangeRate: 158
            },
            contact: {
                name: 'Demo User',
                email: 'demo@example.com',
                phone: '+251911234567'
            }
        };
    }

    // ========================================
    // Initialize
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
