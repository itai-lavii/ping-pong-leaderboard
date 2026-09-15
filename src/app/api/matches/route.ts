import { NextResponse } from "next/server";
import { getMatches, getPlayers, kv } from "@/lib/kv";
import { MATCHES_KEY, PLAYERS_KEY, type Match } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const winnerId = typeof body?.winnerId === "string" ? body.winnerId : "";
  const loserId = typeof body?.loserId === "string" ? body.loserId : "";

  if (!winnerId || !loserId || winnerId === loserId) {
    return NextResponse.json(
      { error: "Winner and loser must be different players." },
      { status: 400 }
    );
  }

  try {
    const players = await getPlayers();
    if (!players.some((p) => p.id === winnerId) || !players.some((p) => p.id === loserId)) {
      return NextResponse.json({ error: "Unknown player." }, { status: 400 });
    }

    const updatedPlayers = players.map((p) => {
      if (p.id === winnerId) return { ...p, wins: p.wins + 1 };
      if (p.id === loserId) return { ...p, losses: p.losses + 1 };
      return p;
    });

    const match: Match = {
      id: crypto.randomUUID(),
      winnerId,
      loserId,
      playedAt: new Date().toISOString(),
    };
    const updatedMatches = [...(await getMatches()), match];

    await Promise.all([
      kv.set(PLAYERS_KEY, updatedPlayers),
      kv.set(MATCHES_KEY, updatedMatches),
    ]);

    return NextResponse.json({ players: updatedPlayers, matches: updatedMatches });
  } catch (error) {
    console.error("Failed to record match in KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
