export interface Player {
  id: string;
  name: string;
  wins: number;
  losses: number;
}

export interface Match {
  id: string;
  winnerId: string;
  loserId: string;
  playedAt: string;
}

export const INITIAL_PLAYERS: Player[] = [
  { id: "kaiden", name: "Kaiden", wins: 0, losses: 0 },
  { id: "stuart", name: "Stuart", wins: 0, losses: 0 },
  { id: "adyen", name: "Adyen", wins: 0, losses: 0 },
  { id: "scott", name: "Scott", wins: 0, losses: 0 },
  { id: "jeff", name: "Jeff", wins: 0, losses: 0 },
  { id: "itai", name: "Itai", wins: 0, losses: 0 },
];

export const PLAYERS_KEY = "ping-pong:players";
export const MATCHES_KEY = "ping-pong:matches";
