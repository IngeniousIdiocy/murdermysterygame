import { Router } from 'express';
import { existsSync, createReadStream } from 'fs';
import { join, dirname, basename, extname } from 'path';
import config from '../config.js';

const router = Router();

/**
 * Asset resolver middleware
 * Checks for r_ (real) file first, falls back to ph_ (placeholder)
 *
 * URL patterns:
 *   /assets/{mysteryId}/assets/locations/{id}.png
 *   /assets/{mysteryId}/assets/characters/{id}.png
 *   /assets/{mysteryId}/assets/clues/{id}.png
 *   /assets/{mysteryId}/assets/thumbnail.png
 *   /assets/{mysteryId}/assets/map.png
 */
router.get('/:mysteryId/assets/*', (req, res) => {
  const { mysteryId } = req.params;
  const assetPath = req.params[0]; // Everything after /assets/{mysteryId}/assets/

  if (!assetPath) {
    return res.status(400).json({ error: 'Asset path required' });
  }

  const dir = dirname(assetPath);
  const filename = basename(assetPath);
  const ext = extname(filename);
  const id = basename(filename, ext);

  // Build the base path
  const basePath = join(config.mysteries.path, mysteryId, 'assets');
  const assetDir = dir === '.' ? basePath : join(basePath, dir);

  // Check for real asset first (r_ prefix)
  const realPath = join(assetDir, `r_${id}${ext}`);
  if (existsSync(realPath)) {
    return sendFile(res, realPath, ext);
  }

  // Fall back to placeholder (ph_ prefix)
  const placeholderPath = join(assetDir, `ph_${id}${ext}`);
  if (existsSync(placeholderPath)) {
    return sendFile(res, placeholderPath, ext);
  }

  // Neither exists
  res.status(404).json({
    error: 'Asset not found',
    requested: assetPath,
    looked: [`r_${id}${ext}`, `ph_${id}${ext}`]
  });
});

/**
 * Send a file with proper headers
 */
function sendFile(res, filePath, ext) {
  // Set content type
  const contentTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };

  const contentType = contentTypes[ext.toLowerCase()] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day

  // Stream the file
  const stream = createReadStream(filePath);
  stream.pipe(res);
  stream.on('error', (err) => {
    console.error('Error streaming file:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to read asset' });
    }
  });
}

export default router;
