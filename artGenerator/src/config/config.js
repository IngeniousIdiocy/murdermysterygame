import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from the artGenerator root, not CWD
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    apiKey: process.env.GOOGLE_API_KEY,
    paths: {
        // Default relative to package root if running locally
        // __dirname is .../artGenerator/src/config
        // ../../.. resolves to .../murdermysterygame/mysteries
        mysteries: process.env.ART_GENERATOR_MYSTERIES_PATH || path.resolve(__dirname, '../../../mysteries'),
        output: process.env.ART_GENERATOR_OUTPUT_PATH // Optional override
    },
    generation: {
        model: process.env.GEMINI_MODEL_GENERATION || 'gemini-3-pro-image-preview',
        verificationModel: process.env.GEMINI_MODEL_VERIFICATION || 'gemini-3-pro-preview'
    }
};
