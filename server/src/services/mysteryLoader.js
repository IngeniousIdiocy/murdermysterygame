import { readdir, readFile, access } from 'fs/promises';
import { join } from 'path';
import config from '../config.js';

/**
 * Load and validate mystery packs from the mysteries directory
 */
class MysteryLoader {
  constructor() {
    this.mysteriesPath = config.mysteries.path;
    this.cache = new Map();
  }

  /**
   * Get list of all valid mystery packs (metadata only)
   */
  async listMysteries() {
    const mysteries = [];

    try {
      const entries = await readdir(this.mysteriesPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const manifest = await this.loadManifest(entry.name);
            if (manifest) {
              mysteries.push({
                id: manifest.id,
                title: manifest.title,
                tagline: manifest.tagline,
                author: manifest.author,
                difficulty: manifest.difficulty,
                settings: manifest.settings,
              });
            }
          } catch (err) {
            console.warn(`Skipping invalid mystery pack: ${entry.name}`, err.message);
          }
        }
      }
    } catch (err) {
      console.error('Error reading mysteries directory:', err);
    }

    return mysteries;
  }

  /**
   * Load a complete mystery pack (excluding spoilers)
   */
  async loadMystery(mysteryId) {
    // Check cache first
    if (this.cache.has(mysteryId)) {
      return this.cache.get(mysteryId);
    }

    const mysteryPath = join(this.mysteriesPath, mysteryId);

    // Validate mystery exists
    await this.validateMysteryExists(mysteryPath);

    // Load manifest
    const manifest = await this.loadManifest(mysteryId);

    // Load intro
    const intro = await this.loadMarkdownFile(join(mysteryPath, 'intro.md'));

    // Load characters (markdown content)
    const characters = await this.loadCharacters(mysteryPath, manifest.characters);

    // Load locations (markdown content)
    const locations = await this.loadLocations(mysteryPath, manifest.locations);

    // Load clues (markdown content)
    const clues = await this.loadClues(mysteryPath, manifest.clues);

    const mystery = {
      ...manifest,
      intro,
      characters,
      locations,
      clues,
    };

    // Cache the loaded mystery
    this.cache.set(mysteryId, mystery);

    return mystery;
  }

  /**
   * Load spoilers for accusation evaluation ONLY
   * This should never be called during regular gameplay
   */
  async loadSpoilers(mysteryId) {
    const spoilersPath = join(this.mysteriesPath, mysteryId, 'spoilers.md');
    return await this.loadMarkdownFile(spoilersPath);
  }

  /**
   * Load character markdown for LLM system prompt
   */
  async loadCharacterPrompt(mysteryId, characterId) {
    const characterPath = join(this.mysteriesPath, mysteryId, 'characters', `${characterId}.md`);
    return await this.loadMarkdownFile(characterPath);
  }

  // Private helper methods

  async validateMysteryExists(mysteryPath) {
    try {
      await access(mysteryPath);
    } catch {
      throw new Error(`Mystery not found: ${mysteryPath}`);
    }
  }

  async loadManifest(mysteryId) {
    const manifestPath = join(this.mysteriesPath, mysteryId, 'manifest.json');
    const content = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    // Validate required fields
    const requiredFields = ['id', 'title', 'characters', 'locations', 'clues', 'startingLocation'];
    for (const field of requiredFields) {
      if (!manifest[field]) {
        throw new Error(`Missing required field in manifest: ${field}`);
      }
    }

    return manifest;
  }

  async loadMarkdownFile(filePath) {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (err) {
      console.warn(`Could not load markdown file: ${filePath}`);
      return null;
    }
  }

  async loadCharacters(mysteryPath, characterList) {
    const characters = [];

    for (const char of characterList) {
      const markdown = await this.loadMarkdownFile(
        join(mysteryPath, 'characters', `${char.id}.md`)
      );

      characters.push({
        ...char,
        markdown,
      });
    }

    return characters;
  }

  async loadLocations(mysteryPath, locationList) {
    const locations = [];

    for (const loc of locationList) {
      const markdown = await this.loadMarkdownFile(
        join(mysteryPath, 'locations', `${loc.id}.md`)
      );

      locations.push({
        ...loc,
        markdown,
      });
    }

    return locations;
  }

  async loadClues(mysteryPath, clueList) {
    const clues = [];

    for (const clue of clueList) {
      const markdown = await this.loadMarkdownFile(
        join(mysteryPath, 'clues', `${clue.id}.md`)
      );

      clues.push({
        ...clue,
        markdown,
      });
    }

    return clues;
  }

  /**
   * Clear the cache (useful for development)
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const mysteryLoader = new MysteryLoader();
export default mysteryLoader;
