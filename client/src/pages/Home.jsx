import { Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import './Home.css';

function Home() {
  const { state, dispatch } = useGame();

  const hasSavedGame = state.mysteryId !== null;

  const handleNewGame = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  return (
    <div className="home-page">
      <div className="home-content">
        <h1>Murder Mystery</h1>
        <p className="tagline">Interrogate suspects. Gather clues. Solve the crime.</p>

        <div className="home-actions">
          {hasSavedGame && (
            <Link to={`/game/${state.mysteryId}`} className="btn btn-primary btn-large">
              Continue Game
            </Link>
          )}

          <Link
            to="/select"
            className="btn btn-secondary btn-large"
            onClick={hasSavedGame ? handleNewGame : undefined}
          >
            {hasSavedGame ? 'New Game' : 'Start Game'}
          </Link>
        </div>

        <div className="home-features">
          <div className="feature">
            <span className="feature-icon">🔍</span>
            <h3>Investigate</h3>
            <p>Explore locations and discover clues</p>
          </div>
          <div className="feature">
            <span className="feature-icon">💬</span>
            <h3>Interrogate</h3>
            <p>Question suspects with free-form conversation</p>
          </div>
          <div className="feature">
            <span className="feature-icon">⚖️</span>
            <h3>Accuse</h3>
            <p>Name the killer and explain their motive</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
