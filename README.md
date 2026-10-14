# Steady

Personal goals app (PWA). Each goal is a page you name and build from blocks: metrics, tasks, a countdown, and notes. Spec: `REQUIREMENTS.md`.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind 4 · Drizzle + libSQL (local SQLite file, Turso when deployed) · passkeys (SimpleWebAuthn) · web push (VAPID) · Vercel.

## Run locally

Node 22.13+ (`nvm use`).

```bash
npm install
npm run setup:env   # writes .env.local with fresh secrets
npm run db:migrate  # creates data/steady.db
npm run dev
```

Open http://localhost:3000 and create the passkey. Locally, no setup code is needed for the first passkey. With `STEADY_DEV_LOGIN=1` in `.env.local`, the sign-in page also offers a passwordless local sign-in (dev server on localhost only).

To load a goal from a JSON file kept in `data/` (git ignores it):

```bash
npx tsx scripts/import-plan.mts data/my-goal.json
```

It's safe to rerun; existing goals, metrics, tasks, and notes are skipped. Set the Turso variables to run it against the deployed database.

## Goal drawings

Goal drawings come from two CC0 sets: Open Peeps by Pablo Stanley (parts in `src/lib/peeps/parts.json`, assembled by `/api/peep`) and Doodle Icons by Khushmeen Sidhu (`public/doodles/`). To rebuild them (the generators use their own React 18, so they live in their own folder):

```bash
cd scripts/drawings && npm install && npm run generate
```

## Checks

```bash
npm test && npm run typecheck && npm run lint
```

## Data

- Sensitive fields are AES-256-GCM encrypted before they reach the database (`src/db/schema.ts`, `enc*` columns). The key is `STEADY_DATA_KEY`; without it the data can't be read, so keep a copy somewhere safe.
- Schema changes: edit `src/db/schema.ts`, then `npm run db:generate`. Migrations run before every build.

## Deploy (Vercel + Turso)

1. Create a Turso database. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel.
2. Set `STEADY_TIME_ZONE` (for example `America/New_York`), `STEADY_SECRET`, `STEADY_DATA_KEY`, `STEADY_SETUP_CODE`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:` address), `CRON_SECRET`, and `ANTHROPIC_API_KEY` (for AI progress weights). Use new values, not the local ones.
3. Deploy, open the site on iPhone, enter the setup code, and create the passkey. Add to Home Screen, open it from there, and turn on notifications in Settings.
4. On cron-job.org, create a job:
   - URL: `https://<host>/api/cron/tick`
   - Schedule: every 5 minutes
   - Request header: `Authorization: Bearer <CRON_SECRET>`

## Phase 1 status

Home screen (greeting, upcoming tasks, drag-to-reorder goal grid, future goals, completed and archived goals), goals (rename, start, pause, complete, archive, reopen), blocks (countdown, metric, metric summary, tasks, notes), metrics (chart with plan line, status, weekly average for lb, 2 lb/week limit, milestones), tasks with dates and day-before reminders, progress estimate with AI weights and an explanation panel, Settings (name, notifications, AI, account), task and countdown notifications.

Next: Phase 2 blocks (streak, habit, checklist, decisions, links, and the others in `REQUIREMENTS.md`), then Copilot (Phase 3), then Withings, BookBox, places, calendar events, files, weather, and completion highlights (Phase 4).

## License

Steady is licensed under the GNU Affero General Public License v3.0 only (AGPL-3.0-only); see `LICENSE`. If you run a modified version for others over a network, you must offer them its source.

The goal drawings are CC0 (public domain): Open Peeps by Pablo Stanley and Doodle Icons by Khushmeen Sidhu. See the `LICENSE.md` files beside them.

Some animations use code from [Fancy Components](https://fancycomponents.dev) by Daniel Petho (MIT). See `THIRD_PARTY_NOTICES.md` for credits and license texts.
