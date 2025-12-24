import { GeneratorFactory } from '../src/services/generatorService.js';
import { VerificationService } from '../src/services/verificationService.js';
import { ImageService } from '../src/services/imageService.js';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, 'temp');

/**
 * Transparency Workflow Test
 * Replicates the logic from generate.js for a single transparent asset (Poison Bottle).
 * Flow: Generate (with transparent prompt) -> Verify -> Remove Background -> Save
 */
async function runTest() {
    console.log(chalk.blue('Running Transparency Workflow Test (Poison Bottle)...'));

    if (!process.env.GOOGLE_API_KEY) {
        console.error(chalk.red('GOOGLE_API_KEY not set.'));
        process.exit(1);
    }

    // Ensure temp dir
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const testAsset = {
        name: "Test Poison Bottle",
        width: 512,
        height: 512,
        prompt: "Small vintage medicine bottle used for heart condition. Label reads 'Digitalis'. Partially empty. Cork stopper. 1920s pharmacy style glass bottle."
    };

    const testImagePath = path.join(tempDir, 'test_transparency_flow.png');
    const finalImagePath = path.join(tempDir, 'test_transparency_final.png');

    try {
        // 1. Initialize
        const generator = GeneratorFactory.getProvider('gemini');
        const verifier = new VerificationService();

        // 2. Generate with Transparency Hint
        console.log(chalk.magenta('Step 1: Generating Image (Prompting for White BG)...'));
        // Note: We deliberately use the 'transparent: true' flag here to test that prompt logic
        const imageBuffer = await generator.generateImage(testAsset.prompt, {
            width: testAsset.width,
            height: testAsset.height,
            transparent: true
        });

        await ImageService.saveImage(imageBuffer, testImagePath, testAsset.width, testAsset.height);
        console.log(chalk.green('Image generated.'));

        // 3. Verify
        console.log(chalk.magenta('Step 2: Verifying Image content...'));
        const check = await verifier.verifyImage(testImagePath, testAsset.prompt);

        if (!check.verified) {
            console.error(chalk.yellow(`Verification failed: ${check.reason}`));
            console.log(chalk.red('[FAIL] Test failed at verification step (content mismatch).'));
            // For the sake of testing the technical workflow, we might want to proceed? 
            // But strict test should fail.
            process.exit(1);
        }
        console.log(chalk.green(`Verified: ${check.reason}`));

        // 4. Remove Background
        console.log(chalk.magenta('Step 3: Removing Background...'));
        let finalBuffer = await fs.readFileSync(testImagePath);
        finalBuffer = await ImageService.removeBackground(finalBuffer);

        // 5. Save Final
        await ImageService.saveImage(finalBuffer, finalImagePath, testAsset.width, testAsset.height);
        console.log(chalk.green(`Saved final asset with transparency to: ${finalImagePath}`));

        console.log(chalk.blue('\n[PASS] Transparency Workflow Test Successful!'));

    } catch (error) {
        console.error(chalk.red('\n[FAIL] Test Error:'), error);
        process.exit(1);
    }
}

runTest();
