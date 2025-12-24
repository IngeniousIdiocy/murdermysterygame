import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/config.js';
import chalk from 'chalk';

export class GeneratorFactory {
    static getProvider(providerName) {
        if (providerName === 'dummy') {
            return new DummyProvider();
        }
        return new GeminiProvider();
    }
}

class GeminiProvider {
    constructor() {
        if (!config.apiKey) {
            throw new Error('GOOGLE_API_KEY environment variable is not set.');
        }
        this.genAI = new GoogleGenerativeAI(config.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.generation.model });
    }

    calculateAspectRatio(width, height) {
        const ratio = width / height;
        if (ratio >= 1.7) return "16:9 aspect ratio";
        if (ratio >= 1.3) return "4:3 aspect ratio";
        if (ratio >= 0.9 && ratio <= 1.1) return "1:1 square aspect ratio";
        if (ratio <= 0.6) return "9:16 portrait aspect ratio";
        if (ratio <= 0.8) return "3:4 portrait aspect ratio";
        return ""; // Default
    }

    async generateImage(originalPrompt, options = {}) {
        // 1. Append instructions
        let prompt = originalPrompt;

        if (options.transparent) {
            prompt += ", isolated on a smooth solid dark gray background, high contrast, no shadows.";
        }

        if (options.width && options.height) {
            const ratioText = this.calculateAspectRatio(options.width, options.height);
            if (ratioText) prompt += `, ${ratioText}`;
        }

        // 2. Rate Limit / Retry Logic (Exponential Backoff)
        const maxRetries = 5;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                console.log(chalk.blue(`Generating with Gemini (${config.generation.model})... Attempt ${attempt + 1}`));

                const result = await this.model.generateContent(prompt);
                const response = result.response;

                const images = response.candidates?.[0]?.content?.parts?.filter(part => part.inlineData || part.inline_data);

                if (images && images.length > 0) {
                    const imagePart = images[0];
                    const base64Data = imagePart.inlineData ? imagePart.inlineData.data : imagePart.inline_data.data;
                    return Buffer.from(base64Data, 'base64');
                }

                throw new Error('No image data found in Gemini response.');

            } catch (error) {
                // Check for 429 (Resource Exhausted) or 503 (Service Unavailable)
                const isRateLimit = error.message.includes('429') || error.message.includes('Resource has been exhausted');
                const isServerOverload = error.message.includes('503') || error.message.includes('Overloaded');

                if ((isRateLimit || isServerOverload) && attempt < maxRetries - 1) {
                    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff + jitter
                    console.log(chalk.yellow(`Rate limit hit. Retrying in ${(delay / 1000).toFixed(1)}s...`));
                    await new Promise(resolve => setTimeout(resolve, delay));
                    attempt++;
                    continue;
                }

                console.error(chalk.red('Gemini Generation Error:'), error.message);
                throw error;
            }
        }
    }
}

class DummyProvider {
    async generateImage(prompt) {
        console.log(chalk.yellow('DUMMY GENERATION:'), prompt);
        // Return a 1x1 pixel generic buffer or similar, handled by imageService to make a real placeholder
        // For "Dummy", let's return null and let imageService create a solid color image manually if it receives null
        return null;
    }
}
