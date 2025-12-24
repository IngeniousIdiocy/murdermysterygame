import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    try {
        // For listModels we might need to use the model manager if exposed, 
        // or just try a basic fetch if the SDK doesn't expose listModels directly on the main instance easily in older versions.
        // But the error message said "Call ListModels". 
        // The Node SDK usually supports it via `makeRequest` or a specific manager.
        // actually, checking SDK docs pattern:
        // it's usually not on the client directly in the simplified SDK. 
        // Let's try to infer or use a known endpoint via fetch if SDK fails.

        // actually, the error message literally says "Call ListModels".
        // Let's rely on web search results for the correct name primarily, but this script is a backup.
        // Let's try to access it if possible.

        // A common pattern in the node SDK is accessing via the model manager or just knowing the string.
        // I'll stick to web search first, but I'll leave this file here just in case I need to run it with a raw fetch.

        const apiKey = process.env.GOOGLE_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        console.log('Available Models:');
        if (data.models) {
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
