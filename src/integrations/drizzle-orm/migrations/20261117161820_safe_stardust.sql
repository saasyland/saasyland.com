CREATE TABLE `lesson_attachment` (
	`content_type` text,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`lesson_id` text NOT NULL,
	`object_key` text,
	`position` integer DEFAULT 0 NOT NULL,
	`size_bytes` integer,
	`title` text NOT NULL,
	`url` text(2048),
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lesson_attachment_lesson_position_idx` ON `lesson_attachment` (`lesson_id`,`position`);--> statement-breakpoint
ALTER TABLE `chapter` ADD `summary` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `icon` text DEFAULT 'book-open' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `level` text DEFAULT 'beginner' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `outcomes` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `course` ADD `prerequisites` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson` ADD `description` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson` ADD `key_moments` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `video` ADD `placeholder` integer DEFAULT false NOT NULL;