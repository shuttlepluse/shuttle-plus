// ========================================
// SHUTTLE PLUS - PWA Core Application
// ========================================

(function() {
    'use strict';

    // ========================================
    // PWA Configuration
    // ========================================
    const PWA_CONFIG = {
        swPath: '/sw.js',
        installPromptDelay: 30000, // 30 seconds after page load
        dismissDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    // Store the deferred install prompt
    let deferredPrompt = null;

    // ========================================
    // Initialize PWA
    // ========================================
    function initPWA() {
        registerServiceWorker();
        setupInstallPrompt();
        setupOnlineOfflineHandlers();
        setupUpdateHandler();
    }

    // ========================================
    // Service Worker Registration
    // ========================================
    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('[PWA] Service Workers not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register(PWA_CONFIG.swPath, {
                scope: '/'
            });

            console.log('[PWA] Service Worker registered:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('[PWA] New Service Worker installing...');

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New content available
                        showUpdateNotification();
                    }
                });
            });

        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error);
        }
    }

    // ========================================
    // Install Prompt Handling
    // ========================================
    function setupInstallPrompt() {
        const installBanner = document.getElementById('pwaInstallBanner');
        const installBtn = document.getElementById('pwaInstallBtn');
        const dismissBtn = document.getElementById('pwaDismissBtn');

        if (!installBanner) return;

        // Check if already installed or dismissed recently
        if (isAppInstalled() || isPromptDismissed()) {
            return;
        }

        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            console.log('[PWA] Install prompt captured');

            // Show banner after delay
            setTimeout(() => {
                if (deferredPrompt && !isAppInstalled()) {
                    showInstallBanner();
                }
            }, PWA_CONFIG.installPromptDelay);
        });

        // Install button click
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (!deferredPrompt) return;

                hideInstallBanner();
                deferredPrompt.prompt();

                const { outcome } = await deferredPrompt.userChoice;
                console.log('[PWA] User response:', outcome);

                if (outcome === 'accepted') {
                    console.log('[PWA] App installed');
                    trackEvent('pwa_installed');
                }

                deferredPrompt = null;
            });
        }

        // Dismiss button click
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                hideInstallBanner();
                setPromptDismissed();
                trackEvent('pwa_install_dismissed');
            });
        }

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            hideInstallBanner();
            deferredPrompt = null;
            console.log('[PWA] App was installed');
        });
    }

    function showInstallBanner() {
        const banner = document.getElementById('pwaInstallBanner');
        if (banner) {
            banner.classList.add('show');
        }
    }

    function hideInstallBanner() {
        const banner = document.getElementById('pwaInstallBanner');
        if (banner) {
            banner.classList.remove('show');
        }
    }

    function isAppInstalled() {
        // Check if running in standalone mode
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return true;
        }
        // iOS Safari check
        if (window.navigator.standalone === true) {
            return true;
        }
        return false;
    }

    function isPromptDismissed() {
        const dismissedAt = localStorage.getItem('pwa_install_dismissed');
        if (!dismissedAt) return false;

        const dismissedTime = parseInt(dismissedAt, 10);
        const now = Date.now();

        return (now - dismissedTime) < PWA_CONFIG.dismissDuration;
    }

    function setPromptDismissed() {
        localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    }

    // ========================================
    // Online/Offline Handling
    // ========================================
    function setupOnlineOfflineHandlers() {
        const offlineIndicator = document.getElementById('offlineIndicator');

        function updateOnlineStatus() {
            if (navigator.onLine) {
                document.body.classList.remove('offline');
                if (offlineIndicator) {
                    offlineIndicator.classList.remove('show');
                }
                console.log('[PWA] Back online');
                // Trigger sync when back online
                triggerBackgroundSync();
            } else {
                document.body.classList.add('offline');
                if (offlineIndicator) {
                    offlineIndicator.classList.add('show');
                }
                console.log('[PWA] Gone offline');
            }
        }

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Initial check
        updateOnlineStatus();
    }

    // ========================================
    // Background Sync
    // ========================================
    async function triggerBackgroundSync() {
        if (!('serviceWorker' in navigator) || !('sync' in window.registration)) {
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-bookings');
            console.log('[PWA] Background sync registered');
        } catch (error) {
            console.log('[PWA] Background sync not available:', error);
        }
    }

    // ========================================
    // Update Handler
    // ========================================
    function setupUpdateHandler() {
        // Listen for controller change (new SW activated)
        navigator.serviceWorker?.addEventListener('controllerchange', () => {
            console.log('[PWA] New Service Worker activated');
            // Optionally reload to get new content
            // window.location.reload();
        });
    }

    function showUpdateNotification() {
        // Create update notification
        const notification = document.createElement('div');
        notification.className = 'pwa-update-notification';
        notification.innerHTML = `
            <div class="pwa-update-content">
                <i class="fas fa-sync-alt"></i>
                <span>New version available!</span>
            </div>
            <button class="pwa-update-btn" onclick="window.location.reload()">
                Update
            </button>
        `;
        document.body.appendChild(notification);

        // Show with animation
        setTimeout(() => notification.classList.add('show'), 100);
    }

    // ========================================
    // Analytics Tracking (placeholder)
    // ========================================
    function trackEvent(eventName, data = {}) {
        console.log('[Analytics]', eventName, data);
        // Implement actual analytics tracking here
        // e.g., Google Analytics, Mixpanel, etc.
    }

    // ========================================
    // Push Notification Permission
    // ========================================
    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('[PWA] Notifications not supported');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    }

    // ========================================
    // Subscribe to Push Notifications
    // ========================================
    async function subscribeToPush() {
        try {
            const registration = await navigator.serviceWorker.ready;

            // Check if already subscribed
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                // Get VAPID public key from server (placeholder)
                const vapidPublicKey = await getVapidPublicKey();

                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
                });

                // Send subscription to server
                await saveSubscription(subscription);
            }

            console.log('[PWA] Push subscription:', subscription);
            return subscription;

        } catch (error) {
            console.error('[PWA] Push subscription failed:', error);
            return null;
        }
    }

    async function getVapidPublicKey() {
        // This would normally fetch from your server
        // Placeholder - will be replaced with actual API call
        return 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    }

    async function saveSubscription(subscription) {
        // Send to server API
        // Placeholder - will be implemented with backend
        console.log('[PWA] Saving subscription to server...');
    }

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
    // Expose Public API
    // ========================================
    window.ShuttlePlusPWA = {
        init: initPWA,
        requestNotificationPermission,
        subscribeToPush,
        isAppInstalled,
        isOnline: () => navigator.onLine,
        triggerSync: triggerBackgroundSync
    };

    // ========================================
    // Auto-initialize on DOM ready
    // ========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPWA);
    } else {
        initPWA();
    }

})();
