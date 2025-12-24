#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from './config/config.js';
import { scan } from './commands/scan.js';
import { generate } from './commands/generate.js';
import { validate } from './commands/validate.js';
import { verify } from './commands/verify.js';

const program = new Command();

program
    .name('art-generator')
    .description('AI Art Generator for Murder Mystery Game Assets')
    .version('1.0.0');

program.command('scan')
    .description('Scan mystery for assets needing generation')
    .argument('<mysteryId>', 'ID of the mystery to scan')
    .option('--status <status>', 'Filter by status (e.g., placeholder)')
    .action(async (mysteryId, options) => {
        try {
            await scan(mysteryId, options);
        } catch (error) {
            console.error(chalk.red('Error during scan:'), error.message);
            process.exit(1);
        }
    });

program.command('generate')
    .description('Generate assets for a mystery')
    .argument('<mysteryId>', 'ID of the mystery')
    .option('--type <type>', 'Filter by asset type (locations, characters, clues)')
    .option('--asset <assetId>', 'Generate specific asset by ID')
    .option('--all', 'Generate all pending assets')
    .option('--force', 'Regenerate even if files exist')
    .option('--dry-run', 'Preview prompt without generating')
    .option('--provider <provider>', 'AI Provider (gemini, dummy)', 'gemini')
    .action(async (mysteryId, options) => {
        try {
            await generate(mysteryId, options);
        } catch (error) {
            console.error(chalk.red('Error during generation:'), error.message);
            process.exit(1);
        }
    });

program.command('validate')
    .description('Validate existing assets against requirements')
    .argument('<mysteryId>', 'ID of the mystery')
    .action(async (mysteryId) => {
        try {
            await validate(mysteryId);
        } catch (error) {
            console.error(chalk.red('Error during validation:'), error.message);
            process.exit(1);
        }
    });

program.command('verify')
    .description('Verify generated assets using AI Vision')
    .argument('<mysteryId>', 'ID of the mystery')
    .option('--asset <assetId>', 'Verify specific asset by ID')
    .action(async (mysteryId, options) => {
        try {
            await verify(mysteryId, options);
        } catch (error) {
            console.error(chalk.red('Error during verification:'), error.message);
            process.exit(1);
        }
    });

program.parse();
