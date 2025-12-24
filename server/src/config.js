import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: resolve(__dirname, '../../.env') });

const config = {
  // Server settings
  server: {
    port: parseInt(process.env.PORT, 10) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  },

  // Claude API settings
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS, 10) || 1024,
  },

  // Mystery pack settings
  mysteries: {
    path: resolve(__dirname, '..', process.env.MYSTERIES_PATH || '../mysteries'),
  },

  // Game settings
  game: {
    defaultQuestionLimit: parseInt(process.env.DEFAULT_QUESTION_LIMIT, 10) || 5,
    questionLimitOptions: [3, 5, 10],
  },
};

// Validate required configuration
export function validateConfig() {
  const errors = [];

  if (!config.claude.apiKey) {
    errors.push('ANTHROPIC_API_KEY is required. Set it in .env file or environment variable.');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach((err) => console.error(`  - ${err}`));
    return false;
  }

  return true;
}

export default config;
