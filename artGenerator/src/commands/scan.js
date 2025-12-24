import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/config.js';
import chalk from 'chalk';

export async function scan(mysteryId, options = {}) {
    const mysteryPath = path.join(config.paths.mysteries, mysteryId);
    const assetsPath = path.join(mysteryPath, 'assets');

    console.log(chalk.blue(`Scanning mystery: ${mysteryId}`));
    console.log(chalk.gray(`Path: ${assetsPath}`));

    try {
        await fs.access(assetsPath);
    } catch (e) {
        console.error(chalk.red(`Assets directory not found for mystery ${mysteryId}`));
        return;
    }

    // Find all JSON files in assets subdirectories
    const pattern = path.join(assetsPath, '**/*.json');
    const files = await glob(pattern);

    let foundCount = 0;

    console.log(chalk.bold('\nAssets found:'));
    console.log('----------------------------------------');

    for (const file of files) {
        // Ignore style.json and mystery manifest if they happen to be caught (manifest is usually a level up)
        if (path.basename(file) === 'style.json' || path.basename(file) === 'manifest.json') continue;

        try {
            const content = await fs.readFile(file, 'utf-8');
            const data = JSON.parse(content);

            // Filter by status if requested
            if (options.status && data.status !== options.status) continue;

            foundCount++;
            const relativePath = path.relative(assetsPath, file);
            const statusColor = data.status === 'final' ? chalk.green : (data.status === 'draft' ? chalk.yellow : chalk.red);

            console.log(
                `${chalk.white(relativePath.padEnd(40))} ` +
                `[${data.type.padEnd(10)}] ` +
                `${statusColor(data.status)}`
            );

        } catch (e) {
            console.warn(chalk.yellow(`Could not parse ${file}: ${e.message}`));
        }
    }

    console.log('----------------------------------------');
    console.log(`Total assets found: ${foundCount}`);
}
