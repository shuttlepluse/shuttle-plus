/**
 * PWA Icon Generator Script
 *
 * This script generates PNG icons from the SVG source.
 *
 * Usage:
 *   1. Install sharp: npm install sharp
 *   2. Run: node scripts/generate-icons.js
 *
 * Or manually create icons using online tools:
 *   - https://realfavicongenerator.net
 *   - https://www.pwabuilder.com/imageGenerator
 */

const fs = require('fs');
const path = require('path');

// Icon sizes required for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Paths
const iconsDir = path.join(__dirname, '..', 'images', 'icons');
const svgPath = path.join(iconsDir, 'icon.svg');

async function generateIcons() {
    console.log('PWA Icon Generator');
    console.log('==================\n');

    // Check if sharp is available
    let sharp;
    try {
        sharp = require('sharp');
    } catch (e) {
        console.log('Sharp not installed. Creating placeholder HTML icons instead.\n');
        createPlaceholderIcons();
        return;
    }

    // Read SVG
    const svgBuffer = fs.readFileSync(svgPath);

    console.log('Generating icons from SVG...\n');

    for (const size of ICON_SIZES) {
        const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

        try {
            await sharp(svgBuffer)
                .resize(size, size)
                .png()
                .toFile(outputPath);

            console.log(`  ✓ Generated icon-${size}x${size}.png`);
        } catch (error) {
            console.error(`  ✗ Failed to generate ${size}x${size}:`, error.message);
        }
    }

    // Generate Apple touch icon
    const appleTouchPath = path.join(iconsDir, 'apple-touch-icon.png');
    try {
        await sharp(svgBuffer)
            .resize(180, 180)
            .png()
            .toFile(appleTouchPath);
        console.log('  ✓ Generated apple-touch-icon.png (180x180)');
    } catch (error) {
        console.error('  ✗ Failed to generate apple-touch-icon:', error.message);
    }

    // Generate favicon
    const faviconPath = path.join(iconsDir, 'favicon-32x32.png');
    try {
        await sharp(svgBuffer)
            .resize(32, 32)
            .png()
            .toFile(faviconPath);
        console.log('  ✓ Generated favicon-32x32.png');
    } catch (error) {
        console.error('  ✗ Failed to generate favicon:', error.message);
    }

    console.log('\nDone! Icons generated successfully.');
}

function createPlaceholderIcons() {
    console.log('Creating placeholder PNG files...\n');
    console.log('Note: These are minimal placeholders. For production, use:');
    console.log('  1. Install sharp: npm install sharp');
    console.log('  2. Re-run this script: node scripts/generate-icons.js');
    console.log('  Or use https://realfavicongenerator.net with your SVG\n');

    // Create a simple 1x1 pixel PNG as placeholder
    // PNG header + IHDR + IDAT + IEND for a 1x1 transparent pixel
    const minimalPNG = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, // bit depth, color type, etc
        0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
        0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // compressed data
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
        0xAE, 0x42, 0x60, 0x82
    ]);

    for (const size of ICON_SIZES) {
        const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
        fs.writeFileSync(outputPath, minimalPNG);
        console.log(`  Created placeholder: icon-${size}x${size}.png`);
    }

    // Apple touch icon
    fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), minimalPNG);
    console.log('  Created placeholder: apple-touch-icon.png');

    // Favicon
    fs.writeFileSync(path.join(iconsDir, 'favicon-32x32.png'), minimalPNG);
    console.log('  Created placeholder: favicon-32x32.png');

    console.log('\nPlaceholder icons created.');
    console.log('\nTo generate proper icons, either:');
    console.log('  1. Run: npm install sharp && node scripts/generate-icons.js');
    console.log('  2. Use an online tool with images/icons/icon.svg');
}

generateIcons().catch(console.error);
