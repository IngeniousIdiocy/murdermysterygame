import { removeBackground } from '@imgly/background-removal-node';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testTransparency() {
    try {
        console.log('Testing background removal...');
        const inputPath = path.join(__dirname, 'temp/test_gen.png');

        // Check if test image exists, if not, warn user to run main test first or just exit
        try {
            await fs.access(inputPath);
        } catch {
            console.log('Test image not found at test/temp/test_gen.png. Run "npm test" first to generate it.');
            // Create a dummy red square on white background if possible? 
            // Or just return.
            return;
        }

        console.log(`Reading from ${inputPath}`);
        // Config: imgly might fetch models, so it needs internet access first time.
        // It accepts path or blob.
        const blob = await removeBackground(inputPath);
        const buffer = Buffer.from(await blob.arrayBuffer());

        const outputPath = path.join(__dirname, 'temp/test_transparent.png');
        await fs.writeFile(outputPath, buffer);
        console.log(`Saved transparent image to ${outputPath}`);

    } catch (error) {
        console.error('Transparency Test Failed:', error);
    }
}

testTransparency();
