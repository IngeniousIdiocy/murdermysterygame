# Claude Code Guide: Murder Mystery Game Engine

## What You're Building

A **content-agnostic game engine** that plays murder mystery games. The engine loads mystery content from folders - it doesn't know WHO did it or WHY until it reads the files. This separation is critical.

```
YOU ARE BUILDING:          YOU ARE NOT BUILDING:
─────────────────          ────────────────────
Game engine (code)         Mystery content (data)
Mystery loader             Hardcoded characters
LLM interrogation system   Hardcoded locations
Accusation evaluator       Hardcoded solutions
UI components              Story logic
```

## Key Documentation

Read these files in order:

1. **REQUIREMENTS.md** - Complete technical specification
2. **mysteries/blackwood-manor/** - Example mystery pack (use for testing)
3. **mysteries/blackwood-manor/spoilers.md** - Solution (for understanding, NOT for hardcoding)

## Critical Architecture Rules

### Rule 1: Context Isolation

The `spoilers.md` file contains the solution. It must NEVER be loaded during normal gameplay.

```javascript
// CORRECT: Only load spoilers during accusation
async function evaluateAccusation(mysteryId, accusation) {
  const spoilers = await loadSpoilers(mysteryId); // Only here!
  return await llmEvaluate(spoilers, accusation);
}

// WRONG: Loading spoilers with other content
async function loadMystery(mysteryId) {
  return {
    manifest: await loadManifest(mysteryId),
    spoilers: await loadSpoilers(mysteryId), // NO! This leaks to gameplay
    ...
  };
}
```

### Rule 2: Content Agnosticism

The engine must work with ANY valid mystery pack. Never hardcode mystery content.

```javascript
// CORRECT: Load from files
const characterPrompt = await fetch(`/mysteries/${id}/characters/${charId}.md`);

// WRONG: Hardcoded content
if (characterId === 'james-hartley') {
  return "You are James Hartley, the guilty party...";
}
```

### Rule 3: Character Files ARE the LLM Prompts

Each character's `.md` file is passed directly to the LLM as the system prompt. The engine doesn't interpret or modify this content.

```javascript
// CORRECT: Pass markdown directly to LLM
const response = await openai.chat.completions.create({
  messages: [
    { role: "system", content: characterMarkdown }, // Entire .md file
    ...conversationHistory,
    { role: "user", content: playerQuestion }
  ]
});

// WRONG: Parsing and reconstructing
const character = parseCharacterMarkdown(characterMarkdown);
const prompt = buildPrompt(character.personality, character.secrets, ...);
```

## Implementation Order

### Phase 1: Project Setup
```bash
# Client
npm create vite@latest client -- --template react
cd client && npm install react-router-dom

# Server
mkdir server && cd server && npm init -y
npm install express cors dotenv openai express-rate-limit
```

Create folder structure per REQUIREMENTS.md section 3.2.

### Phase 2: Mystery Pack Loader
Build the system that:
1. Scans `mysteries/` directory
2. Validates each pack (manifest + required files)
3. Returns list of valid mysteries
4. Loads full mystery content on selection

**Test with**: `mysteries/blackwood-manor/`

### Phase 3: Game State Management
Implement React Context with:
- Current mystery ID
- Current location
- Discovered clues
- Discovered characters
- Interrogation history per character
- Questions remaining (challenge mode)
- Game status

**Auto-save to localStorage** after each state change.

### Phase 4: Core Game Loop
Build screens in order:
1. Mystery selection screen
2. Game screen (location view)
3. Location examination (clue discovery)
4. Navigation between locations
5. Notebook (view collected info)

### Phase 5: Character Interrogation
1. Build interrogation UI
2. Create backend `/api/interrogate` endpoint
3. Pass character markdown as system prompt
4. Maintain conversation history
5. Implement question limits for challenge mode

### Phase 6: Accusation System
1. Build accusation UI (dropdown + text input)
2. Create `/api/evaluate-accusation` endpoint
3. Load `spoilers.md` ONLY at this point
4. Use LLM to compare player's motive to actual motive
5. Return win/partial/lose result

## API Endpoints

```
GET  /api/mysteries              List valid mystery packs
GET  /api/mysteries/:id          Load full mystery (except spoilers.md)
POST /api/interrogate            Character conversation
POST /api/evaluate-accusation    Check player's solution
```

## LLM Prompts

### Character Interrogation
```
System: [Contents of character's .md file - passed verbatim]

[Conversation history as user/assistant messages]

User: [Player's question]
```

### Accusation Evaluation
```
You are evaluating a player's accusation in a murder mystery game.

THE ACTUAL SOLUTION:
[Contents of spoilers.md]

PLAYER'S ACCUSATION:
Suspect: [selected character name]
Motive: [player's free-text explanation]

Evaluate:
1. Is the suspect correct? (yes/no)
2. Does the motive explanation match the actual motive? Consider it a match
   if the core reasoning is correct, even if wording differs. (yes/partially/no)

Respond in JSON:
{
  "suspectCorrect": boolean,
  "motiveMatch": "yes" | "partially" | "no",
  "feedback": "Brief explanation of what they got right/wrong"
}
```

## Placeholder Images

During development, display placeholder boxes with text descriptions:

```jsx
function ImagePlaceholder({ description }) {
  return (
    <div className="placeholder">
      <p>{description}</p>
    </div>
  );
}
```

Read the `## Placeholder Image Description` field from each markdown file.

## Common Mistakes to Avoid

### Don't Parse Markdown Structure
The character/location/clue markdown files are designed to be human-readable AND LLM-readable. Don't try to parse them into structured data.

```javascript
// WRONG: Parsing markdown into objects
const character = {
  name: extractHeader(md),
  personality: extractSection(md, "Personality"),
  secrets: extractBullets(md, "Secrets")
};

// CORRECT: Use markdown as-is
const characterPrompt = markdownContent;
```

### Don't Filter or Modify Character Prompts
The character files are carefully crafted. Pass them to the LLM unchanged.

### Don't Forget the Timeline
The mystery relies on players tracking WHEN things happened. Make sure clue descriptions and character testimonies reference times clearly.

### Don't Show All Characters Immediately
Characters should be "discovered" when the player visits their location for the first time.

### Don't Load Spoilers Early
The `spoilers.md` file should only be read when evaluating the final accusation. Not during mystery loading. Not during gameplay. Only at accusation time.

## Testing Checklist

### Mystery Loading
- [ ] Engine finds mysteries/blackwood-manor/
- [ ] Validates manifest.json
- [ ] Confirms all character .md files exist
- [ ] Confirms all location .md files exist
- [ ] Confirms all clue .md files exist
- [ ] Confirms spoilers.md exists
- [ ] Invalid packs are rejected (not shown)

### Gameplay
- [ ] Can navigate all 6 locations
- [ ] Location connections match manifest
- [ ] Characters appear in correct locations
- [ ] Examining location reveals clues
- [ ] Clues appear in notebook
- [ ] Can interrogate characters
- [ ] Conversation history maintained per character
- [ ] Challenge mode limits questions correctly

### Interrogation
- [ ] Character markdown passed as system prompt
- [ ] LLM responds in character
- [ ] Characters reveal secrets gradually (test with multiple questions)
- [ ] Characters deflect appropriately
- [ ] Conversation flows naturally

### Accusation
- [ ] Can select suspect from discovered characters
- [ ] Can enter free-text motive
- [ ] Spoilers.md loaded only at this point
- [ ] Correct accusation (James + embezzlement) returns win
- [ ] Wrong suspect returns loss
- [ ] Wrong motive returns loss
- [ ] Partial motive match returns win with feedback

### Save/Load
- [ ] Game state saves to localStorage
- [ ] Can refresh and continue
- [ ] Can start new game (clears save)

## File Structure Reference

```
murdermysterygame/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── screens/         # Main screens
│   │   │   ├── game/            # Game-specific components
│   │   │   └── ui/              # Reusable UI components
│   │   ├── context/
│   │   │   └── GameContext.jsx  # State management
│   │   ├── services/
│   │   │   ├── api.js           # Backend API calls
│   │   │   └── storage.js       # localStorage helpers
│   │   └── App.jsx
│   └── public/
│       └── mysteries/           # Mystery packs (static serving)
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── mysteries.js     # GET /api/mysteries
│   │   │   └── interrogate.js   # POST /api/interrogate
│   │   ├── services/
│   │   │   ├── mysteryLoader.js # Validation & loading
│   │   │   └── llmService.js    # OpenAI integration
│   │   └── server.js
│   └── mysteries/               # Or serve from here
└── mysteries/
    └── blackwood-manor/         # Example mystery
```

## Environment Variables

### Server (.env)
```
OPENAI_API_KEY=sk-...
PORT=3001
NODE_ENV=development
```

### Client (.env) - optional
```
VITE_API_URL=http://localhost:3001
```

## When to Ask for Clarification

**Just implement (don't ask):**
- UI styling decisions
- Component structure
- Error message wording
- Loading spinner design

**Ask first:**
- Changes to mystery pack format
- Changes to accusation evaluation logic
- Changes to how spoilers are isolated
- Anything that would require mystery content changes

## Success Criteria

The game is complete when:

1. Player can select mystery from valid packs
2. Player can explore all locations
3. Player can discover all clues
4. Player can interrogate all characters with natural LLM responses
5. Characters reveal information gradually based on questioning
6. Player can make accusation with suspect + free-text motive
7. Accusation is evaluated by LLM against spoilers.md
8. Correct answer (James Hartley + embezzlement motive) wins
9. Game state persists across browser refresh
10. Mobile responsive (375px minimum)
11. No hardcoded mystery content in engine code

## Final Note

The mystery in `blackwood-manor/` is designed with:
- 3 suspicious characters (Margaret, Victoria, James)
- 2 strong red herrings with false alibis
- 1 actual killer
- Timeline-based deduction required
- Multiple pieces of evidence that must be synthesized

The player should be able to accuse the wrong person if they don't think carefully. The LLM evaluation should give helpful feedback explaining what they missed.

Good luck, and remember: **the engine plays mysteries, it doesn't contain them.**
