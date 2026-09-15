import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getMatches, getPlayers, kv } from "@/lib/kv";
import { MATCHES_KEY, PLAYERS_KEY } from "@/lib/types";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/matches/[id]">) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const matches = await getMatches();
    const match = matches.find((m) => m.id === id);
    if (!match) {
      return NextResponse.json({ error: "Match not found." }, { status: 404 });
    }

    const updatedMatches = matches.filter((m) => m.id !== id);
    const players = await getPlayers();
    const updatedPlayers = players.map((p) => {
      if (p.id === match.winnerId) return { ...p, wins: Math.max(0, p.wins - 1) };
      if (p.id === match.loserId) return { ...p, losses: Math.max(0, p.losses - 1) };
      return p;
    });

    await Promise.all([
      kv.set(MATCHES_KEY, updatedMatches),
      kv.set(PLAYERS_KEY, updatedPlayers),
    ]);

    return NextResponse.json({ players: updatedPlayers, matches: updatedMatches });
  } catch (error) {
    console.error("Failed to undo match in KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
