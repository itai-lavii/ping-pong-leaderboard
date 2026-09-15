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

export function sortByStanding(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (winPct(b) !== winPct(a)) return winPct(b) - winPct(a);
    return a.name.localeCompare(b.name);
  });
}
