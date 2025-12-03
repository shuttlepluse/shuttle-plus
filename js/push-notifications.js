// ========================================
// Push Notifications Handler
// ========================================

(function() {
    'use strict';

    // ========================================
    // Configuration
    // ========================================
    const VAPID_PUBLIC_KEY = null; // Will be fetched from server

    // ========================================
    // State
    // ========================================
    let swRegistration = null;
    let isSubscribed = false;
    let vapidPublicKey = null;

    // ========================================
    // Initialize
    // ========================================
    async function init() {
        // Check if push notifications are supported
        if (!('PushManager' in window)) {
            console.log('[Push] Push notifications not supported');
            return;
        }

        // Check if service worker is ready
        if (!('serviceWorker' in navigator)) {
            console.log('[Push] Service Worker not supported');
            return;
        }

        try {
            // Wait for service worker to be ready
            swRegistration = await navigator.serviceWorker.ready;
            console.log('[Push] Service Worker is ready');

            // Fetch VAPID public key from server
            await fetchVapidKey();

            // Check subscription status
            await checkSubscription();

        } catch (error) {
            console.error('[Push] Initialization failed:', error);
        }
    }

    // ========================================
    // Fetch VAPID Key
    // ========================================
    async function fetchVapidKey() {
        try {
            const response = await fetch('/api/config/vapid');
            if (response.ok) {
                const data = await response.json();
                vapidPublicKey = data.publicKey;
                console.log('[Push] VAPID key loaded');
            }
        } catch (error) {
            console.log('[Push] VAPID key not available - notifications disabled');
        }
    }

    // ========================================
    // Check Subscription Status
    // ========================================
    async function checkSubscription() {
        if (!swRegistration) return;

        try {
            const subscription = await swRegistration.pushManager.getSubscription();
            isSubscribed = subscription !== null;

            if (isSubscribed) {
                console.log('[Push] User is subscribed');
                // Update UI if needed
                updateSubscriptionUI(true);
            } else {
                console.log('[Push] User is not subscribed');
                updateSubscriptionUI(false);
            }
        } catch (error) {
            console.error('[Push] Error checking subscription:', error);
        }
    }

    // ========================================
    // Request Permission
    // ========================================
    async function requestPermission() {
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('[Push] Notification permission granted');
            return true;
        } else if (permission === 'denied') {
            console.log('[Push] Notification permission denied');
            return false;
        } else {
            console.log('[Push] Notification permission dismissed');
            return false;
        }
    }

    // ========================================
    // Subscribe to Push Notifications
    // ========================================
    async function subscribe() {
        if (!vapidPublicKey) {
            console.log('[Push] Cannot subscribe - VAPID key not available');
            showNotificationPrompt();
            return null;
        }

        // Request permission first
        const hasPermission = await requestPermission();
        if (!hasPermission) {
            return null;
        }

        try {
            // Convert VAPID key to Uint8Array
            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

            // Subscribe
            const subscription = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            console.log('[Push] Subscribed:', subscription);

            // Send subscription to server
            await sendSubscriptionToServer(subscription);

            isSubscribed = true;
            updateSubscriptionUI(true);

            return subscription;

        } catch (error) {
            console.error('[Push] Subscription failed:', error);
            return null;
        }
    }

    // ========================================
    // Unsubscribe from Push Notifications
    // ========================================
    async function unsubscribe() {
        try {
            const subscription = await swRegistration.pushManager.getSubscription();

            if (subscription) {
                // Unsubscribe from push manager
                await subscription.unsubscribe();

                // Remove from server
                await removeSubscriptionFromServer(subscription);

                isSubscribed = false;
                updateSubscriptionUI(false);

                console.log('[Push] Unsubscribed');
                return true;
            }
        } catch (error) {
            console.error('[Push] Unsubscribe failed:', error);
        }
        return false;
    }

    // ========================================
    // Send Subscription to Server
    // ========================================
    async function sendSubscriptionToServer(subscription) {
        try {
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('auth_token') && {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    })
                },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    userAgent: navigator.userAgent
                })
            });

            if (response.ok) {
                console.log('[Push] Subscription sent to server');
                // Store subscription endpoint locally
                localStorage.setItem('push_endpoint', subscription.endpoint);
            }
        } catch (error) {
            console.error('[Push] Failed to send subscription to server:', error);
        }
    }

    // ========================================
    // Remove Subscription from Server
    // ========================================
    async function removeSubscriptionFromServer(subscription) {
        try {
            await fetch('/api/notifications/subscribe', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('auth_token') && {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    })
                },
                body: JSON.stringify({
                    endpoint: subscription.endpoint
                })
            });

            localStorage.removeItem('push_endpoint');
        } catch (error) {
            console.error('[Push] Failed to remove subscription from server:', error);
        }
    }

    // ========================================
    // Show Local Notification
    // ========================================
    async function showLocalNotification(title, options = {}) {
        if (!swRegistration) {
            console.log('[Push] Service worker not ready');
            return;
        }

        const defaultOptions = {
            icon: '/images/icons/icon-192x192.png',
            badge: '/images/icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            tag: 'shuttle-plus',
            renotify: true,
            requireInteraction: false,
            ...options
        };

        try {
            await swRegistration.showNotification(title, defaultOptions);
        } catch (error) {
            console.error('[Push] Failed to show notification:', error);
        }
    }

    // ========================================
    // Show Notification Prompt
    // ========================================
    function showNotificationPrompt() {
        // Check if we should show prompt (not dismissed recently)
        const lastDismissed = localStorage.getItem('notification_prompt_dismissed');
        if (lastDismissed) {
            const daysSinceDismissed = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < 7) return; // Don't show for 7 days after dismissal
        }

        // Check if already subscribed
        if (isSubscribed) return;

        // Create prompt element
        const prompt = document.createElement('div');
        prompt.className = 'notification-prompt';
        prompt.innerHTML = `
            <div class="notification-prompt-content">
                <div class="notification-prompt-icon">
                    <i class="fas fa-bell"></i>
                </div>
                <div class="notification-prompt-text">
                    <strong>Get Trip Updates</strong>
                    <span>Enable notifications for driver updates and flight alerts</span>
                </div>
            </div>
            <div class="notification-prompt-actions">
                <button class="notification-prompt-enable">Enable</button>
                <button class="notification-prompt-dismiss">Not now</button>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .notification-prompt {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                background: white;
                padding: 1rem 1.25rem;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                gap: 1rem;
                max-width: 340px;
                width: calc(100% - 2rem);
                z-index: 9999;
                opacity: 0;
                transition: all 0.3s ease;
            }
            .notification-prompt.show {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
            .notification-prompt-content {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            .notification-prompt-icon {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #597B87 0%, #183251 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.25rem;
                flex-shrink: 0;
            }
            .notification-prompt-text {
                display: flex;
                flex-direction: column;
            }
            .notification-prompt-text strong {
                color: #183251;
                font-size: 1rem;
            }
            .notification-prompt-text span {
                color: #666;
                font-size: 0.85rem;
            }
            .notification-prompt-actions {
                display: flex;
                gap: 0.75rem;
            }
            .notification-prompt-enable {
                flex: 1;
                padding: 0.75rem;
                background: linear-gradient(135deg, #597B87 0%, #183251 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
            }
            .notification-prompt-dismiss {
                padding: 0.75rem 1rem;
                background: #f0f0f0;
                color: #666;
                border: none;
                border-radius: 8px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(prompt);

        // Show with animation
        setTimeout(() => prompt.classList.add('show'), 100);

        // Event listeners
        prompt.querySelector('.notification-prompt-enable').addEventListener('click', async () => {
            prompt.remove();
            await subscribe();
        });

        prompt.querySelector('.notification-prompt-dismiss').addEventListener('click', () => {
            localStorage.setItem('notification_prompt_dismissed', Date.now().toString());
            prompt.classList.remove('show');
            setTimeout(() => prompt.remove(), 300);
        });

        // Auto-dismiss after 30 seconds
        setTimeout(() => {
            if (document.body.contains(prompt)) {
                prompt.classList.remove('show');
                setTimeout(() => prompt.remove(), 300);
            }
        }, 30000);
    }

    // ========================================
    // Update UI Based on Subscription
    // ========================================
    function updateSubscriptionUI(subscribed) {
        // Update any notification toggle buttons
        document.querySelectorAll('[data-notification-toggle]').forEach(btn => {
            btn.dataset.subscribed = subscribed ? 'true' : 'false';
            btn.textContent = subscribed ? 'Notifications On' : 'Enable Notifications';
        });
    }

    // ========================================
    // Utility: Convert VAPID Key
    // ========================================
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // ========================================
    // Booking Notification Helpers
    // ========================================
    const BookingNotifications = {
        // Notify booking confirmation
        confirmed: (bookingRef) => {
            showLocalNotification('Booking Confirmed!', {
                body: `Your transfer ${bookingRef} has been confirmed.`,
                data: { type: 'booking_confirmed', bookingRef },
                actions: [
                    { action: 'view', title: 'View Ticket' }
                ]
            });
        },

        // Notify driver assigned
        driverAssigned: (bookingRef, driverName) => {
            showLocalNotification('Driver Assigned', {
                body: `${driverName} will pick you up. Tap to track.`,
                data: { type: 'driver_assigned', bookingRef },
                actions: [
                    { action: 'track', title: 'Track Driver' },
                    { action: 'call', title: 'Call Driver' }
                ]
            });
        },

        // Notify driver arriving
        driverArriving: (bookingRef, minutes) => {
            showLocalNotification('Driver Arriving Soon', {
                body: `Your driver will arrive in ${minutes} minutes.`,
                data: { type: 'driver_arriving', bookingRef },
                requireInteraction: true
            });
        },

        // Notify driver arrived
        driverArrived: (bookingRef) => {
            showLocalNotification('Driver Has Arrived!', {
                body: 'Your driver is waiting at the pickup point.',
                data: { type: 'driver_arrived', bookingRef },
                vibrate: [200, 100, 200, 100, 200],
                requireInteraction: true
            });
        },

        // Notify flight delay
        flightDelay: (bookingRef, flightNumber, newTime) => {
            showLocalNotification('Flight Update', {
                body: `Flight ${flightNumber} delayed. New pickup: ${newTime}`,
                data: { type: 'flight_delay', bookingRef },
                tag: `flight-${flightNumber}`
            });
        }
    };

    // ========================================
    // Export API
    // ========================================
    window.PushNotifications = {
        init,
        subscribe,
        unsubscribe,
        isSubscribed: () => isSubscribed,
        showPrompt: showNotificationPrompt,
        showNotification: showLocalNotification,
        booking: BookingNotifications
    };

    // ========================================
    // Initialize on Load
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Show notification prompt after 10 seconds on booking-related pages
    setTimeout(() => {
        const isBookingPage = window.location.pathname.includes('booking') ||
                              window.location.pathname.includes('tickets') ||
                              window.location.pathname.includes('tracking');
        if (isBookingPage && !isSubscribed && Notification.permission === 'default') {
            showNotificationPrompt();
        }
    }, 10000);

})();
