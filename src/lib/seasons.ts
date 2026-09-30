import type { Match, Player } from "@/lib/types";
import { CLASSIC_RULES, type EloRules } from "./stats";

/**
 * A season is one calendar month, keyed "YYYY-MM" in the viewer's local time.
 * Seasons are derived purely from match dates — nothing is stored — so every
 * season's Elo restarts at the starting rating on the 1st automatically.
 */
export function seasonKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function seasonStart(key: string): Date {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function seasonEnd(key: string): Date {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month, 1);
}

export function seasonLabel(key: string): string {
  return seasonStart(key).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function seasonShortLabel(key: string): string {
  return seasonStart(key).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/** Whole days left until the next season starts, counting today. */
export function daysLeftInSeason(key: string, now: Date): number {
  return Math.ceil((seasonEnd(key).getTime() - now.getTime()) / 86_400_000);
}

/** Every season with at least one match, plus the current one, newest first. */
export function listSeasons(matches: Match[], now: Date): string[] {
  const keys = new Set(matches.map((m) => seasonKeyOf(new Date(m.playedAt))));
  keys.add(seasonKeyOf(now));
  return [...keys].sort((a, b) => b.localeCompare(a));
}

export function matchesInSeason(matches: Match[], key: string): Match[] {
  return matches.filter((m) => seasonKeyOf(new Date(m.playedAt)) === key);
}

/** Players with wins/losses recounted from the given matches only. */
export function playersWithRecords(players: Player[], matches: Match[]): Player[] {
  return players.map((p) => ({
    ...p,
    wins: matches.filter((m) => m.winnerId === p.id).length,
    losses: matches.filter((m) => m.loserId === p.id).length,
  }));
}

/**
 * Scoring rules per season. From October 2026 (season 2) on, everyone starts
 * at 1000 and winners earn 1.2x their normal gain. Earlier seasons keep the
 * classic rules they were played under. All-time always uses CLASSIC_RULES.
 */
export const SEASON_2_START = "2026-10";

export const SEASON_2_RULES: EloRules = { start: 1000, winMultiplier: 1.2 };

export function seasonRules(key: string): EloRules {
  return key >= SEASON_2_START ? SEASON_2_RULES : CLASSIC_RULES;
}
