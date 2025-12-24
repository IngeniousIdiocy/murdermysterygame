import './NotesPanel.css';

function NotesPanel({ mystery, discoveredClues, talkedTo, conversations }) {
  // Get discovered clue objects
  const clues = mystery.clues.filter((c) => discoveredClues.includes(c.id));

  // Get characters talked to
  const characters = mystery.characters.filter((c) => talkedTo.includes(c.id));

  // Get suspects only
  const suspects = mystery.characters.filter((c) => c.isSuspect);

  return (
    <div className="notes-panel">
      <h2>Investigation Notes</h2>

      {/* Suspects overview */}
      <div className="notes-section">
        <h3>Suspects</h3>
        <div className="suspects-grid">
          {suspects.map((s) => (
            <div key={s.id} className={`suspect-card ${talkedTo.includes(s.id) ? 'talked' : ''}`}>
              <div className="suspect-avatar">{s.name.charAt(0)}</div>
              <div className="suspect-info">
                <span className="suspect-name">{s.name}</span>
                <span className="suspect-role">{s.role}</span>
              </div>
              {talkedTo.includes(s.id) && <span className="badge">Interviewed</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Discovered clues */}
      <div className="notes-section">
        <h3>Evidence Collected ({clues.length})</h3>
        {clues.length > 0 ? (
          <ul className="clue-list-summary">
            {clues.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>
                <span className="clue-location">Found in: {c.location}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No evidence collected yet.</p>
        )}
      </div>

      {/* Conversation summaries */}
      <div className="notes-section">
        <h3>Interview Logs</h3>
        {characters.length > 0 ? (
          <div className="interview-logs">
            {characters.map((char) => {
              const convo = conversations[char.id] || [];
              return (
                <details key={char.id} className="interview-log">
                  <summary>
                    <span className="log-name">{char.name}</span>
                    <span className="log-count">
                      {convo.filter((m) => m.role === 'user').length} questions
                    </span>
                  </summary>
                  <div className="log-content">
                    {convo.map((msg, idx) => (
                      <div key={idx} className={`log-message ${msg.role}`}>
                        <span className="log-speaker">
                          {msg.role === 'user' ? 'You' : char.name}:
                        </span>
                        <span className="log-text">{msg.content}</span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <p className="text-muted">No interviews conducted yet.</p>
        )}
      </div>

      {/* Progress */}
      <div className="notes-section">
        <h3>Progress</h3>
        <div className="progress-stats">
          <div className="stat">
            <span className="stat-value">
              {discoveredClues.length}/{mystery.clues.length}
            </span>
            <span className="stat-label">Clues Found</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {talkedTo.filter((id) => mystery.characters.find((c) => c.id === id)?.isSuspect).length}/{suspects.length}
            </span>
            <span className="stat-label">Suspects Interviewed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotesPanel;
