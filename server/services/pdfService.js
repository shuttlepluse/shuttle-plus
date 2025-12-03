// ========================================
// PDF Service - Ticket Generation
// ========================================
// Generates PDF tickets/receipts for bookings
// Uses PDFKit for PDF generation
// ========================================

const PDFDocument = require('pdfkit');

class PDFService {
    constructor() {
        this.colors = {
            primary: '#597B87',
            secondary: '#183251',
            accent: '#4CAF50',
            text: '#333333',
            lightText: '#666666',
            border: '#e0e0e0'
        };
    }

    /**
     * Generate booking ticket PDF
     */
    async generateTicketPDF(booking) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: 50, bottom: 50, left: 50, right: 50 },
                    info: {
                        Title: `Shuttle Plus Ticket - ${booking.bookingReference}`,
                        Author: 'Shuttle Plus',
                        Subject: 'Airport Transfer Booking Confirmation'
                    }
                });

                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });

                // Generate the ticket content
                this._drawHeader(doc, booking);
                this._drawBookingDetails(doc, booking);
                this._drawTripDetails(doc, booking);
                this._drawDriverInfo(doc, booking);
                this._drawPaymentSummary(doc, booking);
                this._drawQRCode(doc, booking);
                this._drawTerms(doc);
                this._drawFooter(doc);

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    _drawHeader(doc, booking) {
        // Header background
        doc.rect(0, 0, doc.page.width, 120).fill(this.colors.secondary);

        // Logo/Brand
        doc.fillColor('#ffffff')
           .fontSize(28)
           .font('Helvetica-Bold')
           .text('Shuttle', 50, 35, { continued: true })
           .fillColor('rgba(255,255,255,0.7)')
           .text('Plus');

        // Tagline
        doc.fillColor('rgba(255,255,255,0.9)')
           .fontSize(10)
           .font('Helvetica')
           .text('Premium Airport Transfer Service', 50, 70);

        // Booking Reference (right side)
        doc.fillColor('#ffffff')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text('BOOKING CONFIRMATION', 350, 35, { width: 200, align: 'right' });

        doc.fontSize(18)
           .text(booking.bookingReference, 350, 55, { width: 200, align: 'right' });

        // Status badge
        const statusColor = booking.status === 'confirmed' ? '#4CAF50' :
                           booking.status === 'pending' ? '#FF9800' : '#666666';
        doc.roundedRect(450, 85, 100, 22, 3)
           .fill(statusColor);
        doc.fillColor('#ffffff')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(booking.status.toUpperCase(), 450, 90, { width: 100, align: 'center' });

        doc.moveDown(3);
    }

    _drawBookingDetails(doc, booking) {
        const startY = 140;

        // Section title
        doc.fillColor(this.colors.secondary)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('Passenger Details', 50, startY);

        doc.moveTo(50, startY + 18).lineTo(545, startY + 18).stroke(this.colors.border);

        // Customer info
        doc.fillColor(this.colors.text)
           .fontSize(11)
           .font('Helvetica');

        const detailsY = startY + 30;

        doc.font('Helvetica-Bold')
           .text('Name:', 50, detailsY);
        doc.font('Helvetica')
           .text(booking.contact?.name || 'N/A', 150, detailsY);

        doc.font('Helvetica-Bold')
           .text('Email:', 300, detailsY);
        doc.font('Helvetica')
           .text(booking.contact?.email || 'N/A', 400, detailsY);

        doc.font('Helvetica-Bold')
           .text('Phone:', 50, detailsY + 20);
        doc.font('Helvetica')
           .text(booking.contact?.phone || 'N/A', 150, detailsY + 20);

        doc.font('Helvetica-Bold')
           .text('Passengers:', 300, detailsY + 20);
        doc.font('Helvetica')
           .text(`${booking.passengers || 1} passenger(s)`, 400, detailsY + 20);

        if (booking.luggage) {
            doc.font('Helvetica-Bold')
               .text('Luggage:', 50, detailsY + 40);
            doc.font('Helvetica')
               .text(`${booking.luggage} piece(s)`, 150, detailsY + 40);
        }

        doc.moveDown(2);
    }

    _drawTripDetails(doc, booking) {
        const startY = 250;

        // Section title
        doc.fillColor(this.colors.secondary)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('Trip Details', 50, startY);

        doc.moveTo(50, startY + 18).lineTo(545, startY + 18).stroke(this.colors.border);

        // Trip info box
        const boxY = startY + 30;
        doc.roundedRect(50, boxY, 495, 100, 5)
           .lineWidth(1)
           .stroke(this.colors.border);

        // Date and Time
        const pickupDate = new Date(booking.pickup?.scheduledTime);
        const dateStr = pickupDate.toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Africa/Addis_Ababa'
        });
        const timeStr = pickupDate.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Africa/Addis_Ababa'
        });

        doc.fillColor(this.colors.text)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('Date & Time:', 65, boxY + 15);
        doc.font('Helvetica')
           .text(`${dateStr} at ${timeStr}`, 160, boxY + 15);

        // Pickup location
        doc.fillColor(this.colors.accent)
           .circle(75, boxY + 50, 5)
           .fill();
        doc.fillColor(this.colors.text)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('PICKUP', 90, boxY + 45);
        doc.font('Helvetica')
           .fontSize(11)
           .text(booking.pickup?.location || 'N/A', 160, boxY + 45);

        // Connection line
        doc.moveTo(75, boxY + 58).lineTo(75, boxY + 72)
           .dash(3, { space: 2 })
           .stroke(this.colors.lightText);
        doc.undash();

        // Drop-off location
        doc.fillColor('#ea4335')
           .circle(75, boxY + 80, 5)
           .fill();
        doc.fillColor(this.colors.text)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('DROP-OFF', 90, boxY + 75);
        doc.font('Helvetica')
           .fontSize(11)
           .text(booking.dropoff?.location || 'N/A', 160, boxY + 75);

        // Flight info if available
        if (booking.flightNumber) {
            doc.fillColor(this.colors.lightText)
               .fontSize(10)
               .font('Helvetica')
               .text(`Flight: ${booking.flightNumber}${booking.airline ? ` (${booking.airline})` : ''}`,
                     350, boxY + 75);
        }

        doc.moveDown(2);
    }

    _drawDriverInfo(doc, booking) {
        const startY = 385;

        // Section title
        doc.fillColor(this.colors.secondary)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('Driver & Vehicle', 50, startY);

        doc.moveTo(50, startY + 18).lineTo(545, startY + 18).stroke(this.colors.border);

        if (booking.driver?.name) {
            const infoY = startY + 30;

            // Driver info
            doc.fillColor(this.colors.text)
               .fontSize(11)
               .font('Helvetica-Bold')
               .text('Driver:', 50, infoY);
            doc.font('Helvetica')
               .text(booking.driver.name, 150, infoY);

            doc.font('Helvetica-Bold')
               .text('Phone:', 300, infoY);
            doc.font('Helvetica')
               .text(booking.driver.phone || 'Will be provided', 400, infoY);

            // Vehicle info
            doc.font('Helvetica-Bold')
               .text('Vehicle:', 50, infoY + 20);
            doc.font('Helvetica')
               .text(`${booking.driver.vehicleModel || 'TBA'} - ${booking.driver.vehicleColor || ''}`, 150, infoY + 20);

            doc.font('Helvetica-Bold')
               .text('Plate:', 300, infoY + 20);
            doc.font('Helvetica-Bold')
               .fillColor(this.colors.primary)
               .text(booking.driver.vehiclePlate || 'TBA', 400, infoY + 20);
        } else {
            doc.fillColor(this.colors.lightText)
               .fontSize(11)
               .font('Helvetica-Oblique')
               .text('Driver details will be provided before your pickup time.', 50, startY + 30);
        }

        doc.moveDown(2);
    }

    _drawPaymentSummary(doc, booking) {
        const startY = 470;

        // Section title
        doc.fillColor(this.colors.secondary)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('Payment Summary', 50, startY);

        doc.moveTo(50, startY + 18).lineTo(545, startY + 18).stroke(this.colors.border);

        // Payment box
        const boxY = startY + 30;
        doc.roundedRect(300, boxY, 245, 90, 5)
           .lineWidth(1)
           .stroke(this.colors.border);

        // Price breakdown
        const pricing = booking.pricing || {};

        doc.fillColor(this.colors.text)
           .fontSize(10)
           .font('Helvetica');

        doc.text('Base Fare:', 315, boxY + 12);
        doc.text(`$${(pricing.baseFare || 0).toFixed(2)}`, 445, boxY + 12, { width: 85, align: 'right' });

        if (pricing.extras) {
            doc.text('Extras:', 315, boxY + 28);
            doc.text(`$${(pricing.extras || 0).toFixed(2)}`, 445, boxY + 28, { width: 85, align: 'right' });
        }

        doc.moveTo(315, boxY + 48).lineTo(530, boxY + 48).stroke(this.colors.border);

        // Total
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text('Total:', 315, boxY + 58);
        doc.fillColor(this.colors.accent)
           .text(`$${(pricing.totalUSD || 0).toFixed(2)}`, 400, boxY + 58, { width: 130, align: 'right' });

        doc.fillColor(this.colors.lightText)
           .fontSize(10)
           .font('Helvetica')
           .text(`(ETB ${(pricing.totalETB || 0).toFixed(2)})`, 400, boxY + 75, { width: 130, align: 'right' });

        // Payment status
        const paymentStatus = booking.payment?.status || 'pending';
        const statusColor = paymentStatus === 'paid' ? '#4CAF50' : '#FF9800';

        doc.fillColor(this.colors.text)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('Status:', 50, boxY + 20);
        doc.fillColor(statusColor)
           .text(paymentStatus.toUpperCase(), 100, boxY + 20);

        if (booking.payment?.method) {
            doc.fillColor(this.colors.text)
               .font('Helvetica-Bold')
               .text('Method:', 50, boxY + 38);
            doc.font('Helvetica')
               .text(this._formatPaymentMethod(booking.payment.method), 100, boxY + 38);
        }

        doc.moveDown(2);
    }

    _drawQRCode(doc, booking) {
        const qrY = 580;

        // QR Code placeholder box
        doc.roundedRect(50, qrY, 80, 80, 3)
           .lineWidth(1)
           .stroke(this.colors.border);

        doc.fillColor(this.colors.lightText)
           .fontSize(8)
           .font('Helvetica')
           .text('SCAN TO', 50, qrY + 30, { width: 80, align: 'center' })
           .text('TRACK', 50, qrY + 40, { width: 80, align: 'center' });

        // Tracking info
        doc.fillColor(this.colors.text)
           .fontSize(10)
           .font('Helvetica')
           .text('Track your ride:', 145, qrY + 15);
        doc.fillColor(this.colors.primary)
           .font('Helvetica-Bold')
           .text(`shuttleplus.et/track/${booking.bookingReference}`, 145, qrY + 30);

        doc.fillColor(this.colors.text)
           .fontSize(10)
           .font('Helvetica')
           .text('Need help?', 145, qrY + 55);
        doc.font('Helvetica-Bold')
           .text('+251 91 234 5678', 145, qrY + 70);
    }

    _drawTerms(doc) {
        const termsY = 680;

        doc.fillColor(this.colors.lightText)
           .fontSize(8)
           .font('Helvetica')
           .text('Terms & Conditions:', 50, termsY, { underline: true });

        const terms = [
            'Please be ready 5 minutes before scheduled pickup time.',
            'Free cancellation up to 4 hours before pickup. Late cancellations may incur fees.',
            'Driver will wait up to 30 minutes for airport pickups, 10 minutes for other locations.',
            'Additional stops may incur extra charges.'
        ];

        terms.forEach((term, i) => {
            doc.text(`${i + 1}. ${term}`, 50, termsY + 15 + (i * 12), { width: 495 });
        });
    }

    _drawFooter(doc) {
        const footerY = doc.page.height - 40;

        doc.moveTo(50, footerY).lineTo(545, footerY).stroke(this.colors.border);

        doc.fillColor(this.colors.lightText)
           .fontSize(9)
           .font('Helvetica')
           .text('Shuttle Plus - Premium Airport Transfer Service | www.shuttleplus.et',
                 50, footerY + 10, { width: 495, align: 'center' });

        doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`,
                 50, footerY + 22, { width: 495, align: 'center' });
    }

    _formatPaymentMethod(method) {
        const methods = {
            'stripe': 'Credit/Debit Card',
            'telebirr': 'Telebirr',
            'cash': 'Cash on Arrival',
            'bank_transfer': 'Bank Transfer'
        };
        return methods[method] || method;
    }

    /**
     * Generate receipt PDF
     */
    async generateReceiptPDF(booking) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: [226, 800], // Receipt paper width (80mm)
                    margins: { top: 20, bottom: 20, left: 15, right: 15 }
                });

                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));

                // Receipt header
                doc.fontSize(14)
                   .font('Helvetica-Bold')
                   .text('SHUTTLE PLUS', { align: 'center' });
                doc.fontSize(8)
                   .font('Helvetica')
                   .text('Airport Transfer Receipt', { align: 'center' });

                doc.moveDown(0.5);
                doc.text('─'.repeat(30), { align: 'center' });
                doc.moveDown(0.5);

                // Booking ref
                doc.fontSize(10)
                   .font('Helvetica-Bold')
                   .text(booking.bookingReference, { align: 'center' });

                doc.moveDown(0.5);

                // Date
                const date = new Date(booking.pickup?.scheduledTime);
                doc.fontSize(9)
                   .font('Helvetica')
                   .text(date.toLocaleDateString('en-GB', {
                       timeZone: 'Africa/Addis_Ababa',
                       dateStyle: 'medium'
                   }), { align: 'center' });

                doc.moveDown();

                // Trip details
                doc.fontSize(8)
                   .text(`From: ${booking.pickup?.location || 'N/A'}`);
                doc.text(`To: ${booking.dropoff?.location || 'N/A'}`);

                doc.moveDown();
                doc.text('─'.repeat(30), { align: 'center' });

                // Pricing
                const pricing = booking.pricing || {};
                doc.fontSize(9)
                   .text(`Base Fare:`, { continued: true })
                   .text(`$${(pricing.baseFare || 0).toFixed(2)}`, { align: 'right' });

                if (pricing.extras) {
                    doc.text(`Extras:`, { continued: true })
                       .text(`$${pricing.extras.toFixed(2)}`, { align: 'right' });
                }

                doc.moveDown(0.5);
                doc.text('─'.repeat(30), { align: 'center' });

                doc.fontSize(11)
                   .font('Helvetica-Bold')
                   .text(`TOTAL: $${(pricing.totalUSD || 0).toFixed(2)}`, { align: 'center' });
                doc.fontSize(9)
                   .font('Helvetica')
                   .text(`(ETB ${(pricing.totalETB || 0).toFixed(2)})`, { align: 'center' });

                doc.moveDown();

                // Payment info
                doc.fontSize(8)
                   .text(`Payment: ${this._formatPaymentMethod(booking.payment?.method)}`);
                doc.text(`Status: ${(booking.payment?.status || 'Pending').toUpperCase()}`);

                doc.moveDown();
                doc.text('─'.repeat(30), { align: 'center' });
                doc.moveDown(0.5);

                // Footer
                doc.fontSize(8)
                   .text('Thank you for choosing Shuttle Plus!', { align: 'center' });
                doc.text('www.shuttleplus.et', { align: 'center' });
                doc.text('+251 91 234 5678', { align: 'center' });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = new PDFService();
