CREATE TABLE `video` (
	`caption_locales` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`duration_ms` integer NOT NULL,
	`height` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`size_bytes` integer NOT NULL,
	`title` text(255) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`width` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `video_created_at_idx` ON `video` (`created_at`);