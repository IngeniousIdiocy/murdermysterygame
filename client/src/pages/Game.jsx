import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import api from '../api';
import SceneView from '../components/SceneView';
import ChatPanel from '../components/ChatPanel';
import EvidenceDrawer from '../components/EvidenceDrawer';
import MapView from '../components/MapView';
import Markdown from '../components/Markdown';
import './Game.css';

// Cache-busting version - increment when assets change
const ASSET_VERSION = Date.now();

function Game() {
  const { mysteryId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showIntro, setShowIntro] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);

  // Load mystery if not loaded
  useEffect(() => {
    if (!state.mystery || state.mysteryId !== mysteryId) {
      loadMystery();
    } else if (!state.visitedLocations.includes(state.mystery.startingLocation)) {
      setShowIntro(true);
    }
  }, [mysteryId]);

  async function loadMystery() {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const mystery = await api.loadMystery(mysteryId);
      dispatch({ type: 'LOAD_MYSTERY', payload: mystery });
      setShowIntro(true);
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }

  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    dispatch({ type: 'TALK_TO_CHARACTER', payload: character.id });
  };

  const handleCloseChat = () => {
    setSelectedCharacter(null);
  };

  const handleNavigate = (locationId) => {
    dispatch({ type: 'MOVE_TO_LOCATION', payload: locationId });
    setShowNavigation(false);
  };

  if (state.isLoading || !state.mystery) {
    return (
      <div className="page game-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="page game-page">
        <div className="error">
          <p>{state.error}</p>
          <Link to="/select" className="btn btn-primary mt-2">
            Back to Mystery Select
          </Link>
        </div>
      </div>
    );
  }

  const currentLocationData = state.mystery.locations.find(
    (l) => l.id === state.currentLocation
  );

  const charactersHere = state.mystery.characters.filter(
    (c) => c.location === state.currentLocation
  );

  const cluesHere = state.mystery.clues.filter(
    (c) => c.location === state.currentLocation
  );

  // Intro modal
  if (showIntro) {
    return (
      <div className="page game-page">
        <div className="intro-overlay">
          <div className="intro-modal">
            <div className="intro-header">
              <img
                src={`/assets/${mysteryId}/assets/thumbnail.png?v=${ASSET_VERSION}`}
                alt={state.mystery.title}
                className="intro-thumbnail"
              />
            </div>
            <div className="intro-body">
              <h1>{state.mystery.title}</h1>
              <div className="intro-content">
                <Markdown>{state.mystery.intro}</Markdown>
              </div>
              <button className="btn btn-primary btn-large" onClick={() => setShowIntro(false)}>
                Begin Investigation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page game-page">
      {/* Location header */}
      <header className="game-header">
        <h1>{currentLocationData.name}</h1>
      </header>

      {/* Main scene */}
      <div className="game-content">
        <SceneView
          mysteryId={mysteryId}
          location={currentLocationData}
          cluesHere={cluesHere}
          charactersHere={charactersHere}
          discoveredClues={state.discoveredClues}
          onDiscoverClue={(clueId) => dispatch({ type: 'DISCOVER_CLUE', payload: clueId })}
          onTalkToCharacter={handleCharacterSelect}
          allClues={state.mystery.clues}
          onUpdateClues={(clues) => dispatch({ type: 'UPDATE_CLUES', payload: clues })}
        />
      </div>

      {/* Bottom action bar */}
      <nav className="game-bottom-bar">
        <button
          className="bottom-bar-btn"
          onClick={() => setShowNavigation(true)}
        >
          <span className="bottom-bar-icon">🗺️</span>
          <span className="bottom-bar-label">Map</span>
        </button>
        <button
          className="bottom-bar-btn"
          onClick={() => setShowEvidence(true)}
        >
          <span className="bottom-bar-icon">📋</span>
          <span className="bottom-bar-label">Evidence</span>
          {state.discoveredClues.length > 0 && (
            <span className="bottom-bar-badge">{state.discoveredClues.length}</span>
          )}
        </button>
        <button
          className="bottom-bar-btn"
          onClick={() => setShowIntro(true)}
        >
          <span className="bottom-bar-icon">📖</span>
          <span className="bottom-bar-label">Story</span>
        </button>
        <button
          className="bottom-bar-btn bottom-bar-btn-danger"
          onClick={() => navigate(`/accuse/${mysteryId}`)}
        >
          <span className="bottom-bar-icon">⚖️</span>
          <span className="bottom-bar-label">Accuse</span>
        </button>
      </nav>

      {/* Map navigation */}
      {showNavigation && (
        <MapView
          mysteryId={mysteryId}
          locations={state.mystery.locations}
          currentLocationId={state.currentLocation}
          onNavigate={handleNavigate}
          onClose={() => setShowNavigation(false)}
          onUpdateLocations={(locations) => dispatch({ type: 'UPDATE_LOCATIONS', payload: locations })}
        />
      )}

      {/* Evidence drawer */}
      {showEvidence && (
        <EvidenceDrawer
          mystery={state.mystery}
          discoveredClues={state.discoveredClues}
          talkedTo={state.talkedToCharacters}
          conversations={state.conversations}
          onClose={() => setShowEvidence(false)}
        />
      )}

      {/* Chat panel */}
      {selectedCharacter && (
        <ChatPanel
          character={selectedCharacter}
          mysteryId={mysteryId}
          conversation={state.conversations[selectedCharacter.id] || []}
          questionsAsked={state.questionsAsked[selectedCharacter.id] || 0}
          questionLimit={state.questionLimit}
          onMessage={(msg) =>
            dispatch({
              type: 'ADD_MESSAGE',
              payload: { characterId: selectedCharacter.id, message: msg },
            })
          }
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
}

export default Game;
