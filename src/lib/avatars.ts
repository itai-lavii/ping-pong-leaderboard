/**
 * Character customization. Each field is an index into the option lists
 * below; anything a player hasn't picked falls back to a default derived from
 * their id, so un-customized characters look the same as they always have.
 */
export interface AvatarStyle {
  color: number;
  eyes: number;
  accessory: number;
  blush: boolean;
}

export type AvatarStyles = Record<string, Partial<AvatarStyle>>;

export const AVATARS_KEY = "ping-pong:avatars";

export const PLAYER_COLORS = [
  "#ff8a4c",
  "#4c8dff",
  "#2fbf71",
  "#a970ff",
  "#ffb020",
  "#ff5c8a",
  "#20bfc5",
  "#8a8f98",
  "#f4f1e8",
  "#e5484d",
];

export const EYE_OPTIONS = ["Dots", "Big", "Chill", "Focused"];
export const ACCESSORY_OPTIONS = ["None", "Sweatband", "Cap", "Shades", "Sprout", "Spikes", "Crown", "Headphones"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The look a player gets before anyone customizes them. */
export function defaultStyle(id: string, colorIndex: number): AvatarStyle {
  const h = hash(id);
  return {
    color: colorIndex % 8,
    eyes: h % 3,
    accessory: (h >>> 3) % 6,
    blush: ((h >>> 7) & 1) === 1,
  };
}

export function resolveStyle(id: string, colorIndex: number, custom?: Partial<AvatarStyle>): AvatarStyle {
  return { ...defaultStyle(id, colorIndex), ...custom };
}

function inRange(n: unknown, length: number): n is number {
  return Number.isInteger(n) && (n as number) >= 0 && (n as number) < length;
}

/** Validates an untrusted request body; returns null if anything is off. */
export function parseStyle(body: unknown): AvatarStyle | null {
  const b = body as Record<string, unknown> | null;
  if (
    !b ||
    !inRange(b.color, PLAYER_COLORS.length) ||
    !inRange(b.eyes, EYE_OPTIONS.length) ||
    !inRange(b.accessory, ACCESSORY_OPTIONS.length) ||
    typeof b.blush !== "boolean"
  ) {
    return null;
  }
  return { color: b.color, eyes: b.eyes, accessory: b.accessory, blush: b.blush };
}
