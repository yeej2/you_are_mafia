CREATE TABLE `simulation_media` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`content` text,
	`mime` text,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `simulation_media_room_kind` ON `simulation_media` (`room`,`kind`);