CREATE TABLE `presence` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`seen` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `rooms` ADD `locked_until` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `lock_owner` text;