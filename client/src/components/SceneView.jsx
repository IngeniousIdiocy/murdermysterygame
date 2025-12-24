import { useState } from 'react';
import './SceneView.css';

function SceneView({
  mysteryId,
  location,
  cluesHere,
  charactersHere,
  discoveredClues,
  onDiscoverClue,
  onTalkToCharacter,
}) {
  const [hoveredClue, setHoveredClue] = useState(null);
  const [selectedClue, setSelectedClue] = useState(null);

  const locationImageUrl = `/assets/${mysteryId}/assets/locations/${location.id}.png`;

  const handleClueClick = (clue) => {
    if (!discoveredClues.includes(clue.id)) {
      onDiscoverClue(clue.id);
    }
    setSelectedClue(clue);
  };

  const undiscoveredClues = cluesHere.filter((c) => !discoveredClues.includes(c.id));

  return (
    <div className="scene-view">
      {/* Main scene with location background */}
      <div className="scene-container">
        <img
          src={locationImageUrl}
          alt={location.name}
          className="scene-background"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />

        {/* Clue hotspots with icons */}
        {cluesHere.map((clue) => {
          const isDiscovered = discoveredClues.includes(clue.id);
          const hotspot = clue.hotspot || { x: 50, y: 50, radius: 5 };
          const clueImageUrl = `/assets/${mysteryId}/assets/clues/${clue.id}.png`;

          return (
            <button
              key={clue.id}
              className={`clue-hotspot ${isDiscovered ? 'discovered' : 'undiscovered'} ${
                hoveredClue === clue.id ? 'hovered' : ''
              }`}
              style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
              }}
              onClick={() => handleClueClick(clue)}
              onMouseEnter={() => setHoveredClue(clue.id)}
              onMouseLeave={() => setHoveredClue(null)}
              title={isDiscovered ? clue.name : 'Something catches your eye...'}
            >
              <img
                src={clueImageUrl}
                alt={isDiscovered ? clue.name : '?'}
                className="clue-icon"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {!isDiscovered && <span className="hotspot-pulse" />}
              {isDiscovered && <span className="hotspot-check">✓</span>}
            </button>
          );
        })}

        {/* Characters in scene */}
        <div className="scene-characters">
          {charactersHere.map((char, index) => (
            <button
              key={char.id}
              className="scene-character"
              onClick={() => onTalkToCharacter(char)}
              style={{ '--char-index': index }}
            >
              <img
                src={`/assets/${mysteryId}/assets/characters/${char.id}.png`}
                alt={char.name}
                className="character-portrait"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="character-name">{char.name}</span>
              <span className="character-role">{char.role}</span>
            </button>
          ))}
        </div>

        {/* Hint for undiscovered clues */}
        {undiscoveredClues.length > 0 && (
          <div className="scene-hint">
            <span className="hint-icon">🔍</span>
            <span>Look around for clues...</span>
          </div>
        )}
      </div>

      {/* Clue detail modal */}
      {selectedClue && (
        <div className="clue-modal-overlay" onClick={() => setSelectedClue(null)}>
          <div className="clue-modal" onClick={(e) => e.stopPropagation()}>
            <button className="clue-modal-close" onClick={() => setSelectedClue(null)}>
              ×
            </button>
            <div className="clue-modal-image">
              <img
                src={`/assets/${mysteryId}/assets/clues/${selectedClue.id}.png`}
                alt={selectedClue.name}
                onError={(e) => {
                  e.target.parentElement.style.display = 'none';
                }}
              />
            </div>
            <h3>{selectedClue.name}</h3>
            <div className="clue-modal-content">
              {selectedClue.markdown?.split('\n').map((line, i) => {
                if (line.startsWith('#')) return null;
                if (!line.trim()) return null;
                return <p key={i}>{line}</p>;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SceneView;
