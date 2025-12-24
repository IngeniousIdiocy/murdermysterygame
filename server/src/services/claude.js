import Anthropic from '@anthropic-ai/sdk';
import config from '../config.js';

/**
 * Claude API service for character interrogation and accusation evaluation
 * Supports both regular and streaming responses
 */
class ClaudeService {
  constructor() {
    this.client = new Anthropic({
      apiKey: config.claude.apiKey,
    });
    this.model = config.claude.model;
    this.maxTokens = config.claude.maxTokens;
  }

  /**
   * Send a message to a character (interrogation) - non-streaming
   */
  async interrogateCharacter(characterMarkdown, mysteryIntro, conversationHistory, playerMessage, characterName) {
    const systemPrompt = this.buildCharacterSystemPrompt(characterMarkdown, mysteryIntro, characterName);
    const messages = this.buildMessages(conversationHistory, playerMessage);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages,
      });

      return {
        success: true,
        response: response.content[0].text,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send a message to a character (interrogation) - streaming
   * Returns an async generator that yields text chunks
   */
  async *interrogateCharacterStream(characterMarkdown, mysteryIntro, conversationHistory, playerMessage, characterName) {
    const systemPrompt = this.buildCharacterSystemPrompt(characterMarkdown, mysteryIntro, characterName);
    const messages = this.buildMessages(conversationHistory, playerMessage);

    try {
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.text) {
          yield { type: 'text', text: event.delta.text };
        }
      }

      yield { type: 'done' };
    } catch (error) {
      console.error('Claude API streaming error:', error);
      yield { type: 'error', error: error.message };
    }
  }

  /**
   * Evaluate player's accusation - non-streaming
   */
  async evaluateAccusation(spoilersMarkdown, accusedCharacter, playerMotive) {
    const systemPrompt = this.buildAccusationSystemPrompt(spoilersMarkdown);
    const userMessage = this.buildAccusationMessage(accusedCharacter, playerMotive);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const responseText = response.content[0].text;
      const verdict = this.parseAccusationVerdict(responseText);

      return {
        success: true,
        ...verdict,
        fullResponse: responseText,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Evaluate player's accusation - streaming
   * Returns an async generator that yields text chunks and final verdict
   */
  async *evaluateAccusationStream(spoilersMarkdown, accusedCharacter, playerMotive) {
    const systemPrompt = this.buildAccusationSystemPrompt(spoilersMarkdown);
    const userMessage = this.buildAccusationMessage(accusedCharacter, playerMotive);
    let fullText = '';

    try {
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.text) {
          fullText += event.delta.text;
          yield { type: 'text', text: event.delta.text };
        }
      }

      // Parse verdict from complete response
      const verdict = this.parseAccusationVerdict(fullText);
      yield { type: 'done', verdict };
    } catch (error) {
      console.error('Claude API streaming error:', error);
      yield { type: 'error', error: error.message };
    }
  }

  // Helper methods

  buildMessages(conversationHistory, playerMessage) {
    return [
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: playerMessage,
      },
    ];
  }

  buildCharacterSystemPrompt(characterMarkdown, mysteryIntro, characterName) {
    return `You are narrating a murder mystery game, writing the responses of a character the player is interviewing. Write in THIRD PERSON like a novel.

## The Mystery Setting
${mysteryIntro}

## The Character Being Interviewed
${characterMarkdown}

## Writing Style Instructions
- Write in THIRD PERSON narrative style, like a novel
- Describe the character's actions, expressions, and mannerisms in narrative prose
- Put the character's spoken dialogue in quotation marks
- Example of correct style:
  ${characterName} shifts uncomfortably in the chair, avoiding eye contact. "I was in the library at the time," she says quietly, her fingers tightening around her handkerchief. "I didn't hear anything unusual." She pauses, seeming to consider her next words carefully.
- Show personality through behavior, speech patterns, and body language
- Keep responses concise (2-3 paragraphs max)
- The character may be evasive, nervous, defensive, or cooperative depending on their personality and secrets
- NEVER reveal information the character wouldn't know or share
- NEVER break the fourth wall or acknowledge this is a game
- The character does NOT know who the murderer is - write them authentically`;
  }

  buildAccusationSystemPrompt(spoilersMarkdown) {
    return `You are the narrator revealing the conclusion of a murder mystery game. Write in a dramatic third-person narrative style.

## The Actual Solution
${spoilersMarkdown}

## Your Task
The player will provide:
1. The name of the character they are accusing
2. Their explanation of the motive

Evaluate their accusation:
1. **Correct Suspect**: Did they identify the actual murderer? (YES/NO)
2. **Correct Motive**: Does their motive explanation substantially match the actual motive? (YES/NO)

## Response Format
Start with a clear verdict line:
VERDICT: [CORRECT/INCORRECT]

Then write a dramatic reveal in third-person narrative style:
- If CORRECT: Write a satisfying conclusion confirming their deduction
- If INCORRECT: Reveal the truth dramatically - who really did it and why

Write like the final chapter of a mystery novel - atmospheric, dramatic, and satisfying.`;
  }

  buildAccusationMessage(accusedCharacter, playerMotive) {
    return `The player has made their accusation:

**Accused Character:** ${accusedCharacter}

**Player's Motive Explanation:** ${playerMotive}

Please evaluate this accusation and provide your dramatic reveal.`;
  }

  parseAccusationVerdict(responseText) {
    const upperText = responseText.toUpperCase();

    const correctSuspect = upperText.includes('VERDICT: CORRECT') ||
                          (upperText.includes('CORRECT SUSPECT: YES') &&
                           upperText.includes('CORRECT MOTIVE: YES'));

    const isCorrect = correctSuspect || upperText.includes('VERDICT: CORRECT');

    return {
      isCorrect,
      suspectCorrect: upperText.includes('CORRECT SUSPECT: YES') ||
                      (isCorrect && !upperText.includes('WRONG SUSPECT')),
      motiveCorrect: upperText.includes('CORRECT MOTIVE: YES') ||
                     (isCorrect && !upperText.includes('WRONG MOTIVE')),
    };
  }
}

// Export singleton instance
export const claudeService = new ClaudeService();
export default claudeService;
