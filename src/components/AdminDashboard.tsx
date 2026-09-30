"use client";

import { useEffect, useMemo, useState } from "react";
import type { Match, Player } from "@/lib/types";
import { computeEloHistory, computeEloRatings, eloFor, sortByElo } from "@/lib/stats";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui";

type AuthStatus = "checking" | "unauthenticated" | "authenticated";

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
  const eloHistory = useMemo(() => computeEloHistory(players, matches), [players, matches]);
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
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-sm text-muted">Checking session…</p>
      </main>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <main className="flex flex-1 items-start justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6">
          <h1 className="mb-1 text-lg font-semibold">Admin access</h1>
          <p className="mb-5 text-sm text-muted">
            Enter the admin passcode to manage records.
          </p>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Passcode"
              autoFocus
              className="field"
            />
            <button
              type="submit"
              disabled={loggingIn}
              className="btn btn-primary"
            >
              {loggingIn ? "Checking…" : "Enter"}
            </button>
            {loginError && (
              <p className="text-sm text-loss">
                {loginError}
              </p>
            )}
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Manage leaderboard</h1>
            <p className="mt-1 text-sm text-muted">Edit records, fix or undo matches.</p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm shrink-0">
            Log out
          </button>
        </header>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="flex flex-col gap-6">
            {error && (
              <p className="text-sm text-loss">
                {error}
              </p>
            )}

            <Card title="Records" description="Stored all-time wins and losses. Elo is always recalculated from matches." flush>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-left text-sm tabular-nums [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_td]:py-2.5 [&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_th]:py-2.5">
                  <thead>
                    <tr className="border-b border-line bg-subtle text-xs text-muted">
                      <th className="py-2 pr-2 font-medium">Player</th>
                      <th className="py-2 pr-2 font-medium">Elo</th>
                      <th className="py-2 pr-2 font-medium">Wins</th>
                      <th className="py-2 pr-2 font-medium">Losses</th>
                      <th className="py-2 pr-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.map((p) => (
                      <tr key={p.id} className="border-b border-line last:border-0">
                        <td className="py-2 pr-2 font-medium">{p.name}</td>
                        <td className="py-2 pr-2 text-muted">
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
                            className="field w-20"
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
                            className="field w-20"
                          />
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <button
                            onClick={() => handleSaveRecord(p.id)}
                            disabled={savingId === p.id}
                            className="btn btn-secondary btn-sm"
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

            <Card title="Match history" flush>
              {recentMatches.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted">No matches recorded yet.</p>
              ) : (
                <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
                  {recentMatches.map((m) =>
                    editingMatchId === m.id ? (
                      <li
                        key={m.id}
                        className="flex flex-col gap-3 bg-subtle px-5 py-4 text-sm"
                      >
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
                            Winner
                            <select
                              value={matchEdit.winnerId}
                              onChange={(e) =>
                                setMatchEdit((prev) => ({ ...prev, winnerId: e.target.value }))
                              }
                              className="field w-36"
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
                            className="field w-20"
                          />
                          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
                            Loser
                            <select
                              value={matchEdit.loserId}
                              onChange={(e) =>
                                setMatchEdit((prev) => ({ ...prev, loserId: e.target.value }))
                              }
                              className="field w-36"
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
                            className="field w-20"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveMatch(m.id)}
                            disabled={savingMatchId === m.id}
                            className="btn btn-primary btn-sm"
                          >
                            {savingMatchId === m.id ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={handleCancelEditMatch}
                            className="btn btn-secondary btn-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </li>
                    ) : (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                      >
                        <span>
                          {(() => {
                            const eloChange = eloHistory.get(m.id);
                            const delta = eloChange
                              ? Math.round(eloChange.winnerEloAfter - eloChange.winnerEloBefore)
                              : null;
                            return (
                              <>
                                <span className="font-medium">
                                  {playerName(m.winnerId)}
                                </span>
                                {delta !== null && (
                                  <span className="ml-1 text-xs text-muted">
                                    +{delta}
                                  </span>
                                )}{" "}
                                beat{" "}
                                <span className="font-medium">
                                  {playerName(m.loserId)}
                                </span>
                                {delta !== null && (
                                  <span className="ml-1 text-xs text-muted">
                                    -{delta}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                          {m.winnerScore !== undefined && m.loserScore !== undefined && (
                            <span className="ml-1.5 tabular-nums text-muted">
                              {m.winnerScore}-{m.loserScore}
                            </span>
                          )}
                          <span className="ml-2 text-xs text-muted">
                            {formatDate(m.playedAt)}
                          </span>
                        </span>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => handleStartEditMatch(m)}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleUndo(m.id)}
                            disabled={undoingId === m.id}
                            className="btn btn-secondary btn-sm"
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

            <Card title="Danger zone">
              <p className="mb-4 text-sm text-muted">
                Reset every player&apos;s wins and losses to zero and clear match history. This
                cannot be undone.
              </p>
              {confirmingReset ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="btn bg-loss text-white hover:opacity-90"
                  >
                    {resetting ? "Resetting…" : "Confirm reset"}
                  </button>
                  <button
                    onClick={() => setConfirmingReset(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingReset(true)}
                  className="btn btn-secondary text-loss"
                >
                  Reset all scores
                </button>
              )}
            </Card>
          </div>
        )}
    </main>
  );
}
