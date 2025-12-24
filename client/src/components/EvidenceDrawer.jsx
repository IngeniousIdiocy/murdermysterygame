import { useState } from 'react';
import Markdown from './Markdown';
import './EvidenceDrawer.css';

function EvidenceDrawer({ mystery, discoveredClues, talkedTo, conversations, onClose }) {
  const [activeTab, setActiveTab] = useState('evidence');
  const [expandedItem, setExpandedItem] = useState(null);

  const clues = mystery.clues.filter((c) => discoveredClues.includes(c.id));
  const interviewedCharacters = mystery.characters.filter((c) => talkedTo.includes(c.id));

  return (
    <div className="evidence-drawer-overlay" onClick={onClose}>
      <div className="evidence-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>Case File</h2>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>

        <div className="drawer-tabs">
          <button
            className={`drawer-tab ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => setActiveTab('evidence')}
          >
            Evidence
            {clues.length > 0 && <span className="tab-count">{clues.length}</span>}
          </button>
          <button
            className={`drawer-tab ${activeTab === 'interviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('interviews')}
          >
            Interviews
            {interviewedCharacters.length > 0 && (
              <span className="tab-count">{interviewedCharacters.length}</span>
            )}
          </button>
        </div>

        <div className="drawer-content">
          {activeTab === 'evidence' && (
            <div className="evidence-list">
              {clues.length === 0 ? (
                <div className="empty-state">
                  <p>No evidence collected yet.</p>
                  <p className="text-muted">Explore locations to find clues.</p>
                </div>
              ) : (
                clues.map((clue) => (
                  <div key={clue.id} className="evidence-item">
                    <button
                      className={`evidence-header ${expandedItem === clue.id ? 'expanded' : ''}`}
                      onClick={() => setExpandedItem(expandedItem === clue.id ? null : clue.id)}
                    >
                      <span className="evidence-icon">🔍</span>
                      <div className="evidence-info">
                        <span className="evidence-name">{clue.name}</span>
                        <span className="evidence-location">
                          Found in: {mystery.locations.find((l) => l.id === clue.location)?.name}
                        </span>
                      </div>
                      <span className="expand-icon">{expandedItem === clue.id ? '−' : '+'}</span>
                    </button>
                    {expandedItem === clue.id && (
                      <div className="evidence-details">
                        <Markdown>{clue.markdown}</Markdown>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'interviews' && (
            <div className="interviews-list">
              {interviewedCharacters.length === 0 ? (
                <div className="empty-state">
                  <p>No interviews conducted yet.</p>
                  <p className="text-muted">Talk to people you meet.</p>
                </div>
              ) : (
                interviewedCharacters.map((char) => {
                  const convo = conversations[char.id] || [];
                  return (
                    <div key={char.id} className="interview-item">
                      <button
                        className={`interview-header ${expandedItem === char.id ? 'expanded' : ''}`}
                        onClick={() => setExpandedItem(expandedItem === char.id ? null : char.id)}
                      >
                        <div className="interview-avatar">{char.name.charAt(0)}</div>
                        <div className="interview-info">
                          <span className="interview-name">{char.name}</span>
                          <span className="interview-role">{char.role}</span>
                        </div>
                        <span className="interview-count">
                          {convo.filter((m) => m.role === 'user').length} questions
                        </span>
                        <span className="expand-icon">{expandedItem === char.id ? '−' : '+'}</span>
                      </button>
                      {expandedItem === char.id && (
                        <div className="interview-transcript">
                          {convo.length === 0 ? (
                            <p className="text-muted">No conversation recorded.</p>
                          ) : (
                            convo.map((msg, idx) => (
                              <div key={idx} className={`transcript-message ${msg.role}`}>
                                <span className="transcript-speaker">
                                  {msg.role === 'user' ? 'You' : char.name}:
                                </span>
                                <span className="transcript-text">{msg.content}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EvidenceDrawer;
