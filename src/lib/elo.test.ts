// Elo + season rules, checked against an independent reference implementation.
// Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLASSIC_RULES, computeEloHistory, computeEloRatings, eloDelta } from "./stats";
import { SEASON_2_RULES, matchesInSeason, seasonKeyOf, seasonRules } from "./seasons";
import { INITIAL_PLAYERS, type Match } from "./types";

const players = INITIAL_PLAYERS;
const ids = players.map((p) => p.id);
const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);
const total = (r: Map<string, number>) => [...r.values()].reduce((a, b) => a + b, 0);

/** Written from the spec; shares no code with stats.ts. */
function reference(matches: Match[], start: number, winMultiplier: number) {
  const r = new Map(ids.map((id) => [id, start]));
  for (const m of [...matches].sort((a, b) => a.playedAt.localeCompare(b.playedAt))) {
    const w = r.get(m.winnerId)!;
    const l = r.get(m.loserId)!;
    const expected = 1 / (1 + 10 ** ((l - w) / 400));
    const margin = Math.min(2, 1 + Math.abs((m.winnerScore ?? 0) - (m.loserScore ?? 0)) / 20);
    const change = 32 * (1 - expected) * margin;
    r.set(m.winnerId, w + change * winMultiplier);
    r.set(m.loserId, l - change);
  }
  return r;
}

/** Deterministic pseudo-random games within one month (0-based `month`). */
function games(n: number, seed: number, month: number, year = 2026): Match[] {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const pick = () => ids[Math.floor(rnd() * ids.length)];
  return Array.from({ length: n }, (_, i) => {
    const winnerId = pick();
    let loserId = pick();
    while (loserId === winnerId) loserId = pick();
    const loserScore = Math.floor(rnd() * 20);
    return {
      id: `g${seed}-${i}`,
      winnerId,
      loserId,
      winnerScore: Math.max(21, loserScore + 2),
      loserScore,
      playedAt: new Date(year, month, 1 + Math.floor(rnd() * 28), Math.floor(rnd() * 24), i % 60).toISOString(),
    };
  });
}

const SEP = 8;
const OCT = 9;

test("rules: October 2026 onward = 1000 start, 1.2x wins; September and earlier = classic", () => {
  assert.deepEqual(seasonRules("2026-10"), { start: 1000, winMultiplier: 1.2 });
  assert.equal(seasonRules("2026-11"), SEASON_2_RULES);
  assert.equal(seasonRules("2027-01"), SEASON_2_RULES);
  assert.deepEqual(seasonRules("2026-09"), { start: 1500, winMultiplier: 1 });
  assert.equal(seasonRules("2026-08"), CLASSIC_RULES);
});

test("September is untouched: season rules give exactly the classic ratings", () => {
  const sep = games(200, 42, SEP);
  const classic = computeEloRatings(players, sep);
  const season = computeEloRatings(players, sep, seasonRules("2026-09"));
  for (const id of ids) assert.equal(season.get(id), classic.get(id));
  const ref = reference(sep, 1500, 1);
  for (const id of ids) close(season.get(id)!, ref.get(id)!, 1e-6);
});

test("classic Elo is zero-sum", () => {
  close(total(computeEloRatings(players, games(200, 5, SEP))), 1500 * ids.length, 1e-6);
});

test("October: in every game the winner gains exactly 1.2x what the loser loses", () => {
  const history = computeEloHistory(players, games(300, 7, OCT), seasonRules("2026-10"));
  for (const h of history.values()) {
    const gain = h.winnerEloAfter - h.winnerEloBefore;
    const loss = h.loserEloBefore - h.loserEloAfter;
    assert.ok(gain > 0 && loss > 0);
    close(gain, loss * 1.2);
  }
});

test("October: the loser loses exactly the normal amount for the same pre-game ratings", () => {
  const oct = games(300, 11, OCT);
  const history = computeEloHistory(players, oct, seasonRules("2026-10"));
  for (const m of oct) {
    const h = history.get(m.id)!;
    close(h.loserEloBefore - h.loserEloAfter, eloDelta(h.winnerEloBefore, h.loserEloBefore, m.winnerScore, m.loserScore));
  }
});

test("October: final ratings match the reference across 5 random seasons", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const oct = games(250, seed, OCT);
    const app = computeEloRatings(players, oct, seasonRules("2026-10"));
    const ref = reference(oct, 1000, 1.2);
    for (const id of ids) close(app.get(id)!, ref.get(id)!, 1e-6);
  }
});

test("October: everyone starts at 1000; someone who hasn't played stays there", () => {
  for (const r of computeEloRatings(players, [], seasonRules("2026-10")).values()) assert.equal(r, 1000);
  const withoutScott = games(40, 3, OCT).filter((m) => m.winnerId !== "scott" && m.loserId !== "scott");
  assert.equal(computeEloRatings(players, withoutScott, seasonRules("2026-10")).get("scott"), 1000);
});

test("worked example: two 1000 players, 21–15 → +25 / −21", () => {
  const m: Match = {
    id: "x",
    winnerId: ids[0],
    loserId: ids[1],
    winnerScore: 21,
    loserScore: 15,
    playedAt: new Date(2026, OCT, 1, 20).toISOString(),
  };
  const h = computeEloHistory(players, [m], seasonRules("2026-10")).get("x")!;
  assert.equal(Math.round(h.winnerEloAfter), 1025);
  assert.equal(Math.round(h.loserEloAfter), 979);
});

test("all-time never gets the bonus: classic from 1500 with October games included", () => {
  const all = [...games(200, 8, SEP), ...games(200, 9, OCT)];
  const app = computeEloRatings(players, all, CLASSIC_RULES);
  const ref = reference(all, 1500, 1);
  for (const id of ids) close(app.get(id)!, ref.get(id)!, 1e-6);
  close(total(app), 1500 * ids.length, 1e-6);
});

test("a season only counts its own month", () => {
  const sep = games(80, 20, SEP);
  const oct = games(50, 21, OCT);
  const mixed = [...sep, ...oct];
  assert.deepEqual(new Set(matchesInSeason(mixed, "2026-10").map((m) => m.id)), new Set(oct.map((m) => m.id)));
  assert.equal(matchesInSeason(mixed, "2026-09").length, sep.length);
});

test("month boundary: 11:59:59 PM Sep 30 is September; 12:00:00 AM Oct 1 is October", () => {
  assert.equal(seasonKeyOf(new Date(2026, 8, 30, 23, 59, 59, 999)), "2026-09");
  assert.equal(seasonKeyOf(new Date(2026, 9, 1, 0, 0, 0, 0)), "2026-10");
  assert.equal(seasonKeyOf(new Date(2026, 11, 31, 23, 59)), "2026-12");
  assert.equal(seasonKeyOf(new Date(2027, 0, 1, 0, 0)), "2027-01");
});

test("match order in the input doesn't matter", () => {
  const oct = games(200, 13, OCT);
  const a = computeEloRatings(players, oct, seasonRules("2026-10"));
  const b = computeEloRatings(players, [...oct].reverse(), seasonRules("2026-10"));
  for (const id of ids) assert.equal(a.get(id), b.get(id));
});

test("undoing a past October game re-flows every later rating", () => {
  const withoutOne = games(100, 17, OCT).filter((_, i) => i !== 30);
  const app = computeEloRatings(players, withoutOne, seasonRules("2026-10"));
  const ref = reference(withoutOne, 1000, 1.2);
  for (const id of ids) close(app.get(id)!, ref.get(id)!, 1e-6);
});
