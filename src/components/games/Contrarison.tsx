import React, { useState, useEffect, useCallback } from 'react';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { Globe, MapPin, Users, Shield, Compass, Flame, RotateCcw, Award, CheckCircle2, XCircle } from 'lucide-react';

export interface CountryData {
  name: string;
  code: string;
  flag: string;
  capital: string;
  continent: string;
  landArea: number; // in sq km
  coastline: number; // in km
  population: number;
  armySize: number; // active military personnel
  funFact?: string;
}

export type CompareCategory = 'landArea' | 'coastline' | 'population' | 'armySize';

export const COUNTRIES_DB: CountryData[] = [
  {
    name: 'Russia',
    code: 'RU',
    flag: '🇷🇺',
    capital: 'Moscow',
    continent: 'Europe / Asia',
    landArea: 17098242,
    coastline: 37653,
    population: 144200000,
    armySize: 1320000,
    funFact: 'Russia spans 11 time zones and is larger than Pluto in surface area.',
  },
  {
    name: 'Canada',
    code: 'CA',
    flag: '🇨🇦',
    capital: 'Ottawa',
    continent: 'North America',
    landArea: 9984670,
    coastline: 202080,
    population: 39500000,
    armySize: 68000,
    funFact: 'Canada possesses the longest coastline in the world by a wide margin (over 202,000 km)!',
  },
  {
    name: 'United States',
    code: 'US',
    flag: '🇺🇸',
    capital: 'Washington, D.C.',
    continent: 'North America',
    landArea: 9833517,
    coastline: 19924,
    population: 335000000,
    armySize: 1390000,
    funFact: 'The US has active troops stationed in over 80 countries worldwide.',
  },
  {
    name: 'China',
    code: 'CN',
    flag: '🇨🇳',
    capital: 'Beijing',
    continent: 'Asia',
    landArea: 9596961,
    coastline: 14500,
    population: 1412000000,
    armySize: 2035000,
    funFact: 'China maintains the largest active duty standing military in the world.',
  },
  {
    name: 'India',
    code: 'IN',
    flag: '🇮🇳',
    capital: 'New Delhi',
    continent: 'Asia',
    landArea: 3287263,
    coastline: 7516,
    population: 1428000000,
    armySize: 1455000,
    funFact: 'India is the most populated country on Earth with over 1.42 billion people.',
  },
  {
    name: 'Brazil',
    code: 'BR',
    flag: '🇧🇷',
    capital: 'Brasília',
    continent: 'South America',
    landArea: 8515767,
    coastline: 7491,
    population: 215000000,
    armySize: 360000,
    funFact: 'Brazil is home to 60% of the Amazon rainforest, the world largest tropical rainforest.',
  },
  {
    name: 'Australia',
    code: 'AU',
    flag: '🇦🇺',
    capital: 'Canberra',
    continent: 'Oceania',
    landArea: 7692024,
    coastline: 25760,
    population: 26500000,
    armySize: 58000,
    funFact: 'Australia is both a country and an entire continent surrounded completely by ocean.',
  },
  {
    name: 'Indonesia',
    code: 'ID',
    flag: '🇮🇩',
    capital: 'Jakarta',
    continent: 'Asia',
    landArea: 1904569,
    coastline: 54716,
    population: 277000000,
    armySize: 400000,
    funFact: 'Indonesia consists of over 17,500 islands, creating the second longest coastline in the world!',
  },
  {
    name: 'Japan',
    code: 'JP',
    flag: '🇯🇵',
    capital: 'Tokyo',
    continent: 'Asia',
    landArea: 377975,
    coastline: 29751,
    population: 125000000,
    armySize: 247000,
    funFact: 'Despite its compact land area, Japan has a longer coastline than the United States!',
  },
  {
    name: 'United Kingdom',
    code: 'GB',
    flag: '🇬🇧',
    capital: 'London',
    continent: 'Europe',
    landArea: 242495,
    coastline: 12429,
    population: 67700000,
    armySize: 184000,
    funFact: 'Nowhere in the UK is more than 70 miles (113 km) from the sea.',
  },
  {
    name: 'Norway',
    code: 'NO',
    flag: '🇳🇴',
    capital: 'Oslo',
    continent: 'Europe',
    landArea: 385207,
    coastline: 58133,
    population: 5500000,
    armySize: 23000,
    funFact: 'Including all its deep fjords and islands, Norway has the second longest coastline in the world!',
  },
  {
    name: 'Egypt',
    code: 'EG',
    flag: '🇪🇬',
    capital: 'Cairo',
    continent: 'Africa',
    landArea: 1002450,
    coastline: 2450,
    population: 109000000,
    armySize: 440000,
    funFact: 'Egypt commands the largest active military force on the African continent.',
  },
  {
    name: 'South Korea',
    code: 'KR',
    flag: '🇰🇷',
    capital: 'Seoul',
    continent: 'Asia',
    landArea: 100210,
    coastline: 2413,
    population: 51700000,
    armySize: 555000,
    funFact: 'South Korea maintains mandatory conscription and has one of the world highest active troop densities.',
  },
  {
    name: 'North Korea',
    code: 'KP',
    flag: '🇰🇵',
    capital: 'Pyongyang',
    continent: 'Asia',
    landArea: 120538,
    coastline: 2495,
    population: 26000000,
    armySize: 1280000,
    funFact: 'Over 5% of North Korea total population serves in the active military.',
  },
  {
    name: 'Switzerland',
    code: 'CH',
    flag: '🇨🇭',
    capital: 'Bern',
    continent: 'Europe',
    landArea: 41285,
    coastline: 0,
    population: 8800000,
    armySize: 147000,
    funFact: 'Switzerland is completely landlocked (0 km coastline) surrounded by the high Alps.',
  },
  {
    name: 'Mongolia',
    code: 'MN',
    flag: '🇲🇳',
    capital: 'Ulaanbaatar',
    continent: 'Asia',
    landArea: 1564116,
    coastline: 0,
    population: 3400000,
    armySize: 10000,
    funFact: 'Mongolia is the world second largest landlocked nation and the least densely populated sovereign state.',
  },
  {
    name: 'Germany',
    code: 'DE',
    flag: '🇩🇪',
    capital: 'Berlin',
    continent: 'Europe',
    landArea: 357022,
    coastline: 2389,
    population: 84400000,
    armySize: 181000,
    funFact: 'Germany has the largest population and biggest economy in the European Union.',
  },
  {
    name: 'France',
    code: 'FR',
    flag: '🇫🇷',
    capital: 'Paris',
    continent: 'Europe',
    landArea: 643801,
    coastline: 4853,
    population: 68000000,
    armySize: 205000,
    funFact: 'France has territory across 12 different time zones, more than any other nation!',
  },
  {
    name: 'Philippines',
    code: 'PH',
    flag: '🇵🇭',
    capital: 'Manila',
    continent: 'Asia',
    landArea: 300000,
    coastline: 36289,
    population: 115000000,
    armySize: 143000,
    funFact: 'Comprising 7,641 islands, the Philippines boasts over 36,000 km of tropical coastline.',
  },
  {
    name: 'Nigeria',
    code: 'NG',
    flag: '🇳🇬',
    capital: 'Abuja',
    continent: 'Africa',
    landArea: 923768,
    coastline: 853,
    population: 224000000,
    armySize: 135000,
    funFact: 'Nigeria is the most populous nation in Africa and 6th in the world.',
  },
  {
    name: 'Mexico',
    code: 'MX',
    flag: '🇲🇽',
    capital: 'Mexico City',
    continent: 'North America',
    landArea: 1964375,
    coastline: 9330,
    population: 128500000,
    armySize: 277000,
    funFact: 'Mexico City is built on the ruins of the ancient Aztec capital Tenochtitlan.',
  },
  {
    name: 'Argentina',
    code: 'AR',
    flag: '🇦🇷',
    capital: 'Buenos Aires',
    continent: 'South America',
    landArea: 2780400,
    coastline: 4989,
    population: 46000000,
    armySize: 84000,
    funFact: 'Argentina is the 8th largest country in the world by land surface.',
  },
  {
    name: 'Turkey',
    code: 'TR',
    flag: '🇹🇷',
    capital: 'Ankara',
    continent: 'Europe / Asia',
    landArea: 783562,
    coastline: 7200,
    population: 85300000,
    armySize: 425000,
    funFact: 'Turkey has the second largest active military force in the NATO alliance.',
  },
  {
    name: 'Saudi Arabia',
    code: 'SA',
    flag: '🇸🇦',
    capital: 'Riyadh',
    continent: 'Asia',
    landArea: 2149690,
    coastline: 2640,
    population: 36400000,
    armySize: 257000,
    funFact: 'Saudi Arabia is the largest country in the world with no permanent natural rivers.',
  },
  {
    name: 'South Africa',
    code: 'ZA',
    flag: '🇿🇦',
    capital: 'Pretoria',
    continent: 'Africa',
    landArea: 1219090,
    coastline: 2798,
    population: 60000000,
    armySize: 74000,
    funFact: 'South Africa is the only nation with three official capital cities: Pretoria, Cape Town, and Bloemfontein.',
  },
  {
    name: 'Pakistan',
    code: 'PK',
    flag: '🇵🇰',
    capital: 'Islamabad',
    continent: 'Asia',
    landArea: 881913,
    coastline: 1046,
    population: 241000000,
    armySize: 654000,
    funFact: 'Pakistan operates the 6th largest military in the world and has the 5th highest population.',
  },
  {
    name: 'Greece',
    code: 'GR',
    flag: '🇬🇷',
    capital: 'Athens',
    continent: 'Europe',
    landArea: 131957,
    coastline: 13676,
    population: 10400000,
    armySize: 142000,
    funFact: 'Greece has over 2,000 islands and one of the longest coastlines in Europe relative to its size.',
  },
  {
    name: 'Chile',
    code: 'CL',
    flag: '🇨🇱',
    capital: 'Santiago',
    continent: 'South America',
    landArea: 756102,
    coastline: 6435,
    population: 19600000,
    armySize: 80000,
    funFact: 'Chile is the longest north-to-south country in the world, spanning over 4,300 km.',
  },
  {
    name: 'Bolivia',
    code: 'BO',
    flag: '🇧🇴',
    capital: 'La Paz / Sucre',
    continent: 'South America',
    landArea: 1098581,
    coastline: 0,
    population: 1220000,
    armySize: 34000,
    funFact: 'Despite having 0 km of coastline, Bolivia still maintains a dedicated naval force on Lake Titicaca!',
  },
  {
    name: 'Vietnam',
    code: 'VN',
    flag: '🇻🇳',
    capital: 'Hanoi',
    continent: 'Asia',
    landArea: 331212,
    coastline: 3444,
    population: 99000000,
    armySize: 482000,
    funFact: 'Vietnam maintains one of the largest active armies in Southeast Asia.',
  },
];

const CATEGORY_META: Record<CompareCategory, { label: string; icon: React.ReactNode; unit: string; description: string }> = {
  landArea: {
    label: 'Land Size',
    icon: <MapPin className="w-4 h-4 text-emerald-400" />,
    unit: 'km²',
    description: 'Total sovereign land area in square kilometers',
  },
  coastline: {
    label: 'Coastline',
    icon: <Compass className="w-4 h-4 text-cyan-400" />,
    unit: 'km',
    description: 'Total ocean & sea coast length (island/inlet detail included)',
  },
  population: {
    label: 'Population',
    icon: <Users className="w-4 h-4 text-amber-400" />,
    unit: 'people',
    description: 'Current total sovereign human population',
  },
  armySize: {
    label: 'Army Size',
    icon: <Shield className="w-4 h-4 text-rose-400" />,
    unit: 'active personnel',
    description: 'Active military defense service personnel',
  },
};

export const Contrarison: React.FC = () => {
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<'mixed' | CompareCategory>('mixed');
  const [currentCategory, setCurrentCategory] = useState<CompareCategory>('landArea');
  const [countryA, setCountryA] = useState<CountryData>(COUNTRIES_DB[0]);
  const [countryB, setCountryB] = useState<CountryData>(COUNTRIES_DB[1]);
  const [chosenSide, setChosenSide] = useState<'A' | 'B' | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(() => {
    return Number(localStorage.getItem('gg_contrarison_best_streak') || 0);
  });
  const [roundCount, setRoundCount] = useState<number>(1);
  const [lives, setLives] = useState<number>(3);
  const [gameOver, setGameOver] = useState<boolean>(false);

  // Pick two distinct random countries and a category
  const nextRound = useCallback(() => {
    setIsRevealed(false);
    setChosenSide(null);

    // Pick Category
    let cat: CompareCategory;
    if (selectedFilterCategory === 'mixed') {
      const allCats: CompareCategory[] = ['landArea', 'coastline', 'population', 'armySize'];
      cat = allCats[Math.floor(Math.random() * allCats.length)];
    } else {
      cat = selectedFilterCategory;
    }
    setCurrentCategory(cat);

    // Pick 2 distinct countries where values are not identical
    let c1: CountryData;
    let c2: CountryData;
    let attempts = 0;
    do {
      const idx1 = Math.floor(Math.random() * COUNTRIES_DB.length);
      let idx2 = Math.floor(Math.random() * COUNTRIES_DB.length);
      while (idx2 === idx1) {
        idx2 = Math.floor(Math.random() * COUNTRIES_DB.length);
      }
      c1 = COUNTRIES_DB[idx1];
      c2 = COUNTRIES_DB[idx2];
      attempts++;
    } while (c1[cat] === c2[cat] && attempts < 10);

    setCountryA(c1);
    setCountryB(c2);
    setRoundCount(r => r + 1);
  }, [selectedFilterCategory]);

  // Initial load
  useEffect(() => {
    nextRound();
  }, [nextRound]);

  const handleSelectCountry = (side: 'A' | 'B') => {
    if (isRevealed || gameOver) return;

    setChosenSide(side);
    setIsRevealed(true);

    const valA = countryA[currentCategory];
    const valB = countryB[currentCategory];
    const isCorrect = side === 'A' ? valA >= valB : valB >= valA;

    if (isCorrect) {
      sound.playCorrect();
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        localStorage.setItem('gg_contrarison_best_streak', String(newStreak));
      }
      if (newStreak % 5 === 0) {
        try { confetti({ particleCount: 50, spread: 50 }); } catch {}
      }
    } else {
      sound.playWrong();
      setStreak(0);
      setLives(l => {
        const remaining = l - 1;
        if (remaining <= 0) {
          setGameOver(true);
        }
        return remaining;
      });
    }
  };

  const restartGame = () => {
    setLives(3);
    setStreak(0);
    setGameOver(false);
    nextRound();
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const meta = CATEGORY_META[currentCategory];
  const valA = countryA[currentCategory];
  const valB = countryB[currentCategory];
  const higherCountry = valA > valB ? 'A' : valB > valA ? 'B' : 'EQUAL';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header & Modes */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Contrarison</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Country Stat Showdown
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pick the country with the larger stat. Test your geographic and geopolitical knowledge!
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {(['mixed', 'landArea', 'coastline', 'population', 'armySize'] as const).map(catKey => (
            <button
              key={catKey}
              onClick={() => {
                setSelectedFilterCategory(catKey);
                setTimeout(() => nextRound(), 50);
              }}
              className={`px-2.5 py-1 text-xs capitalize font-medium rounded transition-colors ${
                selectedFilterCategory === catKey
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {catKey === 'mixed'
                ? 'All Categories'
                : catKey === 'landArea'
                ? 'Land Size'
                : catKey === 'armySize'
                ? 'Army'
                : catKey}
            </button>
          ))}
        </div>
      </div>

      {/* Streak & Stats Bar */}
      <div className="grid grid-cols-3 gap-3 p-3 mb-6 bg-slate-900/80 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 px-2">
          <Flame className={`w-5 h-5 ${streak > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`} />
          <div>
            <div className="text-[11px] text-slate-400 font-medium">STREAK</div>
            <div className="text-sm font-mono font-bold text-white tabular-nums">
              {streak} {streak >= 3 && '🔥'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 border-x border-slate-800">
          <Award className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-[11px] text-slate-400 font-medium">BEST STREAK</div>
            <div className="text-sm font-mono font-bold text-white tabular-nums">
              {bestStreak}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 px-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={`text-lg transition-transform ${
                i < lives ? 'text-rose-500 scale-100' : 'text-slate-700 opacity-40 scale-90'
              }`}
            >
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="mb-6 p-6 bg-slate-900 border-2 border-rose-500/50 rounded-2xl text-center space-y-3 shadow-2xl animate-fade-in">
          <div className="text-3xl">🌍💥</div>
          <h3 className="text-lg font-bold text-white">Challenge Complete!</h3>
          <p className="text-xs text-slate-400">
            You achieved a streak of <span className="font-bold text-amber-400">{streak}</span> correct comparisons!
          </p>
          <button
            onClick={restartGame}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again (3 Lives)</span>
          </button>
        </div>
      )}

      {/* Prompt Banner */}
      {!gameOver && (
        <div className="p-4 mb-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-2xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300 mb-2">
            {meta.icon}
            <span>Category: {meta.label}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Which country has a <span className="text-amber-400 underline decoration-amber-400/40">larger {meta.label}</span>?
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {meta.description}
          </p>
        </div>
      )}

      {/* Versus Comparison Arena */}
      {!gameOver && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          {/* Country Card A */}
          <button
            onClick={() => handleSelectCountry('A')}
            disabled={isRevealed}
            className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col justify-between min-h-[260px] relative overflow-hidden group ${
              isRevealed
                ? higherCountry === 'A'
                  ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
                  : 'bg-rose-950/20 border-rose-900/40 opacity-75'
                : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 hover:border-indigo-500/60 shadow-xl cursor-pointer hover:scale-[1.01]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-5xl sm:text-6xl drop-shadow-md select-none">{countryA.flag}</span>
                <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
                  {countryA.continent}
                </span>
              </div>
              <h4 className="text-2xl font-bold text-white mt-4 group-hover:text-indigo-300 transition-colors">
                {countryA.name}
              </h4>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Capital: {countryA.capital}</span>
              </div>
            </div>

            {/* Revealed Metric */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              {isRevealed ? (
                <div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                    {meta.label}:
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-extrabold text-white mt-0.5 tabular-nums flex items-center gap-2">
                    <span>{formatNumber(valA)}</span>
                    <span className="text-xs font-normal text-slate-400">{meta.unit}</span>
                  </div>
                  {higherCountry === 'A' && (
                    <div className="mt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Larger {meta.label}!</span>
                    </div>
                  )}
                  {higherCountry === 'B' && (
                    <div className="mt-2 text-xs font-medium text-rose-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      <span>Smaller</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  Select {countryA.name} →
                </div>
              )}
            </div>
          </button>

          {/* VS Center Badge */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-slate-950 border-2 border-indigo-500 items-center justify-center font-black text-xs text-indigo-400 shadow-xl pointer-events-none">
            VS
          </div>

          {/* Country Card B */}
          <button
            onClick={() => handleSelectCountry('B')}
            disabled={isRevealed}
            className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col justify-between min-h-[260px] relative overflow-hidden group ${
              isRevealed
                ? higherCountry === 'B'
                  ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
                  : 'bg-rose-950/20 border-rose-900/40 opacity-75'
                : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 hover:border-indigo-500/60 shadow-xl cursor-pointer hover:scale-[1.01]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-5xl sm:text-6xl drop-shadow-md select-none">{countryB.flag}</span>
                <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
                  {countryB.continent}
                </span>
              </div>
              <h4 className="text-2xl font-bold text-white mt-4 group-hover:text-indigo-300 transition-colors">
                {countryB.name}
              </h4>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Capital: {countryB.capital}</span>
              </div>
            </div>

            {/* Revealed Metric */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              {isRevealed ? (
                <div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                    {meta.label}:
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-extrabold text-white mt-0.5 tabular-nums flex items-center gap-2">
                    <span>{formatNumber(valB)}</span>
                    <span className="text-xs font-normal text-slate-400">{meta.unit}</span>
                  </div>
                  {higherCountry === 'B' && (
                    <div className="mt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Larger {meta.label}!</span>
                    </div>
                  )}
                  {higherCountry === 'A' && (
                    <div className="mt-2 text-xs font-medium text-rose-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      <span>Smaller</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  Select {countryB.name} →
                </div>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Post-Reveal Bar & Fact */}
      {isRevealed && !gameOver && (
        <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              {chosenSide && (
                <span className={chosenSide === higherCountry ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {chosenSide === higherCountry ? 'Spot on! Correct answer.' : 'Not quite! Better luck on the next one.'}
                </span>
              )}
              {valA !== 0 && valB !== 0 && (
                <span className="text-slate-400 ml-2">
                  ({higherCountry === 'A' ? countryA.name : countryB.name} is {(Math.max(valA, valB) / Math.max(1, Math.min(valA, valB))).toFixed(1)}x larger)
                </span>
              )}
            </div>
            <button
              onClick={nextRound}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <span>Next Comparison</span>
              <span>→</span>
            </button>
          </div>

          {/* Interesting country fact */}
          {(countryA.funFact || countryB.funFact) && (
            <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 italic">
              💡 {countryA.funFact || countryB.funFact}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
