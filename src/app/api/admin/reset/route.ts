import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getPlayers, kv } from "@/lib/kv";
import { MATCHES_KEY, PLAYERS_KEY } from "@/lib/types";

export async function POST() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  try {
    const players = await getPlayers();
    const resetPlayers = players.map((p) => ({ ...p, wins: 0, losses: 0 }));

    await Promise.all([kv.set(PLAYERS_KEY, resetPlayers), kv.set(MATCHES_KEY, [])]);

    return NextResponse.json({ players: resetPlayers, matches: [] });
  } catch (error) {
    console.error("Failed to reset leaderboard in KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
