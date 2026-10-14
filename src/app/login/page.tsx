import { devLoginEnabled } from "@/lib/dev-login";
import { passkeyCount } from "@/lib/passkeys";
import { hasPassword } from "@/lib/password";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const [hasPasskey, passwordSet] = await Promise.all([passkeyCount().then((n) => n > 0), hasPassword()]);
  const needsCode = !!process.env.STEADY_SETUP_CODE || !!process.env.VERCEL;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="h1">Steady</h1>
        <p className="mt-1 text-muted">{hasPasskey || passwordSet ? "Sign in to continue." : "Create the passkey for this app."}</p>
      </div>
      <LoginForm hasPasskey={hasPasskey} hasPassword={passwordSet} needsCode={needsCode} devLogin={devLoginEnabled()} next={typeof next === "string" && next.startsWith("/") ? next : "/"} />
    </main>
  );
}
