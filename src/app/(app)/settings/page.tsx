import { AccountActions } from "@/components/account-actions";
import { Header } from "@/components/header";
import { PasswordForm } from "@/components/password-form";
import { PushToggle } from "@/components/push-toggle";
import { Submit } from "@/components/submit";
import { FRAME_COLORS } from "@/lib/frame";
import { TZ } from "@/lib/dates";
import { hasPassword } from "@/lib/password";
import { getSettings } from "@/lib/settings";
import { CURRENCIES } from "@/lib/units";
import { saveSettingsForm } from "../actions/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { saved } = await searchParams;
  const [s, passwordSet] = await Promise.all([getSettings(), hasPassword()]);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <Header title="Settings" back="/" />

      <form action={saveSettingsForm} className="flex flex-col gap-5">
        <section className="card flex flex-col gap-3">
          <h2 className="h2">Profile</h2>
          <label>
            <span className="label">Your name (for the greeting)</span>
            <input className="field" name="userName" defaultValue={s.userName} maxLength={60} placeholder="you" autoComplete="given-name" />
          </label>
          <fieldset>
            <legend className="label">Frame color</legend>
            <div className="flex flex-wrap gap-2">
              {FRAME_COLORS.map((c) => (
                <label key={c.id} className="chip gap-2 has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:outline-2">
                  <input type="radio" name="frameColor" value={c.id} defaultChecked={s.frameColor === c.id} className="sr-only" />
                  <span
                    aria-hidden
                    className="size-4 rounded-full border border-line bg-[var(--swatch-light)] dark:bg-[var(--swatch-dark)]"
                    style={{ "--swatch-light": c.light, "--swatch-dark": c.dark } as React.CSSProperties}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="frameAnimated" defaultChecked={s.frameAnimated} className="size-5 shrink-0 accent-[var(--accent)]" />
            Animated gradient in the frame
          </label>
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="h2">Units</h2>
          <label className="flex flex-wrap items-center justify-between gap-2">
            <span>Currency</span>
            <select className="field w-40" name="currency" defaultValue={s.currency}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c} ({currencySymbol(c)})
                </option>
              ))}
            </select>
          </label>
          <p className="-mt-1 text-xs text-muted">Changes the symbol on money goals. Amounts aren&apos;t converted.</p>
          <fieldset className="flex flex-wrap items-center justify-between gap-2">
            <legend className="sr-only">Weight</legend>
            <span aria-hidden>Weight</span>
            <div className="flex gap-2">
              {(
                [
                  ["imperial", "Imperial (lb)"],
                  ["metric", "Metric (kg)"],
                ] as const
              ).map(([v, text]) => (
                <label key={v} className="chip has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:outline-2">
                  <input type="radio" name="unitSystem" value={v} defaultChecked={s.unitSystem === v} className="sr-only" />
                  {text}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="-mt-1 text-xs text-muted">Switching converts your weight goals and entries.</p>
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="h2">Notifications</h2>
          <Toggle name="notify.morningDigest" on={s.notify.morningDigest} label="Morning digest (tasks due today, future goals ready to start)" />
          <Toggle name="notify.taskReminder" on={s.notify.taskReminder} label="Day-before reminders (tasks that ask for one)" />
          <label className="flex flex-wrap items-center justify-between gap-2">
            <span>Time for task notifications</span>
            <input className="field w-32" type="time" name="taskDueTime" defaultValue={s.taskDueTime} required />
          </label>
          <Toggle name="notify.countdownMilestone" on={s.notify.countdownMilestone} label="Countdown milestones" />
          <div>
            <span className="label">Quiet hours</span>
            <div className="flex items-center gap-2">
              <input className="field w-32" type="time" name="quietStart" defaultValue={s.quietStart} required aria-label="Quiet hours start" />
              <span className="text-muted">to</span>
              <input className="field w-32" type="time" name="quietEnd" defaultValue={s.quietEnd} required aria-label="Quiet hours end" />
            </div>
          </div>
          <p className="text-xs text-muted">At most 5 a day. Notifications show counts only, never task titles or goal names. Times are in {TZ.replace(/_/g, " ")}.</p>
        </section>

        <section className="card flex flex-col gap-3">
          <h2 className="h2">AI</h2>
          <Toggle name="ai.weights" on={s.ai.weights} label="Weight progress bars by what each part is worth" />
          <p className="-mt-2 text-xs text-muted">
            Sends goal and metric names, units, start and target values, dates, and task titles to Claude. No notes or history. Off means every part
            counts equally.
          </p>
          <Toggle name="ai.highlights" on={s.ai.highlights} label="Write highlights when a goal is completed" />
          <Toggle name="ai.highlightsIncludeNotes" on={s.ai.highlightsIncludeNotes} label="Include notes in highlights" />
          <p className="-mt-2 text-xs text-muted">Completion highlights arrive in a later update.</p>
        </section>

        <Submit>Save settings</Submit>
        {saved && <p className="text-center text-sm text-accent">Saved.</p>}
      </form>

      <section className="card flex flex-col gap-3">
        <h2 className="h2">This device</h2>
        <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="h2">Connections</h2>
        <p className="text-sm text-muted">Copilot Money, BookBox, Withings, Google Maps, and iOS Calendar connect here in later updates.</p>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="h2">Account</h2>
        <AccountActions />
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="h2">Password</h2>
        <PasswordForm hasPassword={passwordSet} />
      </section>
    </div>
  );
}

function Toggle({ name, on, label }: { name: string; on: boolean; label: string }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={name} defaultChecked={on} className="size-5 shrink-0 accent-[var(--accent)]" />
      {label}
    </label>
  );
}

const currencySymbol = (code: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: code }).formatToParts(0).find((p) => p.type === "currency")?.value ?? code;
