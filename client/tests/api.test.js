import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../src/api';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listMysteries', () => {
    it('should fetch mysteries list', async () => {
      const mockMysteries = [
        { id: 'mystery-1', title: 'Mystery 1' },
        { id: 'mystery-2', title: 'Mystery 2' },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mysteries: mockMysteries }),
      });

      const result = await api.listMysteries();

      expect(fetch).toHaveBeenCalledWith('/api/mysteries');
      expect(result).toEqual(mockMysteries);
    });

    it('should throw on fetch error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.listMysteries()).rejects.toThrow('Failed to fetch mysteries');
    });
  });

  describe('loadMystery', () => {
    it('should fetch a specific mystery', async () => {
      const mockMystery = {
        id: 'mystery-1',
        title: 'Mystery 1',
        characters: [],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mystery: mockMystery }),
      });

      const result = await api.loadMystery('mystery-1');

      expect(fetch).toHaveBeenCalledWith('/api/mysteries/mystery-1');
      expect(result).toEqual(mockMystery);
    });

    it('should throw on not found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(api.loadMystery('non-existent')).rejects.toThrow(
        'Failed to load mystery'
      );
    });
  });

  describe('interrogate', () => {
    it('should send interrogation request', async () => {
      const mockResponse = {
        response: 'I was in the library all evening.',
        characterId: 'lady-margaret',
        characterName: 'Lady Margaret',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.interrogate(
        'blackwood-manor',
        'lady-margaret',
        'Where were you?',
        []
      );

      expect(fetch).toHaveBeenCalledWith('/api/game/interrogate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mysteryId: 'blackwood-manor',
          characterId: 'lady-margaret',
          message: 'Where were you?',
          conversationHistory: [],
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include conversation history', async () => {
      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Good evening' },
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Response' }),
      });

      await api.interrogate('mystery', 'char', 'Question', history);

      expect(fetch).toHaveBeenCalledWith(
        '/api/game/interrogate',
        expect.objectContaining({
          body: expect.stringContaining('"conversationHistory"'),
        })
      );
    });

    it('should throw on API error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Character not found' }),
      });

      await expect(
        api.interrogate('mystery', 'invalid', 'Question', [])
      ).rejects.toThrow('Character not found');
    });
  });

  describe('accuse', () => {
    it('should send accusation request', async () => {
      const mockResult = {
        isCorrect: true,
        suspectCorrect: true,
        motiveCorrect: true,
        explanation: 'You solved it!',
        accusedName: 'James Hartley',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await api.accuse(
        'blackwood-manor',
        'james-hartley',
        'Embezzlement cover-up'
      );

      expect(fetch).toHaveBeenCalledWith('/api/game/accuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mysteryId: 'blackwood-manor',
          suspectId: 'james-hartley',
          motive: 'Embezzlement cover-up',
        }),
      });
      expect(result).toEqual(mockResult);
    });

    it('should throw on API error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Suspect not found' }),
      });

      await expect(
        api.accuse('mystery', 'invalid', 'Motive')
      ).rejects.toThrow('Suspect not found');
    });
  });
});
