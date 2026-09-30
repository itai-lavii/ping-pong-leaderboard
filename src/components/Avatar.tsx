import { useId } from "react";
import { PLAYER_COLORS, resolveStyle, type AvatarStyle } from "@/lib/avatars";

/**
 * Every player is a ping-pong-ball character. Their look comes from the
 * saved customization in `style`, falling back to a stable default derived
 * from their id (see lib/avatars). Mood follows current form: a hot streak
 * grins, a cold streak sweats.
 */

export type Mood = "hot" | "cold" | "neutral";

export function moodFor(streak: { type: "W" | "L"; count: number } | null): Mood {
  if (!streak || streak.count < 3) return "neutral";
  return streak.type === "W" ? "hot" : "cold";
}

const INK = "#1b1b1b";
// Mid-tones so accessories read on both light and dark backgrounds.
const CAP = "#e5484d";
const HAIR = "#8a5a2b";

export default function Avatar({
  id,
  colorIndex,
  style,
  mood = "neutral",
  size = 32,
  className = "",
}: {
  id: string;
  colorIndex: number;
  style?: Partial<AvatarStyle>;
  mood?: Mood;
  size?: number;
  className?: string;
}) {
  const clipId = useId();
  const { color: colorChoice, eyes, accessory, blush } = resolveStyle(id, colorIndex, style);
  const color = PLAYER_COLORS[colorChoice];
  const shades = accessory === 3;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={"shrink-0 overflow-visible " + className}
      aria-hidden
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="34" r="24" />
        </clipPath>
      </defs>

      {/* body */}
      <circle cx="32" cy="34" r="24" fill={color} />
      <g clipPath={`url(#${clipId})`}>
        <circle cx="38" cy="42" r="24" fill="#000" opacity="0.08" />
        <path d="M6 36 Q32 47 58 36" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.5" />
        {accessory === 1 && (
          <>
            <rect x="0" y="15" width="64" height="7" fill="#fff" />
            <rect x="0" y="17.5" width="64" height="2" fill="#e5484d" />
          </>
        )}
      </g>
      <ellipse cx="23" cy="23" rx="7" ry="4" fill="#fff" opacity="0.35" transform="rotate(-30 23 23)" />

      {/* accessories that sit outside the ball */}
      {accessory === 2 && (
        <>
          <path d="M11 27 A21 21 0 0 1 53 27 Z" fill={CAP} />
          <path d="M40 25 H59 Q61 28 57 29 H40 Z" fill={CAP} />
          <path d="M32 7.5 V27" stroke="#fff" strokeOpacity="0.25" strokeWidth="1.2" />
        </>
      )}
      {accessory === 4 && (
        <>
          <path d="M32 11 V3" stroke="#2f9e44" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 5 Q24 -1 22 6 Q28 8 32 5 Z" fill="#40c057" />
          <path d="M32 5 Q40 -1 42 6 Q36 8 32 5 Z" fill="#40c057" />
        </>
      )}
      {accessory === 5 && <path d="M24 12 L27 3 L30 11 L33 1 L36 11 L39 4 L41 13 Z" fill={HAIR} />}
      {accessory === 6 && (
        <>
          <path d="M19 15 L21 3 L27 10 L32 1 L37 10 L43 3 L45 15 Z" fill="#ffc93c" />
          <rect x="19" y="12" width="26" height="4" rx="1.5" fill="#f59f00" />
          <circle cx="32" cy="7" r="1.6" fill="#e5484d" />
        </>
      )}
      {accessory === 7 && (
        <>
          <path d="M9 32 A23 23 0 0 1 55 32" fill="none" stroke="#2b2b2e" strokeWidth="3.5" strokeLinecap="round" />
          <rect x="4" y="27" width="9" height="15" rx="4" fill="#2b2b2e" />
          <rect x="51" y="27" width="9" height="15" rx="4" fill="#2b2b2e" />
          <rect x="6.5" y="30" width="4" height="9" rx="2" fill="#e5484d" />
          <rect x="53.5" y="30" width="4" height="9" rx="2" fill="#e5484d" />
        </>
      )}

      {/* eyes */}
      {shades ? (
        <>
          <rect x="17" y="27" width="13" height="8" rx="3.5" fill={INK} />
          <rect x="34" y="27" width="13" height="8" rx="3.5" fill={INK} />
          <path d="M30 30 H34" stroke={INK} strokeWidth="2" />
          <path d="M20 29 L24 29" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : mood === "hot" ? (
        <>
          <path d="M21 33 Q24.5 28 28 33" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M36 33 Q39.5 28 43 33" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        </>
      ) : eyes === 0 ? (
        <>
          <circle cx="25" cy="31" r="2.8" fill={INK} />
          <circle cx="39" cy="31" r="2.8" fill={INK} />
        </>
      ) : eyes === 1 ? (
        <>
          <circle cx="25" cy="31" r="4.8" fill="#fff" />
          <circle cx="39" cy="31" r="4.8" fill="#fff" />
          <circle cx="26" cy="32" r="2.4" fill={INK} />
          <circle cx="40" cy="32" r="2.4" fill={INK} />
        </>
      ) : eyes === 2 ? (
        <>
          <path d="M21 31 Q25 34.5 29 31" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M35 31 Q39 34.5 43 31" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="25" cy="32" r="2.6" fill={INK} />
          <circle cx="39" cy="32" r="2.6" fill={INK} />
          {mood !== "cold" && (
            <>
              <path d="M20 26 L28 28.5" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
              <path d="M44 26 L36 28.5" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}
        </>
      )}

      {mood === "cold" && !shades && (
        <>
          <path d="M20 24 L27 26" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M44 24 L37 26" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}

      {blush && (
        <>
          <ellipse cx="18.5" cy="39" rx="3.5" ry="2" fill="#ff6b8b" opacity="0.4" />
          <ellipse cx="45.5" cy="39" rx="3.5" ry="2" fill="#ff6b8b" opacity="0.4" />
        </>
      )}

      {/* mouth */}
      {mood === "hot" ? (
        <path d="M24 40 Q32 51 40 40 Z" fill={INK} />
      ) : mood === "cold" ? (
        <path d="M27 45 Q32 40.5 37 45" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      ) : (
        <path d="M27 41 Q32 45.5 37 41" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      )}

      {/* mood extras */}
      {mood === "hot" && (
        <path
          d="M53 9 L54.8 13.2 L59 15 L54.8 16.8 L53 21 L51.2 16.8 L47 15 L51.2 13.2 Z"
          fill="#ffc93c"
        />
      )}
      {mood === "cold" && <path d="M51 14 Q56 21 51 24 Q46 21 51 14 Z" fill="#7cc4ff" />}
    </svg>
  );
}
