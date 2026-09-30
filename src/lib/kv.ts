import { Redis } from "@upstash/redis";
import { INITIAL_PLAYERS, MATCHES_KEY, PLAYERS_KEY, type Match, type Player } from "@/lib/types";
import { AVATARS_KEY, type AvatarStyles } from "@/lib/avatars";

export const kv = Redis.fromEnv();

export async function getPlayers(): Promise<Player[]> {
  return (await kv.get<Player[]>(PLAYERS_KEY)) ?? INITIAL_PLAYERS;
}

export async function getMatches(): Promise<Match[]> {
  return (await kv.get<Match[]>(MATCHES_KEY)) ?? [];
}

export async function getAvatars(): Promise<AvatarStyles> {
  return (await kv.get<AvatarStyles>(AVATARS_KEY)) ?? {};
}
