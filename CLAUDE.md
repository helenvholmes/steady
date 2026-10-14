# Steady

Personal, single-user goals app, as a progressive web app (iPhone Home Screen + Mac Dock). Each goal is a page the user names and assembles from blocks. Full spec: `REQUIREMENTS.md`. Read it before any work.

## Build order
1. Phase 1 first: home screen (greeting, goal grid, drag to reorder; no tasks), goals with rename, future goals, complete and archive, blocks (countdown, metric, metric summary, tasks, notes), progress estimate with AI weights and explanation, Settings (profile, notifications, AI, account), task reminders and countdown milestone notifications, importing a goal from a JSON file.
2. Phase 2: the remaining blocks that need no new services (streak, habit, log, rating, reminders, phases, checklist, decisions, budget, links, contacts, key facts, and others listed in `REQUIREMENTS.md`).
3. Phase 3: Copilot (Connections in Settings, CSV import, goal linking, spending block, money reminders).
4. Phase 4: Withings (weight and steps), Hevy (workouts per week, personal records on lifts), BookBox, Google Maps places, service views, calendar events, files and photos, weather, completion summary with AI highlights, data export and delete-all.
5. Start a phase only after the one before it works end to end.

## Rules
1. Single user. Sign in with a passkey, or an optional password set in Settings (scrypt hash, limited wrong tries). No sharing, no analytics, no third-party tracking scripts.
2. Encrypt records at rest. Store tokens and keys (Withings, Hevy, BookBox) encrypted server-side.
3. Notifications and any widget carry counts and times only. No task titles, amounts, notes, or goal names.
4. Streaks are allowed only as a block the user adds; a broken streak is stated in neutral text and never notified. No penalties or red warnings anywhere in the UI. Tasks past their date say "date passed" in neutral text.
5. Units come from Settings: a currency for money (any ISO code; switching relabels, never converts) and imperial (lb) or metric (kg) for weight (switching converts stored weights; Withings returns kg). Block plans needing more than 2 lb (0.9 kg) loss per week; ask for a later target date.
6. Each core action must take under 30 seconds on a phone.
7. Copilot imports keep only monthly totals and row hashes. Never store transaction rows.
8. AI is used only for progress weights and completion highlights, server-side, with the data listed in `REQUIREMENTS.md`. Both work without AI (equal weights; numbers-only summary). No other AI features.
9. Nothing depends on a goal's name or on any one user's data. Personal data (imports, `.env.local`, `data/`) never goes in the repository.

## Open questions
See "Open questions" and the **[Decide]** items in `REQUIREMENTS.md`. Ask the user before deciding any of them.

## When to ask
1. Routine implementation details (naming, file layout, library helpers, UI copy within the rules above): do not ask. Make a reasonable assumption, record it in your final message, and continue. Flag gaps in the output instead of stopping.
2. Still ask before: deciding an open question, changing the stack, or any destructive or hard-to-reverse action (deleting or overwriting files you did not create, reinstalling dependencies, rewriting history).
3. Other Claude sessions may work in this folder. Before creating or overwriting files, check what is already here (`git status`, `ls`) and do not replace another session's work.

## Stack
Confirmed 2026-10-12: Next.js 16 App Router, TypeScript, Tailwind 4, Drizzle + libSQL (Turso when deployed), passkeys via SimpleWebAuthn, web push via VAPID, Vercel. cron-job.org calls `/api/cron/tick` every 5 minutes. Read `AGENTS.md` before writing Next.js code. Node 22.13+ (`.nvmrc`).

Added 2026-10-13 (all called from the server):
- Claude API for progress weights (Phase 1) and completion highlights (Phase 4), key in an environment variable.
- Vercel Blob for files and photos (Phase 4), encrypted before upload.
- Open-Meteo for the weather block (Phase 4); no key, sends only coordinates.

Added 2026-10-14: Hevy public API for workouts and lifts (Phase 4), with the user's Hevy Pro API key stored encrypted.
