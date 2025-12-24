/**
 * Placeholder Image Generator
 *
 * Generates white placeholder images with descriptive text
 * Run with: node scripts/generate-placeholders.js
 *
 * IMAGE SPECIFICATIONS (Portrait Mobile):
 * - Location backgrounds: 720x1280 (9:16 portrait)
 * - Character portraits: 400x600 (2:3 portrait)
 * - Clue/evidence photos: 600x400 (3:2 landscape)
 * - Mystery thumbnail: 450x800 (9:16 portrait)
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MYSTERY_PATH = join(__dirname, '../mysteries/blackwood-manor/assets');

// Image specifications (Portrait Mobile)
const SPECS = {
  location: { width: 720, height: 1280 },
  character: { width: 400, height: 600 },
  clue: { width: 600, height: 400 },
  thumbnail: { width: 450, height: 800 },
  map: { width: 720, height: 900 },
};

function createPlaceholder(width, height, text, filename) {
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
  const words = text.split(' ');
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

  // "PLACEHOLDER" watermark
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#999999';
  ctx.fillText('PLACEHOLDER', width / 2, height - 20);

  // Save the image
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(filename, buffer);
  console.log(`Created: ${filename}`);
}

/**
 * Create a floor plan map placeholder showing room layout
 */
function createMapPlaceholder(filename) {
  const { width, height } = SPECS.map;
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
  ctx.fillText('PLACEHOLDER - MANOR FLOOR PLAN', width / 2, height - 20);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(filename, buffer);
  console.log(`Created: ${filename}`);
}

// Ensure directories exist
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Location descriptions for placeholders
const locations = {
  'foyer': 'Grand entrance hall with marble floors, sweeping staircase, crystal chandelier, and dark wood paneling. Evening lighting with shadows. 1920s aristocratic English manor.',
  'study': 'Crime scene. Dark wood-paneled study with large desk, leather chairs, bookshelves. Body outline on floor near desk. Brandy decanter visible. Fireplace. Evening lamplight.',
  'library': 'Two-story library with rolling ladders, leather armchairs, reading lamps. Large windows with heavy drapes. 1920s English manor atmosphere.',
  'dining-room': 'Formal dining room with long mahogany table set for dinner party. Candelabras, fine china, seating for 8. Crystal chandelier overhead.',
  'kitchen': 'Large manor kitchen with copper pots, cast iron stove, preparation tables. Servants domain. Pantry door visible in background.',
  'garden': 'Moonlit formal garden with hedgerows, stone pathways, garden benches. Manor house visible in background. Stone path shows muddy footprints.',
};

// Character descriptions for placeholders
const characters = {
  'detective-foster': 'Detective Sarah Foster - Professional woman in 1920s attire, notepad in hand. Keen intelligent eyes, practical short hair. Tweed jacket.',
  'lady-margaret': 'Lady Margaret Blackwood - Elegant aristocratic woman, 50s, pearls, expensive black mourning dress. Dignified but with hint of hidden emotions.',
  'james-hartley': 'James Hartley - Distinguished man, 40s, business suit, slightly nervous demeanor. Well-groomed but sweating slightly. Expensive watch.',
  'dr-chen': 'Dr. Elizabeth Chen - Professional woman, 40s, doctor attire of 1920s era. Medical bag nearby. Composed, observant expression.',
  'thomas-reed': 'Thomas Reed - Butler, 60s, formal butler attire, silver hair, dignified posture. Loyal, protective expression. White gloves.',
  'victoria-sterling': 'Victoria Sterling - Young beautiful woman, 20s, artistic bohemian style dress. Red-rimmed eyes from crying. Paint-stained fingers.',
};

// Clue/evidence descriptions for placeholders
const clues = {
  'brandy-glass': 'Close-up of crystal brandy glass on desk. Amber liquid residue at bottom with slight white powder residue on rim. Fingerprints visible.',
  'business-contract': 'Legal document on desk. "Partnership Dissolution Agreement" header visible. Signature lines, one signed, one blank. Red wax seal.',
  'reading-glasses': 'Elegant ladies reading glasses with gold frames. One lens cracked. Lying on carpet near desk.',
  'spilled-brandy': 'Dark stain on Persian rug. Dried brandy spill pattern. Small fragments of broken glass nearby.',
  'financial-ledger': 'Open leather-bound ledger book. Columns of numbers. Red ink entries showing losses. Recent date visible.',
  'love-letters': 'Bundle of handwritten letters tied with ribbon. Feminine handwriting. Partial text visible: "My dearest..." Pressed flower.',
  'seating-chart': 'Hand-drawn diagram of dinner table. Names written at each seat position. Arrows showing who sat next to whom.',
  'poison-bottle': 'Small brown medicine bottle in pantry. Skull and crossbones label partially torn. "Arsenic" text visible. Cork stopper.',
  'prescription-note': 'Doctor prescription pad note. "For medicinal purposes only" text. Dr. Chen signature. Dosage instructions.',
  'muddy-footprints': 'Muddy boot prints on stone path. Leading from garden gate toward manor. Size suggests male. Fresh mud.',
};

// Generate all placeholders
async function main() {
  console.log('Generating placeholder images...\n');
  console.log('IMAGE SPECIFICATIONS (Portrait Mobile):');
  console.log(`  Locations:  ${SPECS.location.width}x${SPECS.location.height}px (9:16)`);
  console.log(`  Characters: ${SPECS.character.width}x${SPECS.character.height}px (2:3)`);
  console.log(`  Clues:      ${SPECS.clue.width}x${SPECS.clue.height}px (3:2)`);
  console.log(`  Thumbnail:  ${SPECS.thumbnail.width}x${SPECS.thumbnail.height}px (9:16)`);
  console.log('');

  // Ensure asset directories exist
  ensureDir(join(MYSTERY_PATH, 'locations'));
  ensureDir(join(MYSTERY_PATH, 'characters'));
  ensureDir(join(MYSTERY_PATH, 'clues'));

  // Generate location images
  console.log('--- LOCATIONS ---');
  for (const [id, description] of Object.entries(locations)) {
    createPlaceholder(
      SPECS.location.width,
      SPECS.location.height,
      description,
      join(MYSTERY_PATH, 'locations', `${id}.png`)
    );
  }

  // Generate character images
  console.log('\n--- CHARACTERS ---');
  for (const [id, description] of Object.entries(characters)) {
    createPlaceholder(
      SPECS.character.width,
      SPECS.character.height,
      description,
      join(MYSTERY_PATH, 'characters', `${id}.png`)
    );
  }

  // Generate clue images
  console.log('\n--- CLUES ---');
  for (const [id, description] of Object.entries(clues)) {
    createPlaceholder(
      SPECS.clue.width,
      SPECS.clue.height,
      description,
      join(MYSTERY_PATH, 'clues', `${id}.png`)
    );
  }

  // Generate thumbnail
  console.log('\n--- THUMBNAIL ---');
  createPlaceholder(
    SPECS.thumbnail.width,
    SPECS.thumbnail.height,
    'Murder at Blackwood Manor - Dark moody image of English manor at night, single lit window, fog, mysterious atmosphere.',
    join(MYSTERY_PATH, 'thumbnail.png')
  );

  // Generate map
  console.log('\n--- MAP ---');
  createMapPlaceholder(join(MYSTERY_PATH, 'map.png'));

  console.log('\n✓ All placeholders generated!');
  console.log('\nTo replace with real art, drop PNG files at the same paths.');
}

main().catch(console.error);
