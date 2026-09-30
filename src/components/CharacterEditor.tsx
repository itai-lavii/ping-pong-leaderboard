"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import type { Player } from "@/lib/types";
import {
  ACCESSORY_OPTIONS,
  EYE_OPTIONS,
  PLAYER_COLORS,
  defaultStyle,
  resolveStyle,
  type AvatarStyle,
  type AvatarStyles,
} from "@/lib/avatars";

function OptionButton({
  selected,
  onClick,
  label,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "flex flex-col items-center gap-1.5 rounded-2xl px-2 pb-2 pt-3 text-[11px] font-medium transition-colors " +
        (selected ? "bg-fg text-bg" : "bg-subtle text-muted hover:text-fg")
      }
    >
      {children}
      {label}
    </button>
  );
}

export default function CharacterEditor({
  players,
  avatars,
  colorIndexOf,
  initialPlayerId,
  onSaved,
  onClose,
}: {
  players: Player[];
  avatars: AvatarStyles;
  colorIndexOf: (id: string) => number;
  initialPlayerId: string;
  onSaved: (avatars: AvatarStyles) => void;
  onClose: () => void;
}) {
  const styleOf = (id: string) => resolveStyle(id, colorIndexOf(id), avatars[id]);
  const [playerId, setPlayerId] = useState(initialPlayerId);
  const [draft, setDraft] = useState<AvatarStyle>(() => styleOf(initialPlayerId));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  function selectPlayer(id: string) {
    setPlayerId(id);
    setDraft(styleOf(id));
    setNotice("");
  }

  const set = (patch: Partial<AvatarStyle>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setNotice("");
  };

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const res = await fetch(`/api/avatars/${playerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof body?.error === "string" ? body.error : "Couldn't save.");
      onSaved(body.avatars as AvatarStyles);
      setNotice("Saved");
    } catch (err) {
      // Still show the new look on this page so it can be tried out.
      onSaved({ ...avatars, [playerId]: draft });
      setNotice(`${err instanceof Error ? err.message : "Couldn't save."} Showing it here until you reload.`);
    } finally {
      setSaving(false);
    }
  }

  const name = players.find((p) => p.id === playerId)?.name ?? "";
  const ci = colorIndexOf(playerId);
  const saved = styleOf(playerId);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ animation: "fade-in 0.2s ease-out both" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Customize characters"
        onClick={(e) => e.stopPropagation()}
        className="card rise flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-b-none sm:rounded-b-[1.5rem]"
      >
        <header className="flex items-center justify-between px-6 pb-2 pt-6">
          <div>
            <h2 className="font-serif text-3xl font-medium leading-none tracking-tight">Characters</h2>
            <p className="mt-2 text-[13px] text-muted">Everyone sees the same characters.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-xl bg-subtle text-muted transition-colors hover:text-fg"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
          {/* who */}
          <div className="-mx-6 flex gap-2 overflow-x-auto px-6 py-3">
            {players.map((p) => {
              const active = p.id === playerId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPlayer(p.id)}
                  className={
                    "flex shrink-0 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium transition-colors " +
                    (active ? "bg-subtle text-fg" : "text-muted hover:text-fg")
                  }
                >
                  <Avatar
                    id={p.id}
                    colorIndex={colorIndexOf(p.id)}
                    style={active ? draft : avatars[p.id]}
                    size={40}
                  />
                  {p.name}
                </button>
              );
            })}
          </div>

          {/* preview */}
          <div className="mt-1 flex items-center gap-5 rounded-3xl bg-subtle/70 px-5 py-5">
            <div className="bob">
              <Avatar id={playerId} colorIndex={ci} style={draft} size={96} />
            </div>
            <div className="min-w-0">
              <p className="font-serif text-2xl font-medium leading-none">{name}</p>
              <div className="mt-3 flex gap-3">
                {(
                  [
                    ["neutral", "Normal"],
                    ["hot", "On fire"],
                    ["cold", "Cold"],
                  ] as const
                ).map(([mood, label]) => (
                  <div key={mood} className="flex flex-col items-center gap-1">
                    <Avatar id={playerId} colorIndex={ci} style={draft} mood={mood} size={36} />
                    <span className="text-[10px] text-muted">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="eyebrow mt-6">Color</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {PLAYER_COLORS.map((c, i) => (
              <button
                key={c}
                type="button"
                onClick={() => set({ color: i })}
                aria-label={`Color ${i + 1}`}
                aria-pressed={draft.color === i}
                className={
                  "size-9 rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110 " +
                  (draft.color === i ? "ring-2 ring-fg" : "ring-1 ring-line")
                }
                style={{ background: c }}
              />
            ))}
          </div>

          <p className="eyebrow mt-6">Face</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {EYE_OPTIONS.map((label, i) => (
              <OptionButton key={label} label={label} selected={draft.eyes === i} onClick={() => set({ eyes: i })}>
                <Avatar id={playerId} colorIndex={ci} style={{ ...draft, eyes: i, accessory: 0 }} size={40} />
              </OptionButton>
            ))}
          </div>

          <p className="eyebrow mt-6">Gear</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {ACCESSORY_OPTIONS.map((label, i) => (
              <OptionButton
                key={label}
                label={label}
                selected={draft.accessory === i}
                onClick={() => set({ accessory: i })}
              >
                <Avatar id={playerId} colorIndex={ci} style={{ ...draft, accessory: i }} size={40} />
              </OptionButton>
            ))}
          </div>

          <label className="relative mt-6 flex cursor-pointer items-center justify-between rounded-2xl bg-subtle px-4 py-3">
            <span className="text-sm font-medium">Rosy cheeks</span>
            <input
              type="checkbox"
              checked={draft.blush}
              onChange={(e) => set({ blush: e.target.checked })}
              className="peer sr-only"
            />
            <span className="relative h-6 w-10 rounded-full bg-line transition-colors peer-checked:bg-ball after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
          </label>
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={() => set(defaultStyle(playerId, ci))}
            className="btn btn-secondary"
          >
            Reset
          </button>
          <p className="min-w-0 flex-1 text-xs text-muted">{notice}</p>
          <button type="button" onClick={save} disabled={saving || !dirty} className="btn btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}
