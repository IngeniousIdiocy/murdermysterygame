import { createContext, useContext, useReducer, useEffect } from 'react';
import config from '../config';

const GameContext = createContext(null);

const initialState = {
  // Current mystery data
  mystery: null,
  mysteryId: null,

  // Player progress
  currentLocation: null,
  visitedLocations: [],
  discoveredClues: [],
  talkedToCharacters: [],

  // Conversation histories per character
  conversations: {},

  // Question limits (per character)
  questionLimit: config.game.defaultQuestionLimit,
  questionsAsked: {}, // { characterId: count }

  // Game mode
  gameMode: 'investigation', // 'investigation' | 'challenge'

  // Accusation result
  accusationResult: null,

  // Loading states
  isLoading: false,
  error: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'LOAD_MYSTERY':
      return {
        ...state,
        mystery: action.payload,
        mysteryId: action.payload.id,
        currentLocation: action.payload.startingLocation,
        visitedLocations: [action.payload.startingLocation],
        discoveredClues: [],
        talkedToCharacters: [],
        conversations: {},
        questionsAsked: {},
        accusationResult: null,
        isLoading: false,
      };

    case 'MOVE_TO_LOCATION':
      return {
        ...state,
        currentLocation: action.payload,
        visitedLocations: state.visitedLocations.includes(action.payload)
          ? state.visitedLocations
          : [...state.visitedLocations, action.payload],
      };

    case 'DISCOVER_CLUE':
      return {
        ...state,
        discoveredClues: state.discoveredClues.includes(action.payload)
          ? state.discoveredClues
          : [...state.discoveredClues, action.payload],
      };

    case 'TALK_TO_CHARACTER':
      return {
        ...state,
        talkedToCharacters: state.talkedToCharacters.includes(action.payload)
          ? state.talkedToCharacters
          : [...state.talkedToCharacters, action.payload],
      };

    case 'ADD_MESSAGE':
      const { characterId, message } = action.payload;
      const existingConvo = state.conversations[characterId] || [];
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [characterId]: [...existingConvo, message],
        },
        questionsAsked: {
          ...state.questionsAsked,
          [characterId]: (state.questionsAsked[characterId] || 0) + (message.role === 'user' ? 1 : 0),
        },
      };

    case 'SET_GAME_MODE':
      return {
        ...state,
        gameMode: action.payload.mode,
        questionLimit: action.payload.limit,
      };

    case 'SET_ACCUSATION_RESULT':
      return {
        ...state,
        accusationResult: action.payload,
      };

    case 'RESET_GAME':
      return {
        ...initialState,
        gameMode: state.gameMode,
        questionLimit: state.questionLimit,
      };

    case 'LOAD_SAVED_STATE':
      return {
        ...state,
        ...action.payload,
      };

    case 'UPDATE_LOCATIONS':
      // Update location data (used by map editor)
      return {
        ...state,
        mystery: {
          ...state.mystery,
          locations: action.payload,
        },
      };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Load saved state on mount
  useEffect(() => {
    const saved = localStorage.getItem(config.storage.gameState);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_SAVED_STATE', payload: parsed });
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }
  }, []);

  // Save state on changes (debounced)
  // Note: We exclude 'mystery' from localStorage - it should always be loaded fresh from server
  // This ensures any changes to manifest.json (like map positions) are picked up on reload
  useEffect(() => {
    if (state.mysteryId) {
      const timeout = setTimeout(() => {
        const { mystery, ...stateWithoutMystery } = state;
        localStorage.setItem(config.storage.gameState, JSON.stringify(stateWithoutMystery));
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [state]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
