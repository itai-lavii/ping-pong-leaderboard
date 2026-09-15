import type { Match, Player } from "@/lib/types";

export function winPct(player: Player): number {
  const games = player.wins + player.losses;
  return games === 0 ? 0 : (player.wins / games) * 100;
}

export interface Streak {
  type: "W" | "L";
  count: number;
}

export function currentStreak(playerId: string, matches: Match[]): Streak | null {
  const playerMatches = matches
    .filter((m) => m.winnerId === playerId || m.loserId === playerId)
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt));

  if (playerMatches.length === 0) return null;

  const type: Streak["type"] = playerMatches[0].winnerId === playerId ? "W" : "L";
  let count = 0;
  for (const m of playerMatches) {
    const isWin = m.winnerId === playerId;
    if ((isWin && type === "W") || (!isWin && type === "L")) {
      count++;
    } else {
      break;
    }
  }
  return { type, count };
}

export interface HeadToHeadRecord {
  opponentId: string;
  wins: number;
  losses: number;
}

export function headToHead(playerId: string, matches: Match[]): HeadToHeadRecord[] {
  const records = new Map<string, HeadToHeadRecord>();

  for (const m of matches) {
    if (m.winnerId === playerId) {
      const rec = records.get(m.loserId) ?? { opponentId: m.loserId, wins: 0, losses: 0 };
      rec.wins++;
      records.set(m.loserId, rec);
    } else if (m.loserId === playerId) {
      const rec = records.get(m.winnerId) ?? { opponentId: m.winnerId, wins: 0, losses: 0 };
      rec.losses++;
      records.set(m.winnerId, rec);
    }
  }

  return [...records.values()].sort((a, b) => b.wins + b.losses - (a.wins + a.losses));
}

export const STARTING_ELO = 1500;
const ELO_K = 32;
// Margin-of-victory multiplier, per (score diff / 20) + 1, capped so a single
// blowout game can't swing a rating too far (a 21-5 game lands right at 1.8x).
const MOV_CAP = 2;

/**
 * Elo ratings are derived fresh from full match history rather than stored
 * incrementally, so editing or undoing any past match (not just the latest)
 * stays correct automatically.
 */
export function computeEloRatings(players: Player[], matches: Match[]): Map<string, number> {
  const ratings = new Map<string, number>();
  for (const p of players) ratings.set(p.id, STARTING_ELO);

  const ordered = [...matches].sort((a, b) => a.playedAt.localeCompare(b.playedAt));

  for (const m of ordered) {
    const winnerElo = ratings.get(m.winnerId) ?? STARTING_ELO;
    const loserElo = ratings.get(m.loserId) ?? STARTING_ELO;

    const expectedWinner = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
    const hasScore = m.winnerScore !== undefined && m.loserScore !== undefined;
    const pointDiff = hasScore ? Math.abs(m.winnerScore! - m.loserScore!) : 0;
    const movMultiplier = Math.min(MOV_CAP, 1 + pointDiff / 20);

    const delta = ELO_K * (1 - expectedWinner) * movMultiplier;

    ratings.set(m.winnerId, winnerElo + delta);
    ratings.set(m.loserId, loserElo - delta);
  }

  return ratings;
}

export function eloFor(playerId: string, ratings: Map<string, number>): number {
  return Math.round(ratings.get(playerId) ?? STARTING_ELO);
}

export function avgPointDiff(playerId: string, matches: Match[]): number | null {
  const scored = matches.filter(
    (m) =>
      (m.winnerId === playerId || m.loserId === playerId) &&
      m.winnerScore !== undefined &&
      m.loserScore !== undefined
  );
  if (scored.length === 0) return null;

  const total = scored.reduce((sum, m) => {
    const diff = m.winnerId === playerId ? m.winnerScore! - m.loserScore! : m.loserScore! - m.winnerScore!;
    return sum + diff;
  }, 0);

  return total / scored.length;
}

export function sortByElo(players: Player[], ratings: Map<string, number>): Player[] {
  return [...players].sort((a, b) => {
    const eloA = eloFor(a.id, ratings);
    const eloB = eloFor(b.id, ratings);
    if (eloB !== eloA) return eloB - eloA;
    return a.name.localeCompare(b.name);
  });
}
