import { connection } from "next/server";
import { AnimatedFrame } from "@/components/animated-frame";
import { RegisterServiceWorker } from "@/components/register-sw";
import { frameColor } from "@/lib/frame";
import { ensureSeeded } from "@/lib/seed";
import { getSettings } from "@/lib/settings";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Every screen shows personal data and "today", so nothing here is prerendered at build time.
  await connection();
  await ensureSeeded();
  const settings = await getSettings();
  const frame = frameColor(settings.frameColor);
  return (
    <>
      {/* The chosen frame color, from fixed presets (never user-typed CSS). */}
      <style>{`:root{--frame:${frame.light}}@media (prefers-color-scheme: dark){:root{--frame:${frame.dark}}}`}</style>
      {settings.frameAnimated && <AnimatedFrame colorId={frame.id} />}
      <main className="mx-auto max-w-5xl px-4 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),32px)]">{children}</main>
      <RegisterServiceWorker />
    </>
  );
}
