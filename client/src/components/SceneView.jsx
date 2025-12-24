import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../api';
import './SceneView.css';

// Cache-busting version - increment when assets change
const ASSET_VERSION = Date.now();

// Check if clue editing is enabled
const EDITABLE_CLUES = import.meta.env.VITE_EDITABLE_CLUES === 'true';

function SceneView({
  mysteryId,
  location,
  cluesHere,
  charactersHere,
  discoveredClues,
  onDiscoverClue,
  onTalkToCharacter,
  allClues,
  onUpdateClues,
}) {
  const [hoveredClue, setHoveredClue] = useState(null);
  const [selectedClue, setSelectedClue] = useState(null);
  const containerRef = useRef(null);

  // Edit mode state
  const [dragging, setDragging] = useState(null);
  const [editSelected, setEditSelected] = useState(null);
  const [editProperty, setEditProperty] = useState('x');
  const [saveStatus, setSaveStatus] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const dragStartPos = useRef(null);

  // Initialize hotspot properties from clues
  const [hotspots, setHotspots] = useState(() => {
    const initial = {};
    cluesHere.forEach((clue) => {
      const hs = clue.hotspot || {};
      initial[clue.id] = {
        x: hs.x ?? 50,
        y: hs.y ?? 50,
        width: hs.width ?? 56,
        height: hs.height ?? 40,
      };
    });
    return initial;
  });

  // Update hotspots when location changes (different clues)
  useEffect(() => {
    const updated = {};
    cluesHere.forEach((clue) => {
      const hs = clue.hotspot || {};
      updated[clue.id] = hotspots[clue.id] || {
        x: hs.x ?? 50,
        y: hs.y ?? 50,
        width: hs.width ?? 56,
        height: hs.height ?? 40,
      };
    });
    setHotspots(updated);
    setEditSelected(null);
    setHasChanges(false);
    setSaveStatus(null);
  }, [location.id]);

  const locationImageUrl = `/assets/${mysteryId}/assets/locations/${location.id}.png?v=${ASSET_VERSION}`;

  const handleClueClick = (clue) => {
    if (EDITABLE_CLUES) return; // Don't show detail modal in edit mode
    if (!discoveredClues.includes(clue.id)) {
      onDiscoverClue(clue.id);
    }
    setSelectedClue(clue);
  };

  const handlePointerDown = useCallback((e, clueId) => {
    if (!EDITABLE_CLUES) return;
    e.preventDefault();
    e.stopPropagation();

    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDragging(clueId);
    e.target.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setHotspots((prev) => ({
      ...prev,
      [dragging]: { ...prev[dragging], x: Math.round(x), y: Math.round(y) },
    }));
    setHasChanges(true);
    setSaveStatus(null);
  }, [dragging]);

  const handlePointerUp = useCallback((e) => {
    if (dragging && EDITABLE_CLUES) {
      if (dragStartPos.current) {
        const dx = Math.abs(e.clientX - dragStartPos.current.x);
        const dy = Math.abs(e.clientY - dragStartPos.current.y);
        if (dx < 5 && dy < 5) {
          setEditSelected(editSelected === dragging ? null : dragging);
        }
      }
      logPositions();
    }
    setDragging(null);
    dragStartPos.current = null;
  }, [dragging, editSelected, hotspots, cluesHere]);

  const logPositions = useCallback(() => {
    console.log('\n📍 Updated Clue Positions:\n');
    console.log(JSON.stringify(
      cluesHere.map((clue) => ({
        id: clue.id,
        name: clue.name,
        hotspot: hotspots[clue.id],
      })),
      null,
      2
    ));
    console.log('\n');
  }, [cluesHere, hotspots]);

  const adjustProperty = useCallback((delta) => {
    if (!editSelected) return;

    const limits = {
      x: { min: 0, max: 100 },
      y: { min: 0, max: 100 },
      width: { min: 20, max: 150 },
      height: { min: 20, max: 150 },
    };

    const { min, max } = limits[editProperty];

    setHotspots((prev) => ({
      ...prev,
      [editSelected]: {
        ...prev[editSelected],
        [editProperty]: Math.max(min, Math.min(max, prev[editSelected][editProperty] + delta)),
      },
    }));
    setHasChanges(true);
    setSaveStatus(null);
    setTimeout(logPositions, 0);
  }, [editSelected, editProperty, logPositions]);

  const savePositions = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const cluePositions = cluesHere.map((clue) => ({
        id: clue.id,
        hotspot: hotspots[clue.id],
      }));
      await api.saveCluePositions(mysteryId, cluePositions);
      setSaveStatus('saved');
      setHasChanges(false);
      console.log('✅ Clue positions saved to manifest.json');

      // Update the game state so positions persist
      if (onUpdateClues && allClues) {
        const updatedClues = allClues.map((clue) => ({
          ...clue,
          hotspot: hotspots[clue.id] || clue.hotspot,
        }));
        onUpdateClues(updatedClues);
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('error');
    }
  }, [mysteryId, cluesHere, hotspots, onUpdateClues, allClues]);

  const handleBackgroundClick = useCallback((e) => {
    if (e.target === containerRef.current || e.target.classList.contains('scene-background')) {
      setEditSelected(null);
    }
  }, []);

  useEffect(() => {
    if (EDITABLE_CLUES) {
      console.log('🔧 Clue Edit Mode ENABLED - Drag to move, tap to select, use controls to adjust size.');
    }
  }, []);

  const undiscoveredClues = cluesHere.filter((c) => !discoveredClues.includes(c.id));

  return (
    <div className="scene-view">
      {/* Edit mode banner */}
      {EDITABLE_CLUES && (
        <div className="clue-edit-banner">
          <span>CLUE EDIT: {location.name}</span>
          <button
            className={`save-btn ${hasChanges ? 'has-changes' : ''} ${saveStatus || ''}`}
            onClick={savePositions}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
          </button>
        </div>
      )}

      {/* Property controls when a clue is selected */}
      {EDITABLE_CLUES && editSelected && (
        <div className="clue-edit-controls">
          <span className="edit-label">{cluesHere.find(c => c.id === editSelected)?.name}</span>
          <select
            className="edit-select"
            value={editProperty}
            onChange={(e) => setEditProperty(e.target.value)}
          >
            <option value="x">X</option>
            <option value="y">Y</option>
            <option value="width">Width</option>
            <option value="height">Height</option>
          </select>
          <button className="edit-btn" onClick={() => adjustProperty(-5)}>−5</button>
          <button className="edit-btn" onClick={() => adjustProperty(-1)}>−1</button>
          <span className="edit-value">{hotspots[editSelected]?.[editProperty]}</span>
          <button className="edit-btn" onClick={() => adjustProperty(1)}>+1</button>
          <button className="edit-btn" onClick={() => adjustProperty(5)}>+5</button>
        </div>
      )}

      {/* Main scene with location background */}
      <div
        className="scene-container"
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleBackgroundClick}
      >
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
          const hs = hotspots[clue.id] || { x: 50, y: 50, width: 56, height: 40 };
          const clueImageUrl = `/assets/${mysteryId}/assets/clues/${clue.id}.png?v=${ASSET_VERSION}`;
          const isDragging = dragging === clue.id;
          const isEditSelected = editSelected === clue.id;

          return (
            <button
              key={clue.id}
              className={`clue-hotspot ${isDiscovered ? 'discovered' : 'undiscovered'} ${
                hoveredClue === clue.id ? 'hovered' : ''
              } ${EDITABLE_CLUES ? 'editable' : ''} ${isDragging ? 'dragging' : ''} ${
                isEditSelected ? 'edit-selected' : ''
              }`}
              style={{
                left: `${hs.x}%`,
                top: `${hs.y}%`,
                width: `${hs.width}px`,
                height: `${hs.height}px`,
              }}
              onClick={() => handleClueClick(clue)}
              onPointerDown={(e) => handlePointerDown(e, clue.id)}
              onMouseEnter={() => !EDITABLE_CLUES && setHoveredClue(clue.id)}
              onMouseLeave={() => !EDITABLE_CLUES && setHoveredClue(null)}
              title={EDITABLE_CLUES ? `${clue.name} (${hs.x},${hs.y})` : isDiscovered ? clue.name : 'Something catches your eye...'}
            >
              <img
                src={clueImageUrl}
                alt={isDiscovered ? clue.name : '?'}
                className="clue-icon"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {!EDITABLE_CLUES && !isDiscovered && <span className="hotspot-pulse" />}
              {!EDITABLE_CLUES && isDiscovered && <span className="hotspot-check">✓</span>}
              {EDITABLE_CLUES && (
                <span className="hotspot-coords">
                  {hs.x},{hs.y} {hs.width}x{hs.height}
                </span>
              )}
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
                src={`/assets/${mysteryId}/assets/characters/${char.id}.png?v=${ASSET_VERSION}`}
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

      {/* Clue detail modal - only in non-edit mode */}
      {!EDITABLE_CLUES && selectedClue && (
        <div className="clue-modal-overlay" onClick={() => setSelectedClue(null)}>
          <div className="clue-modal" onClick={(e) => e.stopPropagation()}>
            <button className="clue-modal-close" onClick={() => setSelectedClue(null)}>
              ×
            </button>
            <div className="clue-modal-image">
              <img
                src={`/assets/${mysteryId}/assets/clues/${selectedClue.id}.png?v=${ASSET_VERSION}`}
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
