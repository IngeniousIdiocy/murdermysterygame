# Murder Mystery Game Engine

A content-agnostic game engine for playing murder mystery games with AI-powered character interrogation.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      GAME ENGINE                            │
│  (React + Node.js - knows HOW to play, not WHAT to play)   │
└────────────────────────────────────────────────────────────┘
                            │
                            │ loads
                            ▼
┌────────────────────────────────────────────────────────────┐
│                     MYSTERY PACKS                           │
│  (Data folders - each is a complete, self-contained game)  │
│                                                             │
│  mysteries/                                                │
│  ├── blackwood-manor/     ← Example mystery included       │
│  ├── orient-express/      ← Add your own                   │
│  └── haunted-lighthouse/  ← Add your own                   │
└────────────────────────────────────────────────────────────┘
```

**Key Insight**: The game engine is content-agnostic. New mysteries are just data folders. An AI agent can generate new mysteries without touching code.

## Win Condition

Players must identify:
1. **WHO** - Select the murderer from discovered characters
2. **WHY** - Explain the motive in their own words (free text)

The LLM evaluates whether the player's motive explanation matches the actual motive. This allows natural language answers rather than multiple choice.

## Context Isolation

**Critical design principle**: The solution is stored in `spoilers.md`, which is NEVER included in character interrogation prompts. This prevents the LLM from accidentally leaking the solution. The spoilers file is only loaded when evaluating the player's final accusation.

## Documentation

| File | Description |
|------|-------------|
| **CLAUDE.md** | Guide for AI coding agents building this project |
| **REQUIREMENTS.md** | Complete technical specification for the game engine |
| **mysteries/blackwood-manor/** | Example mystery pack demonstrating the format |

## Mystery Pack Format

Each mystery is a folder containing:

```
mysteries/{mystery-id}/
├── manifest.json        # Metadata, characters, locations, clues
├── intro.md             # Introduction shown at game start
├── spoilers.md          # Solution (WHO + WHY) - isolated from gameplay
├── characters/
│   └── {id}.md          # One file per character (NO SPOILERS in these files)
├── locations/
│   └── {id}.md          # One file per location
├── clues/
│   └── {id}.md          # One file per clue
└── assets/              # Images (or use placeholders during development)
    ├── thumbnail.png
    ├── characters/
    ├── locations/
    └── clues/
```

## Key Files Explained

### manifest.json
Contains metadata and structure:
- Mystery title, author, difficulty
- List of characters (id, name, role, location)
- List of locations (id, name, connections)
- List of clues (id, name, location, type)

Does NOT contain the solution (that's in spoilers.md).

### spoilers.md
Contains the solution - only loaded during accusation:
- `## The Murderer` - Who did it
- `## The Motive` - Why they did it (full narrative)
- `## How It Happened` - The method
- `## Key Evidence` - What clues support the solution

### Character files
Each character's markdown is passed directly to the LLM as the system prompt. Must NOT contain:
- "You are the murderer" or "You are innocent"
- The actual solution or motive
- Any information that would let the LLM know the answer

Characters should be written so they all seem potentially guilty.

## How It Works

1. **Engine discovers mystery packs** by scanning the `mysteries/` folder
2. **Validates each pack** - checks manifest.json, spoilers.md, and all referenced files
3. **Shows valid packs** to player for selection
4. **Loads selected mystery** - manifest + all markdown (except spoilers.md)
5. **Player plays** - navigates locations, discovers clues, interrogates characters
6. **Character interrogation** - character markdown files are used as LLM system prompts
7. **Player accuses** - selects suspect, types motive explanation
8. **Engine evaluates** - NOW loads spoilers.md, asks LLM to compare
9. **Result** - Win/lose based on correct suspect + matching motive

## Creating New Mysteries

1. Create a folder in `mysteries/`
2. Create `manifest.json` with required fields
3. Create `intro.md` with the mystery introduction
4. Create `spoilers.md` with the solution (WHO + WHY + HOW)
5. Create character markdown files in `characters/` (no spoilers!)
6. Create location markdown files in `locations/`
7. Create clue markdown files in `clues/`
8. Add images or use placeholder descriptions

The engine will automatically discover and validate your mystery.

See `mysteries/blackwood-manor/` for a complete example.

## Tech Stack

- **Frontend**: React 18 + Vite + React Router
- **Backend**: Node.js + Express + OpenAI API (or compatible)
- **Storage**: localStorage for saves, filesystem for mystery packs

## Game Modes

- **Pure Investigation**: Unlimited questions per character
- **Challenge Mode**: Limited questions (3, 5, or 10) per character

## Project Status

**Phase**: Requirements Complete, Ready for Implementation

- [x] Game engine architecture defined
- [x] Mystery pack specification complete
- [x] Context isolation for spoilers designed
- [x] LLM-evaluated accusation system specified
- [x] Example mystery pack created
- [ ] Game engine implementation (next step)

## Files in This Repository

```
murdermysterygame/
├── README.md
├── CLAUDE.md                          # AI agent implementation guide
├── REQUIREMENTS.md
└── mysteries/
    └── blackwood-manor/
        ├── manifest.json
        ├── intro.md
        ├── spoilers.md                # Solution - isolated from gameplay
        ├── characters/
        │   ├── detective-foster.md    # Helper NPC
        │   ├── lady-margaret.md       # Suspect
        │   ├── james-hartley.md       # Suspect (the actual murderer)
        │   ├── dr-chen.md             # Suspect
        │   ├── thomas-reed.md         # Suspect
        │   └── victoria-sterling.md   # Suspect
        ├── locations/
        │   ├── foyer.md
        │   ├── study.md               # Crime scene
        │   ├── library.md
        │   ├── dining-room.md
        │   ├── kitchen.md
        │   └── garden.md
        ├── clues/
        │   ├── brandy-glass.md
        │   ├── business-contract.md
        │   ├── financial-ledger.md
        │   ├── love-letters.md
        │   ├── seating-chart.md
        │   ├── poison-bottle.md
        │   ├── prescription-note.md
        │   └── muddy-footprints.md
        └── assets/                    # (empty - use placeholders)
```

## License

[To be determined]
