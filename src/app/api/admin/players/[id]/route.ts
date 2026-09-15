import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getPlayers, kv } from "@/lib/kv";
import { PLAYERS_KEY } from "@/lib/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/players/[id]">) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const wins = Number(body?.wins);
  const losses = Number(body?.losses);

  if (!Number.isInteger(wins) || wins < 0 || !Number.isInteger(losses) || losses < 0) {
    return NextResponse.json(
      { error: "Wins and losses must be non-negative whole numbers." },
      { status: 400 }
    );
  }

  try {
    const players = await getPlayers();
    if (!players.some((p) => p.id === id)) {
      return NextResponse.json({ error: "Unknown player." }, { status: 404 });
    }

    const updated = players.map((p) => (p.id === id ? { ...p, wins, losses } : p));
    await kv.set(PLAYERS_KEY, updated);

    return NextResponse.json({ players: updated });
  } catch (error) {
    console.error("Failed to update player in KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
