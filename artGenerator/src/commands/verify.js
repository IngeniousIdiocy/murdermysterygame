import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/config.js';
import { VerificationService } from '../services/verificationService.js';
import chalk from 'chalk';

export async function verify(mysteryId, options = {}) {
    const mysteryPath = path.join(config.paths.mysteries, mysteryId);
    const assetsPath = path.join(mysteryPath, 'assets');

    const verifier = new VerificationService();

    console.log(chalk.blue(`Verifying assets for: ${mysteryId} with Gemini Vision`));

    const pattern = path.join(assetsPath, '**/*.json');
    let files = await glob(pattern);
    files = files.filter(f => path.basename(f) !== 'style.json' && path.basename(f) !== 'manifest.json');

    if (options.asset) {
        files = files.filter(f => path.basename(f, '.json') === options.asset);
    }

    for (const file of files) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            const asset = JSON.parse(content);
            const baseName = path.basename(file, '.json');

            const realAssetPath = path.join(path.dirname(file), `r_${baseName}.png`);

            try {
                await fs.access(realAssetPath);

                console.log(chalk.magenta(`\nVerifying: ${baseName}...`));
                const result = await verifier.verifyImage(realAssetPath, asset.prompt);

                if (result.verified) {
                    console.log(chalk.green(`[VERIFIED] ${baseName}`));
                    console.log(chalk.gray(`Reason: ${result.reason}`));
                } else {
                    console.log(chalk.red(`[REJECTED] ${baseName}`));
                    console.log(chalk.yellow(`Reason: ${result.reason}`));
                }

            } catch (e) {
                // Skip if no real asset
                if (asset.status !== 'placeholder') {
                    console.log(chalk.yellow(`[SKIP] No image found for ${baseName}`));
                }
            }

        } catch (e) {
            console.error(chalk.red(`Error processing ${file}:`), e.message);
        }
    }
}
