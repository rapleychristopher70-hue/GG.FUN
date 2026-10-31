import React, { useState, useEffect, useCallback, useRef } from 'react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { Bot, Users, Globe, RotateCcw, Sparkles, MessageCircle, ArrowDown, ChevronRight, Play } from 'lucide-react';

const ROWS = 6;
const COLS = 7;

type Cell = null | 'R' | 'Y'; // R = Red (Player 1 / Human), Y = Yellow (Player 2 / Bot / Opponent)
type GameMode = 'bot' | 'online' | 'local';
type BotDifficulty = 'easy' | 'medium' | 'master';

interface OnlineState {
  roomCode: string;
  opponentName: string;
  isMyTurn: boolean;
  myColor: 'R' | 'Y';
  status: 'idle' | 'searching' | 'connected';
  lastEmote?: { sender: string; text: string };
}

export const ConnectFour: React.FC = () => {
  const [board, setBoard] = useState<Cell[][]>(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<'R' | 'Y'>('R');
  const [winner, setWinner] = useState<Cell | 'DRAW' | null>(null);
  const [winningCells, setWinningCells] = useState<[number, number][]>([]);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [mode, setMode] = useState<GameMode>('bot');
  const [difficulty, setDifficulty] = useState<BotDifficulty>('medium');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [scores, setScores] = useState({ red: 0, yellow: 0, draws: 0 });
  const [roomInput, setRoomInput] = useState('');
  
  // Online / Room Multiplayer State
  const [online, setOnline] = useState<OnlineState>({
    roomCode: '',
    opponentName: '',
    isMyTurn: true,
    myColor: 'R',
    status: 'idle',
  });

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Check 4 in a row
  const checkWinCondition = useCallback((b: Cell[][]): { winner: Cell | 'DRAW' | null; winningCells: [number, number][] } => {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const val = b[r][c];
        if (val && val === b[r][c+1] && val === b[r][c+2] && val === b[r][c+3]) {
          return { winner: val, winningCells: [[r, c], [r, c+1], [r, c+2], [r, c+3]] };
        }
      }
    }
    // Vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 4; r++) {
        const val = b[r][c];
        if (val && val === b[r+1][c] && val === b[r+2][c] && val === b[r+3][c]) {
          return { winner: val, winningCells: [[r, c], [r+1, c], [r+2, c], [r+3, c]] };
        }
      }
    }
    // Diagonal \
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const val = b[r][c];
        if (val && val === b[r+1][c+1] && val === b[r+2][c+2] && val === b[r+3][c+3]) {
          return { winner: val, winningCells: [[r, c], [r+1, c+1], [r+2, c+2], [r+3, c+3]] };
        }
      }
    }
    // Diagonal /
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const val = b[r][c];
        if (val && val === b[r-1][c+1] && val === b[r-2][c+2] && val === b[r-3][c+3]) {
          return { winner: val, winningCells: [[r, c], [r-1, c+1], [r-2, c+2], [r-3, c+3]] };
        }
      }
    }

    // Check Draw
    const isFull = b[0].every(cell => cell !== null);
    if (isFull) {
      return { winner: 'DRAW', winningCells: [] };
    }

    return { winner: null, winningCells: [] };
  }, []);

  // Drop piece into column
  const dropPiece = useCallback((col: number, playerToDrop?: 'R' | 'Y') => {
    if (winner) return false;
    // Block manual clicks if bot is thinking or if it is not the human's turn
    if (!playerToDrop) {
      if (isBotThinking) return false;
      if (mode === 'bot' && currentPlayer !== 'R') return false;
      if (mode === 'online' && online.status === 'connected' && !online.isMyTurn) return false;
    }

    const activeColor = playerToDrop || currentPlayer;

    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === null) {
        targetRow = r;
        break;
      }
    }

    if (targetRow === -1) return false; // Column is full

    sound.playDrop();

    const newBoard = board.map(row => [...row]);
    newBoard[targetRow][col] = activeColor;
    setBoard(newBoard);

    const result = checkWinCondition(newBoard);
    if (result.winner) {
      setWinner(result.winner);
      setWinningCells(result.winningCells);
      if (result.winner === 'R' || (result.winner === online.myColor && mode === 'online')) {
        sound.playWin();
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch {
          // ignore
        }
      }
      setScores(prev => ({
        red: result.winner === 'R' ? prev.red + 1 : prev.red,
        yellow: result.winner === 'Y' ? prev.yellow + 1 : prev.yellow,
        draws: result.winner === 'DRAW' ? prev.draws + 1 : prev.draws,
      }));
    } else {
      const nextPlayer = activeColor === 'R' ? 'Y' : 'R';
      setCurrentPlayer(nextPlayer);

      // If in online mode and we made the move, pass to opponent
      if (mode === 'online' && online.status === 'connected') {
        if (!playerToDrop) {
          // Local player moved
          setOnline(prev => ({ ...prev, isMyTurn: false }));
          // Broadcast to other tabs if channel exists
          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({ type: 'MOVE', col });
          }
        }
      }
    }

    return true;
  }, [board, currentPlayer, winner, isBotThinking, mode, online, checkWinCondition]);

  // Minimax Heuristic Bot Algorithm
  const getBotMove = useCallback((currentBoard: Cell[][], diff: BotDifficulty): number => {
    const validCols: number[] = [];
    for (let c = 0; c < COLS; c++) {
      if (currentBoard[0][c] === null) validCols.push(c);
    }
    if (validCols.length === 0) return 3; // Center column default

    // 1. Check if Yellow ('Y') can win in 1 move
    for (const c of validCols) {
      const copy = currentBoard.map(r => [...r]);
      for (let r = ROWS - 1; r >= 0; r--) {
        if (copy[r][c] === null) {
          copy[r][c] = 'Y';
          if (checkWinCondition(copy).winner === 'Y') return c;
          break;
        }
      }
    }

    // 2. Check if Red ('R') can win in 1 move -> MUST BLOCK
    for (const c of validCols) {
      const copy = currentBoard.map(r => [...r]);
      for (let r = ROWS - 1; r >= 0; r--) {
        if (copy[r][c] === null) {
          copy[r][c] = 'R';
          if (checkWinCondition(copy).winner === 'R') return c;
          break;
        }
      }
    }

    // Easy difficulty: pick random valid column
    if (diff === 'easy') {
      return validCols[Math.floor(Math.random() * validCols.length)];
    }

    // Medium & Master: Minimax with positional weight
    const scoreWindow = (w: Cell[]): number => {
      const yCount = w.filter(x => x === 'Y').length;
      const rCount = w.filter(x => x === 'R').length;
      const empty = w.filter(x => x === null).length;

      if (yCount === 4) return 1000;
      if (yCount === 3 && empty === 1) return 15;
      if (yCount === 2 && empty === 2) return 5;
      if (rCount === 3 && empty === 1) return -80; // strong block need
      if (rCount === 4) return -1000;
      return 0;
    };

    const evaluateBoard = (b: Cell[][]): number => {
      let score = 0;
      // Center column preference
      const centerCol = Math.floor(COLS / 2);
      for (let r = 0; r < ROWS; r++) {
        if (b[r][centerCol] === 'Y') score += 4;
      }

      // Horizontal
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
          score += scoreWindow([b[r][c], b[r][c+1], b[r][c+2], b[r][c+3]]);
        }
      }
      // Vertical
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r <= ROWS - 4; r++) {
          score += scoreWindow([b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]]);
        }
      }
      // Diagonals
      for (let r = 0; r <= ROWS - 4; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
          score += scoreWindow([b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]]);
        }
      }
      for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
          score += scoreWindow([b[r][c], b[r-1][c+1], b[r-2][c+2], b[r-3][c+3]]);
        }
      }
      return score;
    };

    const depth = diff === 'master' ? 3 : 2;

    const minimax = (b: Cell[][], d: number, alpha: number, beta: number, isMaximizing: boolean): { col: number; score: number } => {
      const winStatus = checkWinCondition(b);
      if (winStatus.winner === 'Y') return { col: -1, score: 100000 };
      if (winStatus.winner === 'R') return { col: -1, score: -100000 };
      if (winStatus.winner === 'DRAW' || d === 0) return { col: -1, score: evaluateBoard(b) };

      const availableCols: number[] = [];
      // Prefer center columns first for faster alpha-beta pruning
      const colOrder = [3, 2, 4, 1, 5, 0, 6];
      for (const c of colOrder) {
        if (b[0][c] === null) availableCols.push(c);
      }

      if (isMaximizing) {
        let maxEval = -Infinity;
        let bestCol = availableCols[0];
        for (const c of availableCols) {
          const copy = b.map(row => [...row]);
          for (let r = ROWS - 1; r >= 0; r--) {
            if (copy[r][c] === null) {
              copy[r][c] = 'Y';
              break;
            }
          }
          const evaluation = minimax(copy, d - 1, alpha, beta, false).score;
          if (evaluation > maxEval) {
            maxEval = evaluation;
            bestCol = c;
          }
          alpha = Math.max(alpha, evaluation);
          if (beta <= alpha) break;
        }
        return { col: bestCol, score: maxEval };
      } else {
        let minEval = Infinity;
        let bestCol = availableCols[0];
        for (const c of availableCols) {
          const copy = b.map(row => [...row]);
          for (let r = ROWS - 1; r >= 0; r--) {
            if (copy[r][c] === null) {
              copy[r][c] = 'R';
              break;
            }
          }
          const evaluation = minimax(copy, d - 1, alpha, beta, true).score;
          if (evaluation < minEval) {
            minEval = evaluation;
            bestCol = c;
          }
          beta = Math.min(beta, evaluation);
          if (beta <= alpha) break;
        }
        return { col: bestCol, score: minEval };
      }
    };

    const best = minimax(currentBoard, depth, -Infinity, Infinity, true);
    return best.col !== -1 ? best.col : validCols[0];
  }, [checkWinCondition]);

  // Bot Turn Trigger
  useEffect(() => {
    if (mode === 'bot' && currentPlayer === 'Y' && !winner) {
      setIsBotThinking(true);
      const timer = setTimeout(() => {
        const botCol = getBotMove(board, difficulty);
        setIsBotThinking(false);
        dropPiece(botCol, 'Y');
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [mode, currentPlayer, winner, board, difficulty, getBotMove, dropPiece]);

  // Setup BroadcastChannel for multi-tab online room play
  useEffect(() => {
    if (typeof window !== 'undefined' && online.roomCode) {
      const channel = new BroadcastChannel(`gg_connect4_${online.roomCode}`);
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const data = event.data;
        if (data.type === 'MOVE') {
          dropPiece(data.col, online.myColor === 'R' ? 'Y' : 'R');
          setOnline(prev => ({ ...prev, isMyTurn: true }));
        } else if (data.type === 'EMOTE') {
          setOnline(prev => ({ ...prev, lastEmote: { sender: 'Opponent', text: data.text } }));
          setTimeout(() => {
            setOnline(prev => ({ ...prev, lastEmote: undefined }));
          }, 3000);
        } else if (data.type === 'RESTART') {
          resetBoard();
        }
      };

      return () => {
        channel.close();
      };
    }
  }, [online.roomCode, online.myColor, dropPiece]);

  const resetBoard = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setCurrentPlayer('R');
    setWinner(null);
    setWinningCells([]);
    setIsBotThinking(false);
  };

  const handleCreateRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setOnline({
      roomCode: code,
      opponentName: 'Room Host (Player 2 connects via code)',
      isMyTurn: true,
      myColor: 'R',
      status: 'connected',
    });
    resetBoard();
  };

  const handleJoinRoom = () => {
    if (!roomInput.trim()) return;
    const code = roomInput.trim().toUpperCase();
    setOnline({
      roomCode: code,
      opponentName: 'Connected Peer',
      isMyTurn: false,
      myColor: 'Y',
      status: 'connected',
    });
    resetBoard();
    setRoomInput('');
  };

  const sendEmote = (text: string) => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'EMOTE', text });
    }
    setOnline(prev => ({
      ...prev,
      lastEmote: { sender: 'You', text },
    }));
    setTimeout(() => {
      setOnline(prev => ({ ...prev, lastEmote: undefined }));
    }, 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Title & Mode Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Connect 4</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {mode === 'bot' ? 'Vs Bot' : mode === 'online' ? 'Online Multiplayer' : 'Pass & Play'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Connect 4 chips horizontally, vertically, or diagonally to claim victory.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => { setMode('bot'); resetBoard(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'bot' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Vs Bot</span>
          </button>
          <button
            onClick={() => { setMode('online'); resetBoard(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'online' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Online Match</span>
          </button>
          <button
            onClick={() => { setMode('local'); resetBoard(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'local' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2-Player</span>
          </button>
        </div>
      </div>

      {/* Mode Sub-panels */}
      {mode === 'bot' && (
        <div className="flex items-center justify-between p-3 mb-6 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400">
            Bot Difficulty:
          </div>
          <div className="flex items-center gap-1.5">
            {(['easy', 'medium', 'master'] as BotDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => { setDifficulty(d); resetBoard(); }}
                className={`px-3 py-1 text-xs capitalize font-medium rounded-md transition-colors ${
                  difficulty === d
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                }`}
              >
                {d === 'master' ? 'Master (Unbeatable)' : d}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'online' && (
        <div className="p-4 mb-6 bg-slate-900/70 border border-slate-800 rounded-xl">
          {online.status === 'idle' ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-200">Room Code Multiplayer</div>
                <div className="text-xs text-slate-400">Create a 4-letter room code or join one from another tab/window.</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCreateRoom}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Create Room</span>
                </button>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Room Code"
                    value={roomInput}
                    onChange={e => setRoomInput(e.target.value)}
                    className="w-24 px-2.5 py-1.5 text-xs uppercase bg-slate-950 border border-slate-700 rounded-md text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    onClick={handleJoinRoom}
                    className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="font-mono text-indigo-400 font-bold bg-indigo-950/40 px-2 py-1 rounded border border-indigo-800/40">
                  ROOM: {online.roomCode}
                </div>
                <span className="text-slate-400">VS</span>
                <div className="text-slate-200 font-medium">
                  {online.opponentName}
                </div>
              </div>
              
              {/* Emotes */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px] mr-1">Emotes:</span>
                {['👏 GG', '🔥 Fire', '🤔 Hmm', '🎯 Close'].map((emote) => (
                  <button
                    key={emote}
                    onClick={() => sendEmote(emote)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition-colors"
                  >
                    {emote}
                  </button>
                ))}
              </div>
            </div>
          )}

          {online.lastEmote && (
            <div className="mt-2.5 text-center text-xs text-amber-300 font-medium animate-bounce">
              {online.lastEmote.sender}: {online.lastEmote.text}
            </div>
          )}
        </div>
      )}

      {/* Main Board Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Game Stats & Indicators */}
        <div className="lg:col-span-1 space-y-4">
          {/* Turn Card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-400 font-medium mb-3">CURRENT TURN</div>
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                  currentPlayer === 'R'
                    ? 'bg-gradient-to-br from-red-500 to-rose-700 ring-4 ring-rose-500/20'
                    : 'bg-gradient-to-br from-amber-400 to-yellow-600 ring-4 ring-amber-500/20'
                }`}
              >
                <div className="w-6 h-6 rounded-full border-2 border-white/30" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  {currentPlayer === 'R' ? 'Red Player' : mode === 'bot' ? 'Bot (Yellow)' : 'Yellow Player'}
                </div>
                <div className="text-xs text-slate-400">
                  {isBotThinking ? 'Calculating best move...' : 'Drop chip into a column'}
                </div>
              </div>
            </div>
          </div>

          {/* Score Counter */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="text-xs text-slate-400 font-medium mb-3">SERIES SCORE</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-900/30">
                <div className="text-xs text-rose-400 font-medium">Red</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">{scores.red}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/30">
                <div className="text-xs text-slate-400 font-medium">Ties</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">{scores.draws}</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-950/20 border border-amber-900/30">
                <div className="text-xs text-amber-400 font-medium">Yellow</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">{scores.yellow}</div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={resetBoard}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700/60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Match</span>
            </button>
          </div>
        </div>

        {/* 7x6 Connect 4 Grid */}
        <div className="lg:col-span-3 flex flex-col items-center">
          {/* Winner Banner */}
          {winner && (
            <div className="w-full max-w-md mb-4 p-3 rounded-xl text-center bg-indigo-950/80 border border-indigo-500/40 text-white shadow-xl animate-fade-in">
              <div className="text-sm font-bold flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  {winner === 'DRAW'
                    ? "It's a Stalemate Draw!"
                    : winner === 'R'
                    ? 'Red Player Triumphs!'
                    : mode === 'bot'
                    ? 'Bot Claims the Victory!'
                    : 'Yellow Player Wins!'}
                </span>
              </div>
              <button
                onClick={resetBoard}
                className="mt-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Play Next Round
              </button>
            </div>
          )}

          {/* Column Arrow Indicators */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3 w-full max-w-lg mb-1 px-3">
            {Array.from({ length: COLS }).map((_, c) => (
              <div
                key={c}
                className="flex items-center justify-center h-6 cursor-pointer"
                onClick={() => dropPiece(c)}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(null)}
              >
                {hoverCol === c && !winner && (
                  <ArrowDown
                    className={`w-5 h-5 animate-bounce ${
                      currentPlayer === 'R' ? 'text-red-500' : 'text-amber-400'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Blue Connect 4 Cabinet */}
          <div className="w-full max-w-lg p-3 sm:p-4 bg-gradient-to-b from-blue-700 to-blue-900 rounded-3xl shadow-2xl border-4 border-blue-600/80">
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {Array.from({ length: COLS }).map((_, c) => (
                <div
                  key={c}
                  className="flex flex-col gap-2 sm:gap-3 cursor-pointer group"
                  onClick={() => dropPiece(c)}
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(null)}
                >
                  {Array.from({ length: ROWS }).map((_, r) => {
                    const cell = board[r][c];
                    const isWinning = winningCells.some(([wr, wc]) => wr === r && wc === c);

                    return (
                      <div
                        key={r}
                        className={`w-full aspect-square rounded-full flex items-center justify-center transition-all duration-200 relative ${
                          cell === null
                            ? 'bg-slate-950/90 shadow-inner'
                            : cell === 'R'
                            ? 'bg-gradient-to-br from-red-500 to-rose-700 shadow-md'
                            : 'bg-gradient-to-br from-amber-400 to-yellow-600 shadow-md'
                        } ${isWinning ? 'ring-4 ring-white animate-pulse scale-105 z-10' : ''}`}
                      >
                        {/* Chip inner ring styling */}
                        {cell !== null && (
                          <div className="w-2/3 h-2/3 rounded-full border border-white/30 flex items-center justify-center">
                            <div className="w-1/2 h-1/2 rounded-full bg-white/10" />
                          </div>
                        )}
                        {/* Column hover phantom chip */}
                        {cell === null && hoverCol === c && !winner && (
                          <div
                            className={`w-3/4 h-3/4 rounded-full opacity-20 transition-opacity ${
                              currentPlayer === 'R' ? 'bg-red-500' : 'bg-amber-400'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Cabinet base stand */}
            <div className="mt-3 flex justify-between px-4">
              <div className="w-8 h-3 bg-blue-950/80 rounded-t" />
              <div className="w-8 h-3 bg-blue-950/80 rounded-t" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
