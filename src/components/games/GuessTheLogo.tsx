import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { Award, Flame, HelpCircle, RotateCcw, Sparkles, CheckCircle2, XCircle, Eye, Lightbulb } from 'lucide-react';

interface LogoQuestion {
  id: string;
  name: string;
  category: string;
  hints: string[];
  options: string[];
  svgContent: React.ReactNode;
}

export const LOGO_DATABASE: LogoQuestion[] = [
  {
    id: 'apple',
    name: 'Apple',
    category: 'Technology & Hardware',
    hints: ['Founded by Steve Jobs & Steve Wozniak in 1976', 'Famous for iPhone, Mac, and iPad', 'A bitten piece of fruit'],
    options: ['Apple', 'Microsoft', 'Oracle', 'Intel'],
    svgContent: (
      <svg viewBox="0 0 170 170" className="w-24 h-24 sm:w-28 sm:h-28 fill-current">
        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12-14.44-6.31-9.7-11.02-20.2-14.13-31.52-3.11-11.31-4.67-22.12-4.67-32.41 0-14.4 3.73-26.47 11.2-36.21 7.46-9.74 16.92-14.71 28.37-14.93 4.8 0 10.28 1.25 16.44 3.76 6.16 2.51 10.02 3.82 11.58 3.93 1.8.11 6.1-1.31 12.89-4.26 6.79-2.95 12.63-4.31 17.52-4.08 13.06.66 23.47 5.75 31.25 15.28-11.53 6.97-17.18 16.64-16.97 29.02.21 9.8 4.09 17.94 11.63 24.42 7.54 6.48 16.45 10.3 26.73 11.45-2.07 6.1-4.47 12.28-7.21 18.54zM119.22 33.64c0-7.2 2.66-14.07 7.97-20.61 5.31-6.54 11.77-10.74 19.38-12.61.65 1.52.98 3.16.98 4.91 0 7.31-2.78 14.39-8.35 21.24-5.56 6.85-12.18 10.87-19.86 12.06-.08-1.63-.12-3.29-.12-4.99z" />
      </svg>
    ),
  },
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'Audio & Music Streaming',
    hints: ['Swedish audio streaming company founded in 2006', 'Known for green circle and sound waves', 'Over 600 million monthly listeners'],
    options: ['Spotify', 'SoundCloud', 'Deezer', 'Tidal'],
    svgContent: (
      <svg viewBox="0 0 168 168" className="w-24 h-24 sm:w-28 sm:h-28 fill-[#1DB954]">
        <path d="M83.996.002C37.608.002 0 37.61 0 83.998c0 46.39 37.608 83.998 83.996 83.998 46.39 0 83.998-37.608 83.998-83.998C167.994 37.61 130.386.002 83.996.002zm38.544 121.168c-1.526 2.498-4.78 3.284-7.28 1.758-19.98-12.204-45.132-14.97-74.746-8.196-2.846.65-5.698-1.12-6.348-3.966-.65-2.844 1.12-5.698 3.966-6.348 32.42-7.41 60.18-4.238 82.65 9.472 2.5 1.526 3.284 4.78 1.758 7.28zm10.28-22.85c-1.92 3.12-6.02 4.1-9.14 2.18-22.868-14.058-57.734-18.136-84.786-9.924-3.5 1.062-7.22-.94-8.28-4.44-1.06-3.5.94-7.22 4.44-8.28 30.93-9.388 69.346-4.844 95.586 11.324 3.12 1.92 4.1 6.02 2.18 9.14zm.882-23.784C106.294 60.916 61.16 59.43 35.044 67.36c-4.2 1.274-8.634-1.1-9.908-5.3-1.274-4.2 1.1-8.634 5.3-9.908 30.016-9.112 79.948-7.446 111.75 11.432 3.774 2.24 5.016 7.126 2.776 10.9-2.24 3.774-7.126 5.016-10.9 2.776l-.56-.724z" />
      </svg>
    ),
  },
  {
    id: 'nike',
    name: 'Nike',
    category: 'Footwear & Athletic Apparel',
    hints: ['Famous "Just Do It" slogan', 'Named after the Greek goddess of victory', 'The iconic Swoosh was created for $35'],
    options: ['Nike', 'Adidas', 'Puma', 'Reebok'],
    svgContent: (
      <svg viewBox="0 0 24 24" className="w-24 h-24 sm:w-28 sm:h-28 fill-white">
        <path d="M21.707 5.293c-2.454.498-8.81 2.37-12.778 5.768-3.084 2.64-5.328 6.04-6.684 9.13-.538 1.226-.81 2.32-.907 3.238-.052.493-.05.908.01 1.226.06.326.192.56.388.694.39.266.97.224 1.636-.088 1.077-.506 2.45-1.554 4.076-3.09 3.52-3.323 8.35-9.362 14.26-16.878z" />
      </svg>
    ),
  },
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'Video Streaming & Social Media',
    hints: ['Acquired by Google in 2006 for $1.65 billion', 'Red rounded rectangle with white play triangle', 'First video was "Me at the zoo"'],
    options: ['YouTube', 'Netflix', 'Vimeo', 'Twitch'],
    svgContent: (
      <svg viewBox="0 0 24 24" className="w-24 h-24 sm:w-28 sm:h-28">
        <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
        <polygon fill="#FFFFFF" points="9.545,15.568 15.818,12 9.545,8.432" />
      </svg>
    ),
  },
  {
    id: 'discord',
    name: 'Discord',
    category: 'Gaming & Community Chat',
    hints: ['Mascot name is Clyde', 'VoIP & instant messaging platform designed for gamers', 'Has servers, channels, and Nitro perks'],
    options: ['Discord', 'Slack', 'Teams', 'Telegram'],
    svgContent: (
      <svg viewBox="0 0 127.14 96.36" className="w-24 h-24 sm:w-28 sm:h-28 fill-[#5865F2]">
        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,45.91,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,45.91,96.12,53,91.08,65.69,84.69,65.69Z" />
      </svg>
    ),
  },
  {
    id: 'tesla',
    name: 'Tesla',
    category: 'Electric Vehicles & Clean Energy',
    hints: ['Led by Elon Musk', 'Named after inventor Nikola Tesla', 'Stylized "T" represents a cross-section of an electric motor rotor'],
    options: ['Tesla', 'Rivian', 'Lucid', 'Polestar'],
    svgContent: (
      <svg viewBox="0 0 340 340" className="w-24 h-24 sm:w-28 sm:h-28 fill-[#E82127]">
        <path d="M170 55.4c35.6 0 68.6 10.4 96.6 28.3l17.7-27.4C251.8 34.6 212.7 22.8 170 22.8S88.2 34.6 55.7 56.3l17.7 27.4C101.4 65.8 134.4 55.4 170 55.4zm164.7 39.5c-4.4-1.6-9.1-.5-12.3 2.7l-49.8 49.8c-1.8 1.8-2.6 4.3-2.3 6.8 5.7 38.6-8.9 77.2-39.7 104.9l21.2 28.8c42.8-38.3 62.4-91.8 54.4-145.4-.5-3.3 1.1-6.5 4.1-7.8l27.8-11.8c2.8-1.2 4.4-4 3.9-7-.5-3.1-2.9-5.4-6-5.8l-1.3-.2zm-329.4 0c-3.1.4-5.5 2.7-6 5.8-.5 3 1.1 5.8 3.9 7l27.8 11.8c3 1.3 4.6 4.5 4.1 7.8-8 53.6 11.6 107.1 54.4 145.4l21.2-28.8c-30.8-27.7-45.4-66.3-39.7-104.9.3-2.5-.5-5-2.3-6.8L44.9 97.6c-3.2-3.2-7.9-4.3-12.3-2.7l-7.3 2.2v-.2zM170 82.2c-29.4 0-54.8 16.7-67.6 41.2 6.6 3.1 14.1 4.9 22 4.9 14.6 0 27.4-6.3 36.3-16.3h18.6c8.9 10 21.7 16.3 36.3 16.3 7.9 0 15.4-1.8 22-4.9-12.8-24.5-38.2-41.2-67.6-41.2zM170 148c-7.9 0-14.3 6.4-14.3 14.3v138.8c0 7.9 6.4 14.3 14.3 14.3s14.3-6.4 14.3-14.3V162.3c0-7.9-6.4-14.3-14.3-14.3z" />
      </svg>
    ),
  },
  {
    id: 'steam',
    name: 'Steam',
    category: 'PC Gaming Distribution',
    hints: ['Created by Valve Corporation', 'Mechanical locomotive piston / crank logo', 'Largest digital PC video game store'],
    options: ['Steam', 'Epic Games', 'GOG', 'Origin'],
    svgContent: (
      <svg viewBox="0 0 24 24" className="w-24 h-24 sm:w-28 sm:h-28 fill-white">
        <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.704L.438 15.14C1.987 20.25 6.709 24 12.302 24 18.763 24 24 18.763 24 12.302S18.763 0 11.979 0zM7.544 18.216l-1.467-.606c.264.445.67.796 1.163.987.971.381 2.072-.1 2.453-1.072.19-.485.174-1.011-.044-1.478-.218-.466-.607-.811-1.092-.998l1.503.621c.642.266.953 1.002.688 1.644-.266.643-1.002.955-1.644.69l-.56-.232z" />
      </svg>
    ),
  },
  {
    id: 'mcdonalds',
    name: "McDonald's",
    category: 'Fast Food & Restaurants',
    hints: ['Famous Golden Arches', 'Home of the Big Mac and Happy Meal', 'Over 40,000 locations worldwide'],
    options: ["McDonald's", 'Burger King', "Wendy's", 'Subway'],
    svgContent: (
      <svg viewBox="0 0 100 100" className="w-24 h-24 sm:w-28 sm:h-28 fill-[#FFC72C]">
        <path d="M50 18.5c-9.7 0-18.1 11.8-22.3 29.5-3.8-17.7-12.2-29.5-21.9-29.5-3.3 0-5.8 1.4-5.8 4.7v58.3h10.9V47.9c1.9-10.4 6.7-18.5 12.4-18.5 6.5 0 11.2 10.9 11.2 25.7v26.4H55V47.9c1.9-10.4 6.7-18.5 12.4-18.5 6.5 0 11.2 10.9 11.2 25.7v26.4h10.9V23.2c0-3.3-2.5-4.7-5.8-4.7-9.7 0-18.1 11.8-22.3 29.5C68.1 30.3 59.7 18.5 50 18.5z" />
      </svg>
    ),
  },
  {
    id: 'twitch',
    name: 'Twitch',
    category: 'Live Video & Creator Streaming',
    hints: ['Purple speech bubble with chat box eyes', 'Acquired by Amazon in 2014', 'Prime destination for live gaming broadcasts'],
    options: ['Twitch', 'Discord', 'Mixer', 'Kick'],
    svgContent: (
      <svg viewBox="0 0 24 24" className="w-24 h-24 sm:w-28 sm:h-28 fill-[#9146FF]">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
      </svg>
    ),
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'Software Development & Git',
    hints: ['The Octocat mascot', 'Acquired by Microsoft in 2018', 'Largest host of source code in the world'],
    options: ['GitHub', 'GitLab', 'Bitbucket', 'StackOverflow'],
    svgContent: (
      <svg viewBox="0 0 24 24" className="w-24 h-24 sm:w-28 sm:h-28 fill-white">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
];

export const GuessTheLogo: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(() => {
    return Number(localStorage.getItem('gg_logo_best_streak') || 0);
  });
  const [revealedHints, setRevealedHints] = useState<number>(0);
  const [isSilhouette, setIsSilhouette] = useState<boolean>(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);

  const currentQuestion = LOGO_DATABASE[currentIdx];

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;

    setSelectedAnswer(option);
    setIsAnswered(true);

    const isCorrect = option === currentQuestion.name;
    if (isCorrect) {
      sound.playCorrect();
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        localStorage.setItem('gg_logo_best_streak', String(newStreak));
      }
      const pointsEarned = Math.max(10, 30 - revealedHints * 5 + streak * 3);
      setScore(s => s + pointsEarned);

      if (newStreak % 4 === 0) {
        try { confetti({ particleCount: 50, spread: 60 }); } catch {}
      }
    } else {
      sound.playWrong();
      setStreak(0);
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setRevealedHints(0);
    setEliminatedOptions([]);
    setCurrentIdx(i => (i + 1) % LOGO_DATABASE.length);
  };

  const handle5050 = () => {
    if (eliminatedOptions.length > 0 || isAnswered) return;
    const wrong = currentQuestion.options.filter(o => o !== currentQuestion.name);
    // Eliminate 2 wrong answers
    const shuffledWrong = [...wrong].sort(() => Math.random() - 0.5);
    setEliminatedOptions(shuffledWrong.slice(0, 2));
    sound.playClick();
  };

  const handleRevealHint = () => {
    if (revealedHints >= currentQuestion.hints.length || isAnswered) return;
    setRevealedHints(h => h + 1);
    sound.playClick();
  };

  const resetTrivia = () => {
    setCurrentIdx(0);
    setScore(0);
    setStreak(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setRevealedHints(0);
    setEliminatedOptions([]);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Guess the Logo</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Brand Trivia
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Identify the world most iconic global brands, logos, and digital platforms.
          </p>
        </div>

        {/* Silhouette Mode Toggle */}
        <button
          onClick={() => setIsSilhouette(!isSilhouette)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
            isSilhouette
              ? 'bg-purple-600/20 border-purple-500 text-purple-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Silhouette Mode: {isSilhouette ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 p-3 mb-6 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 px-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-[11px] text-slate-400 font-medium">TOTAL SCORE</div>
            <div className="text-lg font-mono font-bold text-white tabular-nums">{score}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-x border-slate-800">
          <Flame className={`w-5 h-5 ${streak > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`} />
          <div>
            <div className="text-[11px] text-slate-400 font-medium">STREAK</div>
            <div className="text-lg font-mono font-bold text-white tabular-nums">
              {streak} {streak >= 3 && '🔥'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2">
          <Award className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-[11px] text-slate-400 font-medium">BEST STREAK</div>
            <div className="text-lg font-mono font-bold text-white tabular-nums">{bestStreak}</div>
          </div>
        </div>
      </div>

      {/* Main Logo Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col items-center">
        {/* Progress & Category */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-6 font-mono">
          <span>Question {currentIdx + 1} of {LOGO_DATABASE.length}</span>
          <span className="text-indigo-400 font-sans">{currentQuestion.category}</span>
        </div>

        {/* Logo Display Box */}
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-slate-950 border-2 border-slate-800 flex items-center justify-center p-6 shadow-inner relative overflow-hidden group">
          <div
            className={`transition-all duration-300 ${
              isSilhouette && !isAnswered ? 'filter brightness-0 invert contrast-200 opacity-80' : ''
            }`}
          >
            {currentQuestion.svgContent}
          </div>
        </div>

        {/* Hints & Power-ups */}
        <div className="flex items-center gap-2 my-5">
          <button
            onClick={handleRevealHint}
            disabled={revealedHints >= currentQuestion.hints.length || isAnswered}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium rounded-lg transition-colors border border-slate-700/60"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Hint ({revealedHints}/{currentQuestion.hints.length})</span>
          </button>
          <button
            onClick={handle5050}
            disabled={eliminatedOptions.length > 0 || isAnswered}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium rounded-lg transition-colors border border-slate-700/60"
          >
            <span>50/50</span>
          </button>
        </div>

        {/* Active Hints List */}
        {revealedHints > 0 && (
          <div className="w-full max-w-md p-3 mb-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 text-xs text-amber-300/90 font-mono">
            {currentQuestion.hints.slice(0, revealedHints).map((h, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span>💡</span>
                <span>{h}</span>
              </div>
            ))}
          </div>
        )}

        {/* Multiple Choice Grid */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {currentQuestion.options.map(opt => {
            const isEliminated = eliminatedOptions.includes(opt);
            const isChosen = selectedAnswer === opt;
            const isCorrect = opt === currentQuestion.name;

            return (
              <button
                key={opt}
                onClick={() => handleSelectOption(opt)}
                disabled={isAnswered || isEliminated}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border text-center ${
                  isEliminated
                    ? 'opacity-20 line-through bg-slate-950 border-slate-900 cursor-not-allowed text-slate-600'
                    : isAnswered
                    ? isCorrect
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
                      : isChosen
                      ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                    : 'bg-slate-950 hover:bg-indigo-950/60 hover:border-indigo-500 border-slate-800 text-slate-200'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Post-Answer Result & Next Button */}
        {isAnswered && (
          <div className="mt-6 flex flex-col items-center gap-3 animate-fade-in">
            <div className="text-xs font-semibold flex items-center gap-1.5">
              {selectedAnswer === currentQuestion.name ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Correct! It is {currentQuestion.name}.</span>
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  <span>Oops! It was {currentQuestion.name}.</span>
                </span>
              )}
            </div>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
            >
              Next Logo →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
