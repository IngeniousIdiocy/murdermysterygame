
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const charactersDir = path.resolve(__dirname, '../mysteries/blackwood-manor/assets/characters');

const files = fs.readdirSync(charactersDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const filePath = path.join(charactersDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Append color instruction if not present
    if (!content.prompt.toLowerCase().includes('color')) {
        content.prompt += " Full vibrant color portrait, 1920s cinematic lighting, highly detailed.";
    } else {
        // Just ensure "Full vibrant color" is emphasized
        content.prompt = content.prompt.replace(/black and white/i, "Full vibrant color");
        content.prompt += " Full vibrant color.";
    }

    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`Updated ${file}`);
});
