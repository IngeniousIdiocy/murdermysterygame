import { Router } from 'express';
import mysteryLoader from '../services/mysteryLoader.js';

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

export default router;
