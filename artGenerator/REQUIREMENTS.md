# Art Generator Requirements

Complete technical specification for the Murder Mystery Game art generation tool.

## Table of Contents

1. [Overview](#overview)
2. [Input Specifications](#input-specifications)
3. [Output Specifications](#output-specifications)
4. [Image Specifications](#image-specifications)
5. [Prompt Engineering](#prompt-engineering)
6. [Style System](#style-system)
7. [Generation Workflow](#generation-workflow)
8. [Validation Requirements](#validation-requirements)
9. [Error Handling](#error-handling)
10. [CLI Interface](#cli-interface)
11. [Configuration](#configuration)
12. [Integration Testing](#integration-testing)

---

## Overview

### Purpose
Generate production-quality art assets for murder mystery game packs from JSON metadata files containing prompts and specifications.

### Scope
- Read asset metadata from mystery pack directories
- Generate images via AI image generation API
- Save images with correct naming and dimensions
- Update metadata status
- Validate output against specifications

### Out of Scope
- Placeholder generation (handled by game engine)
- Asset serving (handled by game server)
- Game logic or UI

---

## Input Specifications

### Source Directory Structure

```
mysteries/{mystery-id}/assets/
├── thumbnail.json
├── map.json
├── locations/
│   ├── foyer.json
│   ├── study.json
│   └── ...
├── characters/
│   ├── detective-foster.json
│   └── ...
└── clues/
    ├── brandy-glass.json
    └── ...
```

### JSON Metadata Schema

Every asset has a companion JSON file:

```json
{
  "name": "Grand Foyer",
  "type": "location",
  "width": 720,
  "height": 1280,
  "prompt": "Grand entrance hall with marble floors, sweeping staircase, crystal chandelier, and dark wood paneling. Evening lighting with shadows. 1920s aristocratic English manor.",
  "status": "placeholder"
}
```

#### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable asset name |
| `type` | string | One of: `location`, `character`, `clue`, `thumbnail`, `map` |
| `width` | integer | Required width in pixels |
| `height` | integer | Required height in pixels |
| `prompt` | string | Generation prompt (content description) |
| `status` | string | One of: `placeholder`, `draft`, `final` |

#### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `style` | string | Override mystery-level style |
| `negativePrompt` | string | Things to avoid in generation |
| `seed` | integer | Seed for reproducible generation |
| `priority` | integer | Generation order (lower = first) |
| `tags` | array | Categorization tags |
| `notes` | string | Human notes for artist/reviewer |

### Mystery-Level Configuration

Each mystery may have a style configuration file:

```
mysteries/{mystery-id}/assets/style.json
```

```json
{
  "mysteryId": "blackwood-manor",
  "styleName": "1920s English Manor",
  "stylePrompt": "1920s period accurate, moody atmospheric lighting, oil painting style, muted colors with gold accents, dramatic shadows",
  "negativePrompt": "modern elements, anachronistic items, bright colors, cartoon style",
  "qualityPrompt": "highly detailed, professional photography, 8k resolution",
  "characterStyle": "portrait photography style, dramatic lighting, period costume",
  "locationStyle": "architectural photography, wide angle, atmospheric",
  "clueStyle": "macro photography, evidence documentation, sharp focus",
  "seed": null,
  "model": null
}
```

---

## Output Specifications

### File Naming

| Input | Output |
|-------|--------|
| `foyer.json` | `r_foyer.png` |
| `detective-foster.json` | `r_detective-foster.png` |
| `thumbnail.json` | `r_thumbnail.png` |

Pattern: `r_{id}.png` where `{id}` is the JSON filename without extension.

### File Location

Output files must be written to the **same directory** as their source JSON:

```
mysteries/blackwood-manor/assets/locations/foyer.json
mysteries/blackwood-manor/assets/locations/r_foyer.png  ← OUTPUT HERE
```

### File Format

- **Format**: PNG
- **Color Space**: sRGB
- **Bit Depth**: 8-bit per channel (24-bit color)
- **Compression**: Standard PNG compression
- **Metadata**: Strip EXIF/generation metadata (optional)

### Status Update

After successful generation, update the JSON file:

```json
{
  "status": "draft",
  "generatedAt": "2024-01-15T10:30:00Z",
  "generator": "art-generator-v1.0",
  "generationModel": "stable-diffusion-xl",
  "generationSeed": 12345
}
```

---

## Image Specifications

### Dimension Requirements

| Asset Type | Width | Height | Aspect Ratio | Notes |
|------------|-------|--------|--------------|-------|
| Location | 720 | 1280 | 9:16 | Portrait mobile background |
| Character | 400 | 600 | 2:3 | Portrait headshot/bust |
| Clue | 600 | 400 | 3:2 | Landscape evidence photo |
| Thumbnail | 450 | 800 | 9:16 | Mystery selection card |
| Map | 720 | 900 | 4:5 | Floor plan / layout |

### Dimension Handling

The tool MUST output images at **exact specified dimensions**. Options:

1. **Generate at exact size** (preferred if API supports)
2. **Generate larger, then crop/resize**
3. **Generate at aspect ratio, then resize**

If resizing:
- Use high-quality resampling (Lanczos, bicubic)
- Maintain aspect ratio (crop if necessary)
- Center-crop for best composition

### Quality Requirements

- **Minimum resolution**: As specified (no upscaling from smaller)
- **Artifacts**: No visible compression artifacts
- **Consistency**: Style-consistent within a mystery
- **Completeness**: No cut-off elements at edges

---

## Prompt Engineering

### Prompt Assembly

The final prompt sent to the generation API should be assembled from multiple sources:

```
[QUALITY_PREFIX] + [STYLE_PREFIX] + [ASSET_PROMPT] + [TYPE_SUFFIX] + [STYLE_SUFFIX]
```

Example for a location:

```
Quality: "highly detailed, professional quality, 8k"
Style: "1920s period accurate, moody atmospheric lighting"
Asset: "Grand entrance hall with marble floors, sweeping staircase..."
Type: "architectural photography, wide angle"
Suffix: "oil painting style, muted colors"

Final: "highly detailed, professional quality, 8k, 1920s period accurate,
moody atmospheric lighting, Grand entrance hall with marble floors,
sweeping staircase, crystal chandelier, architectural photography,
wide angle, oil painting style, muted colors"
```

### Negative Prompts

Combine negative prompts from:
1. Global defaults (modern elements, text, watermarks)
2. Mystery-level style guide
3. Asset-specific overrides

### Type-Specific Prompt Guidelines

#### Locations
- Emphasize atmosphere and mood
- Include lighting description
- Specify camera angle (wide, establishing)
- No people unless specifically needed

#### Characters
- Portrait/bust composition
- Period-appropriate costume
- Expressive face showing personality
- Neutral or contextual background
- Consistent lighting direction across all characters

#### Clues
- Evidence/forensic photography style
- Sharp focus on the item
- Contextual placement (on desk, floor, etc.)
- Scale reference where appropriate
- Dramatic lighting to highlight importance

#### Thumbnail
- Iconic/establishing shot of the mystery
- Moody, atmospheric
- Should convey genre and setting
- Works at small display sizes

#### Map
- Top-down or isometric floor plan
- Stylized (not photorealistic)
- Clear room delineation
- Period-appropriate cartography style
- Legible at mobile screen size

---

## Style System

### Style Hierarchy

1. **Asset-level** (`asset.json` → `style` field) - highest priority
2. **Type-level** (`style.json` → `characterStyle`, etc.)
3. **Mystery-level** (`style.json` → `stylePrompt`)
4. **Global defaults** (hardcoded in tool)

### Style Consistency

For visual coherence within a mystery:

1. **Color Palette**: Extract/define dominant colors, apply consistently
2. **Lighting**: Consistent direction and mood
3. **Art Style**: Same rendering approach (photorealistic, painterly, etc.)
4. **Period Accuracy**: Consistent era-appropriate elements
5. **Seed Values**: Consider using related seeds for similar assets

### Style Guide Template

```json
{
  "colorPalette": {
    "primary": "#8B7355",
    "secondary": "#C9A227",
    "accent": "#4A3728",
    "shadow": "#1A1A2E",
    "highlight": "#F5F0E1"
  },
  "lighting": {
    "direction": "top-left",
    "mood": "dramatic",
    "temperature": "warm",
    "intensity": "low-key"
  },
  "artStyle": {
    "rendering": "painterly",
    "detail": "high",
    "texture": "oil paint",
    "edges": "soft"
  },
  "period": {
    "era": "1920s",
    "region": "English",
    "class": "aristocratic"
  }
}
```

---

## Generation Workflow

### Batch Processing

```
1. SCAN
   └─→ Find all *.json files in mystery assets/
   └─→ Filter by status (placeholder, or force regenerate)
   └─→ Sort by priority (if specified)

2. PREPARE
   └─→ Load mystery style guide
   └─→ For each asset:
       └─→ Load asset JSON
       └─→ Assemble full prompt
       └─→ Determine dimensions
       └─→ Add to generation queue

3. GENERATE
   └─→ For each item in queue:
       └─→ Call image generation API
       └─→ Handle rate limits (backoff/retry)
       └─→ Download/receive generated image
       └─→ Resize if necessary
       └─→ Validate dimensions
       └─→ Save to temp location

4. VALIDATE
   └─→ Check file exists and readable
   └─→ Verify exact dimensions
   └─→ Verify file format (PNG)
   └─→ Optional: visual quality check

5. FINALIZE
   └─→ Move from temp to final location
   └─→ Update JSON status to "draft"
   └─→ Add generation metadata
   └─→ Log success

6. REPORT
   └─→ Summary of generated assets
   └─→ Any failures or warnings
   └─→ Next steps (review, validate)
```

### Resume Capability

The tool should support resuming interrupted batches:
- Track progress in a state file
- Skip already-generated assets
- Option to force regenerate specific assets

### Selective Generation

Support filtering by:
- Asset type (`--type locations`)
- Asset ID (`--asset foyer`)
- Status (`--status placeholder`)
- All (`--all`)

---

## Validation Requirements

### Pre-Generation Validation

Before generating, verify:
- [ ] JSON file is valid and parseable
- [ ] Required fields present (name, type, width, height, prompt)
- [ ] Dimensions are positive integers
- [ ] Type is recognized
- [ ] Prompt is non-empty

### Post-Generation Validation

After generating, verify:
- [ ] File exists at expected path
- [ ] File is valid PNG
- [ ] Dimensions exactly match specification
- [ ] File size is reasonable (not corrupt/empty)
- [ ] No file system errors

### Integration Validation

After all generation, run game engine validation:
```bash
cd /path/to/game
npm run validate-assets
```

Expected output for success:
```
✓ All assets valid - mystery is testable
```

---

## Error Handling

### API Errors

| Error | Action |
|-------|--------|
| Rate limit (429) | Exponential backoff, retry |
| Server error (5xx) | Retry with backoff, max 3 attempts |
| Invalid request (4xx) | Log error, skip asset, continue |
| Timeout | Retry once, then skip |
| Authentication | Halt, prompt for credentials |

### File System Errors

| Error | Action |
|-------|--------|
| Permission denied | Halt with clear error message |
| Disk full | Halt, report space needed |
| File exists | Skip (unless --force flag) |
| Invalid path | Log error, skip asset |

### Generation Errors

| Error | Action |
|-------|--------|
| Content filter triggered | Log, try modified prompt, or skip |
| Generation failed | Retry once, then skip |
| Wrong dimensions | Resize if close, regenerate if far off |
| Corrupt output | Delete, retry |

### Error Reporting

Generate error report:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "mystery": "blackwood-manor",
  "totalAssets": 24,
  "successful": 22,
  "failed": 2,
  "failures": [
    {
      "asset": "locations/study",
      "error": "Content filter triggered",
      "prompt": "Crime scene with body outline...",
      "suggestion": "Remove 'body outline' from prompt"
    }
  ]
}
```

---

## CLI Interface

### Commands

```bash
# Scan and list assets needing generation
art-generator scan <mystery-id>
art-generator scan blackwood-manor --status placeholder

# Generate assets
art-generator generate <mystery-id> [options]
art-generator generate blackwood-manor --all
art-generator generate blackwood-manor --type locations
art-generator generate blackwood-manor --asset foyer
art-generator generate blackwood-manor --force  # regenerate all

# Review generated assets (open in viewer)
art-generator review <mystery-id>

# Update status after manual review
art-generator approve <mystery-id> [--asset <id>]
art-generator reject <mystery-id> --asset <id>

# Validate against game engine specs
art-generator validate <mystery-id>
```

### Options

```
--config <path>     Path to config file
--api-key <key>     API key (overrides config)
--model <model>     Generation model to use
--dry-run           Show what would be generated, don't generate
--force             Regenerate even if r_ file exists
--verbose           Detailed output
--quiet             Minimal output (errors only)
--output <dir>      Output to different directory (for testing)
--style <path>      Override style guide path
--type <type>       Filter by asset type
--asset <id>        Generate specific asset only
--status <status>   Filter by current status
--resume            Resume interrupted batch
--parallel <n>      Number of parallel generations (default: 1)
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - all assets generated |
| 1 | Partial success - some assets failed |
| 2 | Failure - no assets generated |
| 3 | Configuration error |
| 4 | Authentication error |
| 5 | File system error |

---

## Configuration

### Configuration File

`config.json` or `config.yaml`:

```json
{
  "api": {
    "provider": "openai",
    "model": "dall-e-3",
    "apiKey": "${OPENAI_API_KEY}",
    "baseUrl": null,
    "timeout": 120000,
    "retries": 3
  },
  "generation": {
    "defaultQuality": "hd",
    "defaultStyle": "vivid",
    "parallel": 1,
    "delayBetween": 1000
  },
  "output": {
    "format": "png",
    "stripMetadata": true,
    "tempDir": "./temp"
  },
  "paths": {
    "mysteriesDir": "../mysteries",
    "outputDir": null
  },
  "defaults": {
    "qualityPrompt": "highly detailed, professional quality",
    "negativePrompt": "text, watermark, signature, blurry, low quality"
  }
}
```

### Environment Variables

```bash
# API credentials (never commit these)
ART_GENERATOR_API_KEY=sk-...
ART_GENERATOR_API_PROVIDER=openai

# Paths
ART_GENERATOR_MYSTERIES_PATH=../mysteries
ART_GENERATOR_CONFIG_PATH=./config.json

# Options
ART_GENERATOR_PARALLEL=2
ART_GENERATOR_VERBOSE=true
```

### Provider-Specific Configuration

The tool should support multiple providers. Provider-specific options:

#### OpenAI (DALL-E)
```json
{
  "provider": "openai",
  "model": "dall-e-3",
  "quality": "hd",
  "style": "vivid"
}
```

#### Stability AI (Stable Diffusion)
```json
{
  "provider": "stability",
  "model": "stable-diffusion-xl-1024-v1-0",
  "steps": 50,
  "cfgScale": 7.0,
  "sampler": "K_DPMPP_2M"
}
```

#### Midjourney (via API proxy)
```json
{
  "provider": "midjourney",
  "version": "6",
  "stylize": 100,
  "chaos": 0
}
```

#### Local (Automatic1111, ComfyUI)
```json
{
  "provider": "local",
  "baseUrl": "http://localhost:7860",
  "model": "sdxl_base",
  "sampler": "DPM++ 2M Karras"
}
```

---

## Integration Testing

### Test Cases

#### 1. Single Asset Generation
```bash
# Generate one location
art-generator generate blackwood-manor --asset foyer
# Verify
ls mysteries/blackwood-manor/assets/locations/r_foyer.png
npm run validate-assets
```

#### 2. Type-Based Generation
```bash
# Generate all characters
art-generator generate blackwood-manor --type characters
# Verify all 6 character files exist
```

#### 3. Full Mystery Generation
```bash
# Generate everything
art-generator generate blackwood-manor --all
# Verify all 24 assets
npm run validate-assets
```

#### 4. Dimension Validation
```bash
# After generation, verify dimensions
identify -format "%wx%h" r_foyer.png
# Should output: 720x1280
```

#### 5. Game Integration
```bash
# Start game server
cd .. && npm run dev
# Open browser, select mystery, verify images load
# Check browser console for 404 errors
```

### Validation Checklist

- [ ] All r_*.png files created
- [ ] Dimensions match JSON specs exactly
- [ ] Files are valid PNG format
- [ ] JSON status updated to "draft"
- [ ] `npm run validate-assets` passes
- [ ] Game loads images correctly
- [ ] No console errors in browser
- [ ] Visual style is consistent across assets
- [ ] Period accuracy maintained
- [ ] No anachronistic elements

---

## Appendix: Asset Checklist by Type

### Location Assets (6 for Blackwood Manor)

| ID | Name | Size | Key Elements |
|----|------|------|--------------|
| foyer | Grand Foyer | 720x1280 | Marble, staircase, chandelier |
| study | The Study | 720x1280 | Crime scene, desk, body outline |
| library | The Library | 720x1280 | Two-story, rolling ladders |
| dining-room | Dining Room | 720x1280 | Long table, candelabras |
| kitchen | The Kitchen | 720x1280 | Copper pots, cast iron stove |
| garden | The Garden | 720x1280 | Moonlit, hedgerows, muddy path |

### Character Assets (6 for Blackwood Manor)

| ID | Name | Size | Key Elements |
|----|------|------|--------------|
| detective-foster | Detective Foster | 400x600 | Professional, notepad, tweed |
| lady-margaret | Lady Margaret | 400x600 | Aristocratic, pearls, mourning |
| james-hartley | James Hartley | 400x600 | Business suit, nervous |
| dr-chen | Dr. Chen | 400x600 | Doctor attire, medical bag |
| thomas-reed | Thomas Reed | 400x600 | Butler uniform, dignified |
| victoria-sterling | Victoria Sterling | 400x600 | Bohemian, paint-stained |

### Clue Assets (10 for Blackwood Manor)

| ID | Name | Size | Key Elements |
|----|------|------|--------------|
| brandy-glass | Brandy Glass | 600x400 | Crystal, residue, fingerprints |
| business-contract | Contract | 600x400 | Legal document, wax seal |
| reading-glasses | Glasses | 600x400 | Gold frames, cracked lens |
| spilled-brandy | Brandy Stain | 600x400 | Rug stain, glass fragments |
| financial-ledger | Ledger | 600x400 | Open book, red ink |
| love-letters | Letters | 600x400 | Ribbon-tied, pressed flower |
| seating-chart | Seating Chart | 600x400 | Hand-drawn diagram |
| poison-bottle | Poison | 600x400 | Brown bottle, skull label |
| prescription-note | Prescription | 600x400 | Doctor's note |
| muddy-footprints | Footprints | 600x400 | Boot prints on stone |

### Special Assets (2 for each mystery)

| ID | Name | Size | Key Elements |
|----|------|------|--------------|
| thumbnail | Mystery Thumbnail | 450x800 | Manor at night, fog, mood |
| map | Floor Plan | 720x900 | Room layout, parchment style |

---

## Appendix: Prompt Templates

### Location Template
```
{QUALITY}, {STYLE}, {ASSET_PROMPT}, architectural interior photography,
establishing shot, {PERIOD} era, atmospheric {LIGHTING}, no people visible,
{NEGATIVE}
```

### Character Template
```
{QUALITY}, {STYLE}, portrait of {ASSET_PROMPT}, bust shot,
looking at viewer, {PERIOD} costume and styling, studio lighting,
neutral background, {NEGATIVE}
```

### Clue Template
```
{QUALITY}, {STYLE}, close-up photograph of {ASSET_PROMPT},
evidence photography style, sharp focus, dramatic lighting,
contextual placement, {NEGATIVE}
```

### Thumbnail Template
```
{QUALITY}, {STYLE}, {ASSET_PROMPT}, movie poster composition,
dramatic atmosphere, mystery genre, {NEGATIVE}
```

### Map Template
```
{QUALITY}, vintage floor plan illustration, {ASSET_PROMPT},
top-down architectural drawing, {PERIOD} cartography style,
aged parchment texture, hand-drawn aesthetic, {NEGATIVE}
```
