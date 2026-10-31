import React, { useState } from 'react';
import { GameId, PlayerProfile } from '../types';
import { sound } from '../utils/audio';
import { Play, Users, Trophy, Sparkles, Globe, Compass, Droplets, Target, Award, ArrowUpRight, Shield } from 'lucide-react';

interface LobbyProps {
  onSelectGame: (game: GameId) => void;
  profile: PlayerProfile;
}

interface GameCardDef {
  id: GameId;
  title: string;
  category: 'multiplayer' | 'arcade' | 'trivia' | 'physics';
  categoryLabel: string;
  tagline: string;
  badge: string;
  icon: string;
  difficulty: string;
  highlightColor: string;
  modes: string[];
}

const GAMES: GameCardDef[] = [
  {
    id: 'connect4',
    title: 'Connect 4',
    category: 'multiplayer',
    categoryLabel: 'Multiplayer Strategy',
    tagline: 'Connect 4 chips horizontally, vertically, or diagonally. Battle bots or play multi-tab room codes.',
    badge: 'Room Code & Bot',
    icon: '🔴',
    difficulty: 'Easy / Med / Master',
    highlightColor: 'from-blue-600 to-indigo-700',
    modes: ['Smart Minimax Bot', 'Room Code Sync', '2-Player Local'],
  },
  {
    id: 'chess',
    title: 'Chess',
    category: 'multiplayer',
    categoryLabel: 'Classic Board Game',
    tagline: 'Complete 8x8 chessboard with castling, en passant, pawn promotion, clocks, and Grandmaster bot.',
    badge: 'AI Engine & Clock',
    icon: '♟️',
    difficulty: 'Novice to Master',
    highlightColor: 'from-slate-700 to-slate-900',
    modes: ['Novice to Grandmaster Bots', 'Blitz & Rapid Clocks', 'Full Move Log'],
  },
  {
    id: 'tictactoe',
    title: 'Tic-Tac-Toe',
    category: 'multiplayer',
    categoryLabel: 'Competitive Ranked',
    tagline: 'Classic 3x3 and 4x4 grids featuring an ELO rating ladder with tier progression.',
    badge: 'ELO Leaderboard',
    icon: '❌',
    difficulty: 'Minimax AI',
    highlightColor: 'from-indigo-600 to-violet-800',
    modes: ['ELO Rating System', 'Unbeatable Minimax', '3x3 and 4x4 Grids'],
  },
  {
    id: 'contrarison',
    title: 'Contrarison',
    category: 'trivia',
    categoryLabel: 'Country Quiz',
    tagline: 'Compare 2 random countries on Land Size, Coastline, Population, or Army Size. Test your geography!',
    badge: 'Country Stat Showdown',
    icon: '🌍',
    difficulty: '4 Categories',
    highlightColor: 'from-cyan-600 to-teal-800',
    modes: ['Land Area & Coastline', 'Population & Armed Forces', 'Streak Multiplier'],
  },
  {
    id: 'snake',
    title: 'Snake',
    category: 'arcade',
    categoryLabel: 'Arcade Classic',
    tagline: 'Smooth arcade snake with power-up fruit, golden apples, speed berries, and high score tracking.',
    badge: 'Arcade',
    icon: '🐍',
    difficulty: '3 Speed Modes',
    highlightColor: 'from-emerald-600 to-green-800',
    modes: ['Golden Apples & Berries', 'Normal / Fast / Insane', 'Keyboard & Touch D-pad'],
  },
  {
    id: 'perfectline',
    title: 'Draw a Perfect Line',
    category: 'arcade',
    categoryLabel: 'Precision Challenge',
    tagline: 'Draw a straight line and get rated with statistical regression, deviation heatmaps, and laser accuracy.',
    badge: 'Precision Rating',
    icon: '📏',
    difficulty: 'Precision Score',
    highlightColor: 'from-pink-600 to-rose-800',
    modes: ['Linear Regression Analysis', 'Horizontal / Vertical Modes', 'Wobble Heatmap'],
  },
  {
    id: 'guesslogo',
    title: 'Guess the Logo',
    category: 'trivia',
    categoryLabel: 'Brand Trivia',
    tagline: 'Identify famous tech, gaming, fashion, and food logos in vector clarity with hints and silhouette mode.',
    badge: 'Brand Challenge',
    icon: '🎯',
    difficulty: '30+ Logos',
    highlightColor: 'from-amber-600 to-orange-800',
    modes: ['Vector SVG Logos', 'Silhouette Blur Mode', '50/50 & Category Hints'],
  },
  {
    id: 'water',
    title: 'Water Physics Simulator',
    category: 'physics',
    categoryLabel: 'Thermodynamic Sandbox',
    tagline: 'Multi-liquid hydrodynamics sandbox with 9 substances (Lava, Mercury, Honey, Nitrogen, Oil, Water, Steam, Ice) and a draggable radiant Sun.',
    badge: 'Fluid Sandbox',
    icon: '💧',
    difficulty: 'Thermodynamics',
    highlightColor: 'from-sky-600 to-cyan-800',
    modes: ['9 Liquids & Phases', 'Interactive Radiant Sun', 'Volcano & Density Stratification'],
  },
];

export const Lobby: React.FC<LobbyProps> = ({ onSelectGame, profile }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'multiplayer' | 'arcade' | 'trivia' | 'physics'>('all');

  const filteredGames = selectedCategory === 'all'
    ? GAMES
    : GAMES.filter(g => g.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero Welcome Banner */}
      <div className="relative mb-10 p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>GG.fun Arcade Hub</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight text-balance">
            Instant Games. Real-Time Leaderboards.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            Jump into Connect 4 with bot and room codes, full chess with AI, ranked Tic-Tac-Toe, Contrarison country showdowns, precision line drawing, and water physics.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-slate-300">
            <div className="text-slate-400">
              8 playable games · No install needed
            </div>
            <span className="text-slate-600">·</span>
            <div className="text-slate-400">
              Your ELO: <span className="font-mono font-bold text-indigo-400">{profile.elo}</span>
            </div>
            <span className="text-slate-600">·</span>
            <div className="text-slate-400">
              Win Streak: <span className="font-mono font-bold text-amber-400">{profile.streak}</span>
            </div>
          </div>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Games ({GAMES.length})
          </button>
          <button
            onClick={() => setSelectedCategory('multiplayer')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'multiplayer' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Multiplayer &amp; Bot
          </button>
          <button
            onClick={() => setSelectedCategory('arcade')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'arcade' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Arcade &amp; Skill
          </button>
          <button
            onClick={() => setSelectedCategory('trivia')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'trivia' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Trivia &amp; Quiz
          </button>
          <button
            onClick={() => setSelectedCategory('physics')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'physics' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Physics Toy
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing {filteredGames.length} games
        </div>
      </div>

      {/* Game Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredGames.map(game => (
          <div
            key={game.id}
            onClick={() => { onSelectGame(game.id); sound.playClick(); }}
            className="group p-5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-2xl shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer hover:-translate-y-1"
          >
            <div>
              {/* Header inside card */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl select-none">{game.icon}</div>
                <div className="text-[11px] font-mono text-slate-400">
                  {game.difficulty}
                </div>
              </div>

              {/* Title & Metadata without pills */}
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                {game.title}
              </h3>

              {/* Clean unboxed metadata (§1.A of frontend-design) */}
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 mb-2 font-medium">
                <span>{game.categoryLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="text-indigo-400 font-mono text-[11px]">{game.badge}</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                {game.tagline}
              </p>

              {/* Bullet points */}
              <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-1">
                {game.modes.map((m, i) => (
                  <div key={i} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-indigo-500" />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                Play Game
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-800 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white flex items-center justify-center transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
