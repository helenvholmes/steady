CREATE TABLE `login_failures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_failures_at` ON `login_failures` (`at`);--> statement-breakpoint
CREATE TABLE `password` (
	`id` integer PRIMARY KEY NOT NULL,
	`hash` text NOT NULL,
	`updated_at` integer NOT NULL
);
