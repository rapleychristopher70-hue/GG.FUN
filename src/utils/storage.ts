import { PlayerProfile, LeaderboardEntry } from '../types';

const PROFILE_KEY = 'gg_fun_player_profile';
const TTT_LEADERBOARD_KEY = 'gg_fun_ttt_leaderboard';

export const DEFAULT_PROFILE: PlayerProfile = {
  name: 'PixelRacer',
  avatar: '🎮',
  elo: 1250,
  level: 4,
  xp: 380,
  wins: 14,
  losses: 6,
  streak: 3,
};

const INITIAL_BOT_LEADERBOARD: Omit<LeaderboardEntry, 'rank' | 'winRate'>[] = [
  { id: 'lb-1', name: 'Vortex_X', avatar: '⚡', elo: 1845, wins: 142, losses: 18, streak: 12, tier: 'Grandmaster' },
  { id: 'lb-2', name: 'CyberQueen', avatar: '👑', elo: 1720, wins: 118, losses: 26, streak: 7, tier: 'Grandmaster' },
  { id: 'lb-3', name: 'NeonSamurai', avatar: '🗡️', elo: 1640, wins: 95, losses: 31, streak: 5, tier: 'Diamond' },
  { id: 'lb-4', name: 'NullPointer', avatar: '👾', elo: 1530, wins: 88, losses: 42, streak: 4, tier: 'Diamond' },
  { id: 'lb-5', name: 'AstroChallenger', avatar: '🚀', elo: 1410, wins: 64, losses: 35, streak: 2, tier: 'Gold' },
  { id: 'lb-6', name: 'ShadowMove', avatar: '🥷', elo: 1350, wins: 52, losses: 38, streak: 0, tier: 'Gold' },
  { id: 'lb-7', name: 'BlazeByte', avatar: '🔥', elo: 1290, wins: 41, losses: 33, streak: 1, tier: 'Silver' },
  { id: 'lb-8', name: 'EchoStrike', avatar: '🎯', elo: 1180, wins: 33, losses: 29, streak: 0, tier: 'Silver' },
  { id: 'lb-9', name: 'QuantumRook', avatar: '♟️', elo: 1050, wins: 22, losses: 30, streak: 0, tier: 'Bronze' },
  { id: 'lb-10', name: 'CasualGamer99', avatar: '🕹️', elo: 980, wins: 15, losses: 28, streak: 0, tier: 'Bronze' },
];

export function loadPlayerProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_PROFILE;
}

export function savePlayerProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function calculateTier(elo: number): 'Grandmaster' | 'Diamond' | 'Gold' | 'Silver' | 'Bronze' {
  if (elo >= 1700) return 'Grandmaster';
  if (elo >= 1500) return 'Diamond';
  if (elo >= 1300) return 'Gold';
  if (elo >= 1100) return 'Silver';
  return 'Bronze';
}

export function loadLeaderboard(currentUserProfile?: PlayerProfile): LeaderboardEntry[] {
  let list: Array<Omit<LeaderboardEntry, 'rank' | 'winRate'> & { isCurrentUser?: boolean }> = [];
  try {
    const raw = localStorage.getItem(TTT_LEADERBOARD_KEY);
    if (raw) {
      list = JSON.parse(raw);
    } else {
      list = [...INITIAL_BOT_LEADERBOARD];
    }
  } catch {
    list = [...INITIAL_BOT_LEADERBOARD];
  }

  const profile = currentUserProfile || loadPlayerProfile();

  // Remove existing user entry if present to update with fresh values
  list = list.filter(item => !item.isCurrentUser && item.id !== 'current-user');

  // Insert current user
  list.push({
    id: 'current-user',
    name: profile.name,
    avatar: profile.avatar,
    elo: profile.elo,
    wins: profile.wins,
    losses: profile.losses,
    streak: profile.streak,
    tier: calculateTier(profile.elo),
    isCurrentUser: true,
  });

  // Sort by ELO descending
  list.sort((a, b) => b.elo - a.elo);

  // Map ranks and win rates
  return list.map((item, idx) => {
    const total = item.wins + item.losses;
    const winRate = total > 0 ? Math.round((item.wins / total) * 100) : 0;
    return {
      ...item,
      rank: idx + 1,
      winRate,
    };
  });
}

export function recordMatchResult(didWin: boolean, isDraw: boolean = false): { eloDiff: number; newProfile: PlayerProfile } {
  const current = loadPlayerProfile();
  let eloDiff = 0;

  if (isDraw) {
    eloDiff = 2;
  } else if (didWin) {
    const streakBonus = Math.min(15, current.streak * 3);
    eloDiff = 24 + streakBonus;
  } else {
    eloDiff = -16;
  }

  const newElo = Math.max(600, current.elo + eloDiff);
  const newWins = didWin ? current.wins + 1 : current.wins;
  const newLosses = (!didWin && !isDraw) ? current.losses + 1 : current.losses;
  const newStreak = didWin ? current.streak + 1 : 0;
  const xpGain = didWin ? 60 : (isDraw ? 25 : 15);
  const newXp = current.xp + xpGain;
  const newLevel = Math.floor(newXp / 150) + 1;

  const newProfile: PlayerProfile = {
    ...current,
    elo: newElo,
    wins: newWins,
    losses: newLosses,
    streak: newStreak,
    xp: newXp,
    level: newLevel,
  };

  savePlayerProfile(newProfile);
  return { eloDiff, newProfile };
}
