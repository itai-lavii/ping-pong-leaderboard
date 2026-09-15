"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Match, Player } from "@/lib/types";
import { computeEloRatings, eloFor, sortByElo } from "@/lib/stats";
import { Card } from "@/components/ui";

type AuthStatus = "checking" | "unauthenticated" | "authenticated";

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

export default function AdminDashboard() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [editValues, setEditValues] = useState<Record<string, { wins: string; losses: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [matchEdit, setMatchEdit] = useState({
    winnerId: "",
    loserId: "",
    winnerScore: "",
    loserScore: "",
  });
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/session");
        const data = (await res.json()) as { authenticated: boolean };
        setAuthStatus(data.authenticated ? "authenticated" : "unauthenticated");
      } catch {
        setAuthStatus("unauthenticated");
      }
    })();
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    let cancelled = false;
    (async () => {
      setLoading(true);
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
  }, [authStatus]);

  useEffect(() => {
    setEditValues(
      Object.fromEntries(players.map((p) => [p.id, { wins: String(p.wins), losses: String(p.losses) }]))
    );
  }, [players]);

  const eloRatings = useMemo(() => computeEloRatings(players, matches), [players, matches]);
  const sortedPlayers = useMemo(() => sortByElo(players, eloRatings), [players, eloRatings]);
  const recentMatches = useMemo(
    () => [...matches].sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
    [matches]
  );
  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? "Unknown";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      setPasscode("");
      setAuthStatus("authenticated");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Failed to log in.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    setAuthStatus("unauthenticated");
    setPlayers([]);
    setMatches([]);
  }

  async function handleSaveRecord(id: string) {
    const values = editValues[id];
    const wins = Number(values?.wins);
    const losses = Number(values?.losses);
    if (!Number.isInteger(wins) || wins < 0 || !Number.isInteger(losses) || losses < 0) {
      setError("Wins and losses must be non-negative whole numbers.");
      return;
    }
    setSavingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/players/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wins, losses }),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const data = (await res.json()) as { players: Player[] };
      setPlayers(data.players);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save record.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleUndo(id: string) {
    setUndoingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/matches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const data = (await res.json()) as { players: Player[]; matches: Match[] };
      setPlayers(data.players);
      setMatches(data.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to undo match.");
    } finally {
      setUndoingId(null);
    }
  }

  function handleStartEditMatch(m: Match) {
    setEditingMatchId(m.id);
    setMatchEdit({
      winnerId: m.winnerId,
      loserId: m.loserId,
      winnerScore: m.winnerScore !== undefined ? String(m.winnerScore) : "",
      loserScore: m.loserScore !== undefined ? String(m.loserScore) : "",
    });
  }

  function handleCancelEditMatch() {
    setEditingMatchId(null);
  }

  async function handleSaveMatch(id: string) {
    const winnerScoreNum = Number(matchEdit.winnerScore);
    const loserScoreNum = Number(matchEdit.loserScore);
    if (
      !matchEdit.winnerId ||
      !matchEdit.loserId ||
      matchEdit.winnerId === matchEdit.loserId ||
      !Number.isInteger(winnerScoreNum) ||
      !Number.isInteger(loserScoreNum) ||
      winnerScoreNum < 0 ||
      loserScoreNum < 0 ||
      winnerScoreNum <= loserScoreNum
    ) {
      setError(
        "Winner and loser must be different players, and the winner's score must be a higher valid number."
      );
      return;
    }
    setSavingMatchId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerId: matchEdit.winnerId,
          loserId: matchEdit.loserId,
          winnerScore: winnerScoreNum,
          loserScore: loserScoreNum,
        }),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const data = (await res.json()) as { players: Player[]; matches: Match[] };
      setPlayers(data.players);
      setMatches(data.matches);
      setEditingMatchId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save match.");
    } finally {
      setSavingMatchId(null);
    }
  }

  async function handleReset() {
    setResetting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      if (!res.ok) throw new Error(await parseErrorMessage(res));
      const data = (await res.json()) as { players: Player[]; matches: Match[] };
      setPlayers(data.players);
      setMatches(data.matches);
      setConfirmingReset(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset scores.");
    } finally {
      setResetting(false);
    }
  }

  if (authStatus === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Checking session…</p>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="mb-1 text-xl font-semibold">Admin Access</h1>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Enter the admin passcode to manage records.
          </p>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Passcode"
              autoFocus
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              type="submit"
              disabled={loggingIn}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingIn ? "Checking…" : "Enter"}
            </button>
            {loginError && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                {loginError}
              </p>
            )}
          </form>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            ← Back to leaderboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Admin
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Manage Leaderboard</h1>
            <Link
              href="/"
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              ← Back to leaderboard
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-700 dark:hover:text-zinc-300"
          >
            Log out
          </button>
        </header>

        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        ) : (
          <div className="flex flex-col gap-6">
            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                {error}
              </p>
            )}

            <Card title="Edit Records">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      <th className="py-2 pr-2 font-medium">Player</th>
                      <th className="py-2 pr-2 font-medium">Elo</th>
                      <th className="py-2 pr-2 font-medium">Wins</th>
                      <th className="py-2 pr-2 font-medium">Losses</th>
                      <th className="py-2 pr-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.map((p) => (
                      <tr key={p.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                        <td className="py-2 pr-2 font-medium">{p.name}</td>
                        <td className="py-2 pr-2 text-zinc-500 dark:text-zinc-400">
                          {eloFor(p.id, eloRatings)}
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min={0}
                            value={editValues[p.id]?.wins ?? p.wins}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [p.id]: { ...prev[p.id], wins: e.target.value, losses: prev[p.id]?.losses ?? String(p.losses) },
                              }))
                            }
                            className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min={0}
                            value={editValues[p.id]?.losses ?? p.losses}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [p.id]: { ...prev[p.id], losses: e.target.value, wins: prev[p.id]?.wins ?? String(p.wins) },
                              }))
                            }
                            className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
                          />
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <button
                            onClick={() => handleSaveRecord(p.id)}
                            disabled={savingId === p.id}
                            className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
                          >
                            {savingId === p.id ? "Saving…" : "Save"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Match History">
              {recentMatches.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No matches recorded yet.</p>
              ) : (
                <ul className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                  {recentMatches.map((m) =>
                    editingMatchId === m.id ? (
                      <li
                        key={m.id}
                        className="flex flex-col gap-2 rounded-lg bg-zinc-100 px-3 py-3 text-sm dark:bg-zinc-900"
                      >
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Winner
                            <select
                              value={matchEdit.winnerId}
                              onChange={(e) =>
                                setMatchEdit((prev) => ({ ...prev, winnerId: e.target.value }))
                              }
                              className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
                            >
                              {players.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={matchEdit.winnerScore}
                            onChange={(e) =>
                              setMatchEdit((prev) => ({ ...prev, winnerScore: e.target.value }))
                            }
                            placeholder="Score"
                            className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
                          />
                          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Loser
                            <select
                              value={matchEdit.loserId}
                              onChange={(e) =>
                                setMatchEdit((prev) => ({ ...prev, loserId: e.target.value }))
                              }
                              className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
                            >
                              {players.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={matchEdit.loserScore}
                            onChange={(e) =>
                              setMatchEdit((prev) => ({ ...prev, loserScore: e.target.value }))
                            }
                            placeholder="Score"
                            className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveMatch(m.id)}
                            disabled={savingMatchId === m.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingMatchId === m.id ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={handleCancelEditMatch}
                            className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium transition-colors hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </li>
                    ) : (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900"
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
                          <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {formatDate(m.playedAt)}
                          </span>
                        </span>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => handleStartEditMatch(m)}
                            className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium transition-colors hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleUndo(m.id)}
                            disabled={undoingId === m.id}
                            className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            {undoingId === m.id ? "Undoing…" : "Undo"}
                          </button>
                        </div>
                      </li>
                    )
                  )}
                </ul>
              )}
            </Card>

            <Card title="Danger Zone">
              <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
                Reset every player&apos;s wins and losses to zero and clear match history. This
                cannot be undone.
              </p>
              {confirmingReset ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resetting ? "Resetting…" : "Confirm Reset"}
                  </button>
                  <button
                    onClick={() => setConfirmingReset(false)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingReset(true)}
                  className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950"
                >
                  Reset All Scores
                </button>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
