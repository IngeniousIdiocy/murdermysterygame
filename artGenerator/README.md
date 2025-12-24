# Art Generator CLI

A command-line tool for generating production art assets for the Murder Mystery Game using Google's **Gemini 3 Pro** (Nano Banana Pro) models.

## Usage Guide

### 1. Installation

```bash
cd artGenerator
npm install
```

### 2. Configuration

Create a `.env` file in the `artGenerator` directory (see `.env.example`):

```bash
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL_GENERATION=gemini-3-pro-image-preview
GEMINI_MODEL_VERIFICATION=gemini-3-pro-preview
```

### 3. Scanning Mysteries

To see which assets need to be generated for a mystery pack:

```bash
# Sytax: npm start scan <mystery-id>
npm start scan blackwood-manor
```

**Output:**
```
mysteries/blackwood-manor/assets/locations/foyer.json [location]   placeholder
mysteries/blackwood-manor/assets/characters/butler.json [character]  final
```

### 4. Generating Assets

To generate new images using AI:

```bash
# Generate all pending assets for a mystery
npm start generate blackwood-manor -- --all

# Generate only assets of a specific type
npm start generate blackwood-manor -- --type locations

# Generate a single specific asset by ID
npm start generate blackwood-manor -- --asset foyer

# Force regeneration of existing assets
npm start generate blackwood-manor -- --all --force
```

**Note on Rate Limits**: The tool includes intelligent rate limiting with exponential backoff.
**Note on Transparency**: Assets of type `clue` and `character` are automatically processed to have transparent backgrounds.
**Note on Auto-Verification**: The tool will automatically use Gemini Vision to verify if the generated image matches the prompt. It will retry up to 2 times (3 attempts total) if verification fails.

**Note on Regeneration**: By default, the tool skips assets that already exist.
- To regenerate a specific asset: `npm start generate <mystery> -- --asset <id> --force`
- To regenerate ALL assets: `npm start generate <mystery> -- --all --force`
- To only generate missing assets: `npm start generate <mystery> -- --all`

**Note on Arguments**: When using `npm start`, you must use an extra `--` before passing flags (e.g., `npm start generate ... -- --all`). If running via `node src/index.js`, you don't need the extra `--`.

### 5. Verifying Assets (AI Vision)

To verify that generated images match their descriptions using Gemini 3 Vision:

```bash
# Verify all assets in a mystery
npm start verify blackwood-manor

# Verify a specific asset
npm start verify blackwood-manor -- --asset foyer
```

### 6. Validating Dimensions

To perform a quick local check that files exist and match requirements:

```bash
npm start validate blackwood-manor
```

## Troubleshooting

- **404 Not Found (Gemini)**: Check that your `GEMINI_MODEL_GENERATION` in `.env` matches a valid available model ID (e.g., `gemini-3-pro-image-preview`).
- **429 Resource Exhausted**: The tool will try to handle this automatically. If it persists, wait a minute before trying again.
