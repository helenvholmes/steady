CREATE TABLE `blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`type` text NOT NULL,
	`settings` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blocks_goal` ON `blocks` (`goal_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`target_date` text,
	`milestone_days` text NOT NULL,
	`start_date` text NOT NULL,
	`start_by_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`completed_date` text,
	`order` integer DEFAULT 0 NOT NULL,
	`highlights` text,
	`highlights_generated_at` integer,
	`weights_signature` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `metric_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`metric_id` integer NOT NULL,
	`day` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `metric_entries_metric_day` ON `metric_entries` (`metric_id`,`day`);--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`unit` text NOT NULL,
	`start_value` text NOT NULL,
	`target_value` text NOT NULL,
	`start_date` text NOT NULL,
	`target_date` text NOT NULL,
	`direction` text NOT NULL,
	`check_in_frequency` text DEFAULT 'weekly' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`source_mapping` text,
	`external_goal` text,
	`milestone_step_pct` integer DEFAULT 10 NOT NULL,
	`hide_daily_values` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `metrics_goal` ON `metrics` (`goal_id`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`metric_id` integer,
	`goal_id` integer,
	`value` real NOT NULL,
	`reached_date` text,
	FOREIGN KEY (`metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_type` text NOT NULL,
	`parent_id` integer NOT NULL,
	`day` text NOT NULL,
	`text` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`type` text NOT NULL,
	`day` text NOT NULL,
	`sent_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_log_key_unique` ON `notification_log` (`key`);--> statement-breakpoint
CREATE INDEX `notification_log_day` ON `notification_log` (`day`);--> statement-breakpoint
CREATE TABLE `passkeys` (
	`id` text PRIMARY KEY NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer NOT NULL,
	`transports` text,
	`device_name` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress_weights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`input_key` text NOT NULL,
	`weight` real NOT NULL,
	`reason` text,
	`user_set` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `progress_weights_goal_input` ON `progress_weights` (`goal_id`,`input_key`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subscription` text NOT NULL,
	`endpoint_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_hash_unique` ON `push_subscriptions` (`endpoint_hash`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goal_id` integer NOT NULL,
	`metric_id` integer,
	`title` text NOT NULL,
	`notes` text,
	`start_date` text,
	`due_date` text,
	`remind_day_before` integer DEFAULT false NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`done_date` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_goal` ON `tasks` (`goal_id`);--> statement-breakpoint
CREATE INDEX `tasks_due` ON `tasks` (`due_date`);