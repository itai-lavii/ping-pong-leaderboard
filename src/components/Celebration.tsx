"use client";

import { useEffect } from "react";
import Avatar from "@/components/Avatar";
import CountUp from "@/components/CountUp";
import type { AvatarStyle } from "@/lib/avatars";

export interface CelebrationData {
  winnerId: string;
  winnerName: string;
  winnerColor: number;
  winnerStyle?: Partial<AvatarStyle>;
  loserName: string;
  winnerScore: number;
  loserScore: number;
  delta: number | null;
}

const RALLY = 1.9; // seconds from first serve until the fireball leaves the card
const IMPACT = RALLY * 0.9; // fireball crosses the middle — everything explodes here
const DISMISS_MS = 6000;

const FIRE = ["#ffe066", "#ffa94d", "#ff6b1a", "#f03e3e", "#fff3bf"];

// Deterministic so render stays pure: sparks fan out evenly with varied reach.
const SPARKS = Array.from({ length: 36 }, (_, i) => {
  const angle = (i / 36) * Math.PI * 2;
  const reach = 110 + ((i * 53) % 90);
  return {
    cx: `${Math.round(Math.cos(angle) * reach)}px`,
    cy: `${Math.round(Math.sin(angle) * reach)}px`,
    // streaks point along their direction of travel
    cr: `${Math.round((angle * 180) / Math.PI) + 90}deg`,
    color: FIRE[i % FIRE.length],
    streak: i % 3 !== 0,
  };
});

const EMBERS = Array.from({ length: 14 }, (_, i) => ({
  left: `${12 + ((i * 41) % 76)}%`,
  ex: `${((i * 29) % 60) - 30}px`,
  delay: IMPACT + 0.2 + ((i * 0.37) % 1.8),
  dur: 1.4 + ((i * 0.23) % 1.1),
  size: 2 + (i % 3),
}));

const FLAMES = [
  { x: 18, h: 0.72, w: 0.3, dur: 0.42, fill: "url(#flame-outer)" },
  { x: 82, h: 0.7, w: 0.3, dur: 0.5, fill: "url(#flame-outer)" },
  { x: 34, h: 0.92, w: 0.36, dur: 0.38, fill: "url(#flame-outer)" },
  { x: 66, h: 0.9, w: 0.36, dur: 0.46, fill: "url(#flame-outer)" },
  { x: 50, h: 1, w: 0.46, dur: 0.4, fill: "url(#flame-outer)" },
  { x: 42, h: 0.62, w: 0.26, dur: 0.34, fill: "url(#flame-inner)" },
  { x: 58, h: 0.6, w: 0.26, dur: 0.36, fill: "url(#flame-inner)" },
  { x: 50, h: 0.74, w: 0.3, dur: 0.3, fill: "url(#flame-inner)" },
];

function Paddle({ rubber, edge }: { rubber: string; edge: string }) {
  return (
    <svg viewBox="0 0 80 96" className="h-full w-full overflow-visible" aria-hidden>
      <rect x="33" y="54" width="14" height="38" rx="6" fill="#c98f5a" />
      <path d="M36 60 V88 M40 60 V88 M44 60 V88" stroke="#a8713f" strokeWidth="1" opacity="0.6" />
      <circle cx="40" cy="34" r="30" fill={edge} />
      <circle cx="40" cy="34" r="27" fill={rubber} />
      <circle cx="40" cy="34" r="27" fill="url(#dimples)" opacity="0.25" />
      <ellipse cx="30" cy="22" rx="10" ry="5" fill="#fff" opacity="0.18" transform="rotate(-30 30 22)" />
    </svg>
  );
}

/** A flickering bonfire; each tongue is a teardrop scaled from its base. */
function Flames() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute bottom-0 left-1/2 h-40 w-48 -translate-x-1/2"
      style={{ animation: `flame-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${IMPACT}s both`, transformOrigin: "50% 100%" }}
      aria-hidden
    >
      {FLAMES.map((f, i) => {
        const w = f.w * 50;
        const top = 100 - f.h * 100;
        return (
          <path
            key={i}
            d={`M${f.x} 100 C${f.x - w} 100 ${f.x - w * 0.9} ${top + (100 - top) * 0.45} ${f.x} ${top} C${f.x + w * 0.9} ${top + (100 - top) * 0.45} ${f.x + w} 100 ${f.x} 100 Z`}
            fill={f.fill}
            style={{
              transformOrigin: `${f.x}% 100%`,
              transformBox: "view-box",
              animation: `flicker ${f.dur}s ease-in-out ${-i * 0.13}s infinite`,
              mixBlendMode: "screen",
            }}
          />
        );
      })}
    </svg>
  );
}

export default function Celebration({ data, onDone }: { data: CelebrationData; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, DISMISS_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDone();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onDone]);

  const at = (s: number) => ({ "--d": `${s}s` }) as React.CSSProperties;
  const ballAnim = (delay = 0) =>
    `rally-x ${RALLY}s linear ${delay}s both, rally-y ${RALLY}s ${delay}s both, rally-fire ${RALLY}s linear ${delay}s both`;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDone}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden bg-black/70 px-4 backdrop-blur-md"
      style={{ animation: "fade-in 0.25s ease-out both" }}
    >
      {/* shared SVG paint for paddles and flames */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <pattern id="dimples" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="0.9" fill="#000" />
          </pattern>
          <linearGradient id="flame-outer" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#f03e3e" />
            <stop offset="45%" stopColor="#ff6b1a" />
            <stop offset="100%" stopColor="#ffa94d" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="flame-inner" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#fff3bf" />
            <stop offset="50%" stopColor="#ffe066" />
            <stop offset="100%" stopColor="#ffa94d" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* warm glow that floods in on impact */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 45%, rgba(255,107,26,0.45), rgba(240,62,62,0.15) 35%, transparent 65%)",
          animation: `glow-in 0.6s ease-out ${IMPACT}s both`,
        }}
      />
      {/* impact flash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 45%, #fff9db, rgba(255,169,77,0.8) 25%, transparent 60%)",
          opacity: 0,
          animation: `flash 0.7s ease-out ${IMPACT}s 1 both`,
        }}
      />

      <div className="pop-in w-full max-w-sm">
        <div
          className="relative overflow-hidden rounded-[1.75rem] bg-[#121110] px-6 pb-7 pt-6 text-center text-white shadow-[0_30px_80px_-20px_rgba(255,80,0,0.45)] ring-1 ring-white/10"
          style={{ animation: `shake 0.55s linear ${IMPACT}s 1 both` }}
        >
          {/* the rally */}
          <div className="relative mx-auto h-44 w-full max-w-[19rem]">
            {/* flames + winner sit behind the paddles until the reveal */}
            <div className="absolute inset-0 flex items-end justify-center pb-4">
              <div className="relative size-24">
                <Flames />
                {EMBERS.map((e, i) => (
                  <span
                    key={i}
                    className="absolute bottom-6 rounded-full bg-[#ffd43b]"
                    style={
                      {
                        left: e.left,
                        width: e.size,
                        height: e.size,
                        opacity: 0,
                        boxShadow: "0 0 6px 2px rgba(255,146,43,0.8)",
                        "--ex": e.ex,
                        animation: `ember ${e.dur}s ease-out ${e.delay}s infinite`,
                      } as React.CSSProperties
                    }
                  />
                ))}
                <span
                  className="absolute left-1/2 top-1/2 -ml-12 -mt-12 size-24 rounded-full border-4 border-[#ffa94d]"
                  style={{ opacity: 0, animation: `shockwave 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${IMPACT}s 1 forwards` }}
                />
                {SPARKS.map((c, i) => (
                  <span
                    key={i}
                    className={"absolute left-1/2 top-1/2 " + (c.streak ? "h-3.5 w-1 rounded-full" : "size-2 rounded-full")}
                    style={
                      {
                        background: c.color,
                        boxShadow: `0 0 6px ${c.color}`,
                        opacity: 0,
                        "--cx": c.cx,
                        "--cy": c.cy,
                        "--cr": c.cr,
                        animation: `confetti 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${IMPACT}s 1 forwards`,
                      } as React.CSSProperties
                    }
                  />
                ))}
                <div className="absolute inset-0" style={{ opacity: 0, animation: `slam 0.6s cubic-bezier(0.2, 0.9, 0.3, 1) ${IMPACT}s 1 both` }}>
                  <div className="bob" style={{ animationDelay: `${IMPACT + 0.6}s` }}>
                    <Avatar id={data.winnerId} colorIndex={data.winnerColor} style={data.winnerStyle} mood="hot" size={96} />
                  </div>
                </div>
              </div>
            </div>

            <div
              className="absolute bottom-0 left-0 h-24 w-20"
              style={{
                transformOrigin: "50% 90%",
                animation: `swing-l ${RALLY}s ease-in-out 1 both, exit-l 0.45s ease-in ${IMPACT + 0.05}s 1 forwards`,
              }}
            >
              <Paddle rubber="#e5484d" edge="#1b1b1b" />
            </div>
            <div
              className="absolute bottom-0 right-0 h-24 w-20"
              style={{ animation: `exit-r 0.45s ease-in ${IMPACT}s 1 forwards` }}
            >
              <div className="h-full w-full -scale-x-100">
              <div
                className="h-full w-full"
                style={{ transformOrigin: "50% 90%", animation: `swing-r ${RALLY}s ease-in-out 1 both` }}
              >
                <Paddle rubber="#2b2b2e" edge="#555" />
              </div>
              </div>
            </div>

            {/* fireball trail (only visible after the smash), then the ball */}
            {[0.1, 0.07, 0.04].map((lag, i) => (
              <span
                key={lag}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff922b]"
                style={
                  {
                    width: 16 - i * 2,
                    height: 16 - i * 2,
                    filter: "blur(2px)",
                    "--o": 0.25 + i * 0.2,
                    animation: `${ballAnim(lag)}, rally-trail ${RALLY}s linear ${lag}s both`,
                  } as React.CSSProperties
                }
              />
            ))}
            <span
              className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ animation: ballAnim() }}
            />
          </div>

          <div className="mt-5" style={{ opacity: 0, animation: `slam 0.55s cubic-bezier(0.2, 0.9, 0.3, 1) ${IMPACT + 0.2}s 1 both` }}>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">Match recorded</p>
            <p className="mt-2 font-serif text-5xl font-medium leading-none tracking-tight">
              {data.winnerName} <em className="fire-text pr-1">wins</em>
            </p>
          </div>
          <p className="rise mt-4 text-sm text-white/65" style={at(IMPACT + 0.45)}>
            <span className="numeral text-xl font-medium text-white">
              {data.winnerScore}–{data.loserScore}
            </span>{" "}
            over {data.loserName}
            {data.delta !== null && (
              <>
                {" · "}
                <span className="font-semibold text-[#69db7c]">
                  +<CountUp value={data.delta} duration={1000} delay={IMPACT + 0.5} /> Elo
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
