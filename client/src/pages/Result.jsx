import { Link, useParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import Markdown from '../components/Markdown';
import './Result.css';

function Result() {
  const { mysteryId } = useParams();
  const { state, dispatch } = useGame();

  const result = state.accusationResult;

  if (!result) {
    return (
      <div className="page result-page">
        <div className="container text-center">
          <h1>No Result</h1>
          <p className="text-muted">You haven't made an accusation yet.</p>
          <Link to={`/game/${mysteryId}`} className="btn btn-primary mt-2">
            Return to Investigation
          </Link>
        </div>
      </div>
    );
  }

  const handleNewGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  return (
    <div className={`page result-page ${result.isCorrect ? 'success' : 'failure'}`}>
      <div className="container">
        <div className="result-card">
          <div className="result-icon">
            {result.isCorrect ? '🎉' : '❌'}
          </div>

          <h1 className="result-title">
            {result.isCorrect ? 'Case Solved!' : 'Case Closed'}
          </h1>

          <div className="result-verdict">
            {result.isCorrect ? (
              <p>
                Congratulations, detective! You correctly identified the murderer
                and their motive.
              </p>
            ) : (
              <p>
                Unfortunately, your accusation was incorrect.
                The real killer remains at large...
              </p>
            )}
          </div>

          <div className="result-details card">
            <h3>Your Accusation</h3>
            <p>
              <strong>Suspect:</strong> {result.accusedName}
            </p>
            <div className="accusation-verdict">
              {result.suspectCorrect ? (
                <span className="badge badge-success">Correct Suspect</span>
              ) : (
                <span className="badge badge-danger">Wrong Suspect</span>
              )}
              {result.motiveCorrect ? (
                <span className="badge badge-success">Correct Motive</span>
              ) : (
                <span className="badge badge-danger">Wrong Motive</span>
              )}
            </div>
          </div>

          <div className="result-explanation card">
            <h3>The Truth Revealed</h3>
            <div className="explanation-text">
              <Markdown>{result.explanation}</Markdown>
            </div>
          </div>

          <div className="result-stats card">
            <h3>Investigation Stats</h3>
            <div className="stats-grid">
              <div className="stat">
                <span className="stat-value">{state.discoveredClues.length}</span>
                <span className="stat-label">Clues Found</span>
              </div>
              <div className="stat">
                <span className="stat-value">{state.talkedToCharacters.length}</span>
                <span className="stat-label">People Interviewed</span>
              </div>
              <div className="stat">
                <span className="stat-value">{state.visitedLocations.length}</span>
                <span className="stat-label">Locations Visited</span>
              </div>
              <div className="stat">
                <span className="stat-value">
                  {Object.values(state.questionsAsked).reduce((a, b) => a + b, 0)}
                </span>
                <span className="stat-label">Questions Asked</span>
              </div>
            </div>
          </div>

          <div className="result-actions">
            <Link
              to="/select"
              className="btn btn-primary"
              onClick={handleNewGame}
            >
              Play Another Mystery
            </Link>
            <Link to="/" className="btn btn-secondary" onClick={handleNewGame}>
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Result;
