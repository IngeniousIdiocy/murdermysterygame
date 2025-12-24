import './MapView.css';

function MapView({ mysteryId, locations, currentLocationId, onNavigate, onClose }) {
  const currentLocation = locations.find((loc) => loc.id === currentLocationId);
  const adjacentIds = currentLocation?.connections || [];

  const mapImageUrl = `/assets/${mysteryId}/assets/map.png`;

  const handleLocationClick = (location) => {
    if (adjacentIds.includes(location.id)) {
      onNavigate(location.id);
      onClose();
    }
  };

  return (
    <div className="map-overlay" onClick={onClose}>
      <div className="map-container" onClick={(e) => e.stopPropagation()}>
        <button className="map-close" onClick={onClose}>
          &times;
        </button>

        <div className="map-image-container">
          <img
            src={mapImageUrl}
            alt="Manor Map"
            className="map-image"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />

          {/* Location hotspots */}
          {locations.map((location) => {
            const isCurrentLocation = location.id === currentLocationId;
            const isAdjacent = adjacentIds.includes(location.id);
            const position = location.mapPosition || { x: 50, y: 50 };

            return (
              <button
                key={location.id}
                className={`map-hotspot ${isCurrentLocation ? 'current' : ''} ${
                  isAdjacent ? 'adjacent' : ''
                } ${!isCurrentLocation && !isAdjacent ? 'disabled' : ''}`}
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                }}
                onClick={() => handleLocationClick(location)}
                disabled={!isAdjacent}
              >
                <span className="hotspot-name">{location.name}</span>
                {isCurrentLocation && <span className="hotspot-badge">You are here</span>}
                {isAdjacent && !isCurrentLocation && (
                  <span className="hotspot-badge adjacent">Tap to move</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="map-legend">
          <span className="legend-item current">
            <span className="legend-dot"></span> Current Location
          </span>
          <span className="legend-item adjacent">
            <span className="legend-dot"></span> Can Move Here
          </span>
        </div>
      </div>
    </div>
  );
}

export default MapView;
