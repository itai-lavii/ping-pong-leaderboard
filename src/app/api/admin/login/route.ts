import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkPasscode, tokenForPasscode } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const passcode = typeof body?.passcode === "string" ? body.passcode : "";

  if (!process.env.ADMIN_PASSCODE) {
    return NextResponse.json(
      { error: "Admin passcode is not configured on the server." },
      { status: 500 }
    );
  }

  if (!checkPasscode(passcode)) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE, tokenForPasscode(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
