import React, { useState } from 'react';
import { GameId, PlayerProfile } from './types';
import { loadPlayerProfile } from './utils/storage';
import { Header } from './components/Header';
import { Lobby } from './components/Lobby';
import { ConnectFour } from './components/games/ConnectFour';
import { Chess } from './components/games/Chess';
import { TicTacToe } from './components/games/TicTacToe';
import { Contrarison } from './components/games/Contrarison';
import { Snake } from './components/games/Snake';
import { PerfectLine } from './components/games/PerfectLine';
import { GuessTheLogo } from './components/games/GuessTheLogo';
import { WaterSimulator } from './components/games/WaterSimulator';
import { ProfileModal } from './components/ProfileModal';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import { sound } from './utils/audio';

export default function App() {
  const [activeGame, setActiveGame] = useState<GameId>('lobby');
  const [profile, setProfile] = useState<PlayerProfile>(loadPlayerProfile);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleGameSelect = (game: GameId) => {
    setActiveGame(game);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Bar Header */}
      <Header
        activeGame={activeGame}
        setActiveGame={setActiveGame}
        profile={profile}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {/* Breadcrumb / Return to Arcade Button if inside a game */}
        {activeGame !== 'lobby' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
            <button
              onClick={() => { setActiveGame('lobby'); sound.playClick(); }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to GG.fun Lobby</span>
            </button>
          </div>
        )}

        {/* Game Render Switch */}
        {activeGame === 'lobby' && (
          <Lobby onSelectGame={handleGameSelect} profile={profile} />
        )}
        {activeGame === 'connect4' && <ConnectFour />}
        {activeGame === 'chess' && <Chess />}
        {activeGame === 'tictactoe' && <TicTacToe />}
        {activeGame === 'contrarison' && <Contrarison />}
        {activeGame === 'snake' && <Snake />}
        {activeGame === 'perfectline' && <PerfectLine />}
        {activeGame === 'guesslogo' && <GuessTheLogo />}
        {activeGame === 'water' && <WaterSimulator />}
      </main>

      {/* Profile & Settings Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onUpdateProfile={setProfile}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 bg-[#090d16] py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-400">
            <Gamepad2 className="w-4 h-4 text-indigo-400" />
            <span>GG.fun</span>
            <span className="font-normal text-slate-600">·</span>
            <span className="font-normal text-slate-500">Free Mini Games &amp; Online Multiplayer</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={() => setActiveGame('connect4')} className="hover:text-white transition-colors">Connect 4</button>
            <button onClick={() => setActiveGame('chess')} className="hover:text-white transition-colors">Chess</button>
            <button onClick={() => setActiveGame('tictactoe')} className="hover:text-white transition-colors">Leaderboards</button>
            <button onClick={() => setActiveGame('contrarison')} className="hover:text-white transition-colors">Contrarison</button>
            <button onClick={() => setActiveGame('water')} className="hover:text-white transition-colors">Water Lab</button>
          </div>

          <div className="text-[11px] text-slate-600 font-mono">
            © 2026 GG.fun · All rights reserved
          </div>
        </div>
      </footer>
    </div>
  );
}
