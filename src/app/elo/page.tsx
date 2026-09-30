import { ELO_K, MOV_CAP, STARTING_ELO, eloDelta, expectedScore, movMultiplier } from "@/lib/stats";
import { Card } from "@/components/ui";
import EloCalculator from "@/components/EloCalculator";
import { SEASON_2_RULES } from "@/lib/seasons";

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
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">How Elo works</h1>
          <p className="mt-1 text-sm text-muted">
            The math behind the rankings, and how your rating moves after every match.
          </p>
        </header>

        <div className="flex flex-col gap-6">
          <Card title="The basics">
            <p className="text-sm leading-relaxed text-muted">
              Every player starts at <strong className="text-fg">{STARTING_ELO}</strong>. After each match, both
              players&apos; ratings shift by the same amount in opposite directions — the winner
              gains what the loser loses. There are two things that decide how big that shift is:
              how surprising the result was, and how lopsided the score was.
            </p>
          </Card>

          <Card title="Seasons">
            <p className="text-sm leading-relaxed text-muted">
              Every calendar month is its own season, and only that month&apos;s matches count toward
              it. On the 1st, everyone&apos;s season rating starts over at{" "}
              <strong className="text-fg">{SEASON_2_RULES.start}</strong>.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Seasons also pay a <strong className="text-fg">win bonus</strong>: the winner gains{" "}
              {SEASON_2_RULES.winMultiplier}× the normal amount, while the loser still loses the normal
              amount. In an even {WORKED_WINNER_SCORE}-{WORKED_LOSER_SCORE} game that&apos;s{" "}
              <span className="font-medium text-win">
                +{Math.round(workedDelta * SEASON_2_RULES.winMultiplier)}
              </span>{" "}
              / <span className="font-medium text-loss">-{Math.round(workedDelta)}</span> instead of ±
              {Math.round(workedDelta)}, so ratings climb as more games get played.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              The all-time leaderboard never resets and uses classic Elo, starting at {STARTING_ELO} with
              no bonus. The first season (September 2026) was also played under classic rules.
            </p>
          </Card>

          <Card title="1. How surprising was it?">
            <p className="mb-3 text-sm leading-relaxed text-muted">
              Before the match, the rating gap between the two players estimates the winner&apos;s
              odds of winning. If the ratings are equal, it&apos;s a coin flip.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-line bg-subtle px-4 py-3 font-mono text-[13px]">
              expected = 1 / (1 + 10^((loser&apos;s Elo − winner&apos;s Elo) / 400))
            </pre>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              The lower the winner&apos;s expected chance was, the bigger the upset — and the bigger
              the rating swing.
            </p>
          </Card>

          <Card title="2. How lopsided was the score?">
            <p className="mb-3 text-sm leading-relaxed text-muted">
              A 21-20 nail-biter isn&apos;t the same evidence of a skill gap as a 21-5 blowout, so the
              score margin scales the rating shift, capped at {MOV_CAP}× so one wild game can&apos;t
              swing things too far.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-line bg-subtle px-4 py-3 font-mono text-[13px]">
              multiplier = 1 + |winner&apos;s score − loser&apos;s score| / 20 (capped)
            </pre>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[280px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="py-2 pr-2 font-medium">Score</th>
                    <th className="py-2 pr-2 text-right font-medium">Multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  {MOV_EXAMPLES.map(([w, l]) => (
                    <tr key={`${w}-${l}`} className="border-b border-line last:border-0 tabular-nums">
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

          <Card title="3. Put it together">
            <pre className="overflow-x-auto rounded-lg border border-line bg-subtle px-4 py-3 font-mono text-[13px]">
              change = {ELO_K} × (1 − expected) × multiplier
            </pre>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {ELO_K} is the &quot;K-factor&quot; — how fast ratings move for a group this size. The
              winner&apos;s rating goes up by that amount; the loser&apos;s goes down by the exact
              same amount.
            </p>
          </Card>

          <Card title="Worked example">
            <p className="text-sm leading-relaxed text-muted">
              Two {STARTING_ELO}-rated players play to {WORKED_WINNER_SCORE}-{WORKED_LOSER_SCORE}:
            </p>
            <ul className="mt-3 space-y-1 text-sm leading-relaxed text-muted">
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
              <span className="font-medium text-win">
                {STARTING_ELO} → {Math.round(STARTING_ELO + workedDelta)} (+{Math.round(workedDelta)})
              </span>
              <br />
              Loser:{" "}
              <span className="font-medium text-loss">
                {STARTING_ELO} → {Math.round(STARTING_ELO - workedDelta)} (-{Math.round(workedDelta)})
              </span>
            </p>
          </Card>

          <Card title="Why upsets matter more">
            <p className="text-sm leading-relaxed text-muted">
              If a {upsetWinner}-rated player beats a {upsetLoser}-rated player {WORKED_WINNER_SCORE}-
              {WORKED_LOSER_SCORE}, the winner was only expected to win{" "}
              {(upsetExpected * 100).toFixed(0)}% of the time — so the swing is much bigger:{" "}
              <strong className="text-fg">+{Math.round(upsetDelta)}</strong> instead of the {Math.round(workedDelta)} points
              an evenly-matched game would move. Beating someone better than you is worth far more
              than farming easy wins against someone worse.
            </p>
          </Card>

          <Card title="A note on edits">
            <p className="text-sm leading-relaxed text-muted">
              Ratings aren&apos;t stored — they&apos;re recalculated from the entire match history
              every time the page loads, in the order matches were played. That&apos;s why editing or
              undoing an old match in the admin panel correctly ripples through every rating after
              it, instead of leaving things out of sync.
            </p>
          </Card>

          <EloCalculator />
        </div>
    </main>
  );
}
