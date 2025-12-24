import { Router } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import mysteryLoader from '../services/mysteryLoader.js';
import config from '../config.js';

const router = Router();

/**
 * GET /api/mysteries
 * List all available mystery packs (metadata only)
 */
router.get('/', async (req, res) => {
  try {
    const mysteries = await mysteryLoader.listMysteries();
    res.json({ mysteries });
  } catch (error) {
    console.error('Error listing mysteries:', error);
    res.status(500).json({ error: 'Failed to list mysteries' });
  }
});

/**
 * GET /api/mysteries/:id
 * Load a complete mystery pack (excluding spoilers)
 */
router.get('/:id', async (req, res) => {
  try {
    const mystery = await mysteryLoader.loadMystery(req.params.id);
    res.json({ mystery });
  } catch (error) {
    console.error('Error loading mystery:', error);
    res.status(404).json({ error: 'Mystery not found' });
  }
});

/**
 * PUT /api/mysteries/:id/map-positions
 * Save map positions to the manifest file (dev tool)
 */
router.put('/:id/map-positions', async (req, res) => {
  try {
    const { id } = req.params;
    const { positions } = req.body; // Array of { id, mapPosition }

    if (!positions || !Array.isArray(positions)) {
      return res.status(400).json({ error: 'positions array required' });
    }

    // Read current manifest
    const manifestPath = join(config.mysteries.path, id, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    // Update map positions for each location
    for (const pos of positions) {
      const location = manifest.locations.find((l) => l.id === pos.id);
      if (location) {
        location.mapPosition = pos.mapPosition;
      }
    }

    // Write back to file
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

    console.log(`[MAP] Saved ${positions.length} map positions for ${id}`);
    res.json({ success: true, saved: positions.length });
  } catch (error) {
    console.error('Error saving map positions:', error);
    res.status(500).json({ error: 'Failed to save map positions' });
  }
});

export default router;
