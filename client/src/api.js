import config from './config';

const API_BASE = config.apiBaseUrl;

/**
 * API client for the murder mystery game
 */
export const api = {
  /**
   * List all available mysteries
   */
  async listMysteries() {
    const response = await fetch(`${API_BASE}/api/mysteries`);
    if (!response.ok) throw new Error('Failed to fetch mysteries');
    const data = await response.json();
    return data.mysteries;
  },

  /**
   * Load a complete mystery (excluding spoilers)
   */
  async loadMystery(mysteryId) {
    const response = await fetch(`${API_BASE}/api/mysteries/${mysteryId}`);
    if (!response.ok) throw new Error('Failed to load mystery');
    const data = await response.json();
    return data.mystery;
  },

  /**
   * Save map positions to the manifest file (dev tool)
   * @param {string} mysteryId
   * @param {Array} positions - Array of { id, mapPosition: { x, y, width, height } }
   */
  async saveMapPositions(mysteryId, positions) {
    const response = await fetch(`${API_BASE}/api/mysteries/${mysteryId}/map-positions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save map positions');
    }
    return response.json();
  },

  /**
   * Send a message to a character (interrogation)
   */
  async interrogate(mysteryId, characterId, message, conversationHistory) {
    const response = await fetch(`${API_BASE}/api/game/interrogate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mysteryId,
        characterId,
        message,
        conversationHistory,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to interrogate character');
    }
    return response.json();
  },

  /**
   * Submit final accusation (non-streaming - deprecated)
   */
  async accuse(mysteryId, suspectId, motive) {
    const response = await fetch(`${API_BASE}/api/game/accuse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mysteryId,
        suspectId,
        motive,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit accusation');
    }
    return response.json();
  },

  /**
   * Send a message to a character (interrogation) - streaming via SSE
   * @param {string} mysteryId
   * @param {string} characterId
   * @param {string} message
   * @param {Array} conversationHistory
   * @param {function} onText - Called with each text chunk
   * @param {function} onDone - Called when complete with { characterId, characterName }
   * @param {function} onError - Called on error
   */
  async interrogateStream(mysteryId, characterId, message, conversationHistory, onText, onDone, onError) {
    try {
      const response = await fetch(`${API_BASE}/api/game/interrogate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mysteryId,
          characterId,
          message,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to interrogate character');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'text') {
                onText(data.text);
              } else if (data.type === 'done') {
                onDone(data);
              } else if (data.type === 'error') {
                onError(new Error(data.error));
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err) {
      onError(err);
    }
  },

  /**
   * Submit final accusation - streaming via SSE
   * @param {string} mysteryId
   * @param {string} suspectId
   * @param {string} motive
   * @param {function} onText - Called with each text chunk
   * @param {function} onDone - Called when complete with { verdict, accusedName }
   * @param {function} onError - Called on error
   */
  async accuseStream(mysteryId, suspectId, motive, onText, onDone, onError) {
    try {
      const response = await fetch(`${API_BASE}/api/game/accuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mysteryId,
          suspectId,
          motive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit accusation');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'text') {
                onText(data.text);
              } else if (data.type === 'done') {
                onDone(data);
              } else if (data.type === 'error') {
                onError(new Error(data.error));
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err) {
      onError(err);
    }
  },
};

export default api;
