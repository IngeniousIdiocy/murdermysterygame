import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/config.js';
import { GeneratorFactory } from '../services/generatorService.js';
import { ImageService } from '../services/imageService.js';
import { VerificationService } from '../services/verificationService.js';
import chalk from 'chalk';

export async function generate(mysteryId, options = {}) {
    const mysteryPath = path.join(config.paths.mysteries, mysteryId);
    const assetsPath = path.join(mysteryPath, 'assets');

    // 1. Load Style Guide if exists
    let styleGuide = {};
    try {
        const stylePath = path.join(assetsPath, 'style.json');
        const styleContent = await fs.readFile(stylePath, 'utf-8');
        styleGuide = JSON.parse(styleContent);
        console.log(chalk.green('Loaded style guide.'));
    } catch (e) {
        console.log(chalk.gray('No specific style.json found, using defaults.'));
    }

    // 2. Identify target files
    const pattern = path.join(assetsPath, '**/*.json');
    let files = await glob(pattern);

    // Filter out non-assets
    files = files.filter(f => path.basename(f) !== 'style.json' && path.basename(f) !== 'manifest.json');

    // Apply User Filters
    if (options.asset) {
        files = files.filter(f => path.basename(f, '.json') === options.asset);
    }

    if (files.length === 0) {
        console.log(chalk.yellow('No matching assets found to generate.'));
        return;
    }

    console.log(chalk.blue(`Found ${files.length} assets to process.`));

    // 3. Initialize Services
    const provider = GeneratorFactory.getProvider(options.provider);
    const verifier = new VerificationService();

    // 4. Process Loop
    for (const file of files) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            const asset = JSON.parse(content);

            if (options.type && asset.type !== options.type) continue;

            // Check if already generated
            const dir = path.dirname(file);
            const baseName = path.basename(file, '.json');
            const outputFileName = `r_${baseName}.png`;
            const outputPath = path.join(dir, outputFileName);

            try {
                await fs.access(outputPath);
                if (!options.force) {
                    console.log(chalk.gray(`Skipping ${baseName} (already exists). Use --force to regenerate.`));
                    continue;
                }
            } catch (e) {
                // file doesn't exist, proceed
            }

            console.log(chalk.magenta(`\nProcessing: ${asset.name} (${baseName})`));

            // Assemble Prompt
            let fullPrompt = "";
            if (styleGuide.stylePrompt) fullPrompt += `${styleGuide.stylePrompt}. `;
            fullPrompt += asset.prompt;
            if (styleGuide.qualityPrompt) fullPrompt += `, ${styleGuide.qualityPrompt}`;

            if (options.dryRun) {
                console.log(chalk.yellow('[DRY RUN] Prompt:'));
                console.log(fullPrompt);
                continue;
            }

            // Determine if transparency is needed
            // Default: clues and characters need transparency, unless explicitly disabled in asset
            const needsTransparency = (asset.type === 'clue' || asset.type === 'character') && asset.transparent !== false;

            // Retry Loop for Verification
            let attempts = 0;
            const maxAttempts = 3;
            let verified = false;
            let finalImageBuffer = null;

            while (attempts < maxAttempts && !verified) {
                attempts++;
                console.log(chalk.blue(`Attempt ${attempts}/${maxAttempts}...`));

                try {
                    // Generate
                    const imageBuffer = await provider.generateImage(fullPrompt, {
                        width: asset.width,
                        height: asset.height,
                        transparent: needsTransparency // Hint to provider to prompt for white background
                    });

                    // Save to temp file for verification
                    const tempPath = path.resolve(`./temp_${baseName}.png`);
                    await ImageService.saveImage(imageBuffer, tempPath, asset.width, asset.height);

                    // Verify
                    console.log(chalk.cyan('Verifying image...'));
                    const result = await verifier.verifyImage(tempPath, asset.prompt);

                    if (result.verified) {
                        console.log(chalk.green('✓ Verified!'));
                        verified = true;
                        finalImageBuffer = await fs.readFile(tempPath);
                    } else {
                        console.log(chalk.yellow(`⚠ Verification failed: ${result.reason}`));
                        if (attempts < maxAttempts) {
                            console.log(chalk.yellow('Retrying generation...'));
                        }
                    }

                    // Cleanup temp
                    await fs.unlink(tempPath).catch(() => { });

                    // If max attempts reached and still not verified, decide whether to keep last one.
                    // Request says: "if it still fails after two attempts then just proceed with the non-compilant asset"
                    if (!verified && attempts === maxAttempts) {
                        console.log(chalk.red('Max retries reached. Proceeding with unverified asset.'));
                        // We need to regenerate or keep the last one.
                        // Since we unlinked temp, we should actually keep the buffer in memory before unlinking.
                        // Actually, let's keep `imageBuffer` from this iteration if it's the last one.
                        finalImageBuffer = imageBuffer;
                    }

                } catch (err) {
                    console.error(chalk.red('Generation/Verification Error:'), err.message);
                    // If error acts up, better to just continue loop?
                }
            }

            if (!finalImageBuffer) {
                console.error(chalk.red(`Failed to generate valid asset for ${baseName}`));
                continue;
            }

            // Post-Processing: Background Removal
            if (needsTransparency) {
                console.log(chalk.blue('Applying background removal...'));
                try {
                    finalImageBuffer = await ImageService.removeBackground(finalImageBuffer);
                } catch (bgErr) {
                    console.error(chalk.red('Background removal failed, saving original:'), bgErr.message);
                }
            }

            // Save Final
            await ImageService.saveImage(
                finalImageBuffer,
                outputPath,
                asset.width,
                asset.height,
                baseName
            );

            // Update JSON Status
            asset.status = 'draft'; // Maybe 'verified' if verified?
            asset.generatedAt = new Date().toISOString();
            asset.generationModel = config.generation.model;
            // asset.verified = verified; // Optional: track verification status in JSON

            await fs.writeFile(file, JSON.stringify(asset, null, 2));
            console.log(chalk.green(`✓ Saved to ${outputFileName}`));

        } catch (e) {
            console.error(chalk.red(`Failed to generate ${file}:`), e);
        }
    }
}
