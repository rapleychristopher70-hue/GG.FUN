export type GameId = 
  | 'lobby'
  | 'connect4'
  | 'chess'
  | 'tictactoe'
  | 'snake'
  | 'perfectline'
  | 'guesslogo'
  | 'water'
  | 'contrarison';

export interface PlayerProfile {
  name: string;
  avatar: string;
  elo: number;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  streak: number;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  elo: number;
  wins: number;
  losses: number;
  winRate: number;
  streak: number;
  tier: 'Grandmaster' | 'Diamond' | 'Gold' | 'Silver' | 'Bronze';
  isCurrentUser?: boolean;
}

export interface ActivityEvent {
  id: string;
  game: string;
  player: string;
  detail: string;
  timeAgo: string;
  type: 'win' | 'record' | 'rank';
}
