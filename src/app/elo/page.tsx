import Link from "next/link";
import { ELO_K, MOV_CAP, STARTING_ELO, eloDelta, expectedScore, movMultiplier } from "@/lib/stats";
import { Card } from "@/components/ui";
import EloCalculator from "@/components/EloCalculator";

const MOV_EXAMPLES = [
  [21, 20],
  [21, 15],
  [21, 10],
  [21, 5],
  [21, 1],
] as const;

const WORKED_WINNER_SCORE = 21;
const WORKED_LOSER_SCORE = 15;
const workedExpected = expectedScore(STARTING_ELO, STARTING_ELO);
const workedMov = movMultiplier(WORKED_WINNER_SCORE, WORKED_LOSER_SCORE);
const workedDelta = eloDelta(STARTING_ELO, STARTING_ELO, WORKED_WINNER_SCORE, WORKED_LOSER_SCORE);

const upsetWinner = 1400;
const upsetLoser = 1600;
const upsetExpected = expectedScore(upsetWinner, upsetLoser);
const upsetDelta = eloDelta(upsetWinner, upsetLoser, WORKED_WINNER_SCORE, WORKED_LOSER_SCORE);

export default function EloExplainerPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-1">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Household League
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">How Elo Works</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            The math behind the Power Rankings, and how your rating moves after every match.
          </p>
          <Link
            href="/"
            className="mt-2 inline-block w-fit text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            ← Back to leaderboard
          </Link>
        </header>

        <div className="flex flex-col gap-6">
          <Card title="The Basics">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Every player starts at <strong>{STARTING_ELO}</strong>. After each match, both
              players&apos; ratings shift by the same amount in opposite directions — the winner
              gains what the loser loses. There are two things that decide how big that shift is:
              how surprising the result was, and how lopsided the score was.
            </p>
          </Card>

          <Card title="Step 1 — How Surprising Was It?">
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
              Before the match, the rating gap between the two players estimates the winner&apos;s
              odds of winning. If the ratings are equal, it&apos;s a coin flip.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-800/60">
              expected = 1 / (1 + 10^((loser&apos;s Elo − winner&apos;s Elo) / 400))
            </pre>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
              The lower the winner&apos;s expected chance was, the bigger the upset — and the bigger
              the rating swing.
            </p>
          </Card>

          <Card title="Step 2 — How Lopsided Was the Score?">
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
              A 21-20 nail-biter isn&apos;t the same evidence of a skill gap as a 21-5 blowout, so the
              score margin scales the rating shift, capped at {MOV_CAP}× so one wild game can&apos;t
              swing things too far.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-800/60">
              multiplier = 1 + |winner&apos;s score − loser&apos;s score| / 20 (capped)
            </pre>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[280px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="py-2 pr-2 font-medium">Score</th>
                    <th className="py-2 pr-2 text-right font-medium">Multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  {MOV_EXAMPLES.map(([w, l]) => (
                    <tr key={`${w}-${l}`} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                      <td className="py-2 pr-2">
                        {w}-{l}
                      </td>
                      <td className="py-2 pr-2 text-right font-medium">{movMultiplier(w, l).toFixed(2)}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Step 3 — Put It Together">
            <pre className="overflow-x-auto rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-800/60">
              change = {ELO_K} × (1 − expected) × multiplier
            </pre>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
              {ELO_K} is the &quot;K-factor&quot; — how fast ratings move for a group this size. The
              winner&apos;s rating goes up by that amount; the loser&apos;s goes down by the exact
              same amount.
            </p>
          </Card>

          <Card title="Worked Example">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Two {STARTING_ELO}-rated players play to {WORKED_WINNER_SCORE}-{WORKED_LOSER_SCORE}:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
              <li>expected = {workedExpected.toFixed(2)} (equal ratings, coin flip)</li>
              <li>
                multiplier = 1 + {WORKED_WINNER_SCORE - WORKED_LOSER_SCORE}/20 = {workedMov.toFixed(2)}×
              </li>
              <li>
                change = {ELO_K} × (1 − {workedExpected.toFixed(2)}) × {workedMov.toFixed(2)} ={" "}
                {Math.round(workedDelta)}
              </li>
            </ul>
            <p className="mt-3 text-sm">
              Winner:{" "}
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {STARTING_ELO} → {Math.round(STARTING_ELO + workedDelta)} (+{Math.round(workedDelta)})
              </span>
              <br />
              Loser:{" "}
              <span className="font-medium text-rose-500 dark:text-rose-400">
                {STARTING_ELO} → {Math.round(STARTING_ELO - workedDelta)} (-{Math.round(workedDelta)})
              </span>
            </p>
          </Card>

          <Card title="Why Upsets Matter More">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              If a {upsetWinner}-rated player beats a {upsetLoser}-rated player {WORKED_WINNER_SCORE}-
              {WORKED_LOSER_SCORE}, the winner was only expected to win{" "}
              {(upsetExpected * 100).toFixed(0)}% of the time — so the swing is much bigger:{" "}
              <strong>+{Math.round(upsetDelta)}</strong> instead of the {Math.round(workedDelta)} points
              an evenly-matched game would move. Beating someone better than you is worth far more
              than farming easy wins against someone worse.
            </p>
          </Card>

          <Card title="A Note on Edits">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Ratings aren&apos;t stored — they&apos;re recalculated from the entire match history
              every time the page loads, in the order matches were played. That&apos;s why editing or
              undoing an old match in the admin panel correctly ripples through every rating after
              it, instead of leaving things out of sync.
            </p>
          </Card>

          <EloCalculator />
        </div>
      </div>
    </div>
  );
}
