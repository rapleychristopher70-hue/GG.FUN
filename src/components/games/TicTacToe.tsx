import React, { useState, useEffect, useCallback } from 'react';
import { sound } from '../../utils/audio';
import {
  loadLeaderboard,
  loadPlayerProfile,
  savePlayerProfile,
  recordMatchResult,
} from '../../utils/storage';
import { LeaderboardEntry, PlayerProfile } from '../../types';
import confetti from 'canvas-confetti';
import { Trophy, Bot, Users, RotateCcw, TrendingUp, Flame, Globe, UserCheck, Shield } from 'lucide-react';

type BoardSize = 3 | 4;
type CellValue = 'X' | 'O' | null;

export const TicTacToe: React.FC = () => {
  const [boardSize, setBoardSize] = useState<BoardSize>(3);
  const [board, setBoard] = useState<CellValue[]>(() => Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [gameMode, setGameMode] = useState<'bot' | 'ranked' | 'local'>('ranked');
  const [botDiff, setBotDiff] = useState<'easy' | 'hard' | 'unbeatable'>('unbeatable');
  const [winner, setWinner] = useState<CellValue | 'DRAW' | null>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [isBotThinking, setIsBotThinking] = useState(false);

  // Profile & Leaderboard
  const [profile, setProfile] = useState<PlayerProfile>(loadPlayerProfile);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard(profile));
  const [filter, setFilter] = useState<'all' | 'weekly' | 'today'>('all');
  const [lastMatchResult, setLastMatchResult] = useState<{ eloDiff: number } | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newName, setNewName] = useState(profile.name);
  const [newAvatar, setNewAvatar] = useState(profile.avatar);

  // Check Winner for 3x3 or 4x4
  const checkWinner = useCallback((b: CellValue[], size: BoardSize): { winner: CellValue | 'DRAW' | null; line: number[] } => {
    const lines: number[][] = [];

    if (size === 3) {
      // Rows
      lines.push([0, 1, 2], [3, 4, 5], [6, 7, 8]);
      // Cols
      lines.push([0, 3, 6], [1, 4, 7], [2, 5, 8]);
      // Diagonals
      lines.push([0, 4, 8], [2, 4, 6]);
    } else {
      // 4x4: 4 in a row to win
      for (let r = 0; r < 4; r++) {
        lines.push([r*4, r*4+1, r*4+2, r*4+3]);
      }
      for (let c = 0; c < 4; c++) {
        lines.push([c, c+4, c+8, c+12]);
      }
      lines.push([0, 5, 10, 15], [3, 6, 9, 12]);
    }

    for (const line of lines) {
      const first = b[line[0]];
      if (first && line.every(idx => b[idx] === first)) {
        return { winner: first, line };
      }
    }

    if (b.every(cell => cell !== null)) {
      return { winner: 'DRAW', line: [] };
    }

    return { winner: null, line: [] };
  }, []);

  // Minimax algorithm for unbeatable 3x3 bot
  const getMinimaxMove = useCallback((currentBoard: CellValue[]): number => {
    const emptyIndices = currentBoard
      .map((val, idx) => (val === null ? idx : null))
      .filter((val): val is number => val !== null);

    if (emptyIndices.length === 0) return 0;

    // Check immediate win or immediate block
    for (const idx of emptyIndices) {
      const copy = [...currentBoard];
      copy[idx] = 'O';
      if (checkWinner(copy, 3).winner === 'O') return idx;
    }
    for (const idx of emptyIndices) {
      const copy = [...currentBoard];
      copy[idx] = 'X';
      if (checkWinner(copy, 3).winner === 'X') return idx;
    }

    // Minimax recursive
    const minimax = (b: CellValue[], isMax: boolean, depth: number): number => {
      const result = checkWinner(b, 3);
      if (result.winner === 'O') return 10 - depth;
      if (result.winner === 'X') return depth - 10;
      if (result.winner === 'DRAW' || depth >= 5) return 0;

      const avail = b
        .map((val, idx) => (val === null ? idx : null))
        .filter((val): val is number => val !== null);

      if (isMax) {
        let best = -Infinity;
        for (const idx of avail) {
          b[idx] = 'O';
          best = Math.max(best, minimax(b, false, depth + 1));
          b[idx] = null;
        }
        return best;
      } else {
        let best = Infinity;
        for (const idx of avail) {
          b[idx] = 'X';
          best = Math.min(best, minimax(b, true, depth + 1));
          b[idx] = null;
        }
        return best;
      }
    };

    let bestScore = -Infinity;
    let bestMove = emptyIndices[0];

    // Prefer center square
    if (currentBoard[4] === null) return 4;

    for (const idx of emptyIndices) {
      currentBoard[idx] = 'O';
      const score = minimax(currentBoard, false, 0);
      currentBoard[idx] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = idx;
      }
    }

    return bestMove;
  }, [checkWinner]);

  // Handle cell click
  const handleCellClick = (idx: number) => {
    if (board[idx] || winner || isBotThinking) return;

    sound.playClick();
    const newBoard = [...board];
    newBoard[idx] = isXNext ? 'X' : 'O';
    setBoard(newBoard);

    const winStatus = checkWinner(newBoard, boardSize);
    if (winStatus.winner) {
      handleMatchEnd(winStatus.winner, winStatus.line);
    } else {
      setIsXNext(!isXNext);
    }
  };

  // Match end & Leaderboard update
  const handleMatchEnd = (w: CellValue | 'DRAW', line: number[]) => {
    setWinner(w);
    setWinningLine(line);

    const isHumanWin = w === 'X';
    const isDraw = w === 'DRAW';

    if (isHumanWin) {
      sound.playWin();
      try { confetti({ particleCount: 60, spread: 60 }); } catch {}
    }

    if (gameMode === 'ranked' || gameMode === 'bot') {
      const { eloDiff, newProfile } = recordMatchResult(isHumanWin, isDraw);
      setProfile(newProfile);
      setLastMatchResult({ eloDiff });
      setLeaderboard(loadLeaderboard(newProfile));
    }
  };

  // Bot Turn Trigger
  useEffect(() => {
    if ((gameMode === 'bot' || gameMode === 'ranked') && !isXNext && !winner) {
      setIsBotThinking(true);
      const delay = gameMode === 'ranked' ? 700 + Math.random() * 600 : 400;

      const timer = setTimeout(() => {
        let move = 0;
        const emptyIndices = board
          .map((val, idx) => (val === null ? idx : null))
          .filter((val): val is number => val !== null);

        if (emptyIndices.length > 0) {
          if (boardSize === 3 && (botDiff === 'unbeatable' || gameMode === 'ranked')) {
            move = getMinimaxMove(board);
          } else if (botDiff === 'hard') {
            // 70% minimax, 30% random
            move = Math.random() < 0.7 ? getMinimaxMove(board) : emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          } else {
            // easy: mostly random
            move = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          }

          sound.playClick();
          const newBoard = [...board];
          newBoard[move] = 'O';
          setBoard(newBoard);

          const winStatus = checkWinner(newBoard, boardSize);
          if (winStatus.winner) {
            handleMatchEnd(winStatus.winner, winStatus.line);
          } else {
            setIsXNext(true);
          }
        }
        setIsBotThinking(false);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isXNext, gameMode, winner, board, boardSize, botDiff, getMinimaxMove, checkWinner]);

  const resetGame = () => {
    setBoard(Array(boardSize * boardSize).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine([]);
    setLastMatchResult(null);
    setIsBotThinking(false);
  };

  const handleSizeChange = (size: BoardSize) => {
    setBoardSize(size);
    setBoard(Array(size * size).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine([]);
    setLastMatchResult(null);
  };

  const saveProfileChanges = () => {
    if (!newName.trim()) return;
    const updated = { ...profile, name: newName.trim(), avatar: newAvatar };
    setProfile(updated);
    savePlayerProfile(updated);
    setLeaderboard(loadLeaderboard(updated));
    setIsEditingProfile(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Tic-Tac-Toe</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Ranked ELO Ladder
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Compete in 3x3 or 4x4 grids to raise your personal ELO rating and climb the tiers.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => { setGameMode('ranked'); resetGame(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              gameMode === 'ranked' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Ranked (ELO)</span>
          </button>
          <button
            onClick={() => { setGameMode('bot'); resetGame(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              gameMode === 'bot' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Casual Bot</span>
          </button>
          <button
            onClick={() => { setGameMode('local'); resetGame(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              gameMode === 'local' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2-Player</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Game on Left, Leaderboard on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Game Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Options Bar: Board Size & Difficulty */}
          <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>Grid:</span>
              <button
                onClick={() => handleSizeChange(3)}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  boardSize === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                3x3
              </button>
              <button
                onClick={() => handleSizeChange(4)}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  boardSize === 4 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                4x4
              </button>
            </div>

            {gameMode === 'bot' && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                {(['easy', 'hard', 'unbeatable'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => { setBotDiff(d); resetGame(); }}
                    className={`px-2 py-1 text-[11px] capitalize rounded ${
                      botDiff === d ? 'bg-slate-800 text-indigo-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Rank Card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-950 border border-indigo-700 flex items-center justify-center text-xl">
                {profile.avatar}
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{profile.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Lvl {profile.level}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-indigo-400 font-semibold">{profile.elo} ELO</span>
                  <span>·</span>
                  <span>{profile.wins}W - {profile.losses}L</span>
                  {profile.streak > 1 && (
                    <span className="text-amber-400 flex items-center gap-0.5">
                      <Flame className="w-3 h-3 inline" /> {profile.streak}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded transition-colors"
            >
              Edit Tag
            </button>
          </div>

          {/* Profile Edit Modal */}
          {isEditingProfile && (
            <div className="p-3 bg-slate-900/90 border border-slate-700 rounded-xl space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Gamer Handle:</label>
                <input
                  type="text"
                  maxLength={16}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-white text-xs"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Avatar Icon:</label>
                <div className="flex gap-2">
                  {['🎮', '⚡', '👑', '🚀', '🔥', '👾', '🎯', '🦊', '💎'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewAvatar(emoji)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                        newAvatar === emoji ? 'bg-indigo-600' : 'bg-slate-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={saveProfileChanges}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition-colors"
              >
                Save to Leaderboard
              </button>
            </div>
          )}

          {/* Winner Notification & ELO Gain */}
          {winner && (
            <div className="p-4 bg-indigo-950/80 border border-indigo-500/50 rounded-xl text-center shadow-xl animate-fade-in space-y-2">
              <div className="text-sm font-bold text-white">
                {winner === 'DRAW'
                  ? "Tie Game!"
                  : winner === 'X'
                  ? 'Victory!'
                  : gameMode === 'ranked'
                  ? 'Opponent Won!'
                  : 'O Claims Victory!'}
              </div>
              {lastMatchResult && (
                <div className="text-xs font-mono font-bold">
                  {lastMatchResult.eloDiff > 0 ? (
                    <span className="text-emerald-400">+{lastMatchResult.eloDiff} ELO Rating! 📈</span>
                  ) : (
                    <span className="text-rose-400">{lastMatchResult.eloDiff} ELO Rating</span>
                  )}
                </div>
              )}
              <button
                onClick={resetGame}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Play Next Match
              </button>
            </div>
          )}

          {/* Tic-Tac-Toe Arena Grid */}
          <div className="flex flex-col items-center">
            <div
              className={`grid gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-900 border-2 border-slate-800 rounded-2xl shadow-xl ${
                boardSize === 3 ? 'grid-cols-3' : 'grid-cols-4'
              }`}
            >
              {board.map((cell, idx) => {
                const isWinCell = winningLine.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => handleCellClick(idx)}
                    disabled={!!cell || !!winner || isBotThinking}
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center font-bold text-3xl sm:text-4xl transition-all duration-150 ${
                      cell === null
                        ? 'bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800'
                        : cell === 'X'
                        ? 'bg-indigo-950/50 text-indigo-400 border border-indigo-700/60'
                        : 'bg-rose-950/50 text-rose-400 border border-rose-700/60'
                    } ${isWinCell ? 'ring-4 ring-amber-400 scale-105 shadow-lg shadow-amber-500/20 z-10' : ''}`}
                  >
                    {cell}
                  </button>
                );
              })}
            </div>

            {/* Turn info */}
            <div className="mt-3 text-xs text-slate-400 flex items-center gap-2">
              <span>Next move:</span>
              <span className={`font-bold font-mono ${isXNext ? 'text-indigo-400' : 'text-rose-400'}`}>
                {isXNext ? 'X (You)' : gameMode === 'ranked' ? 'O (Opponent)' : 'O'}
              </span>
              {isBotThinking && <span className="text-slate-500 text-[11px] animate-pulse">thinking...</span>}
            </div>

            <button
              onClick={resetGame}
              className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Board</span>
            </button>
          </div>
        </div>

        {/* Real-Time Leaderboard Column (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>ELO Benchmark Ladder</span>
              </h3>
              <div className="text-xs text-slate-400 mt-0.5">
                Benchmark tier rankings tracking your personal progression
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg">
              {(['all', 'weekly', 'today'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 text-xs font-medium capitalize rounded transition-colors ${
                    filter === f ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Player</th>
                  <th className="py-2.5 px-3 text-right">ELO</th>
                  <th className="py-2.5 px-3 text-right">Record</th>
                  <th className="py-2.5 px-3 text-right">Win %</th>
                  <th className="py-2.5 px-3 text-center">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {leaderboard.map(entry => (
                  <tr
                    key={entry.id}
                    className={`hover:bg-slate-800/30 transition-colors ${
                      entry.isCurrentUser ? 'bg-indigo-950/40 border-l-2 border-indigo-500 font-bold' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {entry.rank === 1 ? (
                        <span className="text-amber-400 font-bold">🥇 1</span>
                      ) : entry.rank === 2 ? (
                        <span className="text-slate-300 font-bold">🥈 2</span>
                      ) : entry.rank === 3 ? (
                        <span className="text-amber-600 font-bold">🥉 3</span>
                      ) : (
                        <span className="text-slate-500">{entry.rank}</span>
                      )}
                    </td>

                    {/* Player */}
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{entry.avatar}</span>
                        <div className="truncate">
                          <span className={`text-xs ${entry.isCurrentUser ? 'text-indigo-300 font-bold' : 'text-slate-200'}`}>
                            {entry.name}
                          </span>
                          {entry.isCurrentUser && (
                            <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-400">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ELO */}
                    <td className="py-2.5 px-3 text-right font-bold text-white tabular-nums">
                      {entry.elo}
                    </td>

                    {/* Record (Wins / Losses) */}
                    <td className="py-2.5 px-3 text-right text-slate-400 tabular-nums">
                      {entry.wins}W - {entry.losses}L
                    </td>

                    {/* Win Rate */}
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <span className={entry.winRate >= 70 ? 'text-emerald-400' : 'text-slate-300'}>
                        {entry.winRate}%
                      </span>
                    </td>

                    {/* Tier */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-sans font-medium ${
                          entry.tier === 'Grandmaster'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : entry.tier === 'Diamond'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : entry.tier === 'Gold'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {entry.tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
