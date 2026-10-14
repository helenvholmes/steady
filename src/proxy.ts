import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except sign-in, the passkey API, the cron endpoint (it checks CRON_SECRET itself),
  // the service worker and its static offline page, and the assets the Home Screen needs before signing in.
  matcher: ["/((?!login|api/auth/|api/cron/|sw\\.js|offline\\.html|_next/static|_next/image|manifest.webmanifest|favicon.ico|icon|apple-icon|icons/).*)"],
};
