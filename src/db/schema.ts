import { customType, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { decrypt, encrypt } from "../lib/crypto";

/*
 * Phase 1 tables: goals, their blocks, metrics, tasks, notes, and progress weights.
 *
 * Encryption at rest: every value the user writes or measures (names, titles, notes, amounts, values, block
 * settings, AI reasons) uses an enc* column, which is AES-GCM encrypted before it reaches the database. Left in
 * plain form so the database can sort and filter: ids, foreign keys, dates and timestamps, fixed enums (status,
 * block type, kind, direction), flags, and display order.
 */

const encText = customType<{ data: string; driverData: string }>({
  dataType: () => "text",
  toDriver: (value) => encrypt(value),
  fromDriver: (value) => decrypt(value),
});

const encNumber = customType<{ data: number; driverData: string }>({
  dataType: () => "text",
  toDriver: (value) => encrypt(String(value)),
  fromDriver: (value) => Number(decrypt(value)),
});

const encJson = <T>() =>
  customType<{ data: T; driverData: string }>({
    dataType: () => "text",
    toDriver: (value) => encrypt(JSON.stringify(value)),
    fromDriver: (value) => JSON.parse(decrypt(value)) as T,
  });

const id = () => integer("id").primaryKey({ autoIncrement: true });
const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
/** A calendar day in the user's time zone, "YYYY-MM-DD". */
const day = (name: string) => text(name);

export const GOAL_STATUSES = ["future", "active", "completed", "archived"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** Phase 1 block types. Later phases add more (see REQUIREMENTS.md, Block types). */
export const BLOCK_TYPES = ["countdown", "metric", "metric_summary", "tasks", "notes"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export type BlockSettings = {
  /** metric block */
  metricId?: number | null;
  /** metric_summary block; empty means every metric on the goal */
  metricIds?: number[];
  /** tasks block */
  showDone?: boolean;
};

export const METRIC_SOURCES = ["manual", "copilot", "withings", "bookbox", "googlemaps"] as const;

// ---------- Goals ----------

export const goals = sqliteTable("goals", {
  id: id(),
  name: encText("name").notNull(),
  /** Optional: shows a countdown. */
  targetDate: day("target_date"),
  milestoneDays: text("milestone_days", { mode: "json" }).$type<number[]>().notNull(),
  startDate: day("start_date").notNull(),
  /** Future goals only. */
  startByDate: day("start_by_date"),
  /** Open Peeps drawing id (lib/peeps.ts), or null for none. */
  drawing: text("drawing"),
  status: text("status", { enum: GOAL_STATUSES }).notNull().default("active"),
  completedDate: day("completed_date"),
  /** Order within its section of the home screen (active, future). */
  order: integer("order").notNull().default(0),
  highlights: encText("highlights"),
  highlightsGeneratedAt: timestamp("highlights_generated_at"),
  /** The progress inputs the stored AI weights were computed for (see lib/progress.ts). */
  weightsSignature: text("weights_signature"),
  /** AI's one- or two-sentence explanation of how the progress bar is calculated, written with the weights. */
  weightsSummary: encText("weights_summary"),
  createdAt: timestamp("created_at").notNull(),
});

export const blocks = sqliteTable(
  "blocks",
  {
    id: id(),
    goalId: integer("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    type: text("type", { enum: BLOCK_TYPES }).notNull(),
    settings: encJson<BlockSettings>()("settings").notNull(),
    order: integer("order").notNull().default(0),
  },
  (t) => [index("blocks_goal").on(t.goalId)],
);

// ---------- Metrics ----------

export const metrics = sqliteTable(
  "metrics",
  {
    id: id(),
    goalId: integer("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    name: encText("name").notNull(),
    /** value: each entry is a reading (balance, weight). count: each entry adds to the total (places, books). */
    kind: text("kind", { enum: ["value", "count"] }).notNull(),
    unit: text("unit").notNull(),
    startValue: encNumber("start_value").notNull(),
    targetValue: encNumber("target_value").notNull(),
    startDate: day("start_date").notNull(),
    targetDate: day("target_date").notNull(),
    direction: text("direction", { enum: ["up", "down"] }).notNull(),
    checkInFrequency: text("check_in_frequency", { enum: ["daily", "weekly", "monthly"] }).notNull().default("weekly"),
    source: text("source", { enum: METRIC_SOURCES }).notNull().default("manual"),
    /** Copilot account mask or category (Phase 3). */
    sourceMapping: encText("source_mapping"),
    /** A goal in another app this metric is linked to (Phase 3–4). */
    externalGoal: encJson<{ provider: string; id: string }>()("external_goal"),
    /** Milestones every N percent of the way (0 for none). */
    milestoneStepPct: integer("milestone_step_pct").notNull().default(10),
    hideDailyValues: integer("hide_daily_values", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("metrics_goal").on(t.goalId)],
);

export const metricEntries = sqliteTable(
  "metric_entries",
  {
    id: id(),
    metricId: integer("metric_id")
      .notNull()
      .references(() => metrics.id, { onDelete: "cascade" }),
    day: day("day").notNull(),
    value: encNumber("value").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (t) => [index("metric_entries_metric_day").on(t.metricId, t.day)],
);

/** A metric milestone (metricId + value) or a countdown milestone (goalId + days left). */
export const milestones = sqliteTable("milestones", {
  id: id(),
  metricId: integer("metric_id").references(() => metrics.id, { onDelete: "cascade" }),
  goalId: integer("goal_id").references(() => goals.id, { onDelete: "cascade" }),
  value: real("value").notNull(),
  reachedDate: day("reached_date"),
});

// ---------- Tasks and notes ----------

export const tasks = sqliteTable(
  "tasks",
  {
    id: id(),
    goalId: integer("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    metricId: integer("metric_id").references(() => metrics.id, { onDelete: "set null" }),
    title: encText("title").notNull(),
    notes: encText("notes"),
    startDate: day("start_date"),
    dueDate: day("due_date"),
    remindDayBefore: integer("remind_day_before", { mode: "boolean" }).notNull().default(false),
    /** Weekly (same weekday as the due date) or monthly; checking one off creates the next (lib/tasks.ts). */
    repeat: text("repeat", { enum: ["weekly", "monthly"] }),
    /** Monthly only: the day of the month it falls on (a short month uses its last day). */
    repeatDay: integer("repeat_day"),
    /** The next task this one created when checked off, so unchecking and checking again doesn't make another. */
    nextTaskId: integer("next_task_id"),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    doneDate: day("done_date"),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull(),
  },
  (t) => [index("tasks_goal").on(t.goalId), index("tasks_due").on(t.dueDate)],
);

export const notes = sqliteTable("notes", {
  id: id(),
  parentType: text("parent_type", { enum: ["goal", "metric"] }).notNull(),
  parentId: integer("parent_id").notNull(),
  day: day("day").notNull(),
  text: encText("text").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// ---------- Progress weights ----------

/** How much each progress input counts toward a goal's progress bar. Set by AI, or by the user (userSet). */
export const progressWeights = sqliteTable(
  "progress_weights",
  {
    id: id(),
    goalId: integer("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    /** "metric:<id>", "tasks", or "time" */
    inputKey: text("input_key").notNull(),
    /** Share of the whole, 0–1. */
    weight: real("weight").notNull(),
    reason: encText("reason"),
    userSet: integer("user_set", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [uniqueIndex("progress_weights_goal_input").on(t.goalId, t.inputKey)],
);

// ---------- App infrastructure ----------

export type Settings = {
  userName: string;
  /** Preset id from lib/frame.ts */
  frameColor: string;
  /** Blurred, drifting gradient in the frame instead of a solid color. */
  frameAnimated: boolean;
  /** ISO 4217 code for money metrics (lib/units.ts). */
  currency: string;
  /** Weight in lb (imperial) or kg (metric). */
  unitSystem: "imperial" | "metric";
  /** Time for task notifications, "HH:MM". */
  taskDueTime: string;
  quietStart: string;
  quietEnd: string;
  /** morningDigest: tasks due today and future goals reaching their start-by date, at taskDueTime. */
  notify: { morningDigest: boolean; taskReminder: boolean; countdownMilestone: boolean };
  ai: { weights: boolean; highlights: boolean; highlightsIncludeNotes: boolean };
};

/** One row (id = 1), encrypted as a whole. */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  value: encJson<Settings>()("value").notNull(),
});

export const passkeys = sqliteTable("passkeys", {
  id: text("id").primaryKey(), // credential ID, base64url
  publicKey: text("public_key").notNull(), // base64url
  counter: integer("counter").notNull(),
  transports: text("transports", { mode: "json" }).$type<string[]>(),
  deviceName: text("device_name"),
  createdAt: timestamp("created_at").notNull(),
});

/** The optional sign-in password (one row, id = 1): a salted scrypt hash, never the password itself. */
export const password = sqliteTable("password", {
  id: integer("id").primaryKey(),
  hash: text("hash").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

/** Wrong passwords, for the sign-in limit. Kept in the database so every server instance sees the same count. */
export const loginFailures = sqliteTable(
  "login_failures",
  {
    id: id(),
    at: timestamp("at").notNull(),
  },
  (t) => [index("login_failures_at").on(t.at)],
);

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: id(),
  /** Encrypted: the endpoint URL plus keys are enough to send this device a push. */
  subscription: encJson<{ endpoint: string; keys: { p256dh: string; auth: string } }>()("subscription").notNull(),
  /** SHA-256 of the endpoint, to find a device again without decrypting every row. */
  endpointHash: text("endpoint_hash").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
});

/** One row per notification sent. The key ("morningDigest:2026-10-12") keeps each one from going out twice. */
export const notificationLog = sqliteTable(
  "notification_log",
  {
    id: id(),
    key: text("key").notNull().unique(),
    type: text("type").notNull(),
    day: day("day").notNull(),
    sentAt: timestamp("sent_at").notNull(),
  },
  (t) => [index("notification_log_day").on(t.day)],
);
