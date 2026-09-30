import { NextResponse } from "next/server";
import { getAvatars, getMatches, getPlayers } from "@/lib/kv";

export async function GET() {
  try {
    const [players, matches, avatars] = await Promise.all([getPlayers(), getMatches(), getAvatars()]);
    return NextResponse.json({ players, matches, avatars });
  } catch (error) {
    console.error("Failed to load leaderboard from KV:", error);
    return NextResponse.json(
      { error: "Could not reach the leaderboard store. Check your KV environment variables." },
      { status: 500 }
    );
  }
}
