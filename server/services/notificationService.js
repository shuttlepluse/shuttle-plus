// ========================================
// Notification Service
// ========================================
// Multi-channel notifications: Push, SMS, WhatsApp, Email
// ========================================

const webPush = require('web-push');
const emailService = require('./emailService');
const smsTemplates = require('./smsTemplates');

// Twilio setup (conditional)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );
}

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:bookings@shuttleplus.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

// ========================================
// Send Push Notification
// ========================================
async function sendPushNotification(subscription, payload) {
    if (!subscription?.endpoint) {
        console.log('[Notification] No push subscription provided');
        return null;
    }

    try {
        const result = await webPush.sendNotification(
            subscription,
            JSON.stringify(payload)
        );
        console.log('[Notification] Push sent successfully');
        return { success: true, result };
    } catch (error) {
        console.error('[Notification] Push failed:', error.message);

        // Handle expired subscriptions
        if (error.statusCode === 404 || error.statusCode === 410) {
            return { success: false, expired: true };
        }

        return { success: false, error: error.message };
    }
}

// ========================================
// Send SMS
// ========================================
async function sendSMS(phone, message) {
    // Development mode - just log
    if (!twilioClient) {
        console.log(`[Notification] SMS (dev mode) to ${phone}: ${message}`);
        return { success: true, mode: 'development' };
    }

    try {
        const result = await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });

        console.log(`[Notification] SMS sent to ${phone}: ${result.sid}`);
        return { success: true, messageId: result.sid };

    } catch (error) {
        console.error('[Notification] SMS failed:', error.message);
        return { success: false, error: error.message };
    }
}

// ========================================
// Send WhatsApp Message
// ========================================
async function sendWhatsApp(phone, message) {
    if (!twilioClient || !process.env.TWILIO_WHATSAPP_NUMBER) {
        console.log(`[Notification] WhatsApp (dev mode) to ${phone}: ${message}`);
        return { success: true, mode: 'development' };
    }

    try {
        const result = await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: `whatsapp:${phone}`
        });

        console.log(`[Notification] WhatsApp sent to ${phone}: ${result.sid}`);
        return { success: true, messageId: result.sid };

    } catch (error) {
        console.error('[Notification] WhatsApp failed:', error.message);
        return { success: false, error: error.message };
    }
}

// ========================================
// Send Notification (Multi-Channel)
// ========================================
async function sendNotification(user, notification) {
    const results = {
        push: null,
        sms: null,
        whatsapp: null
    };

    const prefs = user.notificationPreferences || {};

    // Try push first
    if (prefs.push && user.pushSubscription?.endpoint) {
        results.push = await sendPushNotification(user.pushSubscription, {
            title: notification.title,
            body: notification.body,
            icon: '/images/icons/icon-192x192.png',
            badge: '/images/icons/icon-96x96.png',
            data: notification.data,
            tag: notification.tag || 'shuttle-notification'
        });
    }

    // If push failed or not available, try SMS
    if ((!results.push?.success) && prefs.sms && user.phone) {
        results.sms = await sendSMS(user.phone, `${notification.title}: ${notification.body}`);
    }

    // WhatsApp as additional channel
    if (prefs.whatsapp && user.phone) {
        results.whatsapp = await sendWhatsApp(user.phone, `*${notification.title}*\n${notification.body}`);
    }

    return results;
}

// ========================================
// Booking Notification Templates
// ========================================
async function sendBookingConfirmation(booking, language = 'en') {
    const message = {
        title: 'Booking Confirmed!',
        body: `Your transfer to ${booking.dropoff.location} is confirmed. Reference: ${booking.bookingReference}`,
        tag: 'booking-confirmation',
        data: {
            type: 'confirmation',
            bookingId: booking._id.toString(),
            url: `/pages/tickets.html?id=${booking.bookingReference}`
        }
    };

    const results = { sms: null, email: null, push: null };

    // Send SMS using template
    const smsMessage = smsTemplates.getBookingConfirmation(booking, language);
    results.sms = await sendSMS(booking.contact.phone, smsMessage);

    // Send email confirmation
    if (booking.contact.email) {
        results.email = await emailService.sendBookingConfirmation(booking);
    }

    // If user exists, send push
    if (booking.userId) {
        const User = require('../models/User');
        const user = await User.findById(booking.userId);
        if (user) {
            results.push = await sendNotification(user, message);
        }
    }

    // Record notification sent
    booking.notificationsSent.push({
        type: 'confirmation',
        channel: 'multi',
        sentAt: new Date(),
        status: 'sent',
        results
    });
    await booking.save();

    return message;
}

async function sendDriverAssignedNotification(booking, language = 'en') {
    const message = {
        title: 'Driver Assigned',
        body: `${booking.driver.name} will pick you up in a ${booking.driver.vehicleModel}. Plate: ${booking.driver.vehiclePlate}`,
        tag: 'driver-assigned',
        data: {
            type: 'driver_assigned',
            bookingId: booking._id.toString(),
            url: `/pages/tracking.html?id=${booking.bookingReference}`
        }
    };

    const results = { sms: null, email: null };

    // Send SMS using template
    const smsMessage = smsTemplates.getDriverAssigned(booking, language);
    results.sms = await sendSMS(booking.contact.phone, smsMessage);

    // Send driver assigned email
    if (booking.contact.email) {
        results.email = await emailService.sendDriverAssigned(booking);
    }

    booking.notificationsSent.push({
        type: 'driver_assigned',
        channel: 'multi',
        sentAt: new Date(),
        status: 'sent',
        results
    });
    await booking.save();

    return message;
}

async function sendDriverEnrouteNotification(booking, eta = 15, language = 'en') {
    const message = {
        title: 'Driver On The Way',
        body: `Your driver is heading to the pickup point. Track live on the app.`,
        tag: 'driver-enroute',
        data: {
            type: 'driver_enroute',
            bookingId: booking._id.toString(),
            url: `/pages/tracking.html?id=${booking.bookingReference}`
        }
    };

    // Send SMS using template
    const smsMessage = smsTemplates.getDriverEnroute(booking, eta, language);
    await sendSMS(booking.contact.phone, smsMessage);

    booking.notificationsSent.push({
        type: 'driver_enroute',
        channel: 'sms',
        sentAt: new Date(),
        status: 'sent'
    });
    await booking.save();

    return message;
}

async function sendDriverArrivedNotification(booking, language = 'en') {
    const message = {
        title: 'Driver Has Arrived',
        body: `Your driver is waiting at ${booking.pickup.location}`,
        tag: 'driver-arrived',
        data: {
            type: 'driver_arrived',
            bookingId: booking._id.toString()
        }
    };

    // Send SMS using template
    const smsMessage = smsTemplates.getDriverArrived(booking, language);
    await sendSMS(booking.contact.phone, smsMessage);

    booking.notificationsSent.push({
        type: 'driver_arrived',
        channel: 'sms',
        sentAt: new Date(),
        status: 'sent'
    });
    await booking.save();

    return message;
}

async function sendFlightDelayNotification(booking, newArrivalTime, language = 'en') {
    const message = {
        title: 'Flight Delay Detected',
        body: `Your flight is delayed. New arrival: ${new Date(newArrivalTime).toLocaleTimeString()}. We've updated your pickup time.`,
        tag: 'flight-delay',
        data: {
            type: 'flight_delay',
            bookingId: booking._id.toString()
        }
    };

    const results = { sms: null, email: null };

    // Send SMS using template
    const originalTime = booking.flight.scheduledTime;
    const smsMessage = smsTemplates.getFlightDelay(booking, originalTime, newArrivalTime, language);
    results.sms = await sendSMS(booking.contact.phone, smsMessage);

    // Send flight delay email
    if (booking.contact.email) {
        results.email = await emailService.sendFlightDelayEmail(booking, newArrivalTime);
    }

    booking.notificationsSent.push({
        type: 'flight_delay',
        channel: 'multi',
        sentAt: new Date(),
        status: 'sent',
        results
    });
    await booking.save();

    return message;
}

async function sendCancellationNotification(booking, refundAmount = null, language = 'en') {
    const results = { sms: null, email: null };

    // Send SMS using template
    const smsMessage = smsTemplates.getCancellation(booking, refundAmount, language);
    results.sms = await sendSMS(booking.contact.phone, smsMessage);

    // Send cancellation email
    if (booking.contact.email) {
        results.email = await emailService.sendCancellationConfirmation(booking, refundAmount);
    }

    booking.notificationsSent.push({
        type: 'cancellation',
        channel: 'multi',
        sentAt: new Date(),
        status: 'sent',
        results
    });
    await booking.save();
}

// ========================================
// Trip Reminder Notification
// ========================================
async function sendTripReminderNotification(booking, reminderType = '2h', language = 'en') {
    const message = {
        title: 'Trip Reminder',
        body: `Your pickup is coming up soon! Driver: ${booking.driver?.name || 'TBA'}`,
        tag: 'trip-reminder',
        data: {
            type: 'trip_reminder',
            bookingId: booking._id.toString(),
            url: `/pages/tracking.html?id=${booking.bookingReference}`
        }
    };

    const results = { sms: null, email: null };

    // Send SMS using template (24h, 2h, or 30m reminder)
    const smsMessage = smsTemplates.getReminder(booking, reminderType, language);
    results.sms = await sendSMS(booking.contact.phone, smsMessage);

    // Send reminder email
    if (booking.contact.email) {
        results.email = await emailService.sendTripReminder(booking);
    }

    booking.notificationsSent.push({
        type: 'trip_reminder',
        channel: 'multi',
        sentAt: new Date(),
        status: 'sent',
        results
    });
    await booking.save();

    return message;
}

// ========================================
// Trip Completed Notification
// ========================================
async function sendTripCompletedNotification(booking, language = 'en') {
    const results = { sms: null, email: null };

    // Send SMS using template
    const smsMessage = smsTemplates.getTripCompleted(booking, language);
    results.sms = await sendSMS(booking.contact.phone, smsMessage);

    // Send trip completed email
    if (booking.contact.email) {
        results.email = await emailService.sendTripCompletedEmail(booking);
    }

    booking.notificationsSent.push({
        type: 'trip_completed',
        channel: 'multi',
        sentAt: new Date(),
        status: 'sent',
        results
    });
    await booking.save();
}

module.exports = {
    sendPushNotification,
    sendSMS,
    sendWhatsApp,
    sendNotification,
    sendBookingConfirmation,
    sendDriverAssignedNotification,
    sendDriverEnrouteNotification,
    sendDriverArrivedNotification,
    sendFlightDelayNotification,
    sendCancellationNotification,
    sendTripReminderNotification,
    sendTripCompletedNotification,
    emailService,
    smsTemplates
};
