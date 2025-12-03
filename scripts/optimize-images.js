/**
 * Image Optimization Script for Shuttle Plus
 *
 * This script optimizes images for web performance:
 * - Compresses PNG files using sharp
 * - Converts large PNGs to WebP format
 * - Creates responsive image variants
 * - Generates a report of space savings
 *
 * Run: npm install sharp && node scripts/optimize-images.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.log('Installing sharp for image optimization...');
    console.log('Run: npm install sharp');
    console.log('\nAlternatively, use an online tool like:');
    console.log('- TinyPNG: https://tinypng.com');
    console.log('- Squoosh: https://squoosh.app');
    process.exit(0);
}

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const OUTPUT_DIR = path.join(__dirname, '..', 'images', 'optimized');

// Optimization settings
const settings = {
    png: {
        quality: 80,
        compressionLevel: 9
    },
    webp: {
        quality: 80
    },
    jpeg: {
        quality: 80,
        mozjpeg: true
    },
    // Size threshold for WebP conversion (bytes)
    webpThreshold: 100 * 1024 // 100KB
};

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Track statistics
const stats = {
    processed: 0,
    originalSize: 0,
    optimizedSize: 0,
    webpCreated: 0,
    errors: []
};

/**
 * Get all image files recursively
 */
function getImageFiles(dir, files = []) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && item !== 'optimized') {
            getImageFiles(fullPath, files);
        } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
                files.push({
                    path: fullPath,
                    name: item,
                    ext,
                    size: stat.size,
                    relativePath: path.relative(IMAGES_DIR, fullPath)
                });
            }
        }
    }

    return files;
}

/**
 * Optimize a single image
 */
async function optimizeImage(file) {
    const outputPath = path.join(OUTPUT_DIR, file.relativePath);
    const outputDir = path.dirname(outputPath);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        let pipeline = sharp(file.path);

        // Get metadata
        const metadata = await pipeline.metadata();

        // Optimize based on format
        if (file.ext === '.png') {
            pipeline = pipeline.png({
                quality: settings.png.quality,
                compressionLevel: settings.png.compressionLevel,
                palette: true
            });
        } else if (['.jpg', '.jpeg'].includes(file.ext)) {
            pipeline = pipeline.jpeg({
                quality: settings.jpeg.quality,
                mozjpeg: settings.jpeg.mozjpeg
            });
        }

        // Save optimized image
        await pipeline.toFile(outputPath);

        const newStat = fs.statSync(outputPath);
        const savings = file.size - newStat.size;
        const savingsPercent = ((savings / file.size) * 100).toFixed(1);

        stats.originalSize += file.size;
        stats.optimizedSize += newStat.size;
        stats.processed++;

        console.log(`  ${file.name}: ${formatSize(file.size)} → ${formatSize(newStat.size)} (${savingsPercent}% saved)`);

        // Create WebP version for large images
        if (file.size > settings.webpThreshold && file.ext !== '.webp') {
            const webpPath = outputPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
            await sharp(file.path)
                .webp({ quality: settings.webp.quality })
                .toFile(webpPath);

            const webpStat = fs.statSync(webpPath);
            console.log(`  → WebP: ${formatSize(webpStat.size)}`);
            stats.webpCreated++;
        }

        return true;

    } catch (error) {
        stats.errors.push({ file: file.name, error: error.message });
        console.error(`  Error: ${file.name}: ${error.message}`);
        return false;
    }
}

/**
 * Format file size
 */
function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Main optimization function
 */
async function optimizeAllImages() {
    console.log('='.repeat(50));
    console.log('Image Optimization for Shuttle Plus');
    console.log('='.repeat(50));
    console.log(`\nScanning ${IMAGES_DIR}...\n`);

    const files = getImageFiles(IMAGES_DIR);

    if (files.length === 0) {
        console.log('No images found to optimize.');
        return;
    }

    console.log(`Found ${files.length} images to optimize:\n`);

    // Sort by size (largest first)
    files.sort((a, b) => b.size - a.size);

    // Show largest files
    console.log('Largest files:');
    files.slice(0, 5).forEach(f => {
        console.log(`  ${f.name}: ${formatSize(f.size)}`);
    });
    console.log('\nOptimizing...\n');

    // Process each image
    for (const file of files) {
        await optimizeImage(file);
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('Optimization Complete!');
    console.log('='.repeat(50));
    console.log(`\nImages processed: ${stats.processed}`);
    console.log(`Original total: ${formatSize(stats.originalSize)}`);
    console.log(`Optimized total: ${formatSize(stats.optimizedSize)}`);
    console.log(`Space saved: ${formatSize(stats.originalSize - stats.optimizedSize)} (${((1 - stats.optimizedSize / stats.originalSize) * 100).toFixed(1)}%)`);
    console.log(`WebP versions created: ${stats.webpCreated}`);

    if (stats.errors.length > 0) {
        console.log(`\nErrors: ${stats.errors.length}`);
        stats.errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
    }

    console.log(`\nOptimized images saved to: ${OUTPUT_DIR}`);
    console.log('\nTo use optimized images, copy them from the optimized folder');
    console.log('or update your HTML/CSS to reference the new paths.');
}

// Run optimization
optimizeAllImages().catch(console.error);
