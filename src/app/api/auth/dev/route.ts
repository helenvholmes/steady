import { NextResponse, type NextRequest } from "next/server";
import { devLoginAllowed } from "@/lib/dev-login";
import { signedIn } from "@/lib/passkeys";

/** Local development only (see src/lib/dev-login.ts). 404 everywhere else. */
export async function POST(request: NextRequest) {
  // The Host header, not nextUrl: in `next dev`, nextUrl.hostname is the server's own name whatever the client asked for.
  const hostname = URL.parse(`http://${request.headers.get("host") ?? ""}`)?.hostname ?? "";
  if (!devLoginAllowed(hostname)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return signedIn({ ok: true });
}
