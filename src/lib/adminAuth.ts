import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_token";

function sign(passcode: string): string {
  return crypto.createHash("sha256").update(passcode).digest("hex");
}

export function checkPasscode(passcode: string): boolean {
  const expected = process.env.ADMIN_PASSCODE;
  return typeof expected === "string" && expected.length > 0 && passcode === expected;
}

export function tokenForPasscode(passcode: string): string {
  return sign(passcode);
}

export async function isAdminRequest(): Promise<boolean> {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) return false;
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return token === sign(expected);
}
