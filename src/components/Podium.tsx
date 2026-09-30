"use client";

import { useState } from "react";
import Avatar, { type Mood } from "@/components/Avatar";
import type { AvatarStyle } from "@/lib/avatars";
import CountUp from "@/components/CountUp";

export interface PodiumEntry {
  id: string;
  name: string;
  /** null for players who haven't played in this view yet */
  elo: number | null;
  wins: number;
  losses: number;
  colorIndex: number;
  mood: Mood;
  style?: Partial<AvatarStyle>;
  /** This player's record against each opponent, most-played first. */
  h2h: { opponentId: string; opponentName: string; wins: number; losses: number }[];
}

// Visual order is 2nd, 1st, 3rd; `place` is the real finishing position.
const SLOTS = [
  { place: 2, bar: "h-20 sm:h-24", avatar: 56, delay: 0.25 },
  { place: 1, bar: "h-28 sm:h-32", avatar: 72, delay: 0.1 },
  { place: 3, bar: "h-14 sm:h-16", avatar: 56, delay: 0.4 },
];

const EASE = "ease-[cubic-bezier(0.16,1,0.3,1)]";

/** Slides open to its content's natural height (grid-rows 0fr → 1fr). */
function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={
        `grid transition-[grid-template-rows] duration-500 ${EASE} ` + (open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")
      }
    >
      <div className="min-h-0 overflow-hidden" inert={!open}>
        {children}
      </div>
    </div>
  );
}

function Records({ player, onEditCharacter }: { player: PodiumEntry; onEditCharacter: (id: string) => void }) {
  return (
    <div className="px-3 pb-3 pt-1">
      {player.h2h.length === 0 ? (
        <p className="px-1 font-serif text-base italic text-muted">No matches yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-1.5 text-sm">
          {player.h2h.map((rec) => (
            <li
              key={rec.opponentId}
              className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2"
            >
              <span className="min-w-0 truncate text-muted">
                <span className="font-serif italic">vs</span> {rec.opponentName}
              </span>
              <span className="numeral text-lg font-medium leading-none">
                <span className="text-win">{rec.wins}</span>
                <span className="text-faint">–</span>
                <span className="text-loss">{rec.losses}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => onEditCharacter(player.id)}
        className="btn btn-secondary btn-sm mt-2 w-full bg-surface text-muted hover:text-fg"
      >
        Edit {player.name}&apos;s character
      </button>
    </div>
  );
}

function Chevron({ open, direction = "right" }: { open: boolean; direction?: "right" | "down" }) {
  const turned = direction === "right" ? "rotate-90" : "rotate-180";
  return (
    <svg
      viewBox="0 0 16 16"
      className={"size-3 shrink-0 text-faint transition-transform duration-300 " + (open ? turned : "")}
      aria-hidden
    >
      <path
        d={direction === "right" ? "M6 4l4 4-4 4" : "M4 6l4 4 4-4"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Top three on a podium, everyone else listed beneath it. Tapping anyone —
 * on the podium or in the list — slides open their record against each
 * opponent.
 */
export default function Podium({
  standings,
  onEditCharacter,
}: {
  standings: PodiumEntry[];
  onEditCharacter: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  const ranked = standings.filter((p) => p.elo !== null);
  const onPodium = ranked.slice(0, 3);
  const rest = standings.filter((p) => !onPodium.includes(p));
  const podiumPick = onPodium.find((p) => p.id === expandedId);

  return (
    <div className="pb-2">
      <div className="grid w-full grid-cols-3 items-end gap-2 px-4 pt-2 sm:gap-4 sm:px-6">
        {SLOTS.map(({ place, bar, avatar, delay }) => {
          const p = onPodium[place - 1];
          const d = { "--d": `${delay}s` } as React.CSSProperties;
          const isOpen = !!p && expandedId === p.id;
          return (
            <button
              key={place}
              type="button"
              disabled={!p}
              onClick={() => p && toggle(p.id)}
              aria-expanded={p ? isOpen : undefined}
              className="group flex min-w-0 flex-col items-center"
            >
              {p ? (
                <>
                  <div className="pop-in hover-bob" style={d}>
                    <div className="bob-target">
                      <Avatar id={p.id} colorIndex={p.colorIndex} style={p.style} mood={p.mood} size={avatar} />
                    </div>
                  </div>
                  <p className="mt-2 flex max-w-full items-center gap-1 text-sm font-medium">
                    <span className="truncate">{p.name}</span>
                    <Chevron open={isOpen} direction="down" />
                  </p>
                  <p className="numeral text-xl font-medium leading-tight text-muted">
                    <CountUp value={p.elo ?? 0} />
                  </p>
                  <p className="text-xs tabular-nums text-muted">
                    {p.wins}–{p.losses}
                  </p>
                </>
              ) : (
                <p className="pb-3 font-serif text-lg italic text-faint">—</p>
              )}
              <div
                className={
                  "grow-up mt-3 flex w-full items-start justify-center rounded-t-2xl pt-2 transition-colors " +
                  bar +
                  (place === 1 ? " bg-ball/15 group-hover:bg-ball/20" : " bg-subtle group-hover:bg-subtle/70") +
                  (isOpen ? " ring-2 ring-inset ring-fg/15" : "")
                }
                style={d}
              >
                <span
                  className={"numeral text-3xl font-medium italic " + (place === 1 ? "text-acc" : "text-muted")}
                >
                  {place}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* records for whoever was tapped on the podium */}
      <Collapse open={!!podiumPick}>
        {podiumPick && (
          <div className="mx-4 mt-2 rounded-2xl bg-subtle/70 sm:mx-6">
            <p className="px-4 pb-1 pt-3 text-sm font-medium">
              {podiumPick.name}
              <span className="text-muted">
                {" "}
                · {podiumPick.wins}–{podiumPick.losses}
              </span>
            </p>
            <Records player={podiumPick} onEditCharacter={onEditCharacter} />
          </div>
        )}
      </Collapse>

      {/* everyone else, as a list */}
      {rest.length > 0 && (
        <ol className="mt-2 flex flex-col gap-1 px-4 sm:px-6">
          {rest.map((p, i) => {
            const place = p.elo === null ? null : ranked.indexOf(p) + 1;
            const isOpen = expandedId === p.id;
            return (
              <li
                key={p.id}
                className="rise overflow-hidden rounded-2xl bg-subtle/60"
                style={{ "--d": `${0.5 + i * 0.06}s` } as React.CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-expanded={isOpen}
                  className={
                    "hover-bob flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-subtle " +
                    (place ? "" : "text-muted")
                  }
                >
                  <span className="numeral w-7 text-lg italic leading-none text-acc">
                    {place ? String(place).padStart(2, "0") : "–"}
                  </span>
                  <span className={"bob-target " + (place ? "" : "opacity-50 grayscale")}>
                    <Avatar id={p.id} colorIndex={p.colorIndex} style={p.style} mood={p.mood} size={32} />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="truncate text-[15px] font-medium">{p.name}</span>
                    <Chevron open={isOpen} />
                  </span>
                  <span className="text-sm tabular-nums text-muted">
                    {p.wins}–{p.losses}
                  </span>
                  <span className="numeral w-14 text-right text-xl font-medium leading-none">
                    {place ? p.elo : "—"}
                  </span>
                </button>
                <Collapse open={isOpen}>
                  <Records player={p} onEditCharacter={onEditCharacter} />
                </Collapse>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
