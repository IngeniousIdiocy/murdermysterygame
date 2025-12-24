import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import mysteriesRouter from '../src/routes/mysteries.js';
import gameRouter from '../src/routes/game.js';

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/mysteries', mysteriesRouter);
  app.use('/api/game', gameRouter);
  return app;
}

describe('API Routes', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/mysteries', () => {
    it('should return list of mysteries', async () => {
      const response = await request(app).get('/api/mysteries');

      expect(response.status).toBe(200);
      expect(response.body.mysteries).toBeDefined();
      expect(Array.isArray(response.body.mysteries)).toBe(true);
    });

    it('should include blackwood-manor', async () => {
      const response = await request(app).get('/api/mysteries');

      const blackwood = response.body.mysteries.find(
        (m) => m.id === 'blackwood-manor'
      );
      expect(blackwood).toBeDefined();
      expect(blackwood.title).toBe('Murder at Blackwood Manor');
    });
  });

  describe('GET /api/mysteries/:id', () => {
    it('should return a complete mystery', async () => {
      const response = await request(app).get('/api/mysteries/blackwood-manor');

      expect(response.status).toBe(200);
      expect(response.body.mystery).toBeDefined();
      expect(response.body.mystery.id).toBe('blackwood-manor');
      expect(response.body.mystery.characters).toBeDefined();
      expect(response.body.mystery.locations).toBeDefined();
      expect(response.body.mystery.clues).toBeDefined();
    });

    it('should return 404 for non-existent mystery', async () => {
      const response = await request(app).get('/api/mysteries/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/game/interrogate', () => {
    it('should return 400 if missing required fields', async () => {
      const response = await request(app)
        .post('/api/game/interrogate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 404 for non-existent character', async () => {
      const response = await request(app)
        .post('/api/game/interrogate')
        .send({
          mysteryId: 'blackwood-manor',
          characterId: 'non-existent',
          message: 'Hello',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Character not found');
    });

    // Note: Full interrogation test requires Claude API key
    // This test is skipped if no API key is available
    it.skipIf(!process.env.ANTHROPIC_API_KEY)(
      'should return character response with valid request',
      async () => {
        const response = await request(app)
          .post('/api/game/interrogate')
          .send({
            mysteryId: 'blackwood-manor',
            characterId: 'detective-foster',
            message: 'What happened here?',
            conversationHistory: [],
          });

        expect(response.status).toBe(200);
        expect(response.body.response).toBeDefined();
        expect(response.body.characterName).toBe('Detective Sarah Foster');
      },
      30000
    );
  });

  describe('POST /api/game/accuse', () => {
    it('should return 400 if missing required fields', async () => {
      const response = await request(app).post('/api/game/accuse').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 404 for non-existent suspect', async () => {
      const response = await request(app).post('/api/game/accuse').send({
        mysteryId: 'blackwood-manor',
        suspectId: 'non-existent',
        motive: 'Greed',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Suspect not found');
    });

    it('should return 400 for non-suspect characters', async () => {
      const response = await request(app).post('/api/game/accuse').send({
        mysteryId: 'blackwood-manor',
        suspectId: 'detective-foster', // Helper, not suspect
        motive: 'Greed',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('This character cannot be accused');
    });

    // Note: Full accusation test requires Claude API key
    it.skipIf(!process.env.ANTHROPIC_API_KEY)(
      'should evaluate correct accusation',
      async () => {
        const response = await request(app).post('/api/game/accuse').send({
          mysteryId: 'blackwood-manor',
          suspectId: 'james-hartley',
          motive:
            'James was embezzling money from the company and Lord Blackwood discovered it. He killed him to avoid prison.',
        });

        expect(response.status).toBe(200);
        expect(response.body.isCorrect).toBe(true);
        expect(response.body.suspectCorrect).toBe(true);
        expect(response.body.explanation).toBeDefined();
      },
      30000
    );

    it.skipIf(!process.env.ANTHROPIC_API_KEY)(
      'should evaluate incorrect accusation',
      async () => {
        const response = await request(app).post('/api/game/accuse').send({
          mysteryId: 'blackwood-manor',
          suspectId: 'lady-margaret',
          motive: 'She was jealous of his affairs.',
        });

        expect(response.status).toBe(200);
        expect(response.body.suspectCorrect).toBe(false);
        expect(response.body.explanation).toBeDefined();
      },
      30000
    );
  });
});
