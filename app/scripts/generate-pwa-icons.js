/**
 * Script to generate PWA icons from a source image
 *
 * Usage:
 *   1. Install sharp: npm install sharp --save-dev
 *   2. Place your 1024x1024 icon at assets/icon-source.png
 *   3. Run: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Creating placeholder SVG icons instead.');
  sharp = null;
}

const sizes = [16, 32, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512];
const outputDir = path.join(__dirname, '../public/icons');

// Create SVG icon
function createSvgIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#1a1a2e"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-weight="bold"
        font-size="${size * 0.35}" fill="#6c63ff">K</text>
</svg>`;
}

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const sourceIcon = path.join(__dirname, '../assets/icon-source.png');
  const hasSource = fs.existsSync(sourceIcon);

  if (sharp && hasSource) {
    // Generate from source image
    console.log('Generating icons from source image...');
    for (const size of sizes) {
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
      console.log(`  Created icon-${size}x${size}.png`);
    }
  } else {
    // Generate from SVG
    console.log('Generating placeholder SVG icons...');
    for (const size of sizes) {
      const svg = createSvgIcon(size);
      const outputPath = path.join(outputDir, `icon-${size}x${size}.svg`);
      fs.writeFileSync(outputPath, svg);
      console.log(`  Created icon-${size}x${size}.svg`);

      // Also create PNG version using sharp if available
      if (sharp) {
        await sharp(Buffer.from(svg))
          .png()
          .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
        console.log(`  Created icon-${size}x${size}.png`);
      }
    }
  }

  // Create favicon.ico placeholder (copy 32x32)
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  if (!fs.existsSync(faviconPath)) {
    if (sharp && hasSource) {
      await sharp(sourceIcon)
        .resize(32, 32)
        .toFile(faviconPath);
    } else {
      // Just create a note file
      fs.writeFileSync(
        path.join(__dirname, '../public/FAVICON_NOTE.txt'),
        'Please convert icon-32x32.svg to favicon.ico using an online converter'
      );
    }
  }

  console.log('\nDone! Icons created in public/icons/');
  console.log('\nNote: For best results, provide a 1024x1024 PNG at assets/icon-source.png');
  console.log('Then re-run this script after installing sharp: npm install sharp --save-dev');
}

generateIcons().catch(console.error);
