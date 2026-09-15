"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { INITIAL_PLAYERS, type Match, type Player } from "@/lib/types";
import { currentStreak, headToHead, sortByStanding, winPct } from "@/lib/stats";
import { Card, StatCard, StreakBadge } from "@/components/ui";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

  const [newPlayerName, setNewPlayerName] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [loserId, setLoserId] = useState("");
  const [winnerScore, setWinnerScore] = useState("");
  const [loserScore, setLoserScore] = useState("");
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
  }, [players, winnerId, loserId]);

  const sortedPlayers = useMemo(() => sortByStanding(players), [players]);

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

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newPlayerName.trim();
    if (!trimmed) {
      setError("Enter a name before adding a player.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const data = (await res.json()) as { players: Player[] };
      setPlayers(data.players);
      setNewPlayerName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add player.");
    } finally {
      setSubmitting(false);
    }
  }

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
              Track wins, losses, streaks, and bragging rights.
            </p>
          </div>
          <Link
            href="/admin"
            className="mt-1 shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-700 dark:hover:text-zinc-300"
          >
            Admin
          </Link>
        </header>

        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading leaderboard…</p>
        ) : (
          <>
            <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Players" value={players.length} />
              <StatCard label="Matches Played" value={totalMatches} />
              <StatCard label="Top Player" value={topPlayer ? topPlayer.name : "—"} accent="emerald" />
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
              <div className="lg:col-span-2">
                <Card title="Standings">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                          <th className="py-2 pr-2 font-medium">#</th>
                          <th className="py-2 pr-2 font-medium">Player</th>
                          <th className="py-2 pr-2 text-right font-medium">Wins</th>
                          <th className="py-2 pr-2 text-right font-medium">Losses</th>
                          <th className="py-2 pr-2 text-right font-medium">Win %</th>
                          <th className="py-2 pr-2 text-right font-medium">Streak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPlayers.map((p, i) => {
                          const isExpanded = expandedId === p.id;
                          const h2h = headToHead(p.id, matches);
                          return (
                            <Fragment key={p.id}>
                              <tr
                                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                                className="cursor-pointer border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-800/50"
                              >
                                <td className="py-3 pr-2 text-zinc-500 dark:text-zinc-400">
                                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                                </td>
                                <td className="py-3 pr-2 font-medium">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span
                                      className={
                                        "inline-block text-zinc-400 transition-transform dark:text-zinc-600 " +
                                        (isExpanded ? "rotate-90" : "")
                                      }
                                    >
                                      ›
                                    </span>
                                    {p.name}
                                  </span>
                                </td>
                                <td className="py-3 pr-2 text-right text-emerald-600 dark:text-emerald-400">
                                  {p.wins}
                                </td>
                                <td className="py-3 pr-2 text-right text-rose-500 dark:text-rose-400">
                                  {p.losses}
                                </td>
                                <td className="py-3 pr-2 text-right text-zinc-500 dark:text-zinc-400">
                                  {p.wins + p.losses === 0 ? "—" : `${winPct(p).toFixed(0)}%`}
                                </td>
                                <td className="py-3 pr-2 text-right">
                                  <StreakBadge streak={currentStreak(p.id, matches)} />
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-900 dark:bg-zinc-800/30">
                                  <td colSpan={6} className="px-3 py-3">
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
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <div className="mt-6">
                  <Card title="Match History">
                    {recentMatches.length === 0 ? (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No matches recorded yet. Record one to get started.
                      </p>
                    ) : (
                      <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {recentMatches.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900"
                          >
                            <span>
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {playerName(m.winnerId)}
                              </span>{" "}
                              beat{" "}
                              <span className="font-medium text-rose-500 dark:text-rose-400">
                                {playerName(m.loserId)}
                              </span>
                              {m.winnerScore !== undefined && m.loserScore !== undefined && (
                                <span className="ml-1.5 text-zinc-400 dark:text-zinc-600">
                                  {m.winnerScore}-{m.loserScore}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {formatDate(m.playedAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </div>
              </div>

              <div className="flex flex-col gap-6">
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

                <Card title="Add Player">
                  <form onSubmit={handleAddPlayer} className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="Player name"
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
                    >
                      {submitting ? "Saving…" : "Add Player"}
                    </button>
                  </form>
                </Card>

                {error && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
