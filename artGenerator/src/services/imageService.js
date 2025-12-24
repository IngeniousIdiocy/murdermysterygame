import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { removeBackground } from '@imgly/background-removal-node';

export class ImageService {
    /**
     * Process and save the generated image.
     * If imageBuffer is null (Dummy mode), generates a solid color image with text.
     */
    static async saveImage(imageBuffer, outputPath, width, height, textOverlay = '') {
        try {
            let pipeline;

            if (imageBuffer) {
                pipeline = sharp(imageBuffer);
            } else {
                // Create dummy image
                pipeline = sharp({
                    create: {
                        width: width,
                        height: height,
                        channels: 4,
                        background: { r: 100, g: 100, b: 100, alpha: 1 }
                    }
                });

                // Add text overlay for dummy images
                if (textOverlay) {
                    const svgImage = `
            <svg width="${width}" height="${height}">
              <style>
              .title { fill: white; font-size: 24px; font-weight: bold; }
              </style>
              <text x="50%" y="50%" text-anchor="middle" class="title">${textOverlay.substring(0, 30)}</text>
            </svg>
            `;
                    pipeline = pipeline.composite([{ input: Buffer.from(svgImage), top: 0, left: 0 }]);
                }
            }

            // Resize/Crop to exact dimensions
            // We use 'cover' to ensure it fills the dimensions, cropping if necessary
            await pipeline
                .resize(width, height, {
                    fit: 'cover',
                    position: 'center'
                })
                .png() // Force PNG
                .toFile(outputPath);

            console.log(chalk.green(`Saved: ${outputPath}`));
            return true;

        } catch (error) {
            console.error(chalk.red(`Error processing image for ${outputPath}:`), error);
            throw error;
        }
    }

    static async removeBackground(imageBuffer) {
        try {
            console.log(chalk.blue('Removing background...'));
            // imgly requires a blob or path. Buffer -> Blob not direct in Node typically without polyfill, 
            // but imgly node version might accept buffer? Docs usually say path or blob.
            // Let's create a blob from buffer if node version supports it (Node 20+ does).
            // Otherwise, we might need to write temp file.

            // Workaround for safety: Write temp file
            const tempId = Math.random().toString(36).substring(7);
            const tempPath = path.resolve(`./temp_bg_${tempId}.png`);
            await fs.writeFile(tempPath, imageBuffer);

            const blob = await removeBackground(tempPath);
            const arrayBuffer = await blob.arrayBuffer();
            const resultBuffer = Buffer.from(arrayBuffer);

            // Cleanup
            await fs.unlink(tempPath).catch(() => { });

            return resultBuffer;
        } catch (error) {
            console.error(chalk.red('Background Removal Error:'), error);
            throw error;
        }
    }
}
