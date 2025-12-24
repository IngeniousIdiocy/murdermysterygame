import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import api from '../api';
import './Accusation.css';

function Accusation() {
  const { mysteryId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const [selectedSuspect, setSelectedSuspect] = useState(null);
  const [motive, setMotive] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showReveal, setShowReveal] = useState(false);
  const [revealComplete, setRevealComplete] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState(null);
  const revealRef = useRef(null);

  if (!state.mystery) {
    return (
      <div className="page">
        <div className="container">
          <p>Loading...</p>
          <Link to={`/game/${mysteryId}`} className="btn btn-secondary mt-2">
            Back to Game
          </Link>
        </div>
      </div>
    );
  }

  const suspects = state.mystery.characters.filter((c) => c.isSuspect);
  const accusedSuspect = suspects.find((s) => s.id === selectedSuspect);

  // Auto-scroll reveal text as it streams
  useEffect(() => {
    if (revealRef.current) {
      revealRef.current.scrollTop = revealRef.current.scrollHeight;
    }
  }, [streamingText]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSuspect || !motive.trim()) return;

    setIsSubmitting(true);
    setShowReveal(true);
    setStreamingText('');
    setRevealComplete(false);
    setVerdict(null);
    setError(null);

    let fullText = '';

    await api.accuseStream(
      mysteryId,
      selectedSuspect,
      motive.trim(),
      // onText - append each chunk
      (text) => {
        fullText += text;
        setStreamingText(fullText);
      },
      // onDone - finalize with verdict
      (data) => {
        setVerdict(data.verdict);
        setRevealComplete(true);
        setIsSubmitting(false);

        // Save result for the Result page
        dispatch({
          type: 'SET_ACCUSATION_RESULT',
          payload: {
            isCorrect: data.verdict.isCorrect,
            suspectCorrect: data.verdict.suspectCorrect,
            motiveCorrect: data.verdict.motiveCorrect,
            accusedName: data.accusedName,
            explanation: fullText,
          },
        });
      },
      // onError
      (err) => {
        setError(err.message);
        setShowReveal(false);
        setIsSubmitting(false);
      }
    );
  };

  const handleContinueToResult = () => {
    navigate(`/result/${mysteryId}`);
  };

  return (
    <div className="page accusation-page">
      <div className="container">
        <div className="page-header">
          <h1>Make Your Accusation</h1>
          <p className="text-muted">
            Choose wisely. Once you accuse, there's no going back.
          </p>
        </div>

        <form className="accusation-form" onSubmit={handleSubmit}>
          {/* Suspect selection */}
          <div className="form-section">
            <h2>Who is the murderer?</h2>
            <div className="suspect-grid">
              {suspects.map((suspect) => (
                <label
                  key={suspect.id}
                  className={`suspect-option ${selectedSuspect === suspect.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="suspect"
                    value={suspect.id}
                    checked={selectedSuspect === suspect.id}
                    onChange={(e) => setSelectedSuspect(e.target.value)}
                  />
                  <div className="suspect-portrait">
                    <img
                      src={`/assets/${mysteryId}/assets/characters/${suspect.id}.png`}
                      alt={suspect.name}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="suspect-info">
                    <span className="suspect-name">{suspect.name}</span>
                    <span className="suspect-role">{suspect.role}</span>
                  </div>
                  {state.talkedToCharacters.includes(suspect.id) && (
                    <span className="badge">Interviewed</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Motive explanation */}
          <div className="form-section">
            <h2>What was their motive?</h2>
            <p className="text-muted mb-2">
              Explain in your own words why this person committed the murder.
            </p>
            <textarea
              value={motive}
              onChange={(e) => setMotive(e.target.value)}
              placeholder="I believe the motive was..."
              rows={5}
              required
            />
          </div>

          {error && (
            <div className="error mb-2">
              <p>{error}</p>
            </div>
          )}

          <div className="form-actions">
            <Link to={`/game/${mysteryId}`} className="btn btn-secondary">
              Continue Investigating
            </Link>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={!selectedSuspect || !motive.trim() || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Accusation'}
            </button>
          </div>
        </form>

        {/* Investigation summary */}
        <div className="investigation-summary card mt-3">
          <h3>Investigation Summary</h3>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-value">{state.discoveredClues.length}</span>
              <span className="stat-label">Clues Found</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {state.talkedToCharacters.filter((id) =>
                  suspects.some((s) => s.id === id)
                ).length}
              </span>
              <span className="stat-label">Suspects Interviewed</span>
            </div>
            <div className="stat">
              <span className="stat-value">{state.visitedLocations.length}</span>
              <span className="stat-label">Locations Visited</span>
            </div>
          </div>
        </div>
      </div>

      {/* Streaming reveal overlay */}
      {showReveal && (
        <div className="reveal-overlay">
          <div className="reveal-modal">
            <div className="reveal-header">
              <h2>The Truth Revealed</h2>
              {accusedSuspect && (
                <p className="reveal-accused">
                  You accused: <strong>{accusedSuspect.name}</strong>
                </p>
              )}
            </div>

            <div className="reveal-content" ref={revealRef}>
              {streamingText ? (
                <div className="reveal-text">
                  {streamingText.split('\n').map((line, i) => (
                    <p key={i}>{line || '\u00A0'}</p>
                  ))}
                </div>
              ) : (
                <div className="reveal-loading">
                  <span className="typing-dots">
                    <span></span><span></span><span></span>
                  </span>
                  <p>Evaluating your accusation...</p>
                </div>
              )}
            </div>

            {revealComplete && verdict && (
              <div className="reveal-footer">
                <div className={`reveal-verdict ${verdict.isCorrect ? 'correct' : 'incorrect'}`}>
                  {verdict.isCorrect ? 'Case Solved!' : 'Incorrect...'}
                </div>
                <button className="btn btn-primary" onClick={handleContinueToResult}>
                  View Full Results
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Accusation;
