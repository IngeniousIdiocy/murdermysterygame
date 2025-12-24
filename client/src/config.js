/**
 * Client-side configuration
 */
const config = {
  // API base URL (empty string uses relative paths with Vite proxy)
  apiBaseUrl: '',

  // Game settings
  game: {
    questionLimitOptions: [3, 5, 10, Infinity],
    defaultQuestionLimit: Infinity, // Pure investigation mode
  },

  // Local storage keys
  storage: {
    gameState: 'murderMystery_gameState',
    settings: 'murderMystery_settings',
  },
};

export default config;
