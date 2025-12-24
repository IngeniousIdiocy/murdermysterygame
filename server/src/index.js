import express from 'express';
import cors from 'cors';
import { join } from 'path';
import config, { validateConfig } from './config.js';
import mysteriesRouter from './routes/mysteries.js';
import gameRouter from './routes/game.js';

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

// Serve mystery assets (images, etc.)
// URL: /assets/{mysteryId}/{type}/{filename}
// e.g., /assets/blackwood-manor/locations/foyer.png
app.use('/assets', express.static(config.mysteries.path, {
  maxAge: '1d',
  setHeaders: (res, path) => {
    // Set proper content type for images
    if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    }
  },
}));

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
