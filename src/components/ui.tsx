import { formatDate } from "@/lib/format";

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "emerald" | "rose";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p
        className={
          "mt-1 truncate text-xl font-semibold " +
          (accent === "emerald"
            ? "text-emerald-600 dark:text-emerald-400"
            : accent === "rose"
              ? "text-rose-500 dark:text-rose-400"
              : "")
        }
      >
        {value}
      </p>
    </div>
  );
}

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function StreakBadge({ streak }: { streak: { type: "W" | "L"; count: number } | null }) {
  if (!streak || streak.count === 0) {
    return <span className="text-zinc-400 dark:text-zinc-600">—</span>;
  }
  const isWin = streak.type === "W";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold " +
        (isWin
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
          : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400")
      }
    >
      {streak.type}
      {streak.count}
    </span>
  );
}

export function MatchRow({
  winnerName,
  loserName,
  winnerScore,
  loserScore,
  playedAt,
  delta,
}: {
  winnerName: string;
  loserName: string;
  winnerScore?: number;
  loserScore?: number;
  playedAt: string;
  delta: number | null;
}) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
      <span>
        <span className="font-medium text-emerald-600 dark:text-emerald-400">{winnerName}</span>
        {delta !== null && (
          <span className="ml-1 text-xs text-emerald-600/70 dark:text-emerald-400/70">+{delta}</span>
        )}{" "}
        beat{" "}
        <span className="font-medium text-rose-500 dark:text-rose-400">{loserName}</span>
        {delta !== null && (
          <span className="ml-1 text-xs text-rose-500/70 dark:text-rose-400/70">-{delta}</span>
        )}
        {winnerScore !== undefined && loserScore !== undefined && (
          <span className="ml-1.5 text-zinc-400 dark:text-zinc-600">
            {winnerScore}-{loserScore}
          </span>
        )}
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(playedAt)}</span>
    </li>
  );
}
