import './CharacterPanel.css';

function CharacterPanel({
  characters,
  allCharacters,
  talkedTo,
  questionsAsked,
  questionLimit,
  onSelect,
  currentLocation,
}) {
  const charactersHere = characters;
  const charactersElsewhere = allCharacters.filter(
    (c) => c.location !== currentLocation
  );

  const getQuestionStatus = (characterId) => {
    const asked = questionsAsked[characterId] || 0;
    if (questionLimit === Infinity) return null;
    if (asked >= questionLimit) return 'exhausted';
    return `${asked}/${questionLimit}`;
  };

  const renderCharacterCard = (character, isHere) => {
    const status = getQuestionStatus(character.id);
    const isExhausted = status === 'exhausted';
    const hasTalked = talkedTo.includes(character.id);

    return (
      <button
        key={character.id}
        className={`character-card ${isHere ? '' : 'elsewhere'} ${isExhausted ? 'exhausted' : ''}`}
        onClick={() => isHere && !isExhausted && onSelect(character)}
        disabled={!isHere || isExhausted}
      >
        <div className="character-avatar">
          {character.name.charAt(0)}
        </div>
        <div className="character-info">
          <span className="character-name">{character.name}</span>
          <span className="character-role">{character.role}</span>
          {!isHere && (
            <span className="character-location">
              {allCharacters.find((c) => c.id === character.id)?.location &&
                `In: ${getLocationName(character.location, allCharacters)}`}
            </span>
          )}
        </div>
        <div className="character-status">
          {hasTalked && <span className="badge">Talked</span>}
          {status && status !== 'exhausted' && (
            <span className="badge badge-primary">{status}</span>
          )}
          {isExhausted && (
            <span className="badge badge-danger">No questions left</span>
          )}
          {character.isHelper && (
            <span className="badge badge-success">Helper</span>
          )}
        </div>
      </button>
    );
  };

  // Helper to get location name (would need locations passed in for full implementation)
  const getLocationName = (locId) => {
    // Simplified - in real app, pass locations array
    return locId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="character-panel">
      <div className="characters-section">
        <h2>People Here</h2>
        {charactersHere.length > 0 ? (
          <div className="character-list">
            {charactersHere.map((c) => renderCharacterCard(c, true))}
          </div>
        ) : (
          <p className="text-muted">No one is here right now.</p>
        )}
      </div>

      {charactersElsewhere.length > 0 && (
        <div className="characters-section">
          <h3>Elsewhere</h3>
          <div className="character-list">
            {charactersElsewhere.map((c) => renderCharacterCard(c, false))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CharacterPanel;
