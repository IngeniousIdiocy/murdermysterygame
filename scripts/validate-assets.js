/**
 * Asset Validation Script
 *
 * Validates mystery assets against their JSON metadata specs.
 * Run with: node scripts/validate-assets.js [mystery-id]
 *
 * Checks:
 * - All JSON metadata files have corresponding ph_ (placeholder) files
 * - Any r_ (real) files match the expected dimensions
 * - Reports asset status (placeholder-only, has real, complete)
 *
 * Exit codes:
 * - 0: All placeholders exist, any real assets are valid (mystery is testable)
 * - 1: Missing placeholders or dimension mismatches (broken)
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MYSTERIES_PATH = join(__dirname, '../mysteries');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

/**
 * Get image dimensions
 */
async function getImageDimensions(filePath) {
  try {
    const img = await loadImage(filePath);
    return { width: img.width, height: img.height };
  } catch (err) {
    return null;
  }
}

/**
 * Validate a single asset
 */
async function validateAsset(jsonPath, assetDir) {
  const metadata = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const id = basename(jsonPath, '.json');
  const ext = '.png'; // Assuming PNG for now

  const placeholderPath = join(assetDir, `ph_${id}${ext}`);
  const realPath = join(assetDir, `r_${id}${ext}`);

  const result = {
    id,
    name: metadata.name,
    type: metadata.type,
    expectedWidth: metadata.width,
    expectedHeight: metadata.height,
    status: metadata.status || 'unknown',
    hasPlaceholder: existsSync(placeholderPath),
    hasReal: existsSync(realPath),
    placeholderValid: false,
    realValid: false,
    errors: [],
  };

  // Check placeholder
  if (result.hasPlaceholder) {
    const dims = await getImageDimensions(placeholderPath);
    if (dims) {
      if (dims.width === metadata.width && dims.height === metadata.height) {
        result.placeholderValid = true;
      } else {
        result.errors.push(
          `Placeholder dimensions ${dims.width}x${dims.height} don't match spec ${metadata.width}x${metadata.height}`
        );
      }
    } else {
      result.errors.push('Failed to read placeholder image');
    }
  } else {
    result.errors.push('Missing placeholder (ph_) file');
  }

  // Check real asset if exists
  if (result.hasReal) {
    const dims = await getImageDimensions(realPath);
    if (dims) {
      if (dims.width === metadata.width && dims.height === metadata.height) {
        result.realValid = true;
      } else {
        result.errors.push(
          `Real asset dimensions ${dims.width}x${dims.height} don't match spec ${metadata.width}x${metadata.height}`
        );
      }
    } else {
      result.errors.push('Failed to read real asset image');
    }
  }

  return result;
}

/**
 * Validate all assets in a directory
 */
async function validateDirectory(dirPath) {
  const results = [];

  if (!existsSync(dirPath)) {
    return results;
  }

  const jsonFiles = readdirSync(dirPath).filter((f) => f.endsWith('.json'));

  for (const file of jsonFiles) {
    const result = await validateAsset(join(dirPath, file), dirPath);
    results.push(result);
  }

  return results;
}

/**
 * Validate a single root asset (thumbnail, map)
 */
async function validateRootAsset(assetsPath, name) {
  const jsonPath = join(assetsPath, `${name}.json`);
  if (!existsSync(jsonPath)) {
    return null;
  }
  return await validateAsset(jsonPath, assetsPath);
}

/**
 * Validate all assets for a mystery
 */
async function validateMystery(mysteryId) {
  const assetsPath = join(MYSTERIES_PATH, mysteryId, 'assets');

  if (!existsSync(assetsPath)) {
    return { mysteryId, error: 'Assets directory not found', results: [] };
  }

  const results = [];

  // Validate subdirectories
  const locations = await validateDirectory(join(assetsPath, 'locations'));
  const characters = await validateDirectory(join(assetsPath, 'characters'));
  const clues = await validateDirectory(join(assetsPath, 'clues'));

  results.push(...locations, ...characters, ...clues);

  // Validate root assets
  const thumbnail = await validateRootAsset(assetsPath, 'thumbnail');
  const map = await validateRootAsset(assetsPath, 'map');

  if (thumbnail) results.push(thumbnail);
  if (map) results.push(map);

  return { mysteryId, results };
}

/**
 * Print validation report
 */
function printReport(validation) {
  const { mysteryId, error, results } = validation;

  console.log(`\n${colors.blue}Mystery: ${mysteryId}${colors.reset}`);
  console.log('='.repeat(50));

  if (error) {
    console.log(`${colors.red}ERROR: ${error}${colors.reset}`);
    return { total: 0, placeholders: 0, real: 0, errors: 1 };
  }

  let stats = { total: 0, placeholders: 0, real: 0, errors: 0 };

  // Group by type
  const byType = {};
  for (const r of results) {
    if (!byType[r.type]) byType[r.type] = [];
    byType[r.type].push(r);
  }

  for (const [type, assets] of Object.entries(byType)) {
    console.log(`\n${type.toUpperCase()}S:`);

    for (const asset of assets) {
      stats.total++;

      let statusIcon, statusText;

      if (asset.errors.length > 0) {
        statusIcon = `${colors.red}✗${colors.reset}`;
        statusText = `${colors.red}BROKEN${colors.reset}`;
        stats.errors++;
      } else if (asset.hasReal && asset.realValid) {
        statusIcon = `${colors.green}✓${colors.reset}`;
        statusText = `${colors.green}REAL${colors.reset}`;
        stats.real++;
        stats.placeholders++;
      } else if (asset.hasPlaceholder && asset.placeholderValid) {
        statusIcon = `${colors.yellow}○${colors.reset}`;
        statusText = `${colors.yellow}PLACEHOLDER${colors.reset}`;
        stats.placeholders++;
      } else {
        statusIcon = `${colors.red}✗${colors.reset}`;
        statusText = `${colors.red}MISSING${colors.reset}`;
        stats.errors++;
      }

      console.log(`  ${statusIcon} ${asset.id} ${colors.dim}(${asset.expectedWidth}x${asset.expectedHeight})${colors.reset} - ${statusText}`);

      for (const err of asset.errors) {
        console.log(`      ${colors.red}└─ ${err}${colors.reset}`);
      }
    }
  }

  return stats;
}

/**
 * Print summary
 */
function printSummary(allStats) {
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));

  let totalAssets = 0;
  let totalPlaceholders = 0;
  let totalReal = 0;
  let totalErrors = 0;

  for (const stats of allStats) {
    totalAssets += stats.total;
    totalPlaceholders += stats.placeholders;
    totalReal += stats.real;
    totalErrors += stats.errors;
  }

  console.log(`Total assets:    ${totalAssets}`);
  console.log(`With placeholder: ${totalPlaceholders} ${colors.dim}(testable)${colors.reset}`);
  console.log(`With real art:   ${totalReal} ${colors.dim}(production-ready)${colors.reset}`);

  if (totalErrors > 0) {
    console.log(`${colors.red}Errors:          ${totalErrors}${colors.reset}`);
  }

  const coverage = totalAssets > 0 ? Math.round((totalReal / totalAssets) * 100) : 0;
  console.log(`\nReal asset coverage: ${coverage}%`);

  if (totalErrors > 0) {
    console.log(`\n${colors.red}✗ Validation FAILED - fix errors above${colors.reset}`);
    return false;
  } else if (totalPlaceholders === totalAssets) {
    console.log(`\n${colors.green}✓ All assets valid - mystery is testable${colors.reset}`);
    return true;
  } else {
    console.log(`\n${colors.yellow}⚠ Some assets missing placeholders${colors.reset}`);
    return false;
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  console.log('Asset Validation');
  console.log('================');

  const allStats = [];

  if (args.length > 0) {
    // Validate specific mystery
    const validation = await validateMystery(args[0]);
    allStats.push(printReport(validation));
  } else {
    // Validate all mysteries
    const entries = readdirSync(MYSTERIES_PATH, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const validation = await validateMystery(entry.name);
        allStats.push(printReport(validation));
      }
    }
  }

  const success = printSummary(allStats);
  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error('Validation error:', err);
  process.exit(1);
});
