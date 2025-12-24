import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../api';
import './ChatPanel.css';

function ChatPanel({
  character,
  mysteryId,
  conversation,
  questionsAsked,
  questionLimit,
  onMessage,
  onClose,
}) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const streamingTextRef = useRef('');

  const canAsk = questionLimit === Infinity || questionsAsked < questionLimit;
  const questionsRemaining = questionLimit === Infinity ? null : questionLimit - questionsAsked;

  // Scroll to bottom when new messages arrive or streaming text updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, streamingText]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || !canAsk || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setStreamingText('');
    streamingTextRef.current = '';

    // Add user message immediately
    onMessage({ role: 'user', content: userMessage });

    setIsLoading(true);

    await api.interrogateStream(
      mysteryId,
      character.id,
      userMessage,
      conversation,
      // onText - append each chunk
      (text) => {
        streamingTextRef.current += text;
        setStreamingText(streamingTextRef.current);
      },
      // onDone - finalize the message
      () => {
        const finalText = streamingTextRef.current;
        // Clear streaming state first to prevent duplicate render
        streamingTextRef.current = '';
        setStreamingText('');
        setIsLoading(false);
        // Then add to conversation
        if (finalText) {
          onMessage({ role: 'assistant', content: finalText });
        }
      },
      // onError
      (err) => {
        setError(err.message);
        streamingTextRef.current = '';
        setStreamingText('');
        setIsLoading(false);
      }
    );
  }, [input, canAsk, isLoading, mysteryId, character.id, conversation, onMessage]);

  return (
    <div className="chat-overlay">
      <div className="chat-panel">
        <div className="chat-header">
          <div className="chat-character">
            <div className="chat-avatar">{character.name.charAt(0)}</div>
            <div className="chat-character-info">
              <span className="chat-character-name">{character.name}</span>
              <span className="chat-character-role">{character.role}</span>
            </div>
          </div>
          <div className="chat-header-actions">
            {questionsRemaining !== null && (
              <span className={`questions-remaining ${questionsRemaining <= 1 ? 'low' : ''}`}>
                {questionsRemaining} question{questionsRemaining !== 1 ? 's' : ''} left
              </span>
            )}
            <button className="chat-close" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {conversation.length === 0 && (
            <div className="chat-intro">
              <p>
                You approach <strong>{character.name}</strong>, the {character.role.toLowerCase()}.
              </p>
              <p className="text-muted">What would you like to ask?</p>
            </div>
          )}

          {conversation.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="message-avatar">{character.name.charAt(0)}</div>
              )}
              <div className="message-content">{msg.content}</div>
            </div>
          ))}

          {/* Show streaming text as it arrives */}
          {isLoading && streamingText && (
            <div className="chat-message assistant streaming">
              <div className="message-avatar">{character.name.charAt(0)}</div>
              <div className="message-content">{streamingText}</div>
            </div>
          )}

          {/* Show typing indicator only before text starts streaming */}
          {isLoading && !streamingText && (
            <div className="chat-message assistant">
              <div className="message-avatar">{character.name.charAt(0)}</div>
              <div className="message-content typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

          {error && (
            <div className="chat-error">
              <p>Error: {error}</p>
              <button className="btn btn-secondary" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={canAsk ? 'Ask a question...' : 'No questions remaining'}
            disabled={!canAsk || isLoading}
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!canAsk || !input.trim() || isLoading}
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatPanel;
