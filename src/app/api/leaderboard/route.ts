import { NextResponse } from "next/server";
import { getMatches, getPlayers } from "@/lib/kv";

export async function GET() {
  try {
    const [players, matches] = await Promise.all([getPlayers(), getMatches()]);
    return NextResponse.json({ players, matches });
  } catch (error) {
    console.error("Failed to load leaderboard from KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
