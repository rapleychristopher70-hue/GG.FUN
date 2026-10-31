import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { Sparkles, RotateCcw, Target, Award, Compass, Zap, HelpCircle } from 'lucide-react';

interface Point {
  x: number;
  y: number;
  t: number;
}

interface EvaluationResult {
  score: number;
  straightness: number;
  smoothness: number;
  length: number;
  verdict: string;
  angleDeg: number;
  bestFitStart: { x: number; y: number };
  bestFitEnd: { x: number; y: number };
}

export const PerfectLine: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [bestScore, setBestScore] = useState<number>(() => {
    return Number(localStorage.getItem('gg_perfect_line_best') || 0);
  });
  const [challengeMode, setChallengeMode] = useState<'free' | 'horizontal' | 'vertical'>('free');
  const [showGuideline, setShowGuideline] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [attempts, setAttempts] = useState(0);

  // Evaluate Drawn Line
  const evaluatePoints = useCallback((pts: Point[], mode: 'free' | 'horizontal' | 'vertical'): EvaluationResult | null => {
    if (pts.length < 10) return null;

    const start = pts[0];
    const end = pts[pts.length - 1];

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const totalDist = Math.hypot(dx, dy);

    // Minimum distance check
    if (totalDist < 120) {
      return {
        score: 0,
        straightness: 0,
        smoothness: 0,
        length: totalDist,
        verdict: 'Line too short! Draw at least 150px.',
        angleDeg: 0,
        bestFitStart: start,
        bestFitEnd: end,
      };
    }

    // Best fit line via Linear Regression
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    pts.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    });

    const n = pts.length;
    let perpDistances: number[] = [];

    // Parametric line representation between start and end
    const lineLen = totalDist;
    const ux = dx / lineLen;
    const uy = dy / lineLen;

    pts.forEach(p => {
      // Distance from p to line segment (start -> end)
      const px = p.x - start.x;
      const py = p.y - start.y;
      // Perpendicular distance is cross product magnitude
      const dist = Math.abs(px * uy - py * ux);
      perpDistances.push(dist);
    });

    // Mean absolute error and max error
    const meanError = perpDistances.reduce((acc, d) => acc + d, 0) / n;
    const maxError = Math.max(...perpDistances);

    // Straightness score (0 - 100)
    // 0 error = 100%, 20px avg error = ~50%
    const straightnessScore = Math.max(0, Math.min(100, 100 - (meanError * 3.8 + maxError * 0.8)));

    // Smoothness / Curvature (inflection changes)
    let directionChanges = 0;
    for (let i = 2; i < pts.length; i++) {
      const v1x = pts[i-1].x - pts[i-2].x;
      const v1y = pts[i-1].y - pts[i-2].y;
      const v2x = pts[i].x - pts[i-1].x;
      const v2y = pts[i].y - pts[i-1].y;
      const cross = v1x * v2y - v1y * v2x;
      if (Math.abs(cross) > 15) directionChanges++;
    }
    const smoothnessScore = Math.max(0, 100 - directionChanges * 1.5);

    // Angle penalty if in horizontal or vertical challenge mode
    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;
    let anglePenalty = 0;

    if (mode === 'horizontal') {
      const diff1 = Math.abs(angleDeg - 0);
      const diff2 = Math.abs(angleDeg - 180);
      const diff3 = Math.abs(angleDeg - 360);
      const minDiff = Math.min(diff1, diff2, diff3);
      anglePenalty = minDiff * 2.2;
    } else if (mode === 'vertical') {
      const diff1 = Math.abs(angleDeg - 90);
      const diff2 = Math.abs(angleDeg - 270);
      const minDiff = Math.min(diff1, diff2);
      anglePenalty = minDiff * 2.2;
    }

    let finalScore = straightnessScore * 0.75 + smoothnessScore * 0.25 - anglePenalty;
    finalScore = Math.max(0, Math.min(99.9, Number(finalScore.toFixed(1))));

    let verdict = 'A bit wobbly!';
    if (finalScore >= 98.0) verdict = 'LASER PERFECTION! ⚡';
    else if (finalScore >= 94.0) verdict = 'SURGEON HANDS! 🎯';
    else if (finalScore >= 90.0) verdict = 'DEAD ON TARGET! ✨';
    else if (finalScore >= 80.0) verdict = 'STEADY LINE! 👍';
    else if (finalScore >= 60.0) verdict = 'DECENT EFFORT';

    return {
      score: finalScore,
      straightness: Number(straightnessScore.toFixed(1)),
      smoothness: Number(smoothnessScore.toFixed(1)),
      length: Math.round(totalDist),
      verdict,
      angleDeg: Math.round(angleDeg),
      bestFitStart: start,
      bestFitEnd: end,
    };
  }, []);

  // Redraw Canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid dots background
    ctx.fillStyle = '#1e293b';
    const gap = 24;
    for (let x = gap; x < canvas.width; x += gap) {
      for (let y = gap; y < canvas.height; y += gap) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Challenge target helpers
    if (challengeMode === 'horizontal') {
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(40, canvas.height / 2);
      ctx.lineTo(canvas.width - 40, canvas.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (challengeMode === 'vertical') {
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 40);
      ctx.lineTo(canvas.width / 2, canvas.height - 40);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (points.length === 0) return;

    // Draw Ideal Reference Laser Line (Dashed)
    if (evaluation && showGuideline) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(evaluation.bestFitStart.x, evaluation.bestFitStart.y);
      ctx.lineTo(evaluation.bestFitEnd.x, evaluation.bestFitEnd.y);
      ctx.stroke();
      ctx.restore();
    }

    // Draw User Line with Heatmap
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);

      if (evaluation && showHeatmap) {
        // Calculate point deviation from ideal line
        const ux = (evaluation.bestFitEnd.x - evaluation.bestFitStart.x) / evaluation.length;
        const uy = (evaluation.bestFitEnd.y - evaluation.bestFitStart.y) / evaluation.length;
        const px = p2.x - evaluation.bestFitStart.x;
        const py = p2.y - evaluation.bestFitStart.y;
        const dev = Math.abs(px * uy - py * ux);

        if (dev < 3) ctx.strokeStyle = '#10b981'; // Green (accurate)
        else if (dev < 8) ctx.strokeStyle = '#f59e0b'; // Amber (slight drift)
        else ctx.strokeStyle = '#ef4444'; // Red (wobble)
        ctx.lineWidth = 3.5;
      } else {
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#4f46e5';
        ctx.shadowBlur = 6;
      }
      ctx.stroke();
    }
    ctx.restore();

    // Start & End Anchor Circles
    if (points.length > 0) {
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 5, 0, Math.PI * 2);
      ctx.fill();

      if (points.length > 1) {
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(points[points.length - 1].x, points[points.length - 1].y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [points, evaluation, showGuideline, showHeatmap, challengeMode]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setEvaluation(null);
    setPoints([{ x, y, t: Date.now() }]);
    sound.playClick();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPoints(prev => [...prev, { x, y, t: Date.now() }]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (points.length > 5) {
      const result = evaluatePoints(points, challengeMode);
      if (result) {
        setEvaluation(result);
        setAttempts(a => a + 1);

        if (result.score > bestScore) {
          setBestScore(result.score);
          localStorage.setItem('gg_perfect_line_best', String(result.score));
        }

        if (result.score >= 95) {
          sound.playWin();
          try { confetti({ particleCount: 70, spread: 60 }); } catch {}
        } else {
          sound.playCorrect();
        }
      }
    }
  };

  const clearCanvas = () => {
    setPoints([]);
    setEvaluation(null);
    draw();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Title & Modes */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Draw a Perfect Line</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Precision Test
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Click and drag to draw a single continuous straight line. Analyzed via linear regression.
          </p>
        </div>

        {/* Challenge selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {(['free', 'horizontal', 'vertical'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setChallengeMode(m); clearCanvas(); }}
              className={`px-3 py-1.5 text-xs capitalize font-medium rounded transition-colors ${
                challengeMode === m ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'free' ? 'Freeform' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 p-3 mb-6 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 px-2">
          <Award className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-[11px] text-slate-400 font-medium">BEST ACCURACY</div>
            <div className="text-lg font-mono font-bold text-white tabular-nums">
              {bestScore.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-x border-slate-800">
          <Target className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-[11px] text-slate-400 font-medium">ATTEMPTS</div>
            <div className="text-lg font-mono font-bold text-white tabular-nums">
              {attempts}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="text-[11px] text-slate-400 font-medium">CHALLENGE</div>
            <div className="text-sm font-semibold text-slate-200 capitalize">
              {challengeMode}
            </div>
          </div>
        </div>
      </div>

      {/* Main Drawing Canvas Arena */}
      <div className="flex flex-col items-center">
        <div className="relative p-2 bg-slate-950 rounded-2xl border-4 border-slate-800 shadow-2xl">
          <canvas
            ref={canvasRef}
            width={600}
            height={380}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-[340px] h-[220px] sm:w-[540px] sm:h-[340px] md:w-[600px] md:h-[380px] rounded-xl block bg-slate-950 cursor-crosshair touch-none"
          />

          {/* Empty Prompt Overlay */}
          {points.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-700/50 flex items-center justify-center text-indigo-400 mb-3">
                <Compass className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="text-sm font-bold text-white">Draw a Straight Line</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Click and drag smoothly from one side to the other. Release to view your precision score.
              </p>
            </div>
          )}
        </div>

        {/* Evaluation Card Breakdown */}
        {evaluation && (
          <div className="w-full max-w-xl mt-6 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl animate-fade-in space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-mono text-slate-400">Precision Rating</span>
                <div className="text-3xl font-mono font-extrabold text-white mt-0.5 flex items-center gap-2">
                  <span className={evaluation.score >= 90 ? 'text-emerald-400' : evaluation.score >= 75 ? 'text-amber-400' : 'text-rose-400'}>
                    {evaluation.score}%
                  </span>
                  <span className="text-sm font-sans font-bold text-slate-300">
                    — {evaluation.verdict}
                  </span>
                </div>
              </div>
              <button
                onClick={clearCanvas}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Straightness</div>
                <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">{evaluation.straightness}%</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Smoothness</div>
                <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">{evaluation.smoothness}%</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Line Length</div>
                <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">{evaluation.length}px</div>
              </div>
            </div>

            {/* Overlays toggle */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGuideline}
                  onChange={e => setShowGuideline(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Show Ideal Laser Line</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={e => setShowHeatmap(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Heatmap (Green/Amber/Red)</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
