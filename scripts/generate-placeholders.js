/**
 * Placeholder Image Generator
 *
 * Generates placeholder images from asset JSON metadata files.
 * Run with: node scripts/generate-placeholders.js [mystery-id]
 *
 * IMAGE SPECIFICATIONS (Portrait Mobile):
 * - Location backgrounds: 720x1280 (9:16 portrait)
 * - Character portraits: 400x600 (2:3 portrait)
 * - Clue/evidence photos: 600x400 (3:2 landscape)
 * - Mystery thumbnail: 450x800 (9:16 portrait)
 * - Map: 720x900
 */

import { createCanvas } from 'canvas';
import { writeFileSync, readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MYSTERIES_PATH = join(__dirname, '../mysteries');

/**
 * Create a placeholder image from JSON metadata
 */
function createPlaceholder(metadata, outputPath) {
  const { width, height, prompt, name } = metadata;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Light gray border
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  // Diagonal lines pattern (subtle)
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;
  for (let i = -height; i < width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
  }

  // Text background box
  const padding = 20;
  const maxWidth = width - padding * 2;

  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Word wrap the text
  const words = prompt.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth - 40) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  // Calculate text block height
  const lineHeight = 32;
  const textBlockHeight = lines.length * lineHeight + padding * 2;
  const textBlockY = (height - textBlockHeight) / 2;

  // Semi-transparent background for text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(padding, textBlockY, width - padding * 2, textBlockHeight);
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 2;
  ctx.strokeRect(padding, textBlockY, width - padding * 2, textBlockHeight);

  // Draw text
  ctx.fillStyle = '#666666';
  lines.forEach((line, i) => {
    const y = textBlockY + padding + lineHeight / 2 + i * lineHeight;
    ctx.fillText(line, width / 2, y);
  });

  // "PLACEHOLDER" watermark with asset name
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#999999';
  ctx.fillText(`PLACEHOLDER: ${name}`, width / 2, height - 20);

  // Save the image
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outputPath, buffer);
  console.log(`  Created: ${outputPath}`);
}

/**
 * Create a floor plan map placeholder (special case with room layout)
 */
function createMapPlaceholder(metadata, outputPath) {
  const { width, height } = metadata;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Aged parchment background
  ctx.fillStyle = '#f5f0e1';
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = '#8b7355';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Title
  ctx.font = 'bold 28px Georgia';
  ctx.fillStyle = '#4a3728';
  ctx.textAlign = 'center';
  ctx.fillText('BLACKWOOD MANOR', width / 2, 60);
  ctx.font = 'italic 16px Georgia';
  ctx.fillText('Floor Plan', width / 2, 85);

  // Room positions (matching manifest mapPosition percentages)
  const rooms = [
    { name: 'Library', x: 0.25, y: 0.25, w: 140, h: 100 },
    { name: 'Study', x: 0.75, y: 0.25, w: 140, h: 100 },
    { name: 'Foyer', x: 0.50, y: 0.45, w: 160, h: 120 },
    { name: 'Dining Room', x: 0.75, y: 0.65, w: 140, h: 100 },
    { name: 'Kitchen', x: 0.75, y: 0.85, w: 140, h: 80 },
    { name: 'Garden', x: 0.25, y: 0.75, w: 160, h: 120 },
  ];

  // Draw connections first (behind rooms)
  ctx.strokeStyle = '#8b7355';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 5]);

  const connections = [
    ['Library', 'Study'],
    ['Library', 'Foyer'],
    ['Study', 'Foyer'],
    ['Foyer', 'Dining Room'],
    ['Foyer', 'Garden'],
    ['Dining Room', 'Kitchen'],
  ];

  for (const [from, to] of connections) {
    const fromRoom = rooms.find(r => r.name === from);
    const toRoom = rooms.find(r => r.name === to);
    ctx.beginPath();
    ctx.moveTo(fromRoom.x * width, fromRoom.y * height);
    ctx.lineTo(toRoom.x * width, toRoom.y * height);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Draw rooms
  for (const room of rooms) {
    const rx = room.x * width - room.w / 2;
    const ry = room.y * height - room.h / 2;

    // Room background
    ctx.fillStyle = room.name === 'Garden' ? '#d4e6d4' : '#fff8e7';
    ctx.fillRect(rx, ry, room.w, room.h);

    // Room border
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, room.w, room.h);

    // Room name
    ctx.font = 'bold 14px Georgia';
    ctx.fillStyle = '#4a3728';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(room.name, room.x * width, room.y * height);
  }

  // Compass rose (simple)
  ctx.font = 'bold 14px Georgia';
  ctx.fillStyle = '#8b7355';
  ctx.fillText('N', width - 50, 120);
  ctx.beginPath();
  ctx.moveTo(width - 50, 130);
  ctx.lineTo(width - 55, 150);
  ctx.lineTo(width - 50, 145);
  ctx.lineTo(width - 45, 150);
  ctx.closePath();
  ctx.fill();

  // Instructions
  ctx.font = 'italic 12px Georgia';
  ctx.fillStyle = '#666';
  ctx.fillText('Tap a connected room to move there', width / 2, height - 40);

  // PLACEHOLDER watermark
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#999999';
  ctx.fillText('PLACEHOLDER: Manor Floor Plan', width / 2, height - 20);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outputPath, buffer);
  console.log(`  Created: ${outputPath}`);
}

/**
 * Process all JSON files in a directory and generate placeholders
 */
function processDirectory(dirPath, type) {
  if (!existsSync(dirPath)) {
    console.log(`  Directory not found: ${dirPath}`);
    return;
  }

  const files = readdirSync(dirPath).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const jsonPath = join(dirPath, file);
    const metadata = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    const id = basename(file, '.json');
    const outputPath = join(dirPath, `ph_${id}.png`);

    if (type === 'map') {
      createMapPlaceholder(metadata, outputPath);
    } else {
      createPlaceholder(metadata, outputPath);
    }
  }
}

/**
 * Process a single JSON file in the assets root
 */
function processSingleAsset(assetsPath, name, type) {
  const jsonPath = join(assetsPath, `${name}.json`);
  if (!existsSync(jsonPath)) {
    console.log(`  Not found: ${jsonPath}`);
    return;
  }

  const metadata = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const outputPath = join(assetsPath, `ph_${name}.png`);

  if (type === 'map') {
    createMapPlaceholder(metadata, outputPath);
  } else {
    createPlaceholder(metadata, outputPath);
  }
}

/**
 * Generate all placeholders for a mystery
 */
function generateForMystery(mysteryId) {
  const assetsPath = join(MYSTERIES_PATH, mysteryId, 'assets');

  if (!existsSync(assetsPath)) {
    console.error(`Mystery assets not found: ${assetsPath}`);
    return false;
  }

  console.log(`\nGenerating placeholders for: ${mysteryId}`);
  console.log('='.repeat(50));

  // Process subdirectories
  console.log('\n--- LOCATIONS ---');
  processDirectory(join(assetsPath, 'locations'), 'location');

  console.log('\n--- CHARACTERS ---');
  processDirectory(join(assetsPath, 'characters'), 'character');

  console.log('\n--- CLUES ---');
  processDirectory(join(assetsPath, 'clues'), 'clue');

  // Process root assets
  console.log('\n--- THUMBNAIL ---');
  processSingleAsset(assetsPath, 'thumbnail', 'thumbnail');

  console.log('\n--- MAP ---');
  processSingleAsset(assetsPath, 'map', 'map');

  return true;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  console.log('Placeholder Image Generator');
  console.log('===========================\n');
  console.log('IMAGE SPECIFICATIONS:');
  console.log('  Locations:  720x1280px (9:16 portrait)');
  console.log('  Characters: 400x600px (2:3 portrait)');
  console.log('  Clues:      600x400px (3:2 landscape)');
  console.log('  Thumbnail:  450x800px (9:16 portrait)');
  console.log('  Map:        720x900px');

  if (args.length > 0) {
    // Generate for specific mystery
    const mysteryId = args[0];
    if (generateForMystery(mysteryId)) {
      console.log(`\n✓ Placeholders generated for ${mysteryId}!`);
    }
  } else {
    // Generate for all mysteries
    const entries = readdirSync(MYSTERIES_PATH, { withFileTypes: true });
    let count = 0;

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (generateForMystery(entry.name)) {
          count++;
        }
      }
    }

    console.log(`\n✓ Placeholders generated for ${count} mystery(s)!`);
  }

  console.log('\nTo replace with real art:');
  console.log('  1. Create your image matching the specs in the JSON file');
  console.log('  2. Save as r_<asset-id>.png in the same directory');
  console.log('  3. Update status in JSON to "final"');
  console.log('  4. Run npm run validate-assets to verify');
}

main().catch(console.error);
