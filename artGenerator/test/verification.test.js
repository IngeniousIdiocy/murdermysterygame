import { VerificationService } from '../src/services/verificationService.js';
import { GeneratorFactory } from '../src/services/generatorService.js';
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
 * AI Integration Test
 * 1. Generates an image using Gemini (or Dummy if env not set for cost saving in automated runs, but User asked for strict Gemini usage)
 * 2. Verifies the image using Gemini Vision
 */
async function runTest() {
    console.log(chalk.blue('Running AI Integration Test...'));

    if (!process.env.GOOGLE_API_KEY) {
        console.error(chalk.red('SKIIPPING TEST: GOOGLE_API_KEY not set.'));
        process.exit(0);
    }

    // Ensure temp dir
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const testPrompt = "A futuristic city skyline at sunset with flying cars and neon lights, cyberpunk style.";
    const testImagePath = path.join(tempDir, 'test_gen.png');

    try {
        // 1. Generate
        console.log(chalk.magenta('Step 1: Generating Image...'));
        const generator = GeneratorFactory.getProvider('gemini'); // Strict Gemini

        // Note: If the actual API call fails because the model isn't active or access denied, we catch it.
        const imageBuffer = await generator.generateImage(testPrompt);

        await ImageService.saveImage(imageBuffer, testImagePath, 512, 512);
        console.log(chalk.green('Image generated successfully.'));

        // 2. Verify
        console.log(chalk.magenta('Step 2: Verifying Image with Gemini Vision...'));
        const verifier = new VerificationService();

        const result = await verifier.verifyImage(testImagePath, testPrompt);

        console.log(chalk.bold('\nVerification Result:'));
        console.log(`Verified: ${result.verified ? chalk.green('YES') : chalk.red('NO')}`);
        console.log(`Reason: ${chalk.yellow(result.reason)}`);

        // Assert
        if (result.verified) {
            console.log(chalk.green('\n[PASS] AI Verification Test Passed!'));
        } else {
            console.log(chalk.red('\n[FAIL] AI Verification Test Failed (Content Mismatch).'));
            process.exit(1);
        }

    } catch (error) {
        console.error(chalk.red('\n[FAIL] Test Error:'), error);
        process.exit(1);
    } finally {
        // Clean up
        // if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);
        // if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    }
}

runTest();
