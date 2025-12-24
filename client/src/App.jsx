import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MysterySelect from './pages/MysterySelect';
import Game from './pages/Game';
import Accusation from './pages/Accusation';
import Result from './pages/Result';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/select" element={<MysterySelect />} />
        <Route path="/game/:mysteryId" element={<Game />} />
        <Route path="/accuse/:mysteryId" element={<Accusation />} />
        <Route path="/result/:mysteryId" element={<Result />} />
      </Routes>
    </div>
  );
}

export default App;
