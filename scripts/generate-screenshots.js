/**
 * Screenshot Generator for PWA
 *
 * This script generates PWA screenshots using Puppeteer.
 * Run: npm install puppeteer && node scripts/generate-screenshots.js
 *
 * Make sure the server is running on localhost:3000 first.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'images', 'screenshots');
const BASE_URL = 'http://localhost:3000';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const screenshots = [
    // Wide screenshots (desktop)
    {
        name: 'home.png',
        url: '/',
        width: 1280,
        height: 720,
        type: 'wide'
    },
    {
        name: 'booking-desktop.png',
        url: '/pages/booking.html',
        width: 1280,
        height: 720,
        type: 'wide'
    },
    // Narrow screenshots (mobile)
    {
        name: 'booking.png',
        url: '/pages/booking.html',
        width: 375,
        height: 667,
        type: 'narrow'
    },
    {
        name: 'tickets.png',
        url: '/pages/tickets.html',
        width: 375,
        height: 667,
        type: 'narrow'
    },
    {
        name: 'tracking.png',
        url: '/pages/tracking.html?id=demo',
        width: 375,
        height: 667,
        type: 'narrow'
    }
];

async function generateScreenshots() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (const screenshot of screenshots) {
        console.log(`Capturing ${screenshot.name}...`);

        const page = await browser.newPage();
        await page.setViewport({
            width: screenshot.width,
            height: screenshot.height,
            deviceScaleFactor: 2 // Retina quality
        });

        try {
            await page.goto(`${BASE_URL}${screenshot.url}`, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Wait a bit for animations
            await page.waitForTimeout(1000);

            // Take screenshot
            await page.screenshot({
                path: path.join(SCREENSHOTS_DIR, screenshot.name),
                type: 'png'
            });

            console.log(`  Saved ${screenshot.name}`);
        } catch (error) {
            console.error(`  Error capturing ${screenshot.name}:`, error.message);
        }

        await page.close();
    }

    await browser.close();
    console.log('\nAll screenshots generated!');
    console.log(`Location: ${SCREENSHOTS_DIR}`);
}

// Run
generateScreenshots().catch(console.error);
