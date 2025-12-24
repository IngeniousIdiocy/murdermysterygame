import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import api from '../api';
import config from '../config';
import './MysterySelect.css';

function MysterySelect() {
  const navigate = useNavigate();
  const { dispatch } = useGame();
  const [mysteries, setMysteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMode, setSelectedMode] = useState('investigation');
  const [questionLimit, setQuestionLimit] = useState(config.game.defaultQuestionLimit);

  useEffect(() => {
    loadMysteries();
  }, []);

  async function loadMysteries() {
    try {
      setLoading(true);
      const data = await api.listMysteries();
      setMysteries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(mysteryId) {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Set game mode
      dispatch({
        type: 'SET_GAME_MODE',
        payload: {
          mode: selectedMode,
          limit: selectedMode === 'challenge' ? questionLimit : Infinity,
        },
      });

      // Load the mystery
      const mystery = await api.loadMystery(mysteryId);
      dispatch({ type: 'LOAD_MYSTERY', payload: mystery });

      navigate(`/game/${mysteryId}`);
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="error">
          <p>Failed to load mysteries: {error}</p>
          <button className="btn btn-primary mt-2" onClick={loadMysteries}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page mystery-select-page">
      <div className="container">
        <div className="page-header">
          <h1>Select a Mystery</h1>
          <p className="text-muted">Choose your case to investigate</p>
        </div>

        <div className="game-mode-selector card mb-3">
          <h3>Game Mode</h3>
          <div className="mode-options">
            <label className={`mode-option ${selectedMode === 'investigation' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="mode"
                value="investigation"
                checked={selectedMode === 'investigation'}
                onChange={(e) => setSelectedMode(e.target.value)}
              />
              <span className="mode-title">Pure Investigation</span>
              <span className="mode-desc">Unlimited questions per character</span>
            </label>
            <label className={`mode-option ${selectedMode === 'challenge' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="mode"
                value="challenge"
                checked={selectedMode === 'challenge'}
                onChange={(e) => setSelectedMode(e.target.value)}
              />
              <span className="mode-title">Challenge Mode</span>
              <span className="mode-desc">Limited questions per character</span>
            </label>
          </div>

          {selectedMode === 'challenge' && (
            <div className="limit-selector mt-2">
              <label>Questions per character:</label>
              <select
                value={questionLimit}
                onChange={(e) => setQuestionLimit(Number(e.target.value))}
              >
                {config.game.questionLimitOptions
                  .filter((opt) => opt !== Infinity)
                  .map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} questions
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        <div className="mystery-list">
          {mysteries.map((mystery) => (
            <div key={mystery.id} className="mystery-card">
              <div className="mystery-thumbnail">
                <img
                  src={`/assets/${mystery.id}/assets/thumbnail.png`}
                  alt={mystery.title}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="mystery-content">
                <h2>{mystery.title}</h2>
                <p className="mystery-tagline">{mystery.tagline}</p>
                <div className="mystery-meta">
                  <span className="badge">{mystery.settings?.era || 'Classic'}</span>
                  <span className="badge badge-primary">{mystery.difficulty}</span>
                </div>
                <button
                  className="btn btn-primary mystery-play-btn"
                  onClick={() => handleSelect(mystery.id)}
                >
                  Play Mystery
                </button>
              </div>
            </div>
          ))}
        </div>

        {mysteries.length === 0 && (
          <div className="text-center text-muted">
            <p>No mysteries available. Add mystery packs to the mysteries folder.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MysterySelect;
