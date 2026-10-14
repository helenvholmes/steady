ALTER TABLE `goals` ADD `weights_summary` text;--> statement-breakpoint
-- Ask AI again once, so goals weighted before summaries existed get one.
UPDATE `goals` SET `weights_signature` = NULL;
