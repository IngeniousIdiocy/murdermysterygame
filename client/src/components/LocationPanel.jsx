import Markdown from './Markdown';
import './LocationPanel.css';

function LocationPanel({ location, connections, visitedLocations, onNavigate }) {
  if (!location) return null;

  return (
    <div className="location-panel">
      <div className="location-current">
        <h2>{location.name}</h2>
        {location.markdown && (
          <div className="location-description">
            <Markdown>{location.markdown}</Markdown>
          </div>
        )}
      </div>

      <div className="location-connections">
        <h3>Travel to:</h3>
        <div className="connections-grid">
          {connections.map((conn) => (
            <button
              key={conn.id}
              className={`connection-btn ${visitedLocations.includes(conn.id) ? 'visited' : ''}`}
              onClick={() => onNavigate(conn.id)}
            >
              <span className="connection-name">{conn.name}</span>
              {visitedLocations.includes(conn.id) && (
                <span className="visited-badge">Visited</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LocationPanel;
