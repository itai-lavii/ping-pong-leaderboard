import { NextResponse } from "next/server";
import { getPlayers, kv } from "@/lib/kv";
import { makeId } from "@/lib/id";
import { PLAYERS_KEY } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Player name is required." }, { status: 400 });
  }

  try {
    const players = await getPlayers();

    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json(
        { error: `${name} is already on the leaderboard.` },
        { status: 409 }
      );
    }

    const id = makeId(name, players.map((p) => p.id));
    const updated = [...players, { id, name, wins: 0, losses: 0 }];
    await kv.set(PLAYERS_KEY, updated);

    return NextResponse.json({ players: updated });
  } catch (error) {
    console.error("Failed to add player in KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
