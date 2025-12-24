import express from 'express';
import cors from 'cors';
import { join } from 'path';
import config, { validateConfig } from './config.js';
import mysteriesRouter from './routes/mysteries.js';
import gameRouter from './routes/game.js';
import assetsRouter from './routes/assets.js';

// Validate configuration before starting
if (!validateConfig()) {
  console.error('Server cannot start due to configuration errors.');
  console.error('Make sure ANTHROPIC_API_KEY is set in your environment or .env file.');
  process.exit(1);
}

const app = express();

// Middleware
app.use(cors({
  origin: config.server.clientUrl,
  credentials: true,
}));
app.use(express.json());

// Request logging in development
if (config.server.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use('/api/mysteries', mysteriesRouter);
app.use('/api/game', gameRouter);

// Serve mystery assets with r_/ph_ resolver
// URL: /assets/{mysteryId}/assets/{type}/{filename}
// e.g., /assets/blackwood-manor/assets/locations/foyer.png
// Checks for r_foyer.png (real) first, falls back to ph_foyer.png (placeholder)
app.use('/assets', assetsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.server.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(config.server.port, () => {
  console.log(`Murder Mystery Server running on port ${config.server.port}`);
  console.log(`Environment: ${config.server.nodeEnv}`);
  console.log(`Mysteries path: ${config.mysteries.path}`);
  console.log(`Claude model: ${config.claude.model}`);
});
