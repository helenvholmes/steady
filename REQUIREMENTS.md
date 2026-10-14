# Steady — Goals App Requirements

> Approved 2026-10-13. Items marked **[Decide]** need an answer before they're built.

## Purpose

Steady is a personal app for long-term life goals. Each goal is a page the user names and assembles from blocks: the numbers that measure it, the tasks it needs, its dates, and notes. Data comes from the services the user already uses (Copilot Money, BookBox, Withings, Hevy, Google Maps) instead of being typed in.

1. See where each goal stands at a glance, with an estimate of overall progress.
2. Track the tasks each goal needs, with dates, so nothing time-bound is missed.
3. Pull in real data, and link goals that already exist in other apps.
4. Keep a list of future goals to start later.
5. Mark goals complete and look back on what it took.
6. Stay low-pressure: streaks are there to motivate, never to penalize. No red warnings.

## Platform

A progressive web app, installed to the Home Screen on iPhone and the Dock on Mac. Web push for notifications. Single user; sign in with a passkey, or an optional password. Stack as confirmed in `CLAUDE.md`.

**Look.** White page in a colored frame, EB Garamond, navy ink and rules ("Literary"). Light and dark mode follow the device setting.

## Home screen

1. **Greeting.** A different salutation on each load in the upper left, large and upright: "Hello", "Greetings!", "Salutations.", "Hey there, stranger", and others, with the name when one is set ("Greetings, [name]!"). The name is set in Settings. Under it, today's date in muted italic text, such as "Tuesday, October 13th".
2. **Goal grid.** Active goals in the user's order of importance:
   1. Row 1: one large card.
   2. Row 2: two cards.
   3. Row 3 and after: four cards per row.
   4. On iPhone width, rows after row 2 show two cards per row, because four don't fit at a readable size.
3. **Hover.** On devices with a pointer, a card lifts (a little bigger and higher, with a soft shadow, easing in and out). Cards have 8px corners and no divider line. Reduced motion keeps only the shadow.
4. **Reordering.** Each card has a drag handle in its upper right corner, shown on hover (always shown on touch screens). Drag the handle to move the card to a new place; the layout fills again in the new order. With a keyboard, focus the handle, press Space to pick the card up, move it with the arrow keys, and press Space to drop it.
5. **Card contents.** The goal's drawing (if chosen), goal name, progress bar (see Progress estimate), and days left if the goal has a target date. No tasks, dates, metrics, or percentage on the home screen; the goal page has the rest.
6. **No tasks on home.** Tasks appear only on goal pages.
7. **Future goals.** Below the active grid, a "Future goals" section with compact cards (name and optional "start by" date), in their own order. Drag to reorder within the section. A card's "Start" action makes the goal active. The section is always shown open, with every future goal visible.
8. **Completed and archived goals.** Below future goals, at reduced opacity. Completed goals carry a 🎉 marker. They aren't part of the drag order.
9. **New goal.** A button to create a goal, either active or future.

## Goals

A goal is one page the user names and builds, for example "Move to a new city" or "Run a half marathon".

1. **Fields.** Name, optional drawing (see Goal drawings), optional target date (shows a countdown), optional countdown milestones (default 365, 180, 100, 30, 7 days left), start date (default: created date), status (future, active, completed, archived), order.
2. **Rename.** The user can rename a goal at any time. Nothing in the app depends on a goal's name.
3. **Blocks.** A goal page is a single column of blocks. The user adds a block with the "+" in the page's top right corner (a menu of block types, each with a one-line description), edits its settings, moves it up or down, and removes it. A new goal starts with a tasks block and a notes block, plus a countdown block if it has a target date.
4. **Complete.** "Mark complete" sets the status and records the completed date. The goal moves to the bottom of the home screen with a 🎉 marker. The goal page shows a completion summary at the top (see Completion summary). The user can reopen a completed goal.
5. **Archive.** "Archive" sets the status without a celebration. The goal moves to the bottom of the home screen at reduced opacity. Its data stays, and it can be restored.

### Goal drawings

Each goal can have a hand-drawn person or a hand-drawn icon beside its name, on its page and on its home card.

1. **Source.** Open Peeps by Pablo Stanley (openpeeps.com), released under CC0. `scripts/drawings/peeps.mjs` extracts the parts as two-tone markup (navy ink on white): 26 outfits, 53 hairstyles, 16 faces, 16 beards, and 9 glasses. The app assembles a drawing from parts (`/api/peep`), and the generator checks that assembled drawings match Open Peeps exactly.
2. **Icons.** Doodle Icons by Khushmeen Sidhu (khushmeen.com/icons), released under CC0: 400 icons in 13 categories, recolored to navy ink by `scripts/drawings/doodles.mjs` and served from `public/doodles/`. Brand logos and interface arrows are left out.
3. **Choosing.** On the goal page, tapping the drawing (or "Add a drawing") opens an editor with two tabs. Person: a live preview, previous and next for each part (outfit, hair, face, beard, glasses), Shuffle, and 52 ready-made drawings to start from. Icon: category filters, search, and a grid. Save, Remove drawing, or Cancel.
4. **Placement.** The drawing sits small at the left of the goal's name, in a square box so people and icons line up, on the goal page and on every home card.
5. **Dark mode.** The drawings invert so the ink is light on dark.

### Future goals

A future goal is one the user wants to work on later but isn't working on now, for example "Learn Italian" or "Run a half marathon".

1. **Creating.** Name only is required. Optional: a "start by" date, notes, and blocks, so the user can sketch tasks and metrics ahead of time.
2. **Quiet.** A future goal has no progress bar, no plan line or ahead/behind status, no countdown, and sends no notifications. Its tasks don't trigger reminders. The one exception is its start-by date (item 4).
3. **Starting.** "Start" makes the goal active and sets its start date to today. Metrics on it take today as their start date unless the user set one. The goal joins the end of the active grid, where the user can drag it into place.
4. **Start-by date.** If set, the card shows it in neutral text ("start by March 2027"). Once the date passes, the card says "ready to start", with no warning. On the start-by date, the goal is counted once in the morning digest (see Notifications): "1 future goal is ready to start".
5. **Moving back.** An active goal can be moved to future goals ("Pause for later"). Its data stays; its notifications stop.

### Block types

The user adds any of these to a goal, in any order. Each block has its own settings.

**Progress and numbers**

| Block | Shows | Settings |
| --- | --- | --- |
| Countdown | Days left to the goal's target date and the milestone marks | Milestone days |
| Metric | One number with a target: current value, status (ahead, on plan, behind), chart with plan line, milestones, entries | The metric it shows |
| Metric summary | Several metrics as compact rows with status | Which metrics |
| Streak | Consecutive days (or weeks) a daily target was met: current streak, best streak, and a calendar strip of recent days | Target (for example, 10,000 steps), period (day or week), source (Withings steps, a metric, a habit, or manual check-off) |
| Habit | How many times this week something was done against a weekly target, for example "lifting 3× a week" | Weekly target, source (manual check-off or connected data) |
| Log | Quick dated entries with an optional number and unit, for example a run's distance or hours studied | Unit, whether to chart the numbers |
| Rating | A 1–10 check-in the user defines, for example "confidence about the move", charted over time | Question, how often to ask |
| Before and after | Where the goal started next to where it is now: metric start and current values, and optional photos | Which metrics; photos |

**Planning**

| Block | Shows | Settings |
| --- | --- | --- |
| Tasks | The goal's tasks: past-date and upcoming first, then undated, then done (collapsed) | Show done tasks or not; filter to one metric |
| Reminders | Standalone reminders with a date and time, not tied to a task, for example "call the landlord Friday at 10" | None |
| Phases | Named stages with dates on a timeline, for example "Car paid off" → "Lease signed" → "Movers booked" → "Moved". Each is planned, current, or done | None |
| Calendar events | Dated events for the goal, for example apartment viewings or a flight | Source (see Calendar events) |
| Checklist | Undated lists with check-off, for example a packing list or accounts to close. Can be reset to reuse | List name |
| Decisions | Open questions with options, notes, a due date, and a chosen option once decided | None |
| Budget | Expected costs against actual for one-time spending, for example deposit, movers, first month's rent | Currency |

**Reference**

| Block | Shows | Settings |
| --- | --- | --- |
| Notes | Dated notes, newest first, searchable | None |
| Links | Saved links with a title and note, for example listings or a neighborhood guide | None |
| Files and photos | Uploaded documents and images, for example a lease PDF or an apartment photo | None |
| Contacts | People involved in the goal: name, role, phone, email, note, for example landlord, mover, loan officer | None |
| Key facts | A small table of label and value pairs, for example "Lease ends: June 30", "Loan APR: 6.5%" | None |
| Why | One line about why the goal matters, shown large | Text |
| Places | A Google Maps list: places visited and places still to visit | Which list |
| Collection | A list of items with to do, doing, and done states, for example books to read, courses, recipes | Item label, states |

**Reflection**

| Block | Shows | Settings |
| --- | --- | --- |
| Wins | Small victories as they happen, dated. Also used by the completion highlights | None |
| Retrospective | A recurring prompt ("What went well? What's in the way?") with dated answers | How often (default monthly) |

**Connected data**

| Block | Shows | Settings |
| --- | --- | --- |
| Spending | Copilot spending by category for the current month against monthly targets | Categories and monthly targets |
| Service view | Live data from a connected service without making it a metric, for example BookBox currently reading, a Withings steps or weight trend, a Copilot category over 6 months | Service and view |
| Weather | Current conditions and forecast for a place tied to the goal, for example the destination of a move | Place |

### Block details

1. **Streaks.** A day counts when the target is met (for example, Withings reports 10,000 or more steps). The current streak, best streak, and a strip of the last 30 days are shown. When a streak ends, the block says so in neutral text ("Streak ended at 12 days. Best: 30.") and starts again; no red, no notification about the break. Days with no data (for example, the watch wasn't worn) show as "no data" and are skipped: they neither extend nor end the streak.
2. **Withings steps on a weight goal.** A goal can have a weight metric and a 10,000-steps streak, both from Withings.
3. **Habits** count check-offs in the current week (Monday to Sunday) against the target. A habit can feed a streak (weeks the target was met).
4. **Reminders** send a notification at their time. Like all notifications, it doesn't include the reminder's text ("You have a reminder at 10:00").
5. **Calendar events.** Events come from two sources, shown together:
   1. **Typed.** Title, date, optional start and end time, location, and note, added in the block.
   2. **Imported from iOS Calendar.** A web app can't read the iOS calendar directly, so an iOS Shortcut ("Steady Calendar Sync") reads events from calendars the user chooses and posts them to `POST /api/v1/calendar-import` with a calendar token. It runs each morning by a personal automation and can be run by hand. It sends the next 30 days, and Steady replaces all imported events in that window with the posted list, so moved or deleted events update. Events are matched by a hash of calendar, start, and title.
   3. **Which goal.** The user maps each imported calendar to a goal, or assigns single events to a goal from the block. Unassigned imported events aren't shown.
   4. **Token.** The calendar token can only post events, is separate from the login, and can be revoked in Settings.
   5. Events can also be published to the subscribed ICS feed if that's chosen for tasks.
6. **Files and photos** are encrypted before upload and stored in file storage, viewable only after sign-in. Limit 25 MB per file. Stored in Vercel Blob, as BookBox does. The encryption key never leaves the server.
7. **Weather** comes from Open-Meteo, which needs no key or account. Steady calls it from the server and sends only the place's coordinates. Results are cached for an hour.
8. **Service views** fetch data when the block is shown and don't store it, so BookBox titles stay in BookBox.
9. **Phases and Decisions** can be linked to tasks: a decision can create a task for its next step, and a phase can show the tasks it contains.
10. **Budget** is for one-time costs. Each line has an expected amount and an actual amount that is either typed in or taken from a Copilot category (the category's total over a date range the user sets on the line). The user picks typed or Copilot per line.

## Progress estimate

Each goal has a progress bar from 0 to 100% that estimates where the user is, from the goal's data.

1. **Inputs.** Each metric on the goal contributes how far its current value is from start to target (0–100%). Tasks contribute the share done, counting only tasks that are done or have a date. A goal with only a countdown uses the share of time passed from start date to target date.
2. **Combining.** The estimate is a weighted average of the inputs. AI sets the weights automatically, based on how much each input is worth to the goal (for example, paying off a $20,000 loan counts for more than topping up a fund that's 98% done).
   1. **When.** Weights are set when an input is added to or removed from the goal, or a metric's target changes. They don't change when values change, so the bar doesn't jump around.
   2. **Data sent.** The goal's name and target date; each metric's name, unit, start value, target value, and target date; the number of tasks and their titles. No notes, no entry history.
   3. **Reasons and summary.** Each weight comes with a one-line reason (shown as a hint in the weights popover), and the set comes with a one- or two-sentence summary of how the bar is calculated, shown in the tooltip. The summary doesn't mention current values, since it's kept until the inputs change.
   4. **Adjusting.** "Adjust weights" under the bar opens a small popover where the user can change any weight. A changed weight is kept and isn't reset by later AI updates; the other weights are rescaled around it.
   5. **Fallback.** If AI is turned off in Settings or the call fails, every metric counts once and all tasks together count once, and the tooltip says each part counts equally.
3. **Freshness.** If an input's data is older than its check-in period (for example, Copilot data from last month), the tooltip says so. The estimate still uses it.
4. **Explanation.** On the goal page only (home cards show a plain bar), the bar, its end dot, and the percentage count up from 0 when the page loads (about 0.6 seconds, easing in and out; instant with reduced motion). Hovering or focusing the end marker on Mac, or tapping it on iPhone, shows a small tooltip that springs up from the marker: one or two sentences on how the bar is calculated. With AI weights, that's AI's summary; otherwise a plain sentence from the weights, for example "Loan counts most (50%), then Tasks (30%) and Savings (20%)."
5. **Plan comparison.** A thin mark on the bar shows where the plan expected the user to be today (from the metrics' plan lines and the target date), so ahead or behind is visible without color.

## Completion summary

Shown at the top of a completed goal.

1. **Time taken.** From the goal's start date to its completed date, for example "1 year, 2 months, 4 days".
2. **Numbers.** Each metric's start and final value, tasks done, and notes written.
3. **Highlights.** A short paragraph written by AI about what was impressive about reaching the goal, for example a large car payoff ahead of plan, or steady monthly contributions.
   1. Generated once, when the goal is marked complete, and stored (encrypted). The user can regenerate it or edit the text.
   2. Data sent: the goal's name, dates, metric names, units, values over time, milestones reached, and task titles with dates. Notes are not sent unless the user turns that on for the summary. **[Decide]** Confirm this data list.
   3. Sent to the Claude API from the server. The API key stays on the server. The only other AI use is progress weights (see Progress estimate). No AI chat.
   4. If the AI call fails or is turned off in Settings, the summary shows the numbers without highlights.

## Metrics

A metric is a number with a target and a target date, measured inside a goal.

1. **Setup.** Name, goal, unit (a currency code such as USD or EUR, lb or kg, places, books, or any word; the suggestions follow Settings), kind (value: each entry is a reading; count: each entry adds to a total), start value, target value, start date, target date, check-in frequency (default weekly), milestone step (default every 10%), source.
2. **Sources.** Manual entry, Copilot CSV, Withings, Hevy, BookBox, or Google Maps list. A metric has one source, chosen when it's created and changeable later. A money metric can be either a typed balance (the user enters the current balance at each check-in) or Copilot contributions (summed from imports, starting at 0).
3. **Linked goals in other apps.** A metric can be linked to a goal that already exists in BookBox or Copilot (see Integrations). A linked metric takes its name, target, and target date from that goal by default. The user can override them.
4. **Progress.** Line chart with a straight plan line from start to target. Status is ahead, on plan, or behind against the plan line. When behind, the app shows the new rate needed, not a penalty. Dollar amounts show as currency.
5. **Weight.** Shown in lb or kg, as chosen in Settings (Withings returns kg). The chart shows the 7-day average; daily values can be hidden. A plan needing more than 2 lb (0.9 kg) loss per week is blocked, and the app suggests the earliest safe target date ([CDC](https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html)).
6. **Milestones.** Marked when reached, with the date. No rewards or messages.

## Tasks

1. **Fields.** Title, goal, optional linked metric, optional start date and optional due date (a range covers windows like "renew passport, March 1 – April 15"), optional notes, done and done date, order.
2. **Repeating tasks.** A task can repeat weekly (on a weekday) or monthly (on a day of the month, for example "pay rent, monthly on the 1st"). Checking one off creates the next one with the next date. A monthly day past the end of a short month falls on its last day.
3. **Adding.** Title and date only on the first screen, so it takes under 10 seconds.
4. **Past dates.** A task past its date says "date passed" in neutral text. No red, no count of missed tasks.
5. **Reminders.** A notification on the morning a task is due (default 8:00 AM), and optionally the day before.

## Money reminders

Copilot data needs two manual steps each month: categorizing transactions in Copilot, then exporting the CSV for Steady. Goals with a Copilot metric get two reminders:

1. **Categorize.** A few days before the end of the month (default: 3 days before, at 6:00 PM): "Time to categorize this month's transactions in Copilot."
2. **Upload.** Early in the next month (default: the 2nd, at 9:00 AM): "Time to upload your Copilot CSV."
3. Both are sent once a month in total, however many goals use Copilot. Days and times are set in Settings, and each reminder can be turned off.
4. After a successful upload for the month, the upload reminder for that month isn't sent (or stops repeating, if repeats are on).

## Settings

1. **Profile.** Name (used in the greeting) and frame color, chosen from presets (Sage, Olive, Ink blue, Terracotta, Plum, Butter, Charcoal). Each preset has a light and a dark shade. Optional "Animated gradient in the frame": large blurred circles in shades of the frame color drift slowly behind the page, showing through the frame (off by default; still with reduced motion).
2. **Units.** Currency for money goals (default USD), from a list of common currencies; switching changes the symbol on every money metric but doesn't convert amounts. Weight in imperial (lb, the default) or metric (kg); switching converts every weight metric's start, target, and entries. Money goals work with or without Copilot: a typed-balance metric in any currency.
3. **Connections.** One row per service, with its status, the date of its last data, and its actions:
   1. **Copilot Money.** Upload a CSV (drag and drop on Mac, Files app on iPhone), import history, account and category mappings, money reminder times.
   2. **BookBox.** Server URL and read-only token, Connect or Disconnect, last sync, linked reading goals.
   3. **Withings.** Connect (OAuth on the Withings site) or Disconnect, last sync.
   4. **Hevy.** Paste an API key (Hevy Pro, from Hevy's web app under Settings → Developer), Connect or Disconnect, last sync, tracked lifts.
   5. **Google Maps.** Upload a Takeout list CSV, import history.
   6. **iOS Calendar.** Create or revoke the calendar token, link to the Shortcut setup steps, map calendars to goals, last import.
4. **Notifications.** Turn on for this device, each type on or off, times, quiet hours.
5. **AI.** Progress weights on or off; completion highlights on or off, and whether notes are included in them.
6. **Account.** Add a passkey, sign out.
7. **Password.** Optional, alongside the passkey: set, change (needs the current one), or remove (needs the current one). At least 12 characters. Stored as a salted scrypt hash in the database, never the password. After 10 wrong tries in 15 minutes, password sign-in pauses until the oldest try ages out; passkeys still work. The count is kept in the database so every server instance shares it.
8. **Data.** Export all data as CSV, delete all data.
9. **Confirming.** Destructive actions here (removing the password, deleting all data) ask first in an animated alert dialog (a Radix alert dialog with Animate UI's motion). Cancel has focus; Escape cancels.

## Integrations

### Copilot Money (CSV, totals only)

No public Copilot API exists, so the user exports transactions as CSV from Copilot (Settings > Account > Export your transactions) and uploads it to Steady. The file has date, name, amount, category, parent category, account, account mask, transaction type, and notes ([Copilot help](https://help.copilot.money/en/articles/5944414-exporting-your-transaction-data)).

1. **Totals only.** At import, Steady computes monthly totals and then discards the rows. It stores: total per category per month, and net amount per account mask per month. Transaction names, notes, and individual amounts are not stored.
2. **Duplicates.** So overlapping files can be imported, Steady stores a keyed hash (HMAC) of each row's date, name, amount, and account. The hash can't be turned back into the transaction. A row whose hash was seen before is skipped.
3. **Copilot goals.** The transaction export has no goal data. To link a Copilot goal, the user enters its name and target once, and maps it to the account mask or category that funds it. The metric then sums those monthly totals from its start date. **[Decide]** If Copilot offers a goals export or another way to read goals, use that instead; I haven't found one.
4. **Copilot savings metrics** track contributions: start value 0, target is the amount to save, since balances aren't in the export. To track a balance instead, the user makes the metric a typed balance.
5. **Spending block.** Monthly totals per category against targets the user sets (for example, Restaurants $200). Shows this month and the last 3 months. Categories over target are shown in neutral text with the amount over, not in red.
6. **Sign convention.** **[Decide after a test import]** Confirm with a real export whether spending is positive or negative, and how transfers appear.

### BookBox (reading)

BookBox adds a small read-only API. Steady uses it for finished books and for BookBox's own reading goals.

| Item | Specification |
| --- | --- |
| Finished books | `GET /api/v1/books?status=finished&finished_after=YYYY-MM-DD`. Each item: `id`, `status`, `finishedDate`. Paging with `limit` (default 100) and `cursor`. |
| Reading goals | `GET /api/v1/goals`. Each item: `year`, `target`, `finishedCount`. (BookBox stores one reading goal per year.) |
| Authentication | Bearer token. BookBox settings make one token, read-only, revocable. |
| Sync | Once a day and when the user opens the metric, with `finished_after` = date of the last sync. Duplicates removed by `id`. |
| Errors | 401 for a bad token; 429 with `Retry-After` for too many calls. |

1. **Linking.** A reading metric is linked to a BookBox goal by year. Its target comes from BookBox and updates when it changes there.
2. **Data stored.** Book `id`, finished date, and metric link. Titles stay in BookBox.

### Withings (weight)

OAuth 2.0 web flow; tokens encrypted on the server; one action to disconnect ([Withings API](https://developer.withings.com/llms.md)).

1. **Weight.** Webhook on each weigh-in plus a daily backup sync. Weight and time stored, converted to the unit chosen in Settings. Each measurement is an entry on a weight metric.
2. **Steps.** Daily step totals, synced once a day and when a block that uses them is opened. Stored as one number per day. Used by streak, habit, metric, and service view blocks.
3. **Scopes.** Only the scopes for weight and daily activity are requested. No sleep or heart data.

### Hevy (workouts and lifts)

Hevy's public API, available to Hevy Pro users ([Hevy API](https://api.hevyapp.com/docs/)). Hevy says the API is new and may change, so a failed sync shows the last sync date in neutral text and keeps the data already stored.

1. **Connecting.** The user pastes an API key from Hevy's web app (Settings → Developer). It's sent in the `api-key` header and stored encrypted on the server. Disconnect deletes it.
2. **Sync.** Hourly from the existing cron tick, at a fixed minute that isn't on the hour (Hevy asks for that). After a first full sync (`GET /v1/workouts`, paged), each sync asks only for changes since the last one (`GET /v1/workouts/events?since=…`), which also reports deleted workouts. The official docs list no webhooks.
3. **Workouts per week.** The number of workouts in each week (Monday to Sunday, local time), stored as one number per week. Used by a metric (for example, a target of 3 a week, with this week and recent weeks shown) and by streak and habit blocks with a weekly period.
4. **Personal records on lifts.** The user picks the lifts to track from their Hevy exercises (for example, bench press, squat, deadlift). For each, Steady records the best set per workout and keeps a personal-record history. A lift can be a metric with a target, for example "Bench press 185 lb by June". Weights are shown in lb (Hevy returns kg). **[Decide]** Which measure counts as the record: heaviest weight lifted, estimated one-rep max from weight and reps, or both.
5. **Data stored.** Each workout's Hevy id, start time, and duration; for tracked lifts only, the date, weight, and reps of the best set. Workout titles, notes, and other exercises stay in Hevy.

### Google Maps lists (places)

Google Maps has no API for saved lists. Google Takeout exports each list as a CSV with title, note, Maps URL, and comment ([Google Maps Help](https://support.google.com/maps/answer/7280933)). The user uploads a list; duplicates are removed by Maps URL; a manual "+1 place" button covers visits between imports. A Places block shows places visited and places still in "Want to go". A list can also feed a count metric.

## Notifications

| Notification | When | Opens |
| --- | --- | --- |
| Morning digest | Each morning (default 8:00 AM), only if there is something to say: tasks due today, and future goals whose start-by date is today, for example "3 tasks due today · 1 future goal ready to start" | The goal, if everything is on one goal; otherwise home |
| Task reminder | Day before the due date, if set on the task | The task |
| Reminder | At the reminder's date and time | The goal |
| Categorize transactions | Days before month end (default 3, at 6:00 PM) | Copilot in Settings |
| Upload Copilot CSV | Early next month (default the 2nd, at 9:00 AM) | Copilot upload |
| Countdown milestone | Once at each milestone mark | The goal |
| Metric check-in | On the metric's check-in day, if on | The metric |

1. At most 5 a day. Priority: reminders, morning digest, task reminders, money reminders, countdown milestones, check-ins.
2. Quiet hours, default 10:00 PM to 7:00 AM.
3. Each type has an on/off switch.
4. Notifications carry counts and times only. No task titles, amounts, notes, or goal names.

## Data model

| Record | Fields |
| --- | --- |
| Goal | id, name, drawing (optional), targetDate (optional), milestoneDays, startDate, startByDate (future goals, optional), status (future, active, completed, archived), completedDate, order, highlights (text), highlightsGeneratedAt |
| Block | id, goalId, type, settings (JSON), order |
| Metric | id, goalId, name, kind, unit, startValue, targetValue, startDate, targetDate, direction, checkInFrequency, milestoneStepPct, source, sourceMapping (Copilot account mask or category), externalGoal (provider and id, optional), hideDailyValues, archived |
| MetricEntry | id, metricId, date, value |
| Milestone | id, metricId or goalId, value (amount or days left), reachedDate |
| Task | id, goalId, metricId (optional), title, notes, startDate, dueDate, remindDayBefore, done, doneDate, order |
| Note | id, goalId or metricId, date, text, updatedAt |
| SpendingTotal | id, month, kind (category or account), key, total |
| SpendingTarget | id, blockId, category, monthlyTarget |
| ImportedRowHash | hash, importedAt |
| CopilotImport | id, importedAt, monthsCovered, rowsAdded, rowsSkipped |
| Place | id, listName, title, mapsUrl, list (want to go, visited), visitedDate |
| BookRef | bookId, finishedDate, metricId |
| Connection | provider (copilot, bookbox, withings, googlemaps, ioscalendar), status, encrypted tokens or URL, lastSyncAt |
| DailyValue | id, source (for example, withings steps), date, value |
| Streak | id, blockId, target, period, source, currentLength, bestLength, lastCountedDate |
| CheckOff | id, blockId, date (habit and manual streak check-offs) |
| BlockItem | id, blockId, kind, date (optional), state (optional), order, fields (encrypted JSON). Holds the items of list-like blocks: reminders, phases, calendar events, checklist items, decisions, budget lines, log entries, ratings, links, contacts, key facts, collection items, wins, and retrospective answers |
| File | id, blockId, name, type, size, storageKey, uploadedAt (contents encrypted before upload) |

App records: Settings (name, notification times, quiet hours, money reminder times, AI highlights on or off), Passkey, PushSubscription, NotificationLog.

Encrypted at rest: all names, titles, notes, amounts, values, category names, highlights, block item fields, file contents, and tokens. Left plain so the database can sort and filter: ids, dates, statuses, block types, order, and flags.

## Importing a goal

A goal can be loaded from a JSON file with `scripts/import-plan.mts`: the goal, its metrics (with entries), tasks (with dates), notes, block layout, and drawing. The file stays outside the repository (for example in `data/`, which git ignores), so personal figures are never committed. Rerunning the import skips anything that already exists. Imported goals are ordinary goals the user can rename and rearrange.

## Privacy

1. Single user, passkey or password sign-in, no sharing.
2. All records encrypted at rest. The user can export all data as CSV and delete all data with one action.
3. No analytics or third-party tracking scripts.
4. Copilot rows are discarded after import; only monthly totals and row hashes are kept.
5. AI is used for two things only: progress weights and completion highlights. Each sends only the goal data listed in its section to the Claude API, from the server, and each can be turned off.
6. Notifications and any future widget carry counts and times only.

## Tone rules

Streaks are allowed as a block the user chooses; a broken streak is stated in neutral text and never notified. No penalties or red warnings. Behind-plan metrics show the new rate needed. Tasks past their date say "date passed" in neutral text. Each core action takes under 30 seconds on a phone: add a task, check off a task, add a metric entry, upload a Copilot file.

## Out of scope

Native iOS app, Apple Health, direct bank connections, multi-user, sharing, AI chat, free-form grid layouts inside a goal, a calendar feed (ICS) of dated tasks.

## Open questions

- [ ] AI highlights: confirm the data sent. (Completion summary, item 3)
- [ ] Copilot: a way to read Copilot goals directly, if one exists; sign convention and transfers from a real export.
- [ ] BookBox: confirm it records a finish date for each book, and add the two endpoints above.
- [ ] Calendar Shortcut: test that all-day events and events with no end time import correctly.
- [ ] Scriptable Home Screen widget: still wanted? If so, what should it show?
- [ ] Google Maps: how the user names which saved list to import.

## Build phases

1. **Phase 1 — Goals and tasks.** Home screen with greeting, goal grid, and drag to reorder. Goals with rename, future goals, complete and archive. Blocks: countdown, metric, metric summary, tasks, notes. Progress estimate with AI weights and explanation. Settings page with profile, notifications, AI, and account. Task reminders and countdown milestone notifications. Importing a goal from a JSON file.
2. **Phase 2 — More blocks.** Blocks that need no new services: streak and habit (manual check-off), log, rating, before and after (without photos), reminders, phases, checklist, decisions, budget, links, contacts, key facts, why, collection, wins, retrospective.
3. **Phase 3 — Copilot.** Connections section in Settings, CSV import (totals only), Copilot goal linking, spending block, money reminders.
4. **Phase 4 — Other integrations and completion.** Withings (weight and steps, so streaks and habits can use them), Hevy (workouts per week and personal records on lifts), BookBox (needs its API first), Google Maps places, service views, calendar events, files and photos, weather, completion summary with AI highlights, data export and delete-all, and the widget if still wanted.
