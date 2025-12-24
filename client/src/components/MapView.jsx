import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../api';
import './MapView.css';

// Cache-busting version - increment when assets change
const ASSET_VERSION = Date.now();

// Check if map editing is enabled
const EDITABLE_MAP = import.meta.env.VITE_EDITABLE_MAP === 'true';

function MapView({ mysteryId, locations, currentLocationId, onNavigate, onClose, onUpdateLocations }) {
  const currentLocation = locations.find((loc) => loc.id === currentLocationId);
  const adjacentIds = currentLocation?.connections || [];
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editProperty, setEditProperty] = useState('x'); // x, y, width, height
  const [saveStatus, setSaveStatus] = useState(null); // null, 'saving', 'saved', 'error'
  const [hasChanges, setHasChanges] = useState(false);
  const dragStartPos = useRef(null);

  // Initialize hotspot properties from locations
  const [hotspots, setHotspots] = useState(() => {
    const initial = {};
    locations.forEach((loc) => {
      const pos = loc.mapPosition || {};
      initial[loc.id] = {
        x: pos.x ?? 50,
        y: pos.y ?? 50,
        width: pos.width ?? 80,
        height: pos.height ?? 50,
      };
    });
    return initial;
  });

  const mapImageUrl = `/assets/${mysteryId}/assets/map.png?v=${ASSET_VERSION}`;

  const handleLocationClick = (location) => {
    if (!EDITABLE_MAP && adjacentIds.includes(location.id)) {
      onNavigate(location.id);
      onClose();
    }
  };

  const handlePointerDown = useCallback((e, locationId) => {
    if (!EDITABLE_MAP) return;
    e.preventDefault();
    e.stopPropagation();

    // Store starting position to detect if it's a tap or drag
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDragging(locationId);
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
    if (dragging && EDITABLE_MAP) {
      // Check if it was a tap (minimal movement) to select
      if (dragStartPos.current) {
        const dx = Math.abs(e.clientX - dragStartPos.current.x);
        const dy = Math.abs(e.clientY - dragStartPos.current.y);
        if (dx < 5 && dy < 5) {
          // It was a tap - toggle selection
          setSelected(selected === dragging ? null : dragging);
        }
      }

      logPositions();
    }
    setDragging(null);
    dragStartPos.current = null;
  }, [dragging, selected, hotspots, locations]);

  const logPositions = useCallback(() => {
    console.log('\n📍 Updated Map Positions - Copy to manifest.json:\n');
    console.log(JSON.stringify(
      locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        mapPosition: hotspots[loc.id],
      })),
      null,
      2
    ));
    console.log('\n');
  }, [locations, hotspots]);

  const adjustProperty = useCallback((delta) => {
    if (!selected) return;

    const limits = {
      x: { min: 0, max: 100 },
      y: { min: 0, max: 100 },
      width: { min: 30, max: 200 },
      height: { min: 20, max: 150 },
    };

    const { min, max } = limits[editProperty];

    setHotspots((prev) => ({
      ...prev,
      [selected]: {
        ...prev[selected],
        [editProperty]: Math.max(min, Math.min(max, prev[selected][editProperty] + delta)),
      },
    }));
    setHasChanges(true);
    setSaveStatus(null);
    // Log after state updates
    setTimeout(logPositions, 0);
  }, [selected, editProperty, logPositions]);

  const savePositions = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const positions = locations.map((loc) => ({
        id: loc.id,
        mapPosition: hotspots[loc.id],
      }));
      await api.saveMapPositions(mysteryId, positions);
      setSaveStatus('saved');
      setHasChanges(false);
      console.log('✅ Map positions saved to manifest.json');

      // Update the game state so positions persist when map is reopened
      if (onUpdateLocations) {
        const updatedLocations = locations.map((loc) => ({
          ...loc,
          mapPosition: hotspots[loc.id],
        }));
        onUpdateLocations(updatedLocations);
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('error');
    }
  }, [mysteryId, locations, hotspots, onUpdateLocations]);

  // Click on background to deselect
  const handleBackgroundClick = useCallback((e) => {
    if (e.target === containerRef.current || e.target.classList.contains('map-image')) {
      setSelected(null);
    }
  }, []);

  // Log initial message when in edit mode
  useEffect(() => {
    if (EDITABLE_MAP) {
      console.log('🗺️ Map Edit Mode ENABLED - Drag to move, tap to select, use dropdown + buttons to adjust. Check console for coordinates.');
    }
  }, []);

  return (
    <div className="map-overlay" onClick={EDITABLE_MAP ? undefined : onClose}>
      <div className="map-container" onClick={(e) => e.stopPropagation()}>
        {!EDITABLE_MAP && (
          <button className="map-close" onClick={onClose}>
            &times;
          </button>
        )}

        {EDITABLE_MAP && (
          <div className="map-edit-banner">
            <span>EDIT MODE</span>
            <button
              className={`save-btn ${hasChanges ? 'has-changes' : ''} ${saveStatus || ''}`}
              onClick={savePositions}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
            </button>
            <button className="map-close" onClick={onClose}>&times;</button>
          </div>
        )}

        {/* Property controls - show when a hotspot is selected */}
        {EDITABLE_MAP && selected && (
          <div className="map-edit-controls">
            <span className="edit-label">{locations.find(l => l.id === selected)?.name}</span>
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
            <span className="edit-value">{hotspots[selected]?.[editProperty]}</span>
            <button className="edit-btn" onClick={() => adjustProperty(1)}>+1</button>
            <button className="edit-btn" onClick={() => adjustProperty(5)}>+5</button>
          </div>
        )}

        <div
          className="map-image-container"
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={handleBackgroundClick}
        >
          <img
            src={mapImageUrl}
            alt="Manor Map"
            className="map-image"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
            draggable={false}
          />

          {/* Location hotspots */}
          {locations.map((location) => {
            const isCurrentLocation = location.id === currentLocationId;
            const isAdjacent = adjacentIds.includes(location.id);
            const hs = hotspots[location.id] || { x: 50, y: 50, width: 80, height: 50 };
            const isDragging = dragging === location.id;
            const isSelected = selected === location.id;

            return (
              <button
                key={location.id}
                className={`map-hotspot ${isCurrentLocation ? 'current' : ''} ${
                  isAdjacent ? 'adjacent' : ''
                } ${!isCurrentLocation && !isAdjacent && !EDITABLE_MAP ? 'disabled' : ''} ${
                  EDITABLE_MAP ? 'editable' : ''
                } ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `${hs.x}%`,
                  top: `${hs.y}%`,
                  width: `${hs.width}px`,
                  height: `${hs.height}px`,
                  minWidth: 'unset',
                  minHeight: 'unset',
                }}
                onClick={() => handleLocationClick(location)}
                onPointerDown={(e) => handlePointerDown(e, location.id)}
                disabled={!EDITABLE_MAP && !isAdjacent}
              >
                {EDITABLE_MAP && (
                  <>
                    <span className="hotspot-name">{location.name}</span>
                    <span className="hotspot-coords">
                      {hs.x},{hs.y} {hs.width}x{hs.height}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {!EDITABLE_MAP && (
          <div className="map-legend">
            <span className="legend-item current">
              <span className="legend-dot"></span> Current Location
            </span>
            <span className="legend-item adjacent">
              <span className="legend-dot"></span> Can Move Here
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapView;
