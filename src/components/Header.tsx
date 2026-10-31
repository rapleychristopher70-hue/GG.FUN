import React, { useState } from 'react';
import { GameId, PlayerProfile } from '../types';
import { sound } from '../utils/audio';
import { Volume2, VolumeX, User, Gamepad2 } from 'lucide-react';

interface HeaderProps {
  activeGame: GameId;
  setActiveGame: (game: GameId) => void;
  profile: PlayerProfile;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeGame,
  setActiveGame,
  profile,
  onOpenProfile,
}) => {
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Brand title, one line */}
        <button
          onClick={() => { setActiveGame('lobby'); sound.playClick(); }}
          className="text-lg font-black tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2.5 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <span className="text-xl tracking-tight">
            GG<span className="text-indigo-400">.fun</span>
          </span>
        </button>

        {/* Zone 2: Clean single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
          <button
            onClick={() => { setActiveGame('lobby'); sound.playClick(); }}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeGame === 'lobby' ? 'text-indigo-400 font-bold' : 'hover:text-white'
            }`}
          >
            All Games
          </button>
          <button
            onClick={() => { setActiveGame('connect4'); sound.playClick(); }}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeGame === 'connect4' ? 'text-indigo-400 font-bold' : 'hover:text-white'
            }`}
          >
            Connect 4
          </button>
          <button
            onClick={() => { setActiveGame('chess'); sound.playClick(); }}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeGame === 'chess' ? 'text-indigo-400 font-bold' : 'hover:text-white'
            }`}
          >
            Chess
          </button>
          <button
            onClick={() => { setActiveGame('tictactoe'); sound.playClick(); }}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeGame === 'tictactoe' ? 'text-indigo-400 font-bold' : 'hover:text-white'
            }`}
          >
            Tic-Tac-Toe
          </button>
          <button
            onClick={() => { setActiveGame('contrarison'); sound.playClick(); }}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeGame === 'contrarison' ? 'text-indigo-400 font-bold' : 'hover:text-white'
            }`}
          >
            Contrarison
          </button>
          <button
            onClick={() => { setActiveGame('snake'); sound.playClick(); }}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeGame === 'snake' ? 'text-indigo-400 font-bold' : 'hover:text-white'
            }`}
          >
            Snake
          </button>
          <button
            onClick={() => { setActiveGame('perfectline'); sound.playClick(); }}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeGame === 'perfectline' ? 'text-indigo-400 font-bold' : 'hover:text-white'
            }`}
          >
            Perfect Line
          </button>
          <button
            onClick={() => { setActiveGame('guesslogo'); sound.playClick(); }}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeGame === 'guesslogo' ? 'text-indigo-400 font-bold' : 'hover:text-white'
            }`}
          >
            Guess Logo
          </button>
          <button
            onClick={() => { setActiveGame('water'); sound.playClick(); }}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              activeGame === 'water' ? 'text-indigo-400 font-bold' : 'hover:text-white'
            }`}
          >
            Water Lab
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Sound toggle button */}
          <button
            onClick={toggleSound}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Player Profile Action */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <span className="text-sm">{profile.avatar}</span>
            <span className="hidden sm:inline font-mono">{profile.name}</span>
            <span className="hidden sm:inline text-indigo-400 font-mono text-[11px] font-bold">
              {profile.elo}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
