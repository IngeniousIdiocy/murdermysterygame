import { Router } from 'express';
import mysteryLoader from '../services/mysteryLoader.js';
import claudeService from '../services/claude.js';

const router = Router();

/**
 * POST /api/game/interrogate
 * Send a message to a character (interrogation) - streaming via SSE
 *
 * Body: {
 *   mysteryId: string,
 *   characterId: string,
 *   message: string,
 *   conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>
 * }
 */
router.post('/interrogate', async (req, res) => {
  try {
    const { mysteryId, characterId, message, conversationHistory = [] } = req.body;

    // Validate required fields
    if (!mysteryId || !characterId || !message) {
      return res.status(400).json({
        error: 'Missing required fields: mysteryId, characterId, message',
      });
    }

    // Load the mystery (from cache if available)
    const mystery = await mysteryLoader.loadMystery(mysteryId);

    // Find the character
    const character = mystery.characters.find((c) => c.id === characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Get character markdown for system prompt
    const characterMarkdown = await mysteryLoader.loadCharacterPrompt(mysteryId, characterId);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Stream the response
    const stream = claudeService.interrogateCharacterStream(
      characterMarkdown,
      mystery.intro,
      conversationHistory,
      message,
      character.name
    );

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        res.write(`data: ${JSON.stringify({ type: 'text', text: chunk.text })}\n\n`);
      } else if (chunk.type === 'done') {
        res.write(`data: ${JSON.stringify({ type: 'done', characterId, characterName: character.name })}\n\n`);
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`);
      }
    }

    res.end();
  } catch (error) {
    console.error('Error in interrogation:', error);
    // If headers already sent, just end the stream
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to process interrogation' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to process interrogation' });
    }
  }
});

/**
 * POST /api/game/accuse
 * Submit final accusation - streaming via SSE
 *
 * Body: {
 *   mysteryId: string,
 *   suspectId: string,
 *   motive: string
 * }
 */
router.post('/accuse', async (req, res) => {
  try {
    const { mysteryId, suspectId, motive } = req.body;

    // Validate required fields
    if (!mysteryId || !suspectId || !motive) {
      return res.status(400).json({
        error: 'Missing required fields: mysteryId, suspectId, motive',
      });
    }

    // Load the mystery to get character name
    const mystery = await mysteryLoader.loadMystery(mysteryId);

    // Find the accused character
    const suspect = mystery.characters.find((c) => c.id === suspectId);
    if (!suspect) {
      return res.status(404).json({ error: 'Suspect not found' });
    }

    if (!suspect.isSuspect) {
      return res.status(400).json({ error: 'This character cannot be accused' });
    }

    // NOW we load spoilers (only during accusation)
    const spoilers = await mysteryLoader.loadSpoilers(mysteryId);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Stream the response
    const stream = claudeService.evaluateAccusationStream(
      spoilers,
      suspect.name,
      motive
    );

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        res.write(`data: ${JSON.stringify({ type: 'text', text: chunk.text })}\n\n`);
      } else if (chunk.type === 'done') {
        res.write(`data: ${JSON.stringify({
          type: 'done',
          verdict: chunk.verdict,
          accusedName: suspect.name
        })}\n\n`);
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', error: chunk.error })}\n\n`);
      }
    }

    res.end();
  } catch (error) {
    console.error('Error in accusation:', error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to process accusation' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to process accusation' });
    }
  }
});

export default router;
