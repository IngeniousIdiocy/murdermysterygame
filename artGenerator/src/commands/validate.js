import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/config.js';
import sharp from 'sharp';
import chalk from 'chalk';

export async function validate(mysteryId) {
    const mysteryPath = path.join(config.paths.mysteries, mysteryId);
    const assetsPath = path.join(mysteryPath, 'assets');

    console.log(chalk.blue(`Validating assets for: ${mysteryId}`));

    const pattern = path.join(assetsPath, '**/*.json');
    let files = await glob(pattern);
    files = files.filter(f => path.basename(f) !== 'style.json' && path.basename(f) !== 'manifest.json');

    let errors = 0;

    for (const file of files) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            const asset = JSON.parse(content);
            const baseName = path.basename(file, '.json');

            // Expected generated file
            const realAssetPath = path.join(path.dirname(file), `r_${baseName}.png`);

            try {
                await fs.access(realAssetPath);

                // Check dimensions
                const metadata = await sharp(realAssetPath).metadata();

                if (metadata.width !== asset.width || metadata.height !== asset.height) {
                    console.error(chalk.red(`[FAIL] ${baseName}: Dimension mismatch. Expected ${asset.width}x${asset.height}, got ${metadata.width}x${metadata.height}`));
                    errors++;
                } else {
                    console.log(chalk.green(`[PASS] ${baseName}`));
                }

            } catch (e) {
                if (asset.status !== 'placeholder') {
                    console.error(chalk.red(`[FAIL] ${baseName}: Missing generated file r_${baseName}.png (Status: ${asset.status})`));
                    errors++;
                } else {
                    console.log(chalk.gray(`[SKIP] ${baseName} (Placeholder only)`));
                }
            }

        } catch (e) {
            console.error(chalk.red(`Error processing ${file}:`), e.message);
            errors++;
        }
    }

    if (errors > 0) {
        console.log(chalk.red(`\nValidation finished with ${errors} errors.`));
        process.exit(1);
    } else {
        console.log(chalk.green('\nAll assets valid.'));
    }
}
