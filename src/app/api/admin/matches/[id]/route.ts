import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getMatches, getPlayers, kv } from "@/lib/kv";
import { MATCHES_KEY, PLAYERS_KEY, type Player } from "@/lib/types";

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

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/matches/[id]">) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const winnerId = typeof body?.winnerId === "string" ? body.winnerId : "";
  const loserId = typeof body?.loserId === "string" ? body.loserId : "";
  const winnerScore = Number(body?.winnerScore);
  const loserScore = Number(body?.loserScore);

  if (
    !winnerId ||
    !loserId ||
    winnerId === loserId ||
    !Number.isInteger(winnerScore) ||
    !Number.isInteger(loserScore) ||
    winnerScore < 0 ||
    loserScore < 0 ||
    winnerScore <= loserScore
  ) {
    return NextResponse.json(
      {
        error:
          "Winner and loser must be different players, and the winner's score must be a higher valid number.",
      },
      { status: 400 }
    );
  }

  try {
    const matches = await getMatches();
    const original = matches.find((m) => m.id === id);
    if (!original) {
      return NextResponse.json({ error: "Match not found." }, { status: 404 });
    }

    const players = await getPlayers();
    if (!players.some((p) => p.id === winnerId) || !players.some((p) => p.id === loserId)) {
      return NextResponse.json({ error: "Unknown player." }, { status: 400 });
    }

    // Revert the original match's effect on records, then apply the new one —
    // this stays correct even if the winner/loser themselves changed.
    const reverted = players.map((p) => {
      if (p.id === original.winnerId) return { ...p, wins: Math.max(0, p.wins - 1) };
      if (p.id === original.loserId) return { ...p, losses: Math.max(0, p.losses - 1) };
      return p;
    });
    const updatedPlayers: Player[] = reverted.map((p) => {
      if (p.id === winnerId) return { ...p, wins: p.wins + 1 };
      if (p.id === loserId) return { ...p, losses: p.losses + 1 };
      return p;
    });

    const updatedMatches = matches.map((m) =>
      m.id === id ? { ...m, winnerId, loserId, winnerScore, loserScore } : m
    );

    await Promise.all([
      kv.set(PLAYERS_KEY, updatedPlayers),
      kv.set(MATCHES_KEY, updatedMatches),
    ]);

    return NextResponse.json({ players: updatedPlayers, matches: updatedMatches });
  } catch (error) {
    console.error("Failed to edit match in KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
