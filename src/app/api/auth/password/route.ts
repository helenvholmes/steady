import { NextResponse, type NextRequest } from "next/server";
import { signedIn } from "@/lib/passkeys";
import { checkPassword } from "@/lib/password";

/** Password sign-in (when a password is set in Settings). */
export async function POST(request: NextRequest) {
  const { password } = (await request.json().catch(() => ({}))) as { password?: unknown };
  if (typeof password !== "string" || password.length === 0 || password.length > 1000) {
    return NextResponse.json({ error: "Enter your password." }, { status: 400 });
  }
  const result = await checkPassword(password);
  if (result === "ok") return signedIn({ ok: true });
  if (result === "locked") {
    return NextResponse.json({ error: "Too many wrong tries. Wait 15 minutes, or sign in with your passkey." }, { status: 429 });
  }
  return NextResponse.json({ error: result === "none" ? "No password is set." : "That password isn't right." }, { status: 401 });
}
