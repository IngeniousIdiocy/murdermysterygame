# Murder Mystery Game Engine - Requirements & Technical Design

## Overview

A **content-agnostic game engine** that loads and runs murder mystery games from **mystery pack folders**. The engine knows how to play any mystery; the content is entirely data-driven.

### Architecture Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                        GAME ENGINE                               │
│  (React + Node.js - knows HOW to play, not WHAT to play)        │
│                                                                  │
│  • Mystery pack discovery & validation                          │
│  • Location navigation                                          │
│  • Character interrogation (LLM integration)                    │
│  • Clue discovery & notebook                                    │
│  • Accusation & win/loss logic                                  │
│  • Save/load game state                                         │
│  • UI rendering                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ loads
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MYSTERY PACKS                               │
│  (Data folders - each is a complete mystery)                    │
│                                                                  │
│  mysteries/                                                     │
│  ├── blackwood-manor/      ← One mystery                        │
│  │   ├── manifest.json                                          │
│  │   ├── characters/                                            │
│  │   ├── locations/                                             │
│  │   ├── clues/                                                 │
│  │   └── assets/                                                │
│  ├── orient-express/       ← Another mystery                    │
│  └── haunted-lighthouse/   ← Another mystery                    │
└─────────────────────────────────────────────────────────────────┘
```

**Key Principle**: An AI agent can generate new mysteries by creating a properly structured folder. No code changes required.

---

## Part 1: Game Engine Requirements

### 1.1 Mystery Pack Discovery

The engine scans a `mysteries/` directory and:
1. Finds all subdirectories
2. Checks each for a valid `manifest.json`
3. Validates the manifest schema
4. Verifies all referenced files exist (characters, locations, clues, assets)
5. Only shows valid, complete mystery packs to the player

**Validation Rules**:
- Manifest must parse as valid JSON
- All required fields must be present
- All referenced character/location/clue IDs must have corresponding `.md` files
- All referenced asset files must exist (or be placeholder-compatible)
- `spoilers.md` must exist with solution details
- Location connections must form a navigable graph (no orphaned locations)

### 1.2 Game Modes

**Pure Investigation Mode**:
- Unlimited interrogations per character
- No time pressure
- Focus on exploration and deduction

**Challenge Mode**:
- Configurable question limit per character (e.g., 3, 5, 10)
- Forces strategic questioning
- Difficulty selector in game settings

### 1.3 Core Game Loop

```
1. Player selects mystery from available packs
2. Engine loads manifest and all content files
3. Player placed at starting location
4. Player can:
   a. Move to connected locations
   b. Examine current location (discover clues)
   c. Talk to characters present (interrogation)
   d. Open notebook (review collected info)
   e. Make accusation (when ready)
5. Game ends when player makes accusation
6. Engine compares accusation to solution
7. Display win/loss with explanation
```

### 1.4 Location System

- Locations are nodes in a graph
- Each location has connections to other locations
- Characters are assigned to locations
- Clues are assigned to locations
- Examining a location reveals its clues
- Engine tracks which locations have been examined

### 1.5 Character Interrogation

- Free-form text input from player
- Engine constructs LLM prompt from character's markdown content
- LLM responds in character
- Conversation history maintained per character
- Challenge mode: decrement questions remaining after each exchange

**LLM Prompt Construction**:
```
System: [Contents of character's .md file]

[Conversation history]

User: [Player's question]
```

### 1.6 Clue System

- Clues discovered by examining locations
- Each clue has a type: `evidence` or `red_herring`
- Discovered clues appear in notebook
- Clues help player build their theory of the crime

### 1.7 Accusation System

**Win Condition**: Player must correctly identify WHO did it and WHY.

Player provides:
1. **Suspect** - Selected from discovered characters (excluding helper NPCs)
2. **Motive** - Free-form text explaining WHY the suspect committed the murder

**LLM-Evaluated Motive Matching**:
The engine uses an LLM to evaluate whether the player's articulated motive matches the actual motive. This allows for:
- Natural language explanations
- Partial credit for close answers
- Flexibility in how the motive is described

**Accusation Flow**:
```
1. Player selects suspect from dropdown
2. Player types their theory of the motive (free text, 1-3 sentences)
3. Engine loads spoilers.md (ONLY at this point)
4. Engine sends to LLM:
   - The actual murderer and motive from spoilers.md
   - The player's accusation (suspect + motive text)
5. LLM evaluates:
   - Is the suspect correct?
   - Does the motive reasonably match?
6. Return result: correct / partially correct / incorrect
7. Display result with full explanation from spoilers.md
```

**Evaluation Prompt**:
```
You are evaluating a player's accusation in a murder mystery game.

THE ACTUAL SOLUTION:
[Contents of spoilers.md]

PLAYER'S ACCUSATION:
Suspect: [selected character name]
Motive: [player's free-text explanation]

Evaluate the accusation:
1. Is the suspect correct? (yes/no)
2. Does the player's motive match the actual motive? Consider it a match if the core reasoning is correct, even if wording differs. (yes/partially/no)

Respond in JSON:
{
  "suspectCorrect": boolean,
  "motiveMatch": "yes" | "partially" | "no",
  "feedback": "Brief explanation of what they got right/wrong"
}
```

**Result Determination**:
- **Win**: Correct suspect + motive match (yes or partially)
- **Lose**: Wrong suspect OR motive completely wrong

### 1.7.1 Context Isolation

**Critical**: The `spoilers.md` file is NEVER included in character interrogation prompts. It is ONLY loaded when:
1. Validating the mystery pack (check file exists)
2. Evaluating the player's accusation

This prevents the LLM from accidentally leaking the solution during character conversations.

### 1.8 Notebook

Tracks and displays:
- Discovered clues (grouped by type)
- Characters met
- Locations visited
- Interrogation history (searchable/filterable)

### 1.9 Save/Load System

**Auto-save triggers**:
- Location change
- Clue discovery
- After each interrogation
- Game mode/settings change

**Save data** (stored in localStorage):
```javascript
{
  mysteryId: "blackwood-manor",
  difficulty: "pure" | "challenge",
  challengeLimit: number | null,
  currentLocation: "location_id",
  examinedLocations: ["location_id", ...],
  discoveredClues: ["clue_id", ...],
  discoveredCharacters: ["character_id", ...],
  interrogationHistory: {
    "character_id": [
      { role: "user", content: "question" },
      { role: "assistant", content: "response" }
    ]
  },
  questionsRemaining: { "character_id": number },  // challenge mode
  startTime: timestamp,
  gameStatus: "playing" | "won" | "lost"
}
```

### 1.10 UI Screens

**Mystery Selection Screen**:
- Grid/list of available mysteries
- Each shows: title, tagline, difficulty rating, thumbnail
- Invalid packs not shown (logged to console for debugging)

**Game Screen**:
- Current location image (or placeholder)
- Location description
- Characters present (with talk buttons)
- Examine button
- Navigation to connected locations
- Notebook button
- Accusation button

**Interrogation Screen**:
- Character portrait (or placeholder)
- Character name and role
- Conversation history (scrollable)
- Text input for questions
- Questions remaining counter (challenge mode)
- Back button

**Notebook Screen**:
- Tabs: Clues, Characters, Locations, History
- Each clue shows name, description, type
- Search/filter functionality

**Accusation Screen**:
- Dropdown: Select suspect (from discovered characters)
- Text area: "Explain why you believe this person committed the murder" (2-3 sentences)
- Submit/Cancel buttons
- Confirmation dialog before submitting

**End Screen**:
- Win/Loss message with feedback on what player got right/wrong
- Full explanation from spoilers.md (the complete solution)
- Statistics (time, questions asked, clues found)
- Play Again / Choose Another Mystery buttons

---

## Part 2: Mystery Pack Specification

### 2.1 Folder Structure

```
mysteries/
└── {mystery-id}/
    ├── manifest.json           # Required: Mystery metadata and configuration
    ├── intro.md                # Required: Introduction text shown at game start
    ├── spoilers.md             # Required: Solution (murderer + motive) - ISOLATED from gameplay
    ├── characters/
    │   ├── {character-id}.md   # One file per character (NO SPOILERS - who did it, why)
    │   └── ...
    ├── locations/
    │   ├── {location-id}.md    # One file per location
    │   └── ...
    ├── clues/
    │   ├── {clue-id}.md        # One file per clue
    │   └── ...
    └── assets/
        ├── thumbnail.png       # Mystery selection thumbnail
        ├── characters/
        │   ├── {character-id}.png
        │   └── ...
        ├── locations/
        │   ├── {location-id}.png
        │   └── ...
        └── clues/
            ├── {clue-id}.png   # Optional: images for clues
            └── ...
```

### 2.2 Manifest Schema (`manifest.json`)

```json
{
  "id": "blackwood-manor",
  "title": "Murder at Blackwood Manor",
  "tagline": "A poisoning at an aristocratic dinner party",
  "author": "Mystery Author",
  "version": "1.0",
  "difficulty": "medium",

  "settings": {
    "era": "1920s",
    "location": "English countryside mansion",
    "timeOfDay": "evening"
  },

  "startingLocation": "foyer",

  "characters": [
    {
      "id": "lady-margaret",
      "name": "Lady Margaret Blackwood",
      "role": "The Widow",
      "location": "library",
      "isHelper": false,
      "isSuspect": true
    },
    {
      "id": "detective-foster",
      "name": "Detective Sarah Foster",
      "role": "Investigating Officer",
      "location": "foyer",
      "isHelper": true,
      "isSuspect": false
    }
  ],

  "locations": [
    {
      "id": "foyer",
      "name": "Grand Foyer",
      "connections": ["study", "library", "dining-room"]
    },
    {
      "id": "study",
      "name": "The Study",
      "connections": ["foyer", "library"]
    }
  ],

  "clues": [
    {
      "id": "poison-bottle",
      "name": "Poison Bottle",
      "location": "kitchen",
      "type": "evidence"
    },
    {
      "id": "financial-records",
      "name": "Financial Records",
      "location": "study",
      "type": "evidence"
    },
    {
      "id": "wine-glass",
      "name": "Wine Glass with Residue",
      "location": "study",
      "type": "evidence"
    },
    {
      "id": "red-scarf",
      "name": "Red Silk Scarf",
      "location": "garden",
      "type": "red_herring"
    }
  ]
}
```

**Note**: The solution (murderer + motive) is stored in `spoilers.md`, NOT in the manifest. This keeps spoilers isolated from gameplay context.

### 2.3 Spoilers File Structure (`spoilers.md`)

This file contains the solution and is ONLY loaded during accusation evaluation. It is NEVER included in character or location prompts.

```markdown
# Solution: Murder at Blackwood Manor

## The Murderer
James Hartley

## The Motive
James Hartley had been embezzling money from the Blackwood-Hartley Shipping Company for three years to cover gambling debts. Lord Blackwood discovered the missing funds and confronted James at 7:30 PM on the night of the murder, threatening to go to the police. Facing prison and complete financial ruin, James saw murder as his only way out.

## How It Happened
During cocktails before dinner, James rifled through Dr. Chen's medical bag in the foyer and stole her bottle of digitalis (heart medication prescribed to Lord Blackwood). When Blackwood excused himself to the study around 7:45 PM, James followed shortly after, claiming he needed the washroom. He slipped the poison into Blackwood's brandy glass. The lethal dose took effect within the hour.

## Key Evidence
- Financial ledger showing embezzlement
- Business contract with Blackwood's angry annotations about missing money
- Muddy footprints (size 10, James's size) from study window to garden
- Dr. Chen's tampered medical bag
- Prescription note torn from Dr. Chen's pad
- Butler witnessed James leaving toward study at 7:45 PM
```

**Structure Requirements**:
- `## The Murderer` - Character ID or full name
- `## The Motive` - Full narrative explanation of WHY (this is what player's answer is compared against)
- `## How It Happened` - The method (for explanation, not for winning)
- `## Key Evidence` - What clues support the solution (for explanation)

### 2.4 Character Markdown Structure (`characters/{id}.md`)

The entire content of this file is passed to the LLM as the system prompt. Structure it for effective roleplay.

**CRITICAL: NO SPOILERS IN CHARACTER FILES**
- Do NOT include "you are the murderer" or "you are innocent"
- Do NOT include the actual motive for the murder
- Characters should have their own perspective, secrets, and suspicions
- The guilty party's file should make them seem suspicious but not confess
- All characters should be written as if they could be innocent OR guilty

```markdown
# Character: Lady Margaret Blackwood

## Basic Information
- **Role**: The Widow
- **Age**: Early 50s
- **Appearance**: Elegant, wearing black mourning dress, pearl necklace

## Personality
You are aristocratic, composed, and intelligent. You maintain dignity despite grief. You speak with refined language befitting your class. You're somewhat bitter about your husband's infidelity but try to hide it.

## Background
You have been married to Lord Richard Blackwood for 30 years. The marriage started with love but grew cold over the past decade. You discovered his affair with Victoria Sterling last month when you found love letters hidden in his desk.

## What You Know
- **Your alibi**: You were in the library reading from 7:45 to 8:15 PM
- **About the victim**: Your husband of 30 years. He was difficult but you didn't wish him dead.
- **Observations**: You heard angry voices from the study around 7:30 PM - it sounded like Richard arguing with James about money.
- **Suspicions**: James Hartley was always too interested in the business finances.

## Secrets (reveal reluctantly)
- The estate is deeply in debt due to Richard's poor investments
- You consulted with a divorce attorney two weeks ago
- You're privately relieved he's dead, though you feel guilty about it

## Why You Might Be Suspected
You inherit the entire estate. You knew about the affair. You wanted a divorce. Any detective would look at you closely.

## How to Respond
- Stay in character at all times
- Be evasive at first, more open after building rapport
- Show hints of bitterness when Victoria is mentioned
- Use refined, aristocratic language
- Don't reveal secrets immediately - make the detective work for it
- Express appropriate grief while maintaining composure
- Keep responses under 150 words
```

### 2.5 Location Markdown Structure (`locations/{id}.md`)

```markdown
# Location: The Study

## Description
A dark wood-paneled room dominated by a massive mahogany desk. Floor-to-ceiling bookshelves line the walls, filled with leather-bound volumes. The air smells faintly of tobacco and old books. A Persian rug covers most of the hardwood floor. This is where Lord Blackwood's body was discovered.

## Atmosphere
The room feels heavy with secrets. Shadows gather in the corners despite the ornate brass lamp on the desk. Papers are scattered across the desktop, and a crystal decanter of brandy sits half-empty on a silver tray.

## Notable Features
- Mahogany desk with scattered papers
- Crystal brandy decanter and glasses
- Floor-to-ceiling bookshelves
- Persian rug (where the body was found)
- Fireplace with dying embers
- Window overlooking the garden

## Placeholder Image Description
Dark Victorian study with mahogany desk, leather chair, bookshelves, Persian rug with body outline marked in tape, crystal decanter on desk, window showing night garden.
```

### 2.6 Clue Markdown Structure (`clues/{id}.md`)

```markdown
# Clue: Poison Bottle

## Name
Small Medicine Bottle

## Type
evidence

## Brief Description
A small brown glass bottle with a pharmacy label, found hidden in the kitchen pantry.

## Detailed Description
A tiny bottle labeled 'Digitalis - Heart Medication' from Whitmore's Pharmacy. The prescription date is recent, but the bottle is nearly empty when it should be mostly full. The label shows it was prescribed to Lord Blackwood.

## Significance
Digitalis in high doses is lethal. Someone used Lord Blackwood's own heart medication to poison him.

## Placeholder Image Description
Small brown glass medicine bottle with vintage pharmacy label reading "Digitalis", mostly empty, on wooden shelf.
```

### 2.7 Introduction Markdown (`intro.md`)

```markdown
# Murder at Blackwood Manor

The year is 1923. You are a detective called to Blackwood Manor on a cold autumn evening.

Lord Richard Blackwood, wealthy industrialist and patriarch of the Blackwood family, has been found dead in his study. The cause: poison.

It happened during a dinner party. Six guests were present, and any one of them could be the killer.

Your task: interrogate the suspects, examine the crime scene, and gather evidence. When you're ready, make your accusation.

**The victim**: Lord Richard Blackwood, 58, found slumped over his desk at 8:30 PM.

**The suspects**: His wife, his business partner, the family doctor, the butler, and a young artist.

**The setting**: Blackwood Manor, a grand estate in the English countryside.

Trust no one. Everyone has secrets.

Good luck, Detective.
```

### 2.8 Asset Placeholders

During development (or if assets are missing), the engine displays a placeholder:

```
┌─────────────────────────────────────────┐
│                                         │
│        [White/gray background]          │
│                                         │
│    "Placeholder Image Description"      │
│    from the markdown file               │
│                                         │
└─────────────────────────────────────────┘
```

The engine reads the `Placeholder Image Description` field from the relevant markdown file and displays it as text over a neutral background.

---

## Part 3: Technical Architecture

### 3.1 Tech Stack

**Frontend**:
- React 18+ with React Router
- Vite build tool
- React Context API + useReducer for state
- CSS Modules (mobile-first)

**Backend**:
- Node.js + Express
- OpenAI API integration
- Mystery pack loader/validator
- Rate limiting

**Storage**:
- localStorage for game saves
- Filesystem for mystery packs (served statically or via API)

### 3.2 Project Structure

```
murdermysterygame/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── screens/
│   │   │   │   ├── MysterySelectScreen.jsx
│   │   │   │   ├── GameScreen.jsx
│   │   │   │   ├── InterrogationScreen.jsx
│   │   │   │   ├── NotebookScreen.jsx
│   │   │   │   ├── AccusationScreen.jsx
│   │   │   │   └── EndScreen.jsx
│   │   │   ├── game/
│   │   │   │   ├── LocationView.jsx
│   │   │   │   ├── CharacterCard.jsx
│   │   │   │   ├── ClueCard.jsx
│   │   │   │   └── ConversationHistory.jsx
│   │   │   └── ui/
│   │   │       ├── Button.jsx
│   │   │       ├── Modal.jsx
│   │   │       ├── ImagePlaceholder.jsx
│   │   │       └── LoadingSpinner.jsx
│   │   ├── context/
│   │   │   ├── GameContext.jsx
│   │   │   └── gameReducer.js
│   │   ├── services/
│   │   │   ├── mysteryLoader.js      # Fetches & validates mystery packs
│   │   │   ├── api.js                # Backend API calls
│   │   │   └── storage.js            # localStorage helpers
│   │   ├── hooks/
│   │   │   ├── useMysteryPacks.js
│   │   │   └── useGameState.js
│   │   ├── utils/
│   │   │   ├── markdownParser.js     # Parse .md files
│   │   │   └── validation.js         # Manifest validation
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── public/
│       └── mysteries/                # Mystery packs served statically
│           ├── blackwood-manor/
│           └── ...
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── mysteries.js          # GET /api/mysteries
│   │   │   └── interrogate.js        # POST /api/interrogate
│   │   ├── services/
│   │   │   ├── mysteryService.js     # Load/validate mystery packs
│   │   │   └── llmService.js         # OpenAI integration
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   └── rateLimit.js
│   │   └── server.js
│   └── mysteries/                    # Mystery packs (if server-loaded)
└── README.md
```

### 3.3 API Endpoints

**GET /api/mysteries**
Returns list of valid mystery packs:
```json
{
  "mysteries": [
    {
      "id": "blackwood-manor",
      "title": "Murder at Blackwood Manor",
      "tagline": "A poisoning at an aristocratic dinner party",
      "difficulty": "medium",
      "thumbnail": "/mysteries/blackwood-manor/assets/thumbnail.png"
    }
  ]
}
```

**GET /api/mysteries/:id**
Returns full mystery pack data (manifest + all markdown content):
```json
{
  "manifest": { ... },
  "intro": "# Murder at Blackwood Manor...",
  "characters": {
    "lady-margaret": "# Character: Lady Margaret...",
    ...
  },
  "locations": {
    "study": "# Location: The Study...",
    ...
  },
  "clues": {
    "poison-bottle": "# Clue: Poison Bottle...",
    ...
  }
}
```

**POST /api/interrogate**
```json
// Request
{
  "mysteryId": "blackwood-manor",
  "characterId": "lady-margaret",
  "characterContext": "# Character: Lady Margaret...",  // Full markdown
  "conversationHistory": [
    { "role": "user", "content": "Where were you at 8pm?" },
    { "role": "assistant", "content": "I was in the library..." }
  ],
  "question": "Did you hear anything unusual?"
}

// Response
{
  "response": "Now that you mention it, I did hear raised voices...",
  "tokensUsed": 150
}
```

### 3.4 LLM Integration

**System Prompt Construction**:
The server constructs the prompt from the character's markdown file:

```javascript
async function interrogate(characterMarkdown, conversationHistory, question) {
  const messages = [
    {
      role: "system",
      content: characterMarkdown  // Entire .md file content
    },
    ...conversationHistory,
    {
      role: "user",
      content: question
    }
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: 200,
    temperature: 0.8
  });

  return response.choices[0].message.content;
}
```

**Token/Cost Management**:
- Max conversation history: 10 exchanges (older trimmed)
- Max response tokens: 200
- Rate limit: 30 requests/minute per session

### 3.5 Mystery Pack Validation

```javascript
function validateMysteryPack(packPath) {
  const errors = [];

  // 1. Check manifest exists and parses
  const manifestPath = path.join(packPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { valid: false, errors: ['Missing manifest.json'] };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath));
  } catch (e) {
    return { valid: false, errors: ['Invalid JSON in manifest.json'] };
  }

  // 2. Check required manifest fields
  const requiredFields = ['id', 'title', 'startingLocation', 'characters', 'locations', 'clues', 'solution'];
  for (const field of requiredFields) {
    if (!manifest[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // 3. Check all character .md files exist
  for (const char of manifest.characters || []) {
    const charPath = path.join(packPath, 'characters', `${char.id}.md`);
    if (!fs.existsSync(charPath)) {
      errors.push(`Missing character file: ${char.id}.md`);
    }
  }

  // 4. Check all location .md files exist
  for (const loc of manifest.locations || []) {
    const locPath = path.join(packPath, 'locations', `${loc.id}.md`);
    if (!fs.existsSync(locPath)) {
      errors.push(`Missing location file: ${loc.id}.md`);
    }
  }

  // 5. Check all clue .md files exist
  for (const clue of manifest.clues || []) {
    const cluePath = path.join(packPath, 'clues', `${clue.id}.md`);
    if (!fs.existsSync(cluePath)) {
      errors.push(`Missing clue file: ${clue.id}.md`);
    }
  }

  // 6. Validate intro.md exists
  if (!fs.existsSync(path.join(packPath, 'intro.md'))) {
    errors.push('Missing intro.md');
  }

  // 7. Validate solution references exist
  if (manifest.solution) {
    const characterIds = (manifest.characters || []).map(c => c.id);
    const clueIds = (manifest.clues || []).map(c => c.id);

    if (!characterIds.includes(manifest.solution.murderer)) {
      errors.push(`Solution murderer "${manifest.solution.murderer}" not in characters`);
    }
    if (!clueIds.includes(manifest.solution.weapon)) {
      errors.push(`Solution weapon "${manifest.solution.weapon}" not in clues`);
    }
    if (!clueIds.includes(manifest.solution.motive)) {
      errors.push(`Solution motive "${manifest.solution.motive}" not in clues`);
    }
  }

  // 8. Validate starting location exists
  const locationIds = (manifest.locations || []).map(l => l.id);
  if (!locationIds.includes(manifest.startingLocation)) {
    errors.push(`Starting location "${manifest.startingLocation}" not in locations`);
  }

  // 9. Validate location graph is connected
  // (all locations reachable from starting location)
  // ... graph traversal logic ...

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Part 4: Implementation Phases

### Phase 1: Project Setup & Mystery Loader
1. Initialize React + Node.js project structure
2. Create mystery pack validation logic
3. Create API endpoints for loading mysteries
4. Create mystery selection screen
5. Test with mock mystery pack

**Deliverable**: Can browse and select mystery packs

### Phase 2: Core Game State & Navigation
1. Implement GameContext with full state management
2. Create location navigation system
3. Build GameScreen with location display
4. Implement location examination (clue discovery)
5. Create Notebook screen

**Deliverable**: Can navigate locations and discover clues

### Phase 3: Character System & Interrogation
1. Build character display on locations
2. Create InterrogationScreen UI
3. Implement LLM integration (backend)
4. Wire up conversation flow
5. Implement challenge mode question limits

**Deliverable**: Can interrogate characters with AI responses

### Phase 4: Accusation & End Game
1. Build AccusationScreen
2. Implement win/loss logic
3. Create EndScreen with explanation
4. Add game statistics tracking
5. Test full game loop

**Deliverable**: Complete playable game

### Phase 5: Polish & Save System
1. Implement localStorage save/load
2. Add auto-save functionality
3. Add loading states and error handling
4. Mobile responsiveness pass
5. Edge case handling

**Deliverable**: Production-ready MVP

---

## Part 5: Success Criteria

### Game Engine
- [ ] Discovers and validates mystery packs from filesystem
- [ ] Only shows valid packs in selection screen
- [ ] Loads complete mystery data (manifest + all markdown)
- [ ] Navigates between locations correctly
- [ ] Tracks examined locations
- [ ] Discovers clues when examining locations
- [ ] Displays characters at correct locations
- [ ] Interrogation sends character markdown to LLM
- [ ] Maintains conversation history per character
- [ ] Challenge mode limits questions correctly
- [ ] Notebook displays all discovered info
- [ ] Accusation validates against solution
- [ ] End screen shows correct win/loss and explanation
- [ ] Save/load preserves complete game state
- [ ] Works on mobile (375px+)

### Mystery Pack Compatibility
- [ ] Engine runs with any valid mystery pack
- [ ] Invalid packs are rejected with clear error messages
- [ ] Missing assets show placeholders (not crashes)
- [ ] New mysteries work without code changes

---

## Part 6: Guidelines for AI Agent Implementation

### What to Build
Build a **content-agnostic game engine**. The engine should work with ANY properly structured mystery pack without modification.

### What NOT to Build
Do not hardcode any mystery content (characters, locations, clues, story) into the game engine code.

### Testing Strategy
1. Create a minimal test mystery pack with 2 locations, 2 characters, 2 clues
2. Test the engine with this minimal pack
3. Create second test pack to verify engine is truly content-agnostic
4. Only then create full "Blackwood Manor" mystery pack

### Error Handling
- Invalid manifest: Log error, don't show in selection
- Missing markdown file: Log error, don't show pack
- Missing asset: Show placeholder with description text
- LLM error: Show "Character is thinking..." retry option
- Save corruption: Offer to start new game

### Key Code Patterns

**Loading mystery content**:
```javascript
// DO: Load from files
const characterContext = await fetch(`/mysteries/${mysteryId}/characters/${charId}.md`).then(r => r.text());

// DON'T: Hardcode content
const characterContext = "You are Lady Margaret...";
```

**Displaying locations**:
```javascript
// DO: Render from loaded data
<LocationView
  location={mysteryData.locations[currentLocationId]}
  locationContent={locationMarkdown[currentLocationId]}
/>

// DON'T: Hardcode locations
{currentLocation === 'study' && <StudyComponent />}
```

**Checking solution**:
```javascript
// DO: Compare against loaded solution
const isCorrect =
  accusation.suspect === mystery.manifest.solution.murderer &&
  accusation.weapon === mystery.manifest.solution.weapon &&
  accusation.motive === mystery.manifest.solution.motive;

// DON'T: Hardcode solution
const isCorrect = accusation.suspect === 'james-hartley';
```

---

## Appendix: Example File Contents

See the `mysteries/blackwood-manor/` folder for a complete example mystery pack that demonstrates all file formats and structures.

---

## Document Version
- Version: 2.0
- Last Updated: 2025-12-23
- Status: Ready for Implementation
- Major Change: Separated game engine from mystery content
