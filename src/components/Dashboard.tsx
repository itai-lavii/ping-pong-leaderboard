"use client";

import { useEffect, useMemo, useState } from "react";
import { INITIAL_PLAYERS, type Match, type Player } from "@/lib/types";
import {
  CLASSIC_RULES,
  computeEloHistory,
  computeEloRatings,
  currentStreak,
  eloDelta,
  eloFor,
  expectedScore,
  headToHead,
  sortByElo,
} from "@/lib/stats";
import {
  daysLeftInSeason,
  listSeasons,
  matchesInSeason,
  playersWithRecords,
  seasonKeyOf,
  seasonLabel,
  seasonRules,
  seasonShortLabel,
} from "@/lib/seasons";
import { Card, EmptyState, MatchRow, Stat, Streak } from "@/components/ui";
import Avatar, { moodFor } from "@/components/Avatar";
import Celebration, { type CelebrationData } from "@/components/Celebration";
import CountUp from "@/components/CountUp";
import Podium from "@/components/Podium";
import CharacterEditor from "@/components/CharacterEditor";
import type { AvatarStyles } from "@/lib/avatars";

const IS_DEV = process.env.NODE_ENV !== "production";

const ALL_TIME = "all";
const HISTORY_PREVIEW = 10;

async function parseErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : "Something went wrong. Try again.";
}

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}`;
}

export default function Dashboard() {
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  // Seasons depend on the viewer's clock; they're only rendered after data
  // loads on the client, so there's no server/client month mismatch.
  const [now] = useState(() => new Date());
  const currentSeason = seasonKeyOf(now);
  const [view, setView] = useState<string>(currentSeason);

  const [winnerId, setWinnerId] = useState("");
  const [loserId, setLoserId] = useState("");
  const [winnerScore, setWinnerScore] = useState("");
  const [loserScore, setLoserScore] = useState("");
  const [compareAId, setCompareAId] = useState("");
  const [compareBId, setCompareBId] = useState("");
  const [error, setError] = useState("");
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [avatars, setAvatars] = useState<AvatarStyles>({});
  const [editingCharacter, setEditingCharacter] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error(await parseErrorMessage(res));
        const data = (await res.json()) as { players: Player[]; matches: Match[]; avatars?: AvatarStyles };
        if (!cancelled) {
          setPlayers(data.players);
          setMatches(data.matches);
          setAvatars(data.avatars ?? {});
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load leaderboard.");
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

  const seasons = useMemo(() => listSeasons(matches, now), [matches, now]);
  const pastSeasons = seasons.filter((key) => key !== currentSeason);
  const isAllTime = view === ALL_TIME;
  const isCurrentSeason = view === currentSeason;

  // Everything below is scoped to the selected tab: all-time uses the stored
  // records, a season recounts wins/losses and replays Elo from its own matches.
  const viewMatches = useMemo(
    () => (isAllTime ? matches : matchesInSeason(matches, view)),
    [matches, view, isAllTime]
  );
  const viewPlayers = useMemo(
    () => (isAllTime ? players : playersWithRecords(players, viewMatches)),
    [players, viewMatches, isAllTime]
  );
  // Seasons from October 2026 on start at 1000 and pay winners 1.2x; all-time stays classic.
  const viewRules = isAllTime ? CLASSIC_RULES : seasonRules(view);
  const eloRatings = useMemo(
    () => computeEloRatings(viewPlayers, viewMatches, viewRules),
    [viewPlayers, viewMatches, viewRules]
  );
  const eloHistory = useMemo(
    () => computeEloHistory(viewPlayers, viewMatches, viewRules),
    [viewPlayers, viewMatches, viewRules]
  );
  const { ranked, unranked } = useMemo(() => {
    const sorted = sortByElo(viewPlayers, eloRatings);
    return {
      ranked: sorted.filter((p) => p.wins + p.losses > 0),
      unranked: sorted.filter((p) => p.wins + p.losses === 0),
    };
  }, [viewPlayers, eloRatings]);

  const recentMatches = useMemo(
    () => [...viewMatches].sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
    [viewMatches]
  );

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? "Unknown";

  const { hottest, coldest } = useMemo(() => {
    const streaks = viewPlayers
      .map((p) => ({ player: p, streak: currentStreak(p.id, viewMatches) }))
      .filter((s): s is { player: Player; streak: NonNullable<typeof s.streak> } => s.streak !== null);

    const hottest = streaks
      .filter((s) => s.streak.type === "W")
      .sort((a, b) => b.streak.count - a.streak.count)[0];
    const coldest = streaks
      .filter((s) => s.streak.type === "L")
      .sort((a, b) => b.streak.count - a.streak.count)[0];

    return { hottest, coldest };
  }, [viewPlayers, viewMatches]);

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
      const recorded = data.matches[data.matches.length - 1];
      const change = recorded
        ? computeEloHistory(
            data.players,
            matchesInSeason(data.matches, currentSeason),
            seasonRules(currentSeason)
          ).get(recorded.id)
        : undefined;
      celebrate(winnerScoreNum, loserScoreNum, change ? Math.round(change.winnerEloAfter - change.winnerEloBefore) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record match.");
    } finally {
      setSubmitting(false);
    }
  }

  function celebrate(ws: number, ls: number, delta: number | null) {
    setCelebration({
      winnerId,
      winnerName: playerName(winnerId),
      winnerColor: colorIndexOf(winnerId),
      winnerStyle: avatars[winnerId],
      loserName: playerName(loserId),
      winnerScore: ws,
      loserScore: ls,
      delta,
    });
  }

  /** Dev-only: play the win animation for what's in the form, without saving. */
  function previewCelebration() {
    const ws = Number(winnerScore) || 21;
    const ls = Number(loserScore) || 15;
    const [hi, lo] = [Math.max(ws, ls), Math.min(ws, ls)];
    const delta = eloDelta(eloFor(winnerId, eloRatings), eloFor(loserId, eloRatings), hi, lo);
    celebrate(hi, lo, Math.round(delta * viewRules.winMultiplier));
  }

  // Colors follow the stored player order so each player keeps theirs.
  const colorIndexOf = (id: string) => Math.max(0, players.findIndex((p) => p.id === id));
  const moodOf = (id: string) => moodFor(currentStreak(id, viewMatches));
  const avatarFor = (id: string, size: number) => (
    <Avatar id={id} colorIndex={colorIndexOf(id)} style={avatars[id]} mood={moodOf(id)} size={size} />
  );

  const biggestUpset = useMemo(() => {
    let best: { match: Match; odds: number } | null = null;
    for (const m of viewMatches) {
      const h = eloHistory.get(m.id);
      if (!h) continue;
      const odds = expectedScore(h.winnerEloBefore, h.loserEloBefore);
      if (!best || odds < best.odds) best = { match: m, odds };
    }
    return best && best.odds < 0.5 ? best : null;
  }, [viewMatches, eloHistory]);

  const compareA = players.find((p) => p.id === compareAId) ?? null;
  const compareB = players.find((p) => p.id === compareBId) ?? null;
  const compareMatches = useMemo(
    () =>
      viewMatches
        .filter(
          (m) =>
            (m.winnerId === compareAId && m.loserId === compareBId) ||
            (m.winnerId === compareBId && m.loserId === compareAId)
        )
        .sort((a, b) => b.playedAt.localeCompare(a.playedAt)),
    [viewMatches, compareAId, compareBId]
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

  const daysLeft = daysLeftInSeason(currentSeason, now);
  const subtitle = isAllTime
    ? `All-time Elo across ${matches.length} ${matches.length === 1 ? "match" : "matches"}.`
    : isCurrentSeason
      ? `Everyone started at ${viewRules.start} on the 1st.${viewRules.winMultiplier !== 1 ? ` Wins pay ${viewRules.winMultiplier}×.` : ""} ${daysLeft <= 1 ? "Last day of the season." : `${daysLeft} days left.`}`
      : "Final standings.";

  const selectOptions = players.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}
    </option>
  ));

  // Rendered twice: under Rankings on mobile, in the sidebar on desktop.
  const recordCard = (
    <Card
      title="Record a match"
      description={`Counts toward all-time and the ${seasonShortLabel(currentSeason)} season.`}
      delay={0.35}
    >
      <form onSubmit={handleRecordMatch} className="flex flex-col gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] gap-2.5">
          <label className="flex flex-col gap-2">
            <span className="eyebrow">Winner</span>
            <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} className="field">
              {selectOptions}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="eyebrow">Score</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              required
              value={winnerScore}
              onChange={(e) => setWinnerScore(e.target.value)}
              placeholder="21"
              className="field text-center"
            />
          </label>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] gap-2.5">
          <label className="flex flex-col gap-2">
            <span className="eyebrow">Loser</span>
            <select value={loserId} onChange={(e) => setLoserId(e.target.value)} className="field">
              {selectOptions}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="eyebrow">Score</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              required
              value={loserScore}
              onChange={(e) => setLoserScore(e.target.value)}
              placeholder="15"
              className="field text-center"
            />
          </label>
        </div>
        <button type="submit" disabled={submitting} className="btn btn-primary mt-1 w-full">
          {submitting ? "Saving…" : "Record match"}
        </button>
        {error && <p className="text-sm text-loss">{error}</p>}
      </form>
    </Card>
  );

  // Rendered twice as well, always directly under "Record a match".
  const statsGrid = (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <Stat label="Matches" value={<CountUp value={viewMatches.length} />} delay={0.15} />
      <Stat
        label="Biggest upset"
        value={biggestUpset ? playerName(biggestUpset.match.winnerId) : "—"}
        detail={
          biggestUpset
            ? `over ${playerName(biggestUpset.match.loserId)} at ${Math.round(biggestUpset.odds * 100)}% odds`
            : undefined
        }
        delay={0.2}
      />
      <Stat
        label="Hot streak"
        value={hottest ? hottest.player.name : "—"}
        detail={hottest ? `${hottest.streak.count} straight wins` : undefined}
        delay={0.25}
      />
      <Stat
        label="Cold streak"
        value={coldest ? coldest.player.name : "—"}
        detail={coldest ? `${coldest.streak.count} straight losses` : undefined}
        delay={0.3}
      />
    </div>
  );

  const [titleLead, titleAccent] = isAllTime
    ? ["All-time", "leaderboard"]
    : [seasonLabel(view).replace(/ \d{4}$/, ""), "season"];
  const eyebrow = isAllTime
    ? "Every match, ever"
    : isCurrentSeason
      ? `Season · ${now.getFullYear()} · Live`
      : `Season · ${view.slice(0, 4)} · Final`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pt-8">
      {loading ? (
        <p className="font-serif text-xl italic text-muted">Loading…</p>
      ) : loadError ? (
        <p className="card px-6 py-4 text-sm text-loss">{loadError}</p>
      ) : (
        <>
          <div className="mb-8 flex flex-col gap-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="rise min-w-0">
              <p className="eyebrow flex items-center gap-2">
                {isCurrentSeason && <span className="size-1.5 rounded-full bg-acc" aria-hidden />}
                {eyebrow}
              </p>
              <h1 className="mt-3 font-serif text-5xl font-medium leading-[0.95] tracking-tight sm:text-7xl">
                {titleLead} <em className="text-acc">{titleAccent}</em>
              </h1>
              <p className="mt-4 text-[15px] text-muted">{subtitle}</p>
            </div>
            <label className="rise flex shrink-0 flex-col gap-2" style={{ "--d": "0.1s" } as React.CSSProperties}>
              <span className="eyebrow">Leaderboard</span>
              <select
                value={view}
                onChange={(e) => {
                  setView(e.target.value);
                  setShowAllHistory(false);
                }}
                className="field bg-surface font-medium shadow-[var(--shadow)] sm:w-64"
              >
                <option value={currentSeason}>{seasonLabel(currentSeason)} (current)</option>
                <option value={ALL_TIME}>All-time</option>
                {pastSeasons.length > 0 && (
                  <optgroup label="Past seasons">
                    {pastSeasons.map((key) => (
                      <option key={key} value={key}>
                        {seasonLabel(key)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <Card
                title="Podium"
                action={
                  <button
                    type="button"
                    onClick={() => setEditingCharacter(ranked[0]?.id ?? players[0]?.id ?? null)}
                    className="btn btn-secondary btn-sm shrink-0"
                  >
                    <span className="flex -space-x-2" aria-hidden>
                      {players.slice(0, 3).map((p) => (
                        <span key={p.id} className="rounded-full ring-2 ring-subtle">
                          <Avatar id={p.id} colorIndex={colorIndexOf(p.id)} style={avatars[p.id]} size={18} />
                        </span>
                      ))}
                    </span>
                    Customize
                  </button>
                }
                description={
                  isAllTime
                    ? "All-time. Tap anyone for their record."
                    : isCurrentSeason
                      ? "Tap anyone for their record."
                      : "Final standings. Tap anyone for their record."
                }
                flush
                delay={0.1}
              >
                {ranked.length === 0 ? (
                  <EmptyState>Nobody on the podium yet — go play.</EmptyState>
                ) : (
                  <Podium
                    key={view}
                    standings={[...ranked, ...unranked].map((p) => ({
                      id: p.id,
                      name: p.name,
                      elo: p.wins + p.losses > 0 ? eloFor(p.id, eloRatings) : null,
                      wins: p.wins,
                      losses: p.losses,
                      colorIndex: colorIndexOf(p.id),
                      mood: moodOf(p.id),
                      style: avatars[p.id],
                      h2h: headToHead(p.id, viewMatches).map((r) => ({
                        ...r,
                        opponentName: playerName(r.opponentId),
                      })),
                    }))}
                    onEditCharacter={setEditingCharacter}
                  />
                )}
              </Card>

              {/* on phones the form and stats sit right under the podium */}
              <div className="flex flex-col gap-6 lg:hidden">
                {recordCard}
                {statsGrid}
              </div>

              <Card
                title="Match history"
                description={isAllTime ? "Every match, newest first." : `${seasonLabel(view)} only.`}
                flush
                delay={0.4}
              >
                {recentMatches.length === 0 ? (
                  <EmptyState>
                    {isCurrentSeason ? "No matches yet this season — go play." : "No matches recorded yet."}
                  </EmptyState>
                ) : (
                  <ul className="flex flex-col">
                    {(showAllHistory ? recentMatches : recentMatches.slice(0, HISTORY_PREVIEW)).map((m) => {
                      const eloChange = eloHistory.get(m.id);
                      const delta = eloChange
                        ? {
                            gain: Math.round(eloChange.winnerEloAfter - eloChange.winnerEloBefore),
                            loss: Math.round(eloChange.loserEloBefore - eloChange.loserEloAfter),
                          }
                        : null;
                      return (
                        <MatchRow
                          key={m.id}
                          avatar={avatarFor(m.winnerId, 30)}
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
                {recentMatches.length > HISTORY_PREVIEW && (
                  <div className="px-4 pb-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAllHistory((v) => !v)}
                      className="btn btn-secondary w-full text-muted hover:text-fg"
                    >
                      {showAllHistory ? "Show less" : `Show all ${recentMatches.length} matches`}
                    </button>
                  </div>
                )}
              </Card>
            </div>

            <div className="flex flex-col gap-6">
              <div className="hidden flex-col gap-6 lg:flex">
                {recordCard}
                {statsGrid}
              </div>

              <Card
                title="Head-to-head"
                description={isAllTime ? "All-time." : `${seasonLabel(view)} only.`}
                flush
                delay={0.45}
              >
                <div className="flex items-center gap-2 px-6">
                  <select value={compareAId} onChange={(e) => setCompareAId(e.target.value)} className="field">
                    {selectOptions}
                  </select>
                  <span className="shrink-0 font-serif text-lg italic text-muted">vs</span>
                  <select value={compareBId} onChange={(e) => setCompareBId(e.target.value)} className="field">
                    {selectOptions}
                  </select>
                </div>

                {compareAId === compareBId ? (
                  <EmptyState>Pick two different players.</EmptyState>
                ) : (
                  <>
                    <div className="mx-4 mt-4 grid grid-cols-[1fr_auto_1fr] items-center rounded-2xl bg-subtle/70 px-3 py-6 text-center">
                      <div className="flex min-w-0 flex-col items-center">
                        {avatarFor(compareAId, 52)}
                        <p className="mt-2 max-w-full truncate text-sm font-medium">{compareA?.name}</p>
                        <p className="mt-1 text-xs text-muted tabular-nums">{eloFor(compareAId, eloRatings)} Elo</p>
                      </div>
                      <p className="numeral px-3 text-6xl font-medium leading-none tracking-tight">
                        {compareAWins}
                        <span className="px-1 text-faint">–</span>
                        {compareBWins}
                      </p>
                      <div className="flex min-w-0 flex-col items-center">
                        {avatarFor(compareBId, 52)}
                        <p className="mt-2 max-w-full truncate text-sm font-medium">{compareB?.name}</p>
                        <p className="mt-1 text-xs text-muted tabular-nums">{eloFor(compareBId, eloRatings)} Elo</p>
                      </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 px-4 pt-2 text-sm">
                      <div className="rounded-2xl bg-subtle/70 px-4 py-3">
                        <dt className="eyebrow">Avg margin</dt>
                        <dd className="numeral mt-1.5 text-xl font-medium leading-none">
                          {compareAvgMargin === null ? "—" : signed(compareAvgMargin)}
                        </dd>
                      </div>
                      <div className="rounded-2xl bg-subtle/70 px-4 py-3">
                        <dt className="eyebrow">{compareA?.name}&apos;s form</dt>
                        <dd className="numeral mt-1.5 text-xl font-medium leading-none">
                          <Streak streak={compareStreak} />
                        </dd>
                      </div>
                    </dl>
                    {compareMatches.length === 0 ? (
                      <p className="px-6 py-5 font-serif text-base italic text-muted">
                        No matches between them {isAllTime ? "yet" : "this season"}.
                      </p>
                    ) : (
                      <ul className="mt-2 flex flex-col">
                        {compareMatches.slice(0, 5).map((m) => {
                          const eloChange = eloHistory.get(m.id);
                          const delta = eloChange
                            ? {
                                gain: Math.round(eloChange.winnerEloAfter - eloChange.winnerEloBefore),
                                loss: Math.round(eloChange.loserEloBefore - eloChange.loserEloAfter),
                              }
                            : null;
                          return (
                            <MatchRow
                              key={m.id}
                              avatar={avatarFor(m.winnerId, 30)}
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
          </div>
        </>
      )}
      {celebration && <Celebration data={celebration} onDone={() => setCelebration(null)} />}
      {editingCharacter && (
        <CharacterEditor
          players={players}
          avatars={avatars}
          colorIndexOf={colorIndexOf}
          initialPlayerId={editingCharacter}
          onSaved={setAvatars}
          onClose={() => setEditingCharacter(null)}
        />
      )}
      {IS_DEV && !loading && (
        <button
          type="button"
          onClick={previewCelebration}
          className="btn btn-primary btn-sm fixed bottom-4 right-4 z-40 opacity-80 shadow-[var(--shadow)] hover:opacity-100"
          title="Only visible on your local preview — never in production"
        >
          <span className="size-2 rounded-full bg-ball" aria-hidden />
          Test win
        </button>
      )}
    </main>
  );
}
