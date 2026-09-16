"use client";

import { useState } from "react";
import { eloDelta, expectedScore, movMultiplier } from "@/lib/stats";
import { Card } from "@/components/ui";

export default function EloCalculator() {
  const [winnerElo, setWinnerElo] = useState("1500");
  const [loserElo, setLoserElo] = useState("1500");
  const [winnerScore, setWinnerScore] = useState("21");
  const [loserScore, setLoserScore] = useState("15");

  const w = Number(winnerElo);
  const l = Number(loserElo);
  const ws = Number(winnerScore);
  const ls = Number(loserScore);
  const valid =
    Number.isFinite(w) && Number.isFinite(l) && Number.isFinite(ws) && Number.isFinite(ls) && ws > ls;

  const expected = valid ? expectedScore(w, l) : null;
  const mov = valid ? movMultiplier(ws, ls) : null;
  const delta = valid ? eloDelta(w, l, ws, ls) : null;

  return (
    <Card title="Try It Yourself">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          Winner&apos;s Elo
          <input
            type="number"
            value={winnerElo}
            onChange={(e) => setWinnerElo(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Loser&apos;s Elo
          <input
            type="number"
            value={loserElo}
            onChange={(e) => setLoserElo(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Winner&apos;s Score
          <input
            type="number"
            value={winnerScore}
            onChange={(e) => setWinnerScore(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Loser&apos;s Score
          <input
            type="number"
            value={loserScore}
            onChange={(e) => setLoserScore(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>

      {!valid ? (
        <p className="mt-4 text-sm text-rose-500 dark:text-rose-400">
          Enter valid numbers — the winner&apos;s score must be higher than the loser&apos;s.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/30">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Expected Win Chance
            </p>
            <p className="mt-1 text-lg font-semibold">{(expected! * 100).toFixed(0)}%</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/30">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Margin Multiplier
            </p>
            <p className="mt-1 text-lg font-semibold">{mov!.toFixed(2)}×</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/30">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Rating Change
            </p>
            <p className="mt-1 text-lg font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400">+{Math.round(delta!)}</span>
              {" / "}
              <span className="text-rose-500 dark:text-rose-400">-{Math.round(delta!)}</span>
            </p>
          </div>
        </div>
      )}
      {valid && (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Winner: {w} → {Math.round(w + delta!)} · Loser: {l} → {Math.round(l - delta!)}
        </p>
      )}
    </Card>
  );
}
