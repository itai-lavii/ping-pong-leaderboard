"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { INITIAL_PLAYERS, type Match, type Player } from "@/lib/types";
import {
  avgPointDiff,
  computeEloHistory,
  computeEloRatings,
  currentStreak,
  eloFor,
  headToHead,
  sortByElo,
  winPct,
} from "@/lib/stats";
import { Card, MatchRow, StatCard, StreakBadge } from "@/components/ui";

async function parseErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : "Something went wrong. Try again.";
}

export default function Dashboard() {
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [winnerId, setWinnerId] = useState("");
  const [loserId, setLoserId] = useState("");
  const [winnerScore, setWinnerScore] = useState("");
  const [loserScore, setLoserScore] = useState("");
  const [compareAId, setCompareAId] = useState("");
  const [compareBId, setCompareBId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error(await parseErrorMessage(res));
        const data = (await res.json()) as { players: Player[]; matches: Match[] };
        if (!cancelled) {
          setPlayers(data.players);
          setMatches(data.matches);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (players.length === 0) return;
    if (!winnerId) setWinnerId(players[0].id);
    if (!loserId) setLoserId(players[1]?.id ?? players[0].id);
    if (!compareAId) setCompareAId(players[0].id);
    if (!compareBId) setCompareBId(players[1]?.id ?? players[0].id);
  }, [players, winnerId, loserId, compareAId, compareBId]);

  const eloRatings = useMemo(() => computeEloRatings(players, matches), [players, matches]);
  const eloHistory = useMemo(() => computeEloHistory(players, matches), [players, matches]);
  const sortedPlayers = useMemo(() => sortByElo(players, eloRatings), [players, eloRatings]);

  const recentMatches = useMemo(
    () => [...matches].sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
    [matches]
  );

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? "Unknown";

  const { hottest, coldest } = useMemo(() => {
    const streaks = players
      .map((p) => ({ player: p, streak: currentStreak(p.id, matches) }))
      .filter((s): s is { player: Player; streak: NonNullable<typeof s.streak> } => s.streak !== null);

    const hottest = streaks
      .filter((s) => s.streak.type === "W")
      .sort((a, b) => b.streak.count - a.streak.count)[0];
    const coldest = streaks
      .filter((s) => s.streak.type === "L")
      .sort((a, b) => b.streak.count - a.streak.count)[0];

    return { hottest, coldest };
  }, [players, matches]);

  async function handleRecordMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!winnerId || !loserId) return;
    if (winnerId === loserId) {
      setError("Winner and loser must be different players.");
      return;
    }
    const winnerScoreNum = Number(winnerScore);
    const loserScoreNum = Number(loserScore);
    if (
      winnerScore.trim() === "" ||
      loserScore.trim() === "" ||
      !Number.isInteger(winnerScoreNum) ||
      !Number.isInteger(loserScoreNum) ||
      winnerScoreNum < 0 ||
      loserScoreNum < 0 ||
      winnerScoreNum <= loserScoreNum
    ) {
      setError("Enter a valid score for both players — the winner's score must be higher.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerId,
          loserId,
          winnerScore: winnerScoreNum,
          loserScore: loserScoreNum,
        }),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const data = (await res.json()) as { players: Player[]; matches: Match[] };
      setPlayers(data.players);
      setMatches(data.matches);
      setWinnerScore("");
      setLoserScore("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record match.");
    } finally {
      setSubmitting(false);
    }
  }

  const totalMatches = matches.length;
  const topPlayer = sortedPlayers.find((p) => p.wins + p.losses > 0);

  const compareA = players.find((p) => p.id === compareAId) ?? null;
  const compareB = players.find((p) => p.id === compareBId) ?? null;
  const compareMatches = useMemo(
    () =>
      matches
        .filter(
          (m) =>
            (m.winnerId === compareAId && m.loserId === compareBId) ||
            (m.winnerId === compareBId && m.loserId === compareAId)
        )
        .sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
    [matches, compareAId, compareBId]
  );
  const compareAWins = compareMatches.filter((m) => m.winnerId === compareAId).length;
  const compareBWins = compareMatches.length - compareAWins;
  const compareScoredMatches = compareMatches.filter(
    (m) => m.winnerScore !== undefined && m.loserScore !== undefined
  );
  const compareAvgMargin =
    compareScoredMatches.length === 0
      ? null
      : compareScoredMatches.reduce((sum, m) => {
          const diff =
            m.winnerId === compareAId ? m.winnerScore! - m.loserScore! : m.loserScore! - m.winnerScore!;
          return sum + diff;
        }, 0) / compareScoredMatches.length;
  const compareStreak = currentStreak(compareAId, compareMatches);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Household League
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              🏓 Ping Pong Leaderboard
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Elo power rankings, streaks, head-to-head, and bragging rights.
            </p>
          </div>
          <div className="mt-1 flex shrink-0 gap-2">
            <Link
              href="/elo"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-700 dark:hover:text-zinc-300"
            >
              How Elo Works
            </Link>
            <Link
              href="/admin"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-700 dark:hover:text-zinc-300"
            >
              Admin
            </Link>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading leaderboard…</p>
        ) : (
          <>
            <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Matches Played" value={totalMatches} />
              <StatCard
                label="Top Player"
                value={topPlayer ? `${topPlayer.name} · ${eloFor(topPlayer.id, eloRatings)}` : "—"}
                accent="emerald"
              />
              <StatCard
                label="Hottest Streak"
                value={hottest ? `${hottest.player.name} · W${hottest.streak.count}` : "—"}
                accent="emerald"
              />
              <StatCard
                label="Coldest Streak"
                value={coldest ? `${coldest.player.name} · L${coldest.streak.count}` : "—"}
                accent="rose"
              />
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="order-1 lg:col-span-2 lg:col-start-1 lg:row-start-1">
                <Card title="Power Rankings">
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                    {sortedPlayers.map((p, i) => {
                      const isExpanded = expandedId === p.id;
                      const diff = avgPointDiff(p.id, matches);
                      const h2h = headToHead(p.id, matches);
                      return (
                        <div key={p.id}>
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : p.id)}
                            className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="w-5 shrink-0 text-zinc-500 dark:text-zinc-400">
                                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                              </span>
                              <span
                                className={
                                  "shrink-0 text-zinc-400 transition-transform dark:text-zinc-600 " +
                                  (isExpanded ? "rotate-90" : "")
                                }
                              >
                                ›
                              </span>
                              <span className="truncate font-medium">{p.name}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-3">
                              <span className="font-semibold">{eloFor(p.id, eloRatings)}</span>
                              <StreakBadge streak={currentStreak(p.id, matches)} />
                            </span>
                          </button>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 pb-3 pl-[1.75rem] text-xs text-zinc-500 dark:text-zinc-400">
                            <span>
                              <span className="text-emerald-600 dark:text-emerald-400">{p.wins}W</span>{" "}
                              <span className="text-rose-500 dark:text-rose-400">{p.losses}L</span>
                            </span>
                            <span>
                              {p.wins + p.losses === 0 ? "—" : `${winPct(p).toFixed(0)}%`} win rate
                            </span>
                            <span>
                              {diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}`} avg diff
                            </span>
                          </div>
                          {isExpanded && (
                            <div className="mb-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/30">
                              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                {p.name}&apos;s head-to-head record
                              </p>
                              {h2h.length === 0 ? (
                                <p className="text-sm text-zinc-400 dark:text-zinc-600">
                                  No matches recorded yet.
                                </p>
                              ) : (
                                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                  {h2h.map((rec) => (
                                    <li
                                      key={rec.opponentId}
                                      className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-sm dark:bg-zinc-900"
                                    >
                                      <span>vs {playerName(rec.opponentId)}</span>
                                      <span className="font-medium">
                                        <span className="text-emerald-600 dark:text-emerald-400">
                                          {rec.wins}
                                        </span>
                                        <span className="text-zinc-400 dark:text-zinc-600">-</span>
                                        <span className="text-rose-500 dark:text-rose-400">
                                          {rec.losses}
                                        </span>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              <div className="order-2 lg:col-start-3 lg:row-start-1">
                <Card title="Record a Match">
                  <form onSubmit={handleRecordMatch} className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-sm">
                      Winner
                      <select
                        value={winnerId}
                        onChange={(e) => setWinnerId(e.target.value)}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      Loser
                      <select
                        value={loserId}
                        onChange={(e) => setLoserId(e.target.value)}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex gap-3">
                      <label className="flex flex-1 flex-col gap-1 text-sm">
                        Winner Score
                        <input
                          type="number"
                          min={0}
                          required
                          value={winnerScore}
                          onChange={(e) => setWinnerScore(e.target.value)}
                          placeholder="21"
                          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                      </label>
                      <label className="flex flex-1 flex-col gap-1 text-sm">
                        Loser Score
                        <input
                          type="number"
                          min={0}
                          required
                          value={loserScore}
                          onChange={(e) => setLoserScore(e.target.value)}
                          placeholder="15"
                          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                      </label>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="mt-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Saving…" : "Record Match"}
                    </button>
                  </form>
                </Card>
              </div>

              <div className="order-3 lg:col-span-2 lg:col-start-1 lg:row-start-2">
                <Card title="Match History">
                  {recentMatches.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No matches recorded yet. Record one to get started.
                    </p>
                  ) : (
                    <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                      {recentMatches.map((m) => {
                        const eloChange = eloHistory.get(m.id);
                        const delta = eloChange
                          ? Math.round(eloChange.winnerEloAfter - eloChange.winnerEloBefore)
                          : null;
                        return (
                          <MatchRow
                            key={m.id}
                            winnerName={playerName(m.winnerId)}
                            loserName={playerName(m.loserId)}
                            winnerScore={m.winnerScore}
                            loserScore={m.loserScore}
                            playedAt={m.playedAt}
                            delta={delta}
                          />
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </div>

              <div className="order-4 lg:col-span-3 lg:col-start-1 lg:row-start-3">
                <Card title="Compare Players">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <select
                      value={compareAId}
                      onChange={(e) => setCompareAId(e.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-zinc-400 dark:text-zinc-600">vs</span>
                    <select
                      value={compareBId}
                      onChange={(e) => setCompareBId(e.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {compareAId === compareBId ? (
                    <p className="text-sm text-zinc-400 dark:text-zinc-600">
                      Pick two different players to compare.
                    </p>
                  ) : (
                    <>
                      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        <StatCard label="Head-to-Head" value={`${compareAWins}-${compareBWins}`} />
                        <StatCard
                          label={`${compareA?.name ?? ""} Elo`}
                          value={eloFor(compareAId, eloRatings)}
                          accent="emerald"
                        />
                        <StatCard
                          label={`${compareB?.name ?? ""} Elo`}
                          value={eloFor(compareBId, eloRatings)}
                          accent="rose"
                        />
                        <StatCard
                          label={`${compareA?.name ?? ""}'s Avg Margin`}
                          value={
                            compareAvgMargin === null
                              ? "—"
                              : `${compareAvgMargin > 0 ? "+" : ""}${compareAvgMargin.toFixed(1)}`
                          }
                        />
                        <StatCard
                          label="Current Form"
                          value={
                            compareStreak
                              ? `${compareA?.name ?? ""} ${compareStreak.type}${compareStreak.count}`
                              : "—"
                          }
                          accent={
                            compareStreak?.type === "W"
                              ? "emerald"
                              : compareStreak?.type === "L"
                                ? "rose"
                                : undefined
                          }
                        />
                      </div>

                      {compareMatches.length === 0 ? (
                        <p className="text-sm text-zinc-400 dark:text-zinc-600">
                          No matches recorded between {compareA?.name} and {compareB?.name} yet.
                        </p>
                      ) : (
                        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                          {compareMatches.map((m) => {
                            const eloChange = eloHistory.get(m.id);
                            const delta = eloChange
                              ? Math.round(eloChange.winnerEloAfter - eloChange.winnerEloBefore)
                              : null;
                            return (
                              <MatchRow
                                key={m.id}
                                winnerName={playerName(m.winnerId)}
                                loserName={playerName(m.loserId)}
                                winnerScore={m.winnerScore}
                                loserScore={m.loserScore}
                                playedAt={m.playedAt}
                                delta={delta}
                              />
                            );
                          })}
                        </ul>
                      )}
                    </>
                  )}
                </Card>
              </div>

              {error && (
                <div className="order-5 lg:col-start-3 lg:row-start-2">
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    {error}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
