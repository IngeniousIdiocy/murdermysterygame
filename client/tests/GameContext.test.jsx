import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GameProvider, useGame } from '../src/context/GameContext';

// Test component to access context
function TestComponent({ action }) {
  const { state, dispatch } = useGame();
  return (
    <div>
      <span data-testid="mysteryId">{state.mysteryId || 'none'}</span>
      <span data-testid="currentLocation">{state.currentLocation || 'none'}</span>
      <span data-testid="discoveredClues">{state.discoveredClues.length}</span>
      <span data-testid="gameMode">{state.gameMode}</span>
      <button onClick={() => dispatch(action)}>Dispatch</button>
    </div>
  );
}

describe('GameContext', () => {
  describe('Initial State', () => {
    it('should have null mystery by default', () => {
      render(
        <GameProvider>
          <TestComponent action={{ type: 'NOOP' }} />
        </GameProvider>
      );

      expect(screen.getByTestId('mysteryId').textContent).toBe('none');
    });

    it('should have investigation as default game mode', () => {
      render(
        <GameProvider>
          <TestComponent action={{ type: 'NOOP' }} />
        </GameProvider>
      );

      expect(screen.getByTestId('gameMode').textContent).toBe('investigation');
    });
  });

  describe('LOAD_MYSTERY action', () => {
    it('should load mystery data', async () => {
      const mockMystery = {
        id: 'test-mystery',
        title: 'Test Mystery',
        startingLocation: 'foyer',
        characters: [],
        locations: [],
        clues: [],
      };

      function LoadMysteryComponent() {
        const { state, dispatch } = useGame();
        return (
          <div>
            <span data-testid="mysteryId">{state.mysteryId || 'none'}</span>
            <span data-testid="currentLocation">{state.currentLocation || 'none'}</span>
            <button
              onClick={() => dispatch({ type: 'LOAD_MYSTERY', payload: mockMystery })}
            >
              Load
            </button>
          </div>
        );
      }

      render(
        <GameProvider>
          <LoadMysteryComponent />
        </GameProvider>
      );

      await act(async () => {
        screen.getByText('Load').click();
      });

      expect(screen.getByTestId('mysteryId').textContent).toBe('test-mystery');
      expect(screen.getByTestId('currentLocation').textContent).toBe('foyer');
    });
  });

  describe('MOVE_TO_LOCATION action', () => {
    it('should update current location', async () => {
      const mockMystery = {
        id: 'test-mystery',
        startingLocation: 'foyer',
        characters: [],
        locations: [],
        clues: [],
      };

      function MoveComponent() {
        const { state, dispatch } = useGame();
        return (
          <div>
            <span data-testid="currentLocation">{state.currentLocation || 'none'}</span>
            <span data-testid="visitedCount">{state.visitedLocations.length}</span>
            <button
              onClick={() => dispatch({ type: 'LOAD_MYSTERY', payload: mockMystery })}
            >
              Load
            </button>
            <button
              onClick={() =>
                dispatch({ type: 'MOVE_TO_LOCATION', payload: 'library' })
              }
            >
              Move
            </button>
          </div>
        );
      }

      render(
        <GameProvider>
          <MoveComponent />
        </GameProvider>
      );

      await act(async () => {
        screen.getByText('Load').click();
      });

      await act(async () => {
        screen.getByText('Move').click();
      });

      expect(screen.getByTestId('currentLocation').textContent).toBe('library');
      expect(screen.getByTestId('visitedCount').textContent).toBe('2');
    });
  });

  describe('DISCOVER_CLUE action', () => {
    it('should add clue to discovered list', async () => {
      function ClueComponent() {
        const { state, dispatch } = useGame();
        return (
          <div>
            <span data-testid="discoveredClues">{state.discoveredClues.length}</span>
            <span data-testid="clueList">{state.discoveredClues.join(',')}</span>
            <button
              onClick={() => dispatch({ type: 'DISCOVER_CLUE', payload: 'clue-1' })}
            >
              Discover
            </button>
          </div>
        );
      }

      render(
        <GameProvider>
          <ClueComponent />
        </GameProvider>
      );

      await act(async () => {
        screen.getByText('Discover').click();
      });

      expect(screen.getByTestId('discoveredClues').textContent).toBe('1');
      expect(screen.getByTestId('clueList').textContent).toBe('clue-1');
    });

    it('should not duplicate clues', async () => {
      function ClueComponent() {
        const { state, dispatch } = useGame();
        return (
          <div>
            <span data-testid="discoveredClues">{state.discoveredClues.length}</span>
            <button
              onClick={() => dispatch({ type: 'DISCOVER_CLUE', payload: 'clue-1' })}
            >
              Discover
            </button>
          </div>
        );
      }

      render(
        <GameProvider>
          <ClueComponent />
        </GameProvider>
      );

      await act(async () => {
        screen.getByText('Discover').click();
      });

      await act(async () => {
        screen.getByText('Discover').click();
      });

      expect(screen.getByTestId('discoveredClues').textContent).toBe('1');
    });
  });

  describe('SET_GAME_MODE action', () => {
    it('should set game mode and question limit', async () => {
      function ModeComponent() {
        const { state, dispatch } = useGame();
        return (
          <div>
            <span data-testid="gameMode">{state.gameMode}</span>
            <span data-testid="questionLimit">{state.questionLimit}</span>
            <button
              onClick={() =>
                dispatch({
                  type: 'SET_GAME_MODE',
                  payload: { mode: 'challenge', limit: 5 },
                })
              }
            >
              Set Mode
            </button>
          </div>
        );
      }

      render(
        <GameProvider>
          <ModeComponent />
        </GameProvider>
      );

      await act(async () => {
        screen.getByText('Set Mode').click();
      });

      expect(screen.getByTestId('gameMode').textContent).toBe('challenge');
      expect(screen.getByTestId('questionLimit').textContent).toBe('5');
    });
  });

  describe('RESET_GAME action', () => {
    it('should reset to initial state but keep game mode', async () => {
      const mockMystery = {
        id: 'test-mystery',
        startingLocation: 'foyer',
        characters: [],
        locations: [],
        clues: [],
      };

      function ResetComponent() {
        const { state, dispatch } = useGame();
        return (
          <div>
            <span data-testid="mysteryId">{state.mysteryId || 'none'}</span>
            <span data-testid="gameMode">{state.gameMode}</span>
            <button
              onClick={() => dispatch({ type: 'LOAD_MYSTERY', payload: mockMystery })}
            >
              Load
            </button>
            <button
              onClick={() =>
                dispatch({
                  type: 'SET_GAME_MODE',
                  payload: { mode: 'challenge', limit: 5 },
                })
              }
            >
              Set Mode
            </button>
            <button onClick={() => dispatch({ type: 'RESET_GAME' })}>Reset</button>
          </div>
        );
      }

      render(
        <GameProvider>
          <ResetComponent />
        </GameProvider>
      );

      await act(async () => {
        screen.getByText('Set Mode').click();
      });

      await act(async () => {
        screen.getByText('Load').click();
      });

      await act(async () => {
        screen.getByText('Reset').click();
      });

      expect(screen.getByTestId('mysteryId').textContent).toBe('none');
      expect(screen.getByTestId('gameMode').textContent).toBe('challenge');
    });
  });
});
