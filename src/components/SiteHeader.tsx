"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Leaderboard", short: "Board" },
  { href: "/elo", label: "How Elo works", short: "Elo" },
  { href: "/admin", label: "Admin", short: "Admin" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="font-serif text-2xl font-medium italic leading-none tracking-tight">Ping Pong</span>
        <span className="eyebrow hidden sm:inline">League</span>
      </Link>
      <nav className="flex items-center gap-1 rounded-2xl bg-surface p-1 text-[13px] shadow-[var(--shadow)]">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "rounded-xl px-3 py-1.5 transition-colors " +
                (active ? "bg-subtle font-medium text-fg" : "text-muted hover:text-fg")
              }
            >
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
