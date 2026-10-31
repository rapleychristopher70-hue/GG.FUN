import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../../utils/audio';
import { Play, Pause, RotateCcw, Trophy, Flame, Zap, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Fruit {
  x: number;
  y: number;
  type: 'normal' | 'golden' | 'star';
  points: number;
}

const GRID_SIZE = 22; // 22x22 cells

export const Snake: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const [direction, setDirection] = useState<Direction>('UP');
  const nextDirectionRef = useRef<Direction>('UP');
  const [fruit, setFruit] = useState<Fruit>({ x: 10, y: 5, type: 'normal', points: 10 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return Number(localStorage.getItem('gg_snake_high_score') || 0);
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [speed, setSpeed] = useState<'normal' | 'fast' | 'insane'>('normal');

  const speedMs = speed === 'normal' ? 110 : speed === 'fast' ? 80 : 55;

  // Spawn random fruit
  const spawnFruit = useCallback((currentSnake: Point[]): Fruit => {
    let x: number;
    let y: number;
    do {
      x = Math.floor(Math.random() * GRID_SIZE);
      y = Math.floor(Math.random() * GRID_SIZE);
    } while (currentSnake.some(seg => seg.x === x && seg.y === y));

    const rand = Math.random();
    if (rand < 0.15) {
      return { x, y, type: 'star', points: 50 };
    } else if (rand < 0.35) {
      return { x, y, type: 'golden', points: 30 };
    }
    return { x, y, type: 'normal', points: 10 };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        if (direction !== 'DOWN') nextDirectionRef.current = 'UP';
        e.preventDefault();
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        if (direction !== 'UP') nextDirectionRef.current = 'DOWN';
        e.preventDefault();
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        if (direction !== 'RIGHT') nextDirectionRef.current = 'LEFT';
        e.preventDefault();
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        if (direction !== 'LEFT') nextDirectionRef.current = 'RIGHT';
        e.preventDefault();
      } else if (e.code === 'Space') {
        setIsPlaying(p => !p);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  // Main Game Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const interval = setInterval(() => {
      setSnake((prevSnake) => {
        const dir = nextDirectionRef.current;
        setDirection(dir);

        const head = { ...prevSnake[0] };
        if (dir === 'UP') head.y -= 1;
        if (dir === 'DOWN') head.y += 1;
        if (dir === 'LEFT') head.x -= 1;
        if (dir === 'RIGHT') head.x += 1;

        // Wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          sound.playGameOver();
          setGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
          sound.playGameOver();
          setGameOver(true);
          setIsPlaying(false);
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Eat fruit
        if (head.x === fruit.x && head.y === fruit.y) {
          sound.playEat();
          const newScore = score + fruit.points;
          setScore(newScore);
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('gg_snake_high_score', String(newScore));
          }
          setFruit(spawnFruit(newSnake));
        } else {
          newSnake.pop(); // Remove tail
        }

        return newSnake;
      });
    }, speedMs);

    return () => clearInterval(interval);
  }, [isPlaying, gameOver, fruit, score, highScore, speedMs, spawnFruit]);

  // Draw Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellSize = width / GRID_SIZE;

    // Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid pattern
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(width, i * cellSize);
      ctx.stroke();
    }

    // Draw Fruit
    const fx = fruit.x * cellSize + cellSize / 2;
    const fy = fruit.y * cellSize + cellSize / 2;
    const fRadius = cellSize * 0.42;

    ctx.save();
    if (fruit.type === 'star') {
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 12;
    } else if (fruit.type === 'golden') {
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#e11d48';
      ctx.shadowBlur = 8;
    }

    ctx.beginPath();
    ctx.arc(fx, fy, fRadius, 0, Math.PI * 2);
    ctx.fill();

    // Stem / sparkle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(fx - fRadius * 0.3, fy - fRadius * 0.3, fRadius * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Snake
    snake.forEach((seg, index) => {
      const sx = seg.x * cellSize;
      const sy = seg.y * cellSize;
      const isHead = index === 0;

      ctx.save();
      if (isHead) {
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#059669';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4, 6);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        const eyeSize = cellSize * 0.18;
        if (direction === 'UP' || direction === 'DOWN') {
          ctx.fillRect(sx + cellSize * 0.25, sy + cellSize * (direction === 'UP' ? 0.2 : 0.6), eyeSize, eyeSize);
          ctx.fillRect(sx + cellSize * 0.6, sy + cellSize * (direction === 'UP' ? 0.2 : 0.6), eyeSize, eyeSize);
        } else {
          ctx.fillRect(sx + cellSize * (direction === 'LEFT' ? 0.2 : 0.6), sy + cellSize * 0.25, eyeSize, eyeSize);
          ctx.fillRect(sx + cellSize * (direction === 'LEFT' ? 0.2 : 0.6), sy + cellSize * 0.6, eyeSize, eyeSize);
        }
      } else {
        // Gradient fade towards tail
        const progress = index / snake.length;
        ctx.fillStyle = progress > 0.7 ? '#047857' : '#059669';
        ctx.beginPath();
        ctx.roundRect(sx + 3, sy + 3, cellSize - 6, cellSize - 6, 4);
        ctx.fill();
      }
      ctx.restore();
    });
  }, [snake, fruit, direction]);

  const restartGame = () => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    setSnake(initialSnake);
    setDirection('UP');
    nextDirectionRef.current = 'UP';
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
    setFruit(spawnFruit(initialSnake));
  };

  const handleMobileDpad = (d: Direction) => {
    if (d === 'UP' && direction !== 'DOWN') nextDirectionRef.current = 'UP';
    if (d === 'DOWN' && direction !== 'UP') nextDirectionRef.current = 'DOWN';
    if (d === 'LEFT' && direction !== 'RIGHT') nextDirectionRef.current = 'LEFT';
    if (d === 'RIGHT' && direction !== 'LEFT') nextDirectionRef.current = 'RIGHT';
    if (!isPlaying && !gameOver) setIsPlaying(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Title & Speed Settings - Compact single row */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Snake</span>
            <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Arcade
            </span>
          </h2>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
          {(['normal', 'fast', 'insane'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2.5 py-1 text-[11px] capitalize font-medium rounded transition-colors ${
                speed === s ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Score & HUD - Slim bar */}
      <div className="grid grid-cols-3 gap-2 p-2 mb-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Flame className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] text-slate-400">SCORE:</span>
          <span className="text-sm font-mono font-bold text-white tabular-nums">{score}</span>
        </div>

        <div className="flex items-center justify-center gap-1.5 border-x border-slate-800">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] text-slate-400">HIGH:</span>
          <span className="text-sm font-mono font-bold text-white tabular-nums">{highScore}</span>
        </div>

        <div className="flex items-center justify-center gap-1.5">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="text-[11px] text-slate-400">LEN:</span>
          <span className="text-sm font-mono font-bold text-white tabular-nums">{snake.length}</span>
        </div>
      </div>

      {/* Main Game Arena - Compact board and D-pad */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
        {/* Compact Canvas Frame */}
        <div className="relative p-1.5 bg-slate-950 rounded-xl border-2 border-slate-800 shadow-xl shrink-0">
          <canvas
            ref={canvasRef}
            width={440}
            height={440}
            className="w-[230px] h-[230px] sm:w-[260px] sm:h-[260px] rounded-lg block"
          />

          {/* Start / Pause / Game Over Overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center rounded-lg p-4 text-center">
              {gameOver ? (
                <div className="space-y-2">
                  <div className="text-2xl">💥</div>
                  <h3 className="text-base font-bold text-white">Game Over!</h3>
                  <p className="text-xs text-slate-400">
                    Score: <span className="font-mono font-bold text-emerald-400">{score}</span>
                  </p>
                  <button
                    onClick={restartGame}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 mx-auto mt-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Play Again</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-3xl">🐍</div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Classic Snake</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use on-screen D-pad or Arrow keys</p>
                  </div>
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 mx-auto"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Start Game</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side Panel: D-pad + Action Buttons */}
        <div className="flex flex-col items-center gap-3">
          {/* Tactile On-Screen D-Pad (always visible so touch & mouse can use it) */}
          <div className="flex flex-col items-center gap-1.5 p-3 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-md">
            <button
              onClick={() => handleMobileDpad('UP')}
              className="w-11 h-11 bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 rounded-xl flex items-center justify-center text-slate-200 transition-colors shadow-sm"
              title="Up"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleMobileDpad('LEFT')}
                className="w-11 h-11 bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 rounded-xl flex items-center justify-center text-slate-200 transition-colors shadow-sm"
                title="Left"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleMobileDpad('DOWN')}
                className="w-11 h-11 bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 rounded-xl flex items-center justify-center text-slate-200 transition-colors shadow-sm"
                title="Down"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleMobileDpad('RIGHT')}
                className="w-11 h-11 bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 rounded-xl flex items-center justify-center text-slate-200 transition-colors shadow-sm"
                title="Right"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Buttons: Pause & Restart */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(p => !p)}
              disabled={gameOver}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 border border-slate-700/60"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Resume'}</span>
            </button>
            <button
              onClick={restartGame}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 border border-slate-700/60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
