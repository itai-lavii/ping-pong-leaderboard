import { NextResponse } from "next/server";
import { getAvatars, getPlayers, kv } from "@/lib/kv";
import { AVATARS_KEY, parseStyle } from "@/lib/avatars";

// Open to everyone, like recording a match: it's a household league.
export async function PUT(request: Request, ctx: RouteContext<"/api/avatars/[id]">) {
  const { id } = await ctx.params;
  const style = parseStyle(await request.json().catch(() => null));
  if (!style) {
    return NextResponse.json({ error: "That character setup isn't valid." }, { status: 400 });
  }

  try {
    const players = await getPlayers();
    if (!players.some((p) => p.id === id)) {
      return NextResponse.json({ error: "Unknown player." }, { status: 404 });
    }

    const avatars = { ...(await getAvatars()), [id]: style };
    await kv.set(AVATARS_KEY, avatars);
    return NextResponse.json({ avatars });
  } catch (error) {
    console.error("Failed to save avatar in KV:", error);
    return NextResponse.json({ error: "Couldn't save the character. Try again." }, { status: 500 });
  }
}
