import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LocationPanel from '../src/components/LocationPanel';
import CharacterPanel from '../src/components/CharacterPanel';
import CluePanel from '../src/components/CluePanel';

describe('LocationPanel', () => {
  const mockLocation = {
    id: 'foyer',
    name: 'Grand Foyer',
    markdown: '# Grand Foyer\n\nA grand entrance hall with marble floors.',
  };

  const mockConnections = [
    { id: 'study', name: 'The Study', connections: ['foyer'] },
    { id: 'library', name: 'The Library', connections: ['foyer'] },
  ];

  it('should render location name', () => {
    render(
      <LocationPanel
        location={mockLocation}
        connections={mockConnections}
        visitedLocations={['foyer']}
        onNavigate={() => {}}
      />
    );

    // Location name appears in h2 header and also in markdown content
    expect(screen.getByRole('heading', { level: 2, name: 'Grand Foyer' })).toBeInTheDocument();
  });

  it('should render navigation buttons for connections', () => {
    render(
      <LocationPanel
        location={mockLocation}
        connections={mockConnections}
        visitedLocations={['foyer']}
        onNavigate={() => {}}
      />
    );

    expect(screen.getByText('The Study')).toBeInTheDocument();
    expect(screen.getByText('The Library')).toBeInTheDocument();
  });

  it('should call onNavigate when connection is clicked', () => {
    const onNavigate = vi.fn();

    render(
      <LocationPanel
        location={mockLocation}
        connections={mockConnections}
        visitedLocations={['foyer']}
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByText('The Study'));
    expect(onNavigate).toHaveBeenCalledWith('study');
  });

  it('should show visited badge for visited locations', () => {
    render(
      <LocationPanel
        location={mockLocation}
        connections={mockConnections}
        visitedLocations={['foyer', 'study']}
        onNavigate={() => {}}
      />
    );

    expect(screen.getByText('Visited')).toBeInTheDocument();
  });
});

describe('CharacterPanel', () => {
  const mockCharacters = [
    {
      id: 'james-hartley',
      name: 'James Hartley',
      role: 'Business Partner',
      location: 'foyer',
      isSuspect: true,
    },
  ];

  const allCharacters = [
    ...mockCharacters,
    {
      id: 'lady-margaret',
      name: 'Lady Margaret',
      role: 'The Widow',
      location: 'library',
      isSuspect: true,
    },
  ];

  it('should render characters at current location', () => {
    render(
      <CharacterPanel
        characters={mockCharacters}
        allCharacters={allCharacters}
        talkedTo={[]}
        questionsAsked={{}}
        questionLimit={Infinity}
        onSelect={() => {}}
        currentLocation="foyer"
      />
    );

    expect(screen.getByText('James Hartley')).toBeInTheDocument();
    expect(screen.getByText('Business Partner')).toBeInTheDocument();
  });

  it('should call onSelect when character is clicked', () => {
    const onSelect = vi.fn();

    render(
      <CharacterPanel
        characters={mockCharacters}
        allCharacters={allCharacters}
        talkedTo={[]}
        questionsAsked={{}}
        questionLimit={Infinity}
        onSelect={onSelect}
        currentLocation="foyer"
      />
    );

    fireEvent.click(screen.getByText('James Hartley'));
    expect(onSelect).toHaveBeenCalledWith(mockCharacters[0]);
  });

  it('should show talked badge for interviewed characters', () => {
    render(
      <CharacterPanel
        characters={mockCharacters}
        allCharacters={allCharacters}
        talkedTo={['james-hartley']}
        questionsAsked={{}}
        questionLimit={Infinity}
        onSelect={() => {}}
        currentLocation="foyer"
      />
    );

    expect(screen.getByText('Talked')).toBeInTheDocument();
  });

  it('should show question count in challenge mode', () => {
    render(
      <CharacterPanel
        characters={mockCharacters}
        allCharacters={allCharacters}
        talkedTo={[]}
        questionsAsked={{ 'james-hartley': 2 }}
        questionLimit={5}
        onSelect={() => {}}
        currentLocation="foyer"
      />
    );

    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('should disable exhausted characters', () => {
    render(
      <CharacterPanel
        characters={mockCharacters}
        allCharacters={allCharacters}
        talkedTo={[]}
        questionsAsked={{ 'james-hartley': 5 }}
        questionLimit={5}
        onSelect={() => {}}
        currentLocation="foyer"
      />
    );

    expect(screen.getByText('No questions left')).toBeInTheDocument();
  });
});

describe('CluePanel', () => {
  const mockCluesHere = [
    {
      id: 'brandy-glass',
      name: 'Brandy Glass',
      location: 'study',
      type: 'evidence',
      markdown: '# Brandy Glass\n\nA glass with suspicious residue.',
    },
  ];

  const allClues = [
    ...mockCluesHere,
    {
      id: 'financial-ledger',
      name: 'Financial Ledger',
      location: 'library',
      type: 'evidence',
      markdown: '# Financial Ledger\n\nShows discrepancies.',
    },
  ];

  it('should render undiscovered clues as unknown', () => {
    render(
      <CluePanel
        cluesHere={mockCluesHere}
        allClues={allClues}
        discoveredClues={[]}
        onDiscover={() => {}}
      />
    );

    expect(screen.getByText('??? Unknown Clue')).toBeInTheDocument();
  });

  it('should reveal clue name after discovery', () => {
    render(
      <CluePanel
        cluesHere={mockCluesHere}
        allClues={allClues}
        discoveredClues={['brandy-glass']}
        onDiscover={() => {}}
      />
    );

    expect(screen.getByText('Brandy Glass')).toBeInTheDocument();
  });

  it('should call onDiscover when examining undiscovered clue', () => {
    const onDiscover = vi.fn();

    render(
      <CluePanel
        cluesHere={mockCluesHere}
        allClues={allClues}
        discoveredClues={[]}
        onDiscover={onDiscover}
      />
    );

    fireEvent.click(screen.getByText('??? Unknown Clue'));
    expect(onDiscover).toHaveBeenCalledWith('brandy-glass');
  });

  it('should show discovery progress', () => {
    render(
      <CluePanel
        cluesHere={mockCluesHere}
        allClues={allClues}
        discoveredClues={['brandy-glass']}
        onDiscover={() => {}}
      />
    );

    expect(screen.getByText('Discovered: 1 / 2 clues')).toBeInTheDocument();
  });
});
