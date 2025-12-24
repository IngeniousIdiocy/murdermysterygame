import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readdir } from 'fs/promises';

// Import the mystery loader
import mysteryLoader from '../src/services/mysteryLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('MysteryLoader', () => {
  describe('listMysteries', () => {
    it('should return an array of mysteries', async () => {
      const mysteries = await mysteryLoader.listMysteries();

      expect(Array.isArray(mysteries)).toBe(true);
    });

    it('should include blackwood-manor mystery', async () => {
      const mysteries = await mysteryLoader.listMysteries();
      const blackwood = mysteries.find((m) => m.id === 'blackwood-manor');

      expect(blackwood).toBeDefined();
      expect(blackwood.title).toBe('Murder at Blackwood Manor');
      expect(blackwood.difficulty).toBe('medium');
    });

    it('should return only metadata, not full content', async () => {
      const mysteries = await mysteryLoader.listMysteries();
      const mystery = mysteries[0];

      // Should have metadata
      expect(mystery.id).toBeDefined();
      expect(mystery.title).toBeDefined();

      // Should NOT have full content
      expect(mystery.characters).toBeUndefined();
      expect(mystery.locations).toBeUndefined();
      expect(mystery.clues).toBeUndefined();
      expect(mystery.intro).toBeUndefined();
    });
  });

  describe('loadMystery', () => {
    it('should load a complete mystery pack', async () => {
      const mystery = await mysteryLoader.loadMystery('blackwood-manor');

      expect(mystery.id).toBe('blackwood-manor');
      expect(mystery.title).toBe('Murder at Blackwood Manor');
      expect(mystery.intro).toBeDefined();
      expect(mystery.intro.length).toBeGreaterThan(0);
    });

    it('should load all characters with markdown', async () => {
      const mystery = await mysteryLoader.loadMystery('blackwood-manor');

      expect(mystery.characters).toBeDefined();
      expect(mystery.characters.length).toBe(6);

      // Each character should have metadata and markdown
      mystery.characters.forEach((char) => {
        expect(char.id).toBeDefined();
        expect(char.name).toBeDefined();
        expect(char.role).toBeDefined();
        expect(char.location).toBeDefined();
        expect(char.markdown).toBeDefined();
      });
    });

    it('should load all locations with markdown', async () => {
      const mystery = await mysteryLoader.loadMystery('blackwood-manor');

      expect(mystery.locations).toBeDefined();
      expect(mystery.locations.length).toBe(6);

      mystery.locations.forEach((loc) => {
        expect(loc.id).toBeDefined();
        expect(loc.name).toBeDefined();
        expect(loc.connections).toBeDefined();
        expect(Array.isArray(loc.connections)).toBe(true);
      });
    });

    it('should load all clues with markdown', async () => {
      const mystery = await mysteryLoader.loadMystery('blackwood-manor');

      expect(mystery.clues).toBeDefined();
      expect(mystery.clues.length).toBe(10);

      mystery.clues.forEach((clue) => {
        expect(clue.id).toBeDefined();
        expect(clue.name).toBeDefined();
        expect(clue.location).toBeDefined();
        expect(clue.type).toBeDefined();
      });
    });

    it('should NOT include spoilers in loaded mystery', async () => {
      const mystery = await mysteryLoader.loadMystery('blackwood-manor');

      // Mystery object should not have spoilers
      expect(mystery.spoilers).toBeUndefined();

      // Character markdown should not contain murderer reveals
      mystery.characters.forEach((char) => {
        const markdown = char.markdown?.toLowerCase() || '';
        expect(markdown).not.toContain('you are the murderer');
        expect(markdown).not.toContain('you killed');
      });
    });

    it('should throw error for non-existent mystery', async () => {
      await expect(mysteryLoader.loadMystery('non-existent')).rejects.toThrow();
    });

    it('should cache loaded mysteries', async () => {
      // Clear cache first
      mysteryLoader.clearCache();

      // Load twice
      const mystery1 = await mysteryLoader.loadMystery('blackwood-manor');
      const mystery2 = await mysteryLoader.loadMystery('blackwood-manor');

      // Should be the same reference (cached)
      expect(mystery1).toBe(mystery2);
    });
  });

  describe('loadSpoilers', () => {
    it('should load spoilers content', async () => {
      const spoilers = await mysteryLoader.loadSpoilers('blackwood-manor');

      expect(spoilers).toBeDefined();
      expect(spoilers.length).toBeGreaterThan(0);
      expect(spoilers).toContain('James Hartley');
      expect(spoilers).toContain('embezzl');
    });
  });

  describe('loadCharacterPrompt', () => {
    it('should load individual character markdown', async () => {
      const markdown = await mysteryLoader.loadCharacterPrompt(
        'blackwood-manor',
        'james-hartley'
      );

      expect(markdown).toBeDefined();
      expect(markdown).toContain('James Hartley');
    });

    it('should return null for non-existent character', async () => {
      const markdown = await mysteryLoader.loadCharacterPrompt(
        'blackwood-manor',
        'non-existent'
      );

      expect(markdown).toBeNull();
    });
  });

  describe('Mystery Pack Validation', () => {
    it('should have valid starting location', async () => {
      const mystery = await mysteryLoader.loadMystery('blackwood-manor');
      const locationIds = mystery.locations.map((l) => l.id);

      expect(locationIds).toContain(mystery.startingLocation);
    });

    it('should have valid location connections', async () => {
      const mystery = await mysteryLoader.loadMystery('blackwood-manor');
      const locationIds = mystery.locations.map((l) => l.id);

      mystery.locations.forEach((loc) => {
        loc.connections.forEach((conn) => {
          expect(locationIds).toContain(conn);
        });
      });
    });

    it('should have characters in valid locations', async () => {
      const mystery = await mysteryLoader.loadMystery('blackwood-manor');
      const locationIds = mystery.locations.map((l) => l.id);

      mystery.characters.forEach((char) => {
        expect(locationIds).toContain(char.location);
      });
    });

    it('should have clues in valid locations', async () => {
      const mystery = await mysteryLoader.loadMystery('blackwood-manor');
      const locationIds = mystery.locations.map((l) => l.id);

      mystery.clues.forEach((clue) => {
        expect(locationIds).toContain(clue.location);
      });
    });

    it('should have at least one suspect', async () => {
      const mystery = await mysteryLoader.loadMystery('blackwood-manor');
      const suspects = mystery.characters.filter((c) => c.isSuspect);

      expect(suspects.length).toBeGreaterThan(0);
    });
  });
});
