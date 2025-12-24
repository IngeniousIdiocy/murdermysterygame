import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/config.js';
import fs from 'fs';
import chalk from 'chalk';

export class VerificationService {
    constructor() {
        if (!config.apiKey) {
            throw new Error('GOOGLE_API_KEY environment variable is not set.');
        }
        this.genAI = new GoogleGenerativeAI(config.apiKey);
        // Use Gemini 3 Pro (Vision)
        this.model = this.genAI.getGenerativeModel({ model: config.generation.verificationModel });
    }

    async verifyImage(imagePath, originalPrompt) {
        try {
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Image not found at ${imagePath}`);
            }

            // Read image as base64
            const imageBuffer = fs.readFileSync(imagePath);
            const imageBase64 = imageBuffer.toString('base64');

            const parts = [
                {
                    inlineData: {
                        mimeType: 'image/png',
                        data: imageBase64
                    }
                },
                {
                    text: `You are an art director verifying asset generation. 
          Does this image match the following description? 
          Description: "${originalPrompt}"
          
          Respond with JSON: { "verified": boolean, "reason": "string" }`
                }
            ];

            const result = await this.model.generateContent({ contents: [{ role: 'user', parts }] });
            const response = await result.response;
            const text = response.text();

            // Cleanup json block if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                const verification = JSON.parse(jsonStr);
                return verification;
            } catch (e) {
                console.warn(chalk.yellow('Failed to parse verification JSON, returning raw text analysis.'));
                return { verified: false, reason: text };
            }

        } catch (error) {
            console.error(chalk.red('Verification Error:'), error);
            throw error;
        }
    }
}
