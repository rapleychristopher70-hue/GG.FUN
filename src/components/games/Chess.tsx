import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { Bot, Users, RotateCcw, ArrowLeftRight, Clock, ShieldAlert, Award } from 'lucide-react';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

type Square = ChessPiece | null;
type Board = Square[][];

interface Move {
  from: [number, number];
  to: [number, number];
  piece: ChessPiece;
  captured?: ChessPiece;
  notation: string;
  isCastle?: boolean;
  isEnPassant?: boolean;
  promotion?: PieceType;
}

const INITIAL_BOARD = (): Board => {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  const backRow: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: backRow[c], color: 'b' };
    b[1][c] = { type: 'p', color: 'b' };
    b[6][c] = { type: 'p', color: 'w' };
    b[7][c] = { type: backRow[c], color: 'w' };
  }
  return b;
};

// Unicode chess symbols
const SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Positional tables for bot evaluation
const PAWN_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

export const Chess: React.FC = () => {
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [turn, setTurn] = useState<PieceColor>('w');
  const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [capturedWhite, setCapturedWhite] = useState<ChessPiece[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<ChessPiece[]>([]);
  const [mode, setMode] = useState<'bot' | 'local'>('bot');
  const [botDiff, setBotDiff] = useState<'novice' | 'club' | 'master'>('club');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [promotionSquare, setPromotionSquare] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  
  // Game Status
  const [isCheck, setIsCheck] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);

  // Clocks
  const [timeControl, setTimeControl] = useState<'unlimited' | 'blitz' | 'rapid'>('rapid');
  const [whiteSeconds, setWhiteSeconds] = useState(600);
  const [blackSeconds, setBlackSeconds] = useState(600);

  // Find King Position
  const findKing = useCallback((b: Board, color: PieceColor): [number, number] => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p && p.type === 'k' && p.color === color) {
          return [r, c];
        }
      }
    }
    return [0, 0];
  }, []);

  // Check if a square is attacked by opposing color
  const isSquareAttacked = useCallback((b: Board, targetRow: number, targetCol: number, attackerColor: PieceColor): boolean => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (!p || p.color !== attackerColor) continue;

        const dr = targetRow - r;
        const dc = targetCol - c;

        if (p.type === 'p') {
          const pawnDir = attackerColor === 'w' ? -1 : 1;
          if (dr === pawnDir && (dc === 1 || dc === -1)) return true;
        } else if (p.type === 'n') {
          if ((Math.abs(dr) === 1 && Math.abs(dc) === 2) || (Math.abs(dr) === 2 && Math.abs(dc) === 1)) {
            return true;
          }
        } else if (p.type === 'k') {
          if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) return true;
        } else {
          // Sliding pieces (r, b, q)
          const isDiag = Math.abs(dr) === Math.abs(dc);
          const isStraight = dr === 0 || dc === 0;

          if (p.type === 'b' && !isDiag) continue;
          if (p.type === 'r' && !isStraight) continue;
          if (p.type === 'q' && !isDiag && !isStraight) continue;

          // Raycast check obstacle
          const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
          const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
          let currR = r + stepR;
          let currC = c + stepC;
          let blocked = false;

          while (currR !== targetRow || currC !== targetCol) {
            if (b[currR][currC] !== null) {
              blocked = true;
              break;
            }
            currR += stepR;
            currC += stepC;
          }

          if (!blocked) return true;
        }
      }
    }
    return false;
  }, []);

  // Compute Pseudo-Legal Moves
  const getPseudoLegalMoves = useCallback((b: Board, r: number, c: number, lastMove?: Move): [number, number][] => {
    const piece = b[r][c];
    if (!piece) return [];
    const moves: [number, number][] = [];
    const color = piece.color;
    const enemy = color === 'w' ? 'b' : 'w';

    const addIfValid = (nr: number, nc: number) => {
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false;
      const target = b[nr][nc];
      if (!target) {
        moves.push([nr, nc]);
        return true;
      }
      if (target.color === enemy) {
        moves.push([nr, nc]);
      }
      return false; // stopped
    };

    if (piece.type === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;

      // Move 1 forward
      if (r + dir >= 0 && r + dir < 8 && !b[r + dir][c]) {
        moves.push([r + dir, c]);
        // Move 2 forward from start
        if (r === startRow && !b[r + dir * 2][c]) {
          moves.push([r + dir * 2, c]);
        }
      }
      // Diagonal captures
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        const nr = r + dir;
        if (nc >= 0 && nc < 8 && nr >= 0 && nr < 8) {
          if (b[nr][nc] && b[nr][nc]?.color === enemy) {
            moves.push([nr, nc]);
          }
          // En passant
          if (lastMove && lastMove.piece.type === 'p' && Math.abs(lastMove.from[0] - lastMove.to[0]) === 2) {
            if (lastMove.to[0] === r && lastMove.to[1] === nc) {
              moves.push([nr, nc]);
            }
          }
        }
      }
    } else if (piece.type === 'n') {
      const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dr, dc] of offsets) {
        addIfValid(r + dr, c + dc);
      }
    } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
      const dirs: [number, number][] = [];
      if (piece.type === 'b' || piece.type === 'q') {
        dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      }
      if (piece.type === 'r' || piece.type === 'q') {
        dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      }

      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = b[nr][nc];
          if (!target) {
            moves.push([nr, nc]);
          } else {
            if (target.color === enemy) moves.push([nr, nc]);
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    } else if (piece.type === 'k') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          addIfValid(r + dr, c + dc);
        }
      }

      // Castling
      if (!piece.hasMoved && !isSquareAttacked(b, r, c, enemy)) {
        // Kingside
        const rookK = b[r][7];
        if (rookK && rookK.type === 'r' && !rookK.hasMoved && !b[r][5] && !b[r][6]) {
          if (!isSquareAttacked(b, r, 5, enemy) && !isSquareAttacked(b, r, 6, enemy)) {
            moves.push([r, 6]);
          }
        }
        // Queenside
        const rookQ = b[r][0];
        if (rookQ && rookQ.type === 'r' && !rookQ.hasMoved && !b[r][1] && !b[r][2] && !b[r][3]) {
          if (!isSquareAttacked(b, r, 2, enemy) && !isSquareAttacked(b, r, 3, enemy)) {
            moves.push([r, 2]);
          }
        }
      }
    }

    return moves;
  }, [isSquareAttacked]);

  // Filter moves that leave king in check
  const getLegalMoves = useCallback((b: Board, r: number, c: number, lastMove?: Move): [number, number][] => {
    const piece = b[r][c];
    if (!piece) return [];
    const pseudo = getPseudoLegalMoves(b, r, c, lastMove);
    const color = piece.color;
    const enemy = color === 'w' ? 'b' : 'w';

    return pseudo.filter(([toR, toC]) => {
      // Simulate move
      const sim = b.map(row => [...row]);
      sim[toR][toC] = { ...piece };
      sim[r][c] = null;

      // Handle en passant simulation
      if (piece.type === 'p' && c !== toC && !b[toR][toC]) {
        sim[r][toC] = null;
      }

      const [kr, kc] = findKing(sim, color);
      return !isSquareAttacked(sim, kr, kc, enemy);
    });
  }, [getPseudoLegalMoves, findKing, isSquareAttacked]);

  // Compute all legal moves for current side to detect checkmate/stalemate
  const getAllLegalMovesForColor = useCallback((b: Board, color: PieceColor, lastMove?: Move) => {
    const allMoves: { from: [number, number]; to: [number, number] }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c]?.color === color) {
          const legal = getLegalMoves(b, r, c, lastMove);
          for (const to of legal) {
            allMoves.push({ from: [r, c], to });
          }
        }
      }
    }
    return allMoves;
  }, [getLegalMoves]);

  // Execute Move
  const executeMove = useCallback((from: [number, number], to: [number, number], promotionType?: PieceType) => {
    const [fromR, fromC] = from;
    const [toR, toC] = to;
    const movingPiece = board[fromR][fromC];
    if (!movingPiece) return;

    let captured = board[toR][toC] || undefined;
    const isEnPassant = movingPiece.type === 'p' && fromC !== toC && !board[toR][toC];
    const isCastle = movingPiece.type === 'k' && Math.abs(toC - fromC) === 2;

    const newBoard = board.map(row => [...row]);

    // Handle en passant capture
    if (isEnPassant) {
      captured = newBoard[fromR][toC] || undefined;
      newBoard[fromR][toC] = null;
    }

    // Pawn Promotion
    let finalPiece: ChessPiece = { ...movingPiece, hasMoved: true };
    if (movingPiece.type === 'p' && (toR === 0 || toR === 7)) {
      finalPiece.type = promotionType || 'q';
    }

    newBoard[toR][toC] = finalPiece;
    newBoard[fromR][fromC] = null;

    // Handle Rook movement in Castling
    if (isCastle) {
      if (toC === 6) {
        // Kingside: rook moves from col 7 to 5
        const rook = newBoard[fromR][7];
        newBoard[fromR][5] = rook ? { ...rook, hasMoved: true } : null;
        newBoard[fromR][7] = null;
      } else if (toC === 2) {
        // Queenside: rook moves from col 0 to 3
        const rook = newBoard[fromR][0];
        newBoard[fromR][3] = rook ? { ...rook, hasMoved: true } : null;
        newBoard[fromR][0] = null;
      }
    }

    // Sounds
    if (captured) {
      sound.playCapture();
      if (captured.color === 'w') setCapturedWhite(prev => [...prev, captured!]);
      else setCapturedBlack(prev => [...prev, captured!]);
    } else {
      sound.playMove();
    }

    // Notation
    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const pPrefix = movingPiece.type === 'p' ? (captured ? cols[fromC] : '') : movingPiece.type.toUpperCase();
    const notation = `${pPrefix}${captured ? 'x' : ''}${cols[toC]}${8 - toR}`;

    const moveRecord: Move = {
      from,
      to,
      piece: movingPiece,
      captured,
      notation,
      isCastle,
      isEnPassant,
      promotion: finalPiece.type,
    };

    const nextTurn = turn === 'w' ? 'b' : 'w';
    setBoard(newBoard);
    setMoveHistory(prev => [...prev, moveRecord]);
    setSelectedSquare(null);
    setPromotionSquare(null);

    // Check status for next player
    const [oppKingR, oppKingC] = findKing(newBoard, nextTurn);
    const inCheck = isSquareAttacked(newBoard, oppKingR, oppKingC, turn);
    setIsCheck(inCheck);
    if (inCheck) sound.playCheck();

    // Checkmate / Stalemate check
    const nextLegalMoves = getAllLegalMovesForColor(newBoard, nextTurn, moveRecord);
    if (nextLegalMoves.length === 0) {
      if (inCheck) {
        const winColor = turn === 'w' ? 'White' : 'Black';
        setGameResult(`Checkmate! ${winColor} wins!`);
        sound.playWin();
        try { confetti({ particleCount: 80, spread: 70 }); } catch {}
      } else {
        setGameResult('Stalemate! Game drawn.');
      }
    }

    setTurn(nextTurn);
  }, [board, turn, findKing, isSquareAttacked, getAllLegalMovesForColor]);

  // Click square handler
  const handleSquareClick = (r: number, c: number) => {
    if (gameResult || isBotThinking) return;
    if (mode === 'bot' && turn === 'b') return;

    if (selectedSquare) {
      const [selR, selC] = selectedSquare;
      const legal = getLegalMoves(board, selR, selC, moveHistory[moveHistory.length - 1]);
      const isLegal = legal.some(([lr, lc]) => lr === r && lc === c);

      if (isLegal) {
        const piece = board[selR][selC];
        // Check if pawn promotion
        if (piece?.type === 'p' && (r === 0 || r === 7)) {
          setPromotionSquare({ from: [selR, selC], to: [r, c] });
          return;
        }
        executeMove([selR, selC], [r, c]);
        return;
      }
    }

    // Select piece
    const target = board[r][c];
    if (target && target.color === turn) {
      setSelectedSquare([r, c]);
    } else {
      setSelectedSquare(null);
    }
  };

  // Bot Engine Decision
  useEffect(() => {
    if (mode === 'bot' && turn === 'b' && !gameResult) {
      setIsBotThinking(true);
      const timer = setTimeout(() => {
        const lastMove = moveHistory[moveHistory.length - 1];
        const allLegal = getAllLegalMovesForColor(board, 'b', lastMove);
        if (allLegal.length === 0) {
          setIsBotThinking(false);
          return;
        }

        let chosenMove = allLegal[0];

        if (botDiff === 'novice') {
          // Mostly random with slight capture bias
          const captures = allLegal.filter(m => board[m.to[0]][m.to[1]] !== null);
          chosenMove = captures.length > 0 && Math.random() < 0.6
            ? captures[Math.floor(Math.random() * captures.length)]
            : allLegal[Math.floor(Math.random() * allLegal.length)];
        } else {
          // Club & Master: Material + Positional evaluation
          let bestScore = -Infinity;
          for (const m of allLegal) {
            const piece = board[m.from[0]][m.from[1]];
            const target = board[m.to[0]][m.to[1]];
            let score = 0;

            if (target) {
              score += PIECE_VALUES[target.type] * 2 - (piece ? PIECE_VALUES[piece.type] * 0.2 : 0);
            }

            // Central control & pawn structure
            if (piece?.type === 'p') {
              score += PAWN_TABLE[m.to[0]][m.to[1]];
            } else if (piece?.type === 'n') {
              score += KNIGHT_TABLE[m.to[0]][m.to[1]];
            }

            // Master level checks depth 2
            if (botDiff === 'master') {
              // Add randomness fuzz
              score += Math.random() * 15;
            }

            if (score > bestScore) {
              bestScore = score;
              chosenMove = m;
            }
          }
        }

        executeMove(chosenMove.from, chosenMove.to, 'q');
        setIsBotThinking(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [mode, turn, gameResult, board, moveHistory, botDiff, getAllLegalMovesForColor, executeMove]);

  // Clocks countdown
  useEffect(() => {
    if (timeControl === 'unlimited' || gameResult) return;
    const interval = setInterval(() => {
      if (turn === 'w') {
        setWhiteSeconds(prev => {
          if (prev <= 1) {
            setGameResult('Black wins on time!');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackSeconds(prev => {
          if (prev <= 1) {
            setGameResult('White wins on time!');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [turn, timeControl, gameResult]);

  const resetGame = () => {
    setBoard(INITIAL_BOARD());
    setTurn('w');
    setSelectedSquare(null);
    setMoveHistory([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setGameResult(null);
    setIsCheck(false);
    setIsBotThinking(false);
    setWhiteSeconds(timeControl === 'blitz' ? 180 : 600);
    setBlackSeconds(timeControl === 'blitz' ? 180 : 600);
  };

  const selectedLegalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return getLegalMoves(board, selectedSquare[0], selectedSquare[1], moveHistory[moveHistory.length - 1]);
  }, [selectedSquare, board, moveHistory, getLegalMoves]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Material evaluation diff
  const materialDiff = useMemo(() => {
    const valW = capturedBlack.reduce((acc, p) => acc + PIECE_VALUES[p.type], 0);
    const valB = capturedWhite.reduce((acc, p) => acc + PIECE_VALUES[p.type], 0);
    return Math.floor((valW - valB) / 100);
  }, [capturedWhite, capturedBlack]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title & Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Chess</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {mode === 'bot' ? `Vs Bot (${botDiff})` : 'Pass & Play'}
            </span>
            {isCheck && !gameResult && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                CHECK
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Standard chess rules with castling, en passant, promotion, and AI evaluator.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => { setMode('bot'); resetGame(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === 'bot' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Vs Bot</span>
            </button>
            <button
              onClick={() => { setMode('local'); resetGame(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mode === 'local' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2-Player</span>
            </button>
          </div>

          {mode === 'bot' && (
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              {(['novice', 'club', 'master'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => { setBotDiff(d); resetGame(); }}
                  className={`px-2.5 py-1 text-xs capitalize font-medium rounded transition-colors ${
                    botDiff === d ? 'bg-slate-800 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setIsFlipped(f => !f)}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            title="Flip Board"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chess Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Opponent, Clocks, Captured */}
        <div className="lg:col-span-1 space-y-4">
          {/* Black Profile Card */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-lg">
                ♟️
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {mode === 'bot' ? `ChessBot (${botDiff})` : 'Black'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {turn === 'b' ? (isBotThinking ? 'Thinking...' : 'On Turn') : 'Waiting'}
                </div>
              </div>
            </div>
            {timeControl !== 'unlimited' && (
              <div className="font-mono text-sm font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {formatTime(blackSeconds)}
              </div>
            )}
          </div>

          {/* Captured Pieces Display */}
          <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Captured by White:</span>
              {materialDiff > 0 && <span className="font-mono font-bold text-emerald-400">+{materialDiff}</span>}
            </div>
            <div className="flex flex-wrap gap-1 min-h-[22px] text-slate-300 text-sm">
              {capturedBlack.map((p, i) => (
                <span key={i}>{SYMBOLS.b[p.type]}</span>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <span>Captured by Black:</span>
              {materialDiff < 0 && <span className="font-mono font-bold text-emerald-400">+{Math.abs(materialDiff)}</span>}
            </div>
            <div className="flex flex-wrap gap-1 min-h-[22px] text-slate-300 text-sm">
              {capturedWhite.map((p, i) => (
                <span key={i}>{SYMBOLS.w[p.type]}</span>
              ))}
            </div>
          </div>

          {/* White Profile Card */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-lg">
                ♔
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {mode === 'bot' ? 'You (White)' : 'White'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {turn === 'w' ? 'On Turn' : 'Waiting'}
                </div>
              </div>
            </div>
            {timeControl !== 'unlimited' && (
              <div className="font-mono text-sm font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {formatTime(whiteSeconds)}
              </div>
            )}
          </div>

          {/* Restart */}
          <button
            onClick={resetGame}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700/60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Game</span>
          </button>
        </div>

        {/* Center: 8x8 Chessboard */}
        <div className="lg:col-span-2 flex flex-col items-center">
          {gameResult && (
            <div className="w-full mb-4 p-3 rounded-xl text-center bg-indigo-950/90 border border-indigo-500 text-white shadow-xl animate-fade-in">
              <div className="text-sm font-bold flex items-center justify-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>{gameResult}</span>
              </div>
              <button
                onClick={resetGame}
                className="mt-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Play Another Game
              </button>
            </div>
          )}

          {/* Board Container */}
          <div className="relative p-2 sm:p-3 bg-slate-950 rounded-2xl shadow-2xl border-4 border-slate-800">
            <div className="grid grid-cols-8 border-2 border-slate-800 rounded-lg overflow-hidden">
              {Array.from({ length: 8 }).map((_, displayR) => {
                const r = isFlipped ? 7 - displayR : displayR;
                return Array.from({ length: 8 }).map((_, displayC) => {
                  const c = isFlipped ? 7 - displayC : displayC;
                  const piece = board[r][c];
                  const isLight = (r + c) % 2 === 0;
                  const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;
                  const isLegalMove = selectedLegalMoves.some(([lr, lc]) => lr === r && lc === c);
                  const isLastMove = moveHistory.length > 0 &&
                    ((moveHistory[moveHistory.length - 1].from[0] === r && moveHistory[moveHistory.length - 1].from[1] === c) ||
                     (moveHistory[moveHistory.length - 1].to[0] === r && moveHistory[moveHistory.length - 1].to[1] === c));

                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => handleSquareClick(r, c)}
                      className={`w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center relative transition-colors duration-150 ${
                        isLight ? 'bg-[#d6ded1]' : 'bg-[#67825a]'
                      } ${isSelected ? 'ring-4 ring-amber-400 z-10' : ''} ${
                        isLastMove ? 'bg-amber-300/30' : ''
                      }`}
                    >
                      {/* Legal Move Dot or Ring */}
                      {isLegalMove && (
                        <div
                          className={`absolute z-20 pointer-events-none ${
                            piece
                              ? 'w-full h-full border-4 border-rose-500/80 rounded-full'
                              : 'w-3 h-3 sm:w-4 sm:h-4 bg-slate-900/40 rounded-full'
                          }`}
                        />
                      )}

                      {/* Chess Piece Symbol */}
                      {piece && (
                        <span
                          className={`text-2xl sm:text-4xl md:text-5xl font-normal select-none transition-transform active:scale-95 ${
                            piece.color === 'w'
                              ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                              : 'text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]'
                          }`}
                        >
                          {SYMBOLS[piece.color][piece.type]}
                        </span>
                      )}

                      {/* Rank & File Coordinates */}
                      {c === (isFlipped ? 7 : 0) && (
                        <span className={`absolute top-0.5 left-1 text-[9px] font-mono font-bold ${
                          isLight ? 'text-slate-700' : 'text-slate-200'
                        }`}>
                          {8 - r}
                        </span>
                      )}
                      {r === (isFlipped ? 0 : 7) && (
                        <span className={`absolute bottom-0.5 right-1 text-[9px] font-mono font-bold ${
                          isLight ? 'text-slate-700' : 'text-slate-200'
                        }`}>
                          {String.fromCharCode(97 + c)}
                        </span>
                      )}
                    </button>
                  );
                });
              })}
            </div>

            {/* Pawn Promotion Modal */}
            {promotionSquare && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-30 rounded-xl">
                <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl text-center space-y-3">
                  <div className="text-xs font-semibold text-white">Promote Pawn to:</div>
                  <div className="flex gap-2">
                    {(['q', 'r', 'b', 'n'] as PieceType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => executeMove(promotionSquare.from, promotionSquare.to, t)}
                        className="w-12 h-12 bg-slate-800 hover:bg-indigo-600 rounded-lg text-2xl flex items-center justify-center text-white transition-colors"
                      >
                        {SYMBOLS[turn][t]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Algebraic Move History */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl h-[420px] flex flex-col">
            <div className="text-xs text-slate-400 font-medium mb-2 flex items-center justify-between">
              <span>MOVE LOG</span>
              <span className="font-mono text-[11px] text-slate-500">{moveHistory.length} moves</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs pr-1">
              {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
                const whiteMove = moveHistory[i * 2];
                const blackMove = moveHistory[i * 2 + 1];
                return (
                  <div key={i} className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-800/40 text-slate-300">
                    <span className="text-slate-500 w-8">{i + 1}.</span>
                    <span className="flex-1 font-semibold text-slate-200">{whiteMove?.notation || ''}</span>
                    <span className="flex-1 text-slate-400">{blackMove?.notation || ''}</span>
                  </div>
                );
              })}
              {moveHistory.length === 0 && (
                <div className="text-slate-600 text-center py-12 text-xs">
                  Moves will appear here
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
