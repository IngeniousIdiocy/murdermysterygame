import { useState } from 'react';
import Markdown from './Markdown';
import './CluePanel.css';

function CluePanel({ cluesHere, allClues, discoveredClues, onDiscover }) {
  const [expandedClue, setExpandedClue] = useState(null);

  const undiscoveredHere = cluesHere.filter((c) => !discoveredClues.includes(c.id));
  const discoveredHere = cluesHere.filter((c) => discoveredClues.includes(c.id));
  const discoveredElsewhere = allClues.filter(
    (c) => discoveredClues.includes(c.id) && !cluesHere.some((h) => h.id === c.id)
  );

  const handleDiscover = (clue) => {
    onDiscover(clue.id);
    setExpandedClue(clue.id);
  };

  const renderClue = (clue, canDiscover = false) => {
    const isExpanded = expandedClue === clue.id;
    const isDiscovered = discoveredClues.includes(clue.id);

    return (
      <div key={clue.id} className={`clue-card ${isExpanded ? 'expanded' : ''}`}>
        <div
          className="clue-header"
          onClick={() => {
            if (canDiscover && !isDiscovered) {
              handleDiscover(clue);
            } else {
              setExpandedClue(isExpanded ? null : clue.id);
            }
          }}
        >
          <div className="clue-icon">🔍</div>
          <div className="clue-title">
            <span className="clue-name">
              {isDiscovered ? clue.name : '??? Unknown Clue'}
            </span>
            <span className="clue-type">{clue.type}</span>
          </div>
          {canDiscover && !isDiscovered && (
            <span className="badge badge-primary">Click to examine</span>
          )}
        </div>

        {isExpanded && isDiscovered && clue.markdown && (
          <div className="clue-details">
            <Markdown>{clue.markdown}</Markdown>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="clue-panel">
      {/* Undiscovered clues at this location */}
      {undiscoveredHere.length > 0 && (
        <div className="clue-section">
          <h2>Search This Area</h2>
          <p className="text-muted mb-2">Click to examine and discover clues</p>
          <div className="clue-list">
            {undiscoveredHere.map((c) => renderClue(c, true))}
          </div>
        </div>
      )}

      {/* Discovered clues at this location */}
      {discoveredHere.length > 0 && (
        <div className="clue-section">
          <h2>Clues Found Here</h2>
          <div className="clue-list">
            {discoveredHere.map((c) => renderClue(c))}
          </div>
        </div>
      )}

      {/* All discovered clues */}
      {discoveredElsewhere.length > 0 && (
        <div className="clue-section">
          <h3>Other Discovered Clues</h3>
          <div className="clue-list">
            {discoveredElsewhere.map((c) => renderClue(c))}
          </div>
        </div>
      )}

      {undiscoveredHere.length === 0 && discoveredHere.length === 0 && (
        <div className="clue-section">
          <h2>Clues</h2>
          <p className="text-muted">No clues to find in this location.</p>
        </div>
      )}

      {/* Summary */}
      <div className="clue-summary">
        <span className="text-muted">
          Discovered: {discoveredClues.length} / {allClues.length} clues
        </span>
      </div>
    </div>
  );
}

export default CluePanel;
