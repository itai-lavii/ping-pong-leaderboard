import { formatDate } from "@/lib/format";

export function Card({
  title,
  description,
  action,
  flush = false,
  delay,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Drop body side padding so rows can run edge to edge. */
  flush?: boolean;
  /** Fade-up delay in seconds. */
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="card rise overflow-hidden"
      style={delay !== undefined ? ({ "--d": `${delay}s` } as React.CSSProperties) : undefined}
    >
      <header className="flex items-end justify-between gap-3 px-6 pb-4 pt-6">
        <div className="min-w-0">
          <h2 className="font-serif text-[1.65rem] font-medium leading-none tracking-tight">{title}</h2>
          {description && <p className="mt-2 text-[13px] text-muted">{description}</p>}
        </div>
        {action}
      </header>
      <div className={flush ? "pb-2" : "px-6 pb-6"}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  detail,
  delay,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="card rise flex h-full min-w-0 flex-col justify-between gap-4 px-5 py-5 sm:px-6"
      style={delay !== undefined ? ({ "--d": `${delay}s` } as React.CSSProperties) : undefined}
    >
      <p className="eyebrow">{label}</p>
      <div className="min-w-0">
        <p className="numeral truncate text-[2rem] font-medium leading-none tracking-tight">{value}</p>
        {detail && <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-muted">{detail}</p>}
      </div>
    </div>
  );
}

export function Streak({ streak }: { streak: { type: "W" | "L"; count: number } | null }) {
  if (!streak || streak.count === 0) {
    return <span className="text-faint">—</span>;
  }
  return (
    <span className={"tabular-nums " + (streak.type === "W" ? "text-win" : "text-loss")}>
      {streak.type}
      {streak.count}
    </span>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-10 text-center font-serif text-lg italic text-muted">{children}</p>;
}

export function MatchRow({
  winnerName,
  loserName,
  winnerScore,
  loserScore,
  playedAt,
  delta,
  avatar,
}: {
  avatar?: React.ReactNode;
  winnerName: string;
  loserName: string;
  winnerScore?: number;
  loserScore?: number;
  playedAt: string;
  /** Winner's gain and loser's loss; they differ when a season pays winners extra. */
  delta: { gain: number; loss: number } | null;
}) {
  return (
    <li className="mx-2 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm transition-colors hover:bg-subtle/60">
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="truncate">
          <span className="font-medium">{winnerName}</span>
          <span className="font-serif italic text-muted"> over </span>
          <span>{loserName}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted">{formatDate(playedAt)}</p>
      </div>
      <div className="flex shrink-0 items-baseline gap-3">
        {delta !== null && (
          <span className="text-xs text-muted tabular-nums">
            {delta.gain === delta.loss ? (
              `±${delta.gain}`
            ) : (
              <>
                <span className="text-win">+{delta.gain}</span> <span className="text-loss">−{delta.loss}</span>
              </>
            )}
          </span>
        )}
        {winnerScore !== undefined && loserScore !== undefined && (
          <span className="numeral w-16 text-right text-xl font-medium">
            {winnerScore}–{loserScore}
          </span>
        )}
      </div>
    </li>
  );
}
